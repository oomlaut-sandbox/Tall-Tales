// Store narration: makes the Fatima and Henry narration (ElevenLabs, with word timings for the
// highlighting) for a Book Store book that was published from the app's Store Manager.
//
// Called from the app by the store owner: POST { bookId, lang? }. It answers straight away and carries on in
// the background; the book's narration_status goes working → ready (or failed, with a note).
// With a lang (de, fr, es, ja, ar; 30 Oct 2026): that language's approved translation (content.json langs) is
// narrated into narration/<lang>/<voice>/, and books.langs[lang].status goes narrating → ready (or failed).
//
// Reads   books/<id>/content.json              (written by the app when publishing)
// Writes  books/<id>/narration/<voice>/<pid>.mp3
//         books/<id>/narration/<voice>/timings.json   { <pid>: { fp, words: [start seconds…], dur } }
// Pages whose words haven't changed since last time are kept (fp = fingerprint of voice + words).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { bookBucket } from '../_shared/books.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EL_KEY = (Deno.env.get('ELEVENLABS_API_KEY') || '').trim();
const MODEL = 'eleven_multilingual_v2';
// The same two voices and paces as the books inside the app (ci/narrate.js).
const VOICES = [
  { key: 'lily', find: ['lily'], id: 'pFZP5JQG7iQjIQuC4Bku', pace: 0.75 },
  { key: 'gregory', find: ['gregory grumble', 'grumble'], id: null as string | null, pace: 0.75 }, // (every narrator at 0.75, as in ci/narrate.js)
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

const LANGS = ['de', 'fr', 'es', 'ja', 'ar'];

// The English credits line, as the app shows it on the title page (src/catalog.js).
function creditsOf(c: any) {
  const w = (c.writer || '').trim(), a = (c.artist || '').trim();
  if (w && a) return w.toLowerCase() === a.toLowerCase() ? `Written and illustrated by ${w}.` : `Written by ${w} and illustrated by ${a}.`;
  return w ? `Written by ${w}.` : a ? `Illustrated by ${a}.` : '';
}

async function narrate(bookId: string, lang: string) {
  const db = createClient(URL_, SERVICE);
  const en = lang === 'en';
  const setStatus = (status: string, note: string | null = null) => en
    ? db.from('books').update({ narration_status: status === 'working' ? 'working' : status, narration_note: note }).eq('id', bookId)
    : db.rpc('set_book_lang', { book_id: bookId, lang, patch: { status: status === 'working' ? 'narrating' : status, note } });
  try {
    if (!EL_KEY) throw new Error('The ElevenLabs key is missing in Supabase.');
    const BUCKET = await bookBucket(db, bookId); // a book for sale lives in the private folder
    const dl = await db.storage.from(BUCKET).download(`${bookId}/content.json`);
    if (dl.error || !dl.data) throw new Error('The book’s words could not be read.');
    const content = JSON.parse(await dl.data.text());
    const L = en ? null : content.langs && content.langs[lang];
    if (!en && !(L && L.pages)) throw new Error('This language has no translation yet.');
    const pages = (content.pages || []).map((p: any) => ({ pid: p.pid, text: en ? p.text : L.pages[p.pid] })).filter((p: any) => p.text && p.text.trim());
    // the title page too ("Title. Written by …"), worded exactly as the app shows it (src/catalog.js), so the
    // narrator reads it first, like the books inside the app (30 Oct 2026)
    const title = ((en ? content.title : L.title || content.title) || '').trim();
    const credits = en ? creditsOf(content) : (L.credits || '').trim();
    if (title) pages.unshift({ pid: `title-${content.id || bookId}`, text: `${title.replace(/[.。]+$/, '')}${lang === 'ja' ? '。' : '.'}${credits ? ` ${credits}` : ''}` });
    const dir = en ? `${bookId}/narration` : `${bookId}/narration/${lang}`;
    const voices = await voiceIds();
    if (!voices.length) throw new Error('No narrator voices were found in ElevenLabs.');
    let made = 0, kept = 0;
    for (const v of voices) {
      const tPath = `${dir}/${v.key}/timings.json`;
      const old = await db.storage.from(BUCKET).download(tPath);
      const timings: Record<string, any> = old.data ? JSON.parse(await old.data.text()) : {};
      const next: Record<string, any> = {};
      // a few pages at a time, so a whole book is done in well under a minute
      for (let i = 0; i < pages.length; i += 4) {
        await Promise.all(pages.slice(i, i + 4).map(async (p: any) => {
          const fp = await fingerprint(`${MODEL}|${v.id}|${v.pace}|${en ? '' : lang}|${p.text}`);
          if (timings[p.pid] && timings[p.pid].fp === fp) { next[p.pid] = timings[p.pid]; kept++; return; }
          const r = await el(`/v1/text-to-speech/${v.id}/with-timestamps?output_format=mp3_44100_128`, {
            method: 'POST',
            body: JSON.stringify({ text: p.text, model_id: MODEL, ...(en ? {} : { language_code: lang }), voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: v.pace } }),
          });
          if (r.status !== 200 || !r.body || !r.body.audio_base64) throw new Error(`ElevenLabs said no (HTTP ${r.status}) for page ${p.pid}.`);
          const up = await db.storage.from(BUCKET).upload(`${dir}/${v.key}/${p.pid}.mp3`, b64ToBytes(r.body.audio_base64), { contentType: 'audio/mpeg', upsert: true });
          if (up.error) throw new Error(`Saving the narration failed: ${up.error.message}`);
          const al = r.body.alignment || r.body.normalized_alignment;
          const starts = al ? tokenize(p.text).map((t) => Math.round((al.character_start_times_seconds[Math.min(t.start, al.character_start_times_seconds.length - 1)] || 0) * 1000) / 1000) : [];
          const dur = al ? al.character_end_times_seconds[al.character_end_times_seconds.length - 1] : 0;
          next[p.pid] = { fp, words: starts, dur: Math.round(dur * 1000) / 1000 };
          made++;
        }));
      }
      const up = await db.storage.from(BUCKET).upload(tPath, new Blob([JSON.stringify(next)], { type: 'application/json' }), { contentType: 'application/json', upsert: true });
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
  const { bookId, lang: lang0 } = await req.json().catch(() => ({}));
  if (!bookId || !/^[a-z0-9-]+$/.test(bookId)) return json({ error: 'Which book?' }, 400);
  const lang = lang0 && lang0 !== 'en' ? lang0 : 'en';
  if (lang !== 'en' && !LANGS.includes(lang)) return json({ error: 'Which language?' }, 400);
  const db = createClient(URL_, SERVICE);
  if (lang === 'en') await db.from('books').update({ narration_status: 'working', narration_note: null }).eq('id', bookId);
  else await db.rpc('set_book_lang', { book_id: bookId, lang, patch: { status: 'narrating', note: null } });
  // keep going after answering
  // @ts-ignore EdgeRuntime is provided by Supabase
  EdgeRuntime.waitUntil(narrate(bookId, lang));
  return json({ ok: true, status: 'working' });
});
