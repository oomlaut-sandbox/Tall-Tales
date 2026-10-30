// Store translations (30 Oct 2026): every Book Store book carries all six languages. When a book is
// published, this makes its German, French, Spanish, Japanese and Arabic words with Claude (Anthropic),
// for Jörg to read over in the Store Manager. Nothing reaches families until he approves a language there;
// approving it starts that language's narration (the "narrate" function, with { lang }).
//
// Called from the app by the store owner: POST { bookId, langs?: ['de', …], force?: boolean }.
// It answers straight away and carries on in the background; each language's status in books.langs goes
//   translating → review   (or failed, with a note)
// Only pages whose English changed since the last translation are translated again (unless force), so an
// approved translation keeps Jörg's own edits. A language with nothing new keeps its status.
//
// Reads   books/<id>/content.json, and the book's synopsis (books.blurb)
// Writes  books/<id>/content.json  langs: { <lang>: { title, coverTitle, credits, blurb, pages: { <pid>: words },
//                                          src: { <key>: fingerprint of the English it was made from } } }
//         books.langs[<lang>]  { status, note, title, blurb, coverTitle } (through public.set_book_lang)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { bookBucket } from '../_shared/books.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AI_KEY = (Deno.env.get('ANTHROPIC_API_KEY') || '').trim();
const MODEL = (Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5-5').trim();
const LANGS = ['de', 'fr', 'es', 'ja', 'ar'];
const NAMES: Record<string, string> = { de: 'German', fr: 'French', es: 'Spanish', ja: 'Japanese', ar: 'Arabic' };

// How each language should read: the same choices as the books inside the app (src/story.js).
const STYLE: Record<string, string> = {
  de: 'Natural, warm German for a picture book read aloud to young children. Short sentences, everyday words. Use "du" when the book speaks to the child.',
  fr: 'Natural, warm French for a picture book read aloud to young children. Short sentences, everyday words. Use "tu" when the book speaks to the child. French punctuation spacing is not needed.',
  es: 'Natural, warm Spanish (neutral, understood in Spain and Latin America) for a picture book read aloud to young children. Short sentences, everyday words. Use "tú".',
  ja: 'Japanese for young children, as in Japanese picture books: almost all hiragana (katakana for names and loanwords, kanji only for the very simplest words or not at all), with a space between words (wakachigaki), e.g. 「みんなと ちがう きもち。」. Names in katakana, e.g. ヨルク・シュミット. End sentences with 。',
  ar: 'Clear, simple Modern Standard Arabic for young children, as in Arabic picture books. Short sentences, everyday words. No full vowel marks (only where a word would be ambiguous). Names transliterated, e.g. يورغ شميت.',
};

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function fingerprint(s: string) {
  const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

// The English credits line, as the app shows it on the title page (src/catalog.js).
function creditsOf(c: any) {
  const w = (c.writer || '').trim(), a = (c.artist || '').trim();
  if (w && a) return w.toLowerCase() === a.toLowerCase() ? `Written and illustrated by ${w}.` : `Written by ${w} and illustrated by ${a}.`;
  return w ? `Written by ${w}.` : a ? `Illustrated by ${a}.` : '';
}

async function claude(lang: string, book: string, todo: Record<string, string>) {
  const prompt = `You are translating a children's picture book from English into ${NAMES[lang]}.

${STYLE[lang]}

Keep the meaning, the warmth and the humour, and keep each page about as short as the English: it is read aloud, one page at a time, while a child looks at the picture. Keep the same number of sentences on each page where you can. Keep names of people as names (transliterated where the script needs it). Don't add anything that isn't in the English.

The whole book, for context:
${book}

Translate each of these items. Answer with only a JSON object with the same keys and the ${NAMES[lang]} text as values, nothing else.
${JSON.stringify(todo, null, 1)}`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] }),
  });
  const body = await r.json().catch(() => null);
  if (r.status !== 200 || !body) throw new Error(`The translation service said no (HTTP ${r.status}${body && body.error ? `: ${body.error.message}` : ''}).`);
  const text = (body.content || []).map((x: any) => x.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('The translation came back in a form that could not be read.');
  const out = JSON.parse(m[0]);
  for (const k of Object.keys(todo)) if (typeof out[k] !== 'string' || !out[k].trim()) throw new Error(`The translation is missing “${k}”.`);
  return out as Record<string, string>;
}

