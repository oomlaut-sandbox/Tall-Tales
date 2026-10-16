// Store narration: makes the Fatima and Henry narration (ElevenLabs, with word timings for the
// highlighting) for a Book Store book that was published from the app's Store Manager.
//
// Called from the app by the store owner: POST { bookId }. It answers straight away and carries on in
// the background; the book's narration_status goes working → ready (or failed, with a note).
//
// Reads   books/<id>/content.json              (written by the app when publishing)
// Writes  books/<id>/narration/<voice>/<pid>.mp3
//         books/<id>/narration/<voice>/timings.json   { <pid>: { fp, words: [start seconds…], dur } }
// Pages whose words haven't changed since last time are kept (fp = fingerprint of voice + words).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EL_KEY = (Deno.env.get('ELEVENLABS_API_KEY') || '').trim();
const MODEL = 'eleven_multilingual_v2';
// The same two voices and paces as the books inside the app (ci/narrate.js).
const VOICES = [
  { key: 'lily', find: ['lily'], id: 'pFZP5JQG7iQjIQuC4Bku', pace: 0.75 },
  { key: 'gregory', find: ['gregory grumble', 'grumble'], id: null as string | null, pace: 1 },
];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function el(path: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const text = await r.text();
  let body: any = null; try { body = JSON.parse(text); } catch { /* not json */ }
  return { status: r.status, body, text };
}

async function voiceIds() {
  const r = await el('/v1/voices');
  const list: any[] = (r.body && r.body.voices) || [];
  return VOICES.map((v) => {
    const hit = list.find((x) => v.find.some((f) => (x.name || '').toLowerCase().includes(f)));
    return { ...v, id: hit ? hit.voice_id : v.id };
  }).filter((v) => v.id);
}

// Same word splitting as the app: each run of non-spaces is a word.
const tokenize = (text: string) => { const out: { start: number }[] = []; const re = /\S+/g; let m; while ((m = re.exec(text))) out.push({ start: m.index }); return out; };
async function fingerprint(s: string) {
  const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}
const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function narrate(bookId: string) {
  const db = createClient(URL_, SERVICE);
  const setStatus = (narration_status: string, narration_note: string | null = null) =>
    db.from('books').update({ narration_status, narration_note }).eq('id', bookId);
  try {
    if (!EL_KEY) throw new Error('The ElevenLabs key is missing in Supabase.');
    const dl = await db.storage.from('books').download(`${bookId}/content.json`);
    if (dl.error || !dl.data) throw new Error('The book’s words could not be read.');
    const content = JSON.parse(await dl.data.text());
    const pages = (content.pages || []).filter((p: any) => p.text && p.text.trim());
    const voices = await voiceIds();
    if (!voices.length) throw new Error('No narrator voices were found in ElevenLabs.');
    let made = 0, kept = 0;
    for (const v of voices) {
      const tPath = `${bookId}/narration/${v.key}/timings.json`;
      const old = await db.storage.from('books').download(tPath);
      const timings: Record<string, any> = old.data ? JSON.parse(await old.data.text()) : {};
      const next: Record<string, any> = {};
      // a few pages at a time, so a whole book is done in well under a minute
      for (let i = 0; i < pages.length; i += 4) {
        await Promise.all(pages.slice(i, i + 4).map(async (p: any) => {
          const fp = await fingerprint(`${MODEL}|${v.id}|${v.pace}|${p.text}`);
          if (timings[p.pid] && timings[p.pid].fp === fp) { next[p.pid] = timings[p.pid]; kept++; return; }
          const r = await el(`/v1/text-to-speech/${v.id}/with-timestamps?output_format=mp3_44100_128`, {
            method: 'POST',
            body: JSON.stringify({ text: p.text, model_id: MODEL, voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: v.pace } }),
          });
          if (r.status !== 200 || !r.body || !r.body.audio_base64) throw new Error(`ElevenLabs said no (HTTP ${r.status}) for page ${p.pid}.`);
          const up = await db.storage.from('books').upload(`${bookId}/narration/${v.key}/${p.pid}.mp3`, b64ToBytes(r.body.audio_base64), { contentType: 'audio/mpeg', upsert: true });
          if (up.error) throw new Error(`Saving the narration failed: ${up.error.message}`);
          const al = r.body.alignment || r.body.normalized_alignment;
          const starts = al ? tokenize(p.text).map((t) => Math.round((al.character_start_times_seconds[Math.min(t.start, al.character_start_times_seconds.length - 1)] || 0) * 1000) / 1000) : [];
          const dur = al ? al.character_end_times_seconds[al.character_end_times_seconds.length - 1] : 0;
          next[p.pid] = { fp, words: starts, dur: Math.round(dur * 1000) / 1000 };
          made++;
        }));
      }
      const up = await db.storage.from('books').upload(tPath, new Blob([JSON.stringify(next)], { type: 'application/json' }), { contentType: 'application/json', upsert: true });
      if (up.error) throw new Error(`Saving the word timings failed: ${up.error.message}`);
    }
    await setStatus('ready', `${made} pages narrated, ${kept} unchanged (${voices.map((v) => v.key).join(', ')})`);
  } catch (e) {
    await setStatus('failed', String((e as Error).message || e));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  // only the store owner may start narration
  const auth = req.headers.get('Authorization') || '';
  const asCaller = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
  const { data: isAdmin } = await asCaller.rpc('is_store_admin');
  if (!isAdmin) return json({ error: 'Only the store owner can do this.' }, 403);
  const { bookId } = await req.json().catch(() => ({}));
  if (!bookId || !/^[a-z0-9-]+$/.test(bookId)) return json({ error: 'Which book?' }, 400);
  await createClient(URL_, SERVICE).from('books').update({ narration_status: 'working', narration_note: null }).eq('id', bookId);
  // keep going after answering
  // @ts-ignore EdgeRuntime is provided by Supabase
  EdgeRuntime.waitUntil(narrate(bookId));
  return json({ ok: true, status: 'working' });
});