async function translate(bookId: string, langs: string[], force: boolean, before: Record<string, string>) {
  const db = createClient(URL_, SERVICE);
  const setLang = (lang: string, patch: Record<string, unknown>) => db.rpc('set_book_lang', { book_id: bookId, lang, patch });
  let content: any = null;
  const BUCKET = await bookBucket(db, bookId); // a book for sale lives in the private folder
  try {
    if (!AI_KEY) throw new Error('The Anthropic key is missing in Supabase (the ANTHROPIC_API_KEY secret in GitHub, then run Store functions).');
    const dl = await db.storage.from(BUCKET).download(`${bookId}/content.json`);
    if (dl.error || !dl.data) throw new Error('The book’s words could not be read.');
    content = JSON.parse(await dl.data.text());
  } catch (e) {
    for (const lang of langs) await setLang(lang, { status: 'failed', note: String((e as Error).message || e) });
    return;
  }
  const { data: row } = await db.from('books').select('blurb').eq('id', bookId).maybeSingle();
  // the English, keyed: page words by pid, and the book's title, cover title, credits and synopsis
  const en: Record<string, string> = {};
  en.title = content.title || '';
  if (content.coverTitle && content.coverTitle.text && content.coverTitle.text.trim()) en.coverTitle = content.coverTitle.text.trim();
  const cr = creditsOf(content); if (cr) en.credits = cr;
  if (row && row.blurb) en.blurb = row.blurb;
  for (const p of content.pages || []) if (p.text && p.text.trim()) en[`page:${p.pid}`] = p.text.trim();
  const fp: Record<string, string> = {};
  for (const [k, v] of Object.entries(en)) fp[k] = await fingerprint(v);
  const book = (content.pages || []).filter((p: any) => p.text && p.text.trim()).map((p: any, i: number) => `Page ${i + 1}: ${p.text.trim()}`).join('\n');
  content.langs = content.langs || {};
  const results = await Promise.all(langs.map(async (lang) => {
    try {
      const L = content.langs[lang] || { pages: {}, src: {} };
      L.pages = L.pages || {}; L.src = L.src || {};
      const todo: Record<string, string> = {};
      for (const [k, v] of Object.entries(en)) if (force || L.src[k] !== fp[k]) todo[k] = v;
      // pages no longer in the book
      for (const pid of Object.keys(L.pages)) if (!en[`page:${pid}`]) { delete L.pages[pid]; delete L.src[`page:${pid}`]; }
      if (!Object.keys(todo).length) return { lang, L, changed: false };
      const out = await claude(lang, `Title: ${en.title}\n${book}`, todo);
      for (const [k, v] of Object.entries(out)) {
        if (!(k in todo)) continue;
        if (k.startsWith('page:')) L.pages[k.slice(5)] = v.trim(); else L[k] = v.trim();
        L.src[k] = fp[k];
      }
      return { lang, L, changed: true };
    } catch (e) {
      return { lang, error: String((e as Error).message || e) };
    }
  }));
  for (const r of results) if ((r as any).L) content.langs[r.lang] = (r as any).L;
  const up = await db.storage.from(BUCKET).upload(`${bookId}/content.json`, new Blob([JSON.stringify(content)], { type: 'application/json' }), { contentType: 'application/json', upsert: true, cacheControl: '60' });
  for (const r of results as any[]) {
    if (r.error || up.error) { await setLang(r.lang, { status: 'failed', note: r.error || `Saving failed: ${up.error!.message}` }); continue; }
    const L = r.L;
    const meta = { title: L.title || null, blurb: L.blurb || null, coverTitle: L.coverTitle || null };
    // something new to read over; or nothing changed, so it goes back to how it was (keeping the old status)
    if (r.changed) await setLang(r.lang, { ...meta, status: 'review', note: null });
    else await setLang(r.lang, { ...meta, status: ['ready', 'approved', 'narrating', 'review'].includes(before[r.lang]) ? before[r.lang] : 'review', note: null });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') || '';
  const asCaller = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
  const { data: isAdmin } = await asCaller.rpc('is_store_admin');
  if (!isAdmin) return json({ error: 'Only the store owner can do this.' }, 403);
  const { bookId, langs, force } = await req.json().catch(() => ({}));
  if (!bookId || !/^[a-z0-9-]+$/.test(bookId)) return json({ error: 'Which book?' }, 400);
  const which = (Array.isArray(langs) && langs.length ? langs : LANGS).filter((l: string) => LANGS.includes(l));
  const db = createClient(URL_, SERVICE);
  // remember each language's status, so a language with nothing new can go back to it
  const { data: row } = await db.from('books').select('langs').eq('id', bookId).maybeSingle();
  const before: Record<string, string> = {};
  for (const l of which) before[l] = (row && row.langs && row.langs[l] && row.langs[l].status) || 'review';
  for (const l of which) await db.rpc('set_book_lang', { book_id: bookId, lang: l, patch: { status: 'translating', note: null } });
  // @ts-ignore EdgeRuntime is provided by Supabase
  EdgeRuntime.waitUntil(translate(bookId, which, !!force, before));
  return json({ ok: true, status: 'translating' });
});
