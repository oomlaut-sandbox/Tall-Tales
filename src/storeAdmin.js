// The Book Store's own tools: publishing a book made in the book maker to the store, and the
// Store Manager's list. Only the store owner can use them (docs/store-manager-setup.sql decides who);
// for everyone else isStoreAdmin() is false and none of this shows.
//
// A published book lives in Storage under books/<id>/:
//   content.json            title, credits, cover title and the pages (words + picture file names)
//   cover.jpg, pages/<pid>.jpg
//   narration/<voice>/…     made by the "narrate" function in Supabase (Fatima and Henry)
//   narration/<lang>/<voice>/…   the same in another language, once its translation is approved
// content.json also carries the translations (langs), made by the "translate" function and read over and
// approved by the store owner in the Store Manager (30 Oct 2026).
import { supabase } from './account';
import { storageUrl } from './catalog';
import { readBytes } from './storage';
import { creditsLine } from './userStories';

export async function isStoreAdmin() {
  if (!supabase) return false;
  try {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return false;
    const { data, error } = await supabase.rpc('is_store_admin');
    return !error && data === true;
  } catch (e) {
    return false;
  }
}

const slug = (t) => (t || 'book').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'book';

// a book for sale keeps its pages and narration in the private "sold-books" folder (its cover stays public)
const bucketOf = (access) => (access === 'paid' ? 'sold-books' : 'books');
async function upload(path, bytes, contentType, bucket = 'books') {
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType, upsert: true, cacheControl: '60' });
  if (error) throw new Error(error.message);
}

// Publish (or update) a book from the book maker. story: as saved by the book maker
// ({ id, title, writer, artist, cover, pages: [{ pid, text, uri, w, h }] }).
// onStep(text) reports progress. The book goes in hidden; the Store Manager shows it.
export async function publishToStore(story, onStep = () => {}) {
  if (!(await isStoreAdmin())) throw new Error('Only the store owner can publish books.');
  const pages = story.pages.filter((p) => (p.text && p.text.trim()) || p.uri || p.uri2);
  if (!pages.length) throw new Error('This book has no pages yet.');
  // the same store book each time this book is published
  const { data: existing } = await supabase.from('books').select('id,shelf_id,sort,blurb,published,access').eq('source_story', story.id).maybeSingle();
  const bucket = bucketOf(existing && existing.access);
  const id = existing ? existing.id : `${slug(story.title)}-${Math.random().toString(36).slice(2, 6)}`;
  const outPages = [];
  let n = 0;
  for (const p of pages) {
    n++;
    onStep(`Uploading page ${n} of ${pages.length}…`);
    let image = null;
    if (p.uri) { image = `pages/${p.pid}.jpg`; await upload(`${id}/${image}`, await readBytes(p.uri), 'image/jpeg', bucket); }
    let image2 = null; // a second picture where the words would be (a page of two pictures)
    if (p.uri2 && !(p.text || '').trim()) { image2 = `pages/${p.pid}-2.jpg`; await upload(`${id}/${image2}`, await readBytes(p.uri2), 'image/jpeg', bucket); }
    outPages.push({ pid: p.pid, text: (p.text || '').trim(), image, w: p.w || 1600, h: p.h || 1600, ...(image2 ? { image2, w2: p.w2 || 1600, h2: p.h2 || 1600 } : {}) });
  }
  onStep('Uploading the cover…');
  const coverUri = (story.cover && story.cover.uri) || (pages.find((p) => p.uri) || {}).uri;
  if (coverUri) await upload(`${id}/cover.jpg`, await readBytes(coverUri), 'image/jpeg');
  const author = [story.writer, story.artist].map((x) => (x || '').trim()).filter((x, i, a) => x && a.indexOf(x) === i).join(' and ') || null;
  // the translations made before (and any edits to them) carry over; the translation service then redoes
  // only the pages whose English changed
  const before = existing ? await loadStoreContent(id, existing.access).catch(() => null) : null;
  const content = {
    id, title: story.title || 'Untitled story', writer: story.writer || '', artist: story.artist || '', author,
    cover: coverUri ? 'cover.jpg' : null, coverTitle: (story.cover && story.cover.title) || null, pages: outPages,
    ...(before && before.langs ? { langs: before.langs } : {}),
  };
  await upload(`${id}/content.json`, new TextEncoder().encode(JSON.stringify(content)), 'application/json', bucket);
  onStep('Adding it to the store…');
  const row = {
    id, title: content.title, author, bundled: false, access: 'free',
    cover_path: coverUri ? `${id}/cover.jpg` : null, content_path: id, page_count: outPages.length * 2 + 2,
    source_story: story.id, cover_title: content.coverTitle,
  };
  if (!existing) Object.assign(row, { shelf_id: 'new', sort: 100, published: false });
  const { error } = await supabase.from('books').upsert(row);
  if (error) throw new Error(error.message);
  onStep('Starting the narration…');
  const { error: fnErr } = await supabase.functions.invoke('narrate', { body: { bookId: id } });
  // the other five languages, for reading over in the Store Manager
  const { error: trErr } = await supabase.functions.invoke('translate', { body: { bookId: id } });
  const problems = [fnErr ? `The narration couldn’t start (${fnErr.message}).` : null, trErr ? `The translations couldn’t start (${trErr.message}).` : null].filter(Boolean);
  return { id, narration: problems.length ? `${problems.join(' ')} Try again from the Store Manager.` : null };
}

// ── Languages (30 Oct 2026) ─────────────────────────────────────────────────────────────────────────
export const LANG_NAMES = { de: 'German', fr: 'French', es: 'Spanish', ja: 'Japanese', ar: 'Arabic' };

// The book's content.json as it is in the store now (never a cached copy). A book for sale: from the private folder.
export async function loadStoreContent(id, access) {
  if (access === 'paid') {
    const { data, error } = await supabase.storage.from('sold-books').download(`${id}/content.json`);
    if (error || !data) throw new Error('The book’s words could not be loaded.');
    return JSON.parse(await data.text());
  }
  const r = await fetch(`${storageUrl(`${id}/content.json`)}?t=${Date.now()}`);
  if (!r.ok) throw new Error('The book’s words could not be loaded.');
  return r.json();
}

// Free, for sale (with its price), or members': moves the book's files to the right folder on the server.
export async function setAccess(id, access, priceLabel) {
  const { data, error } = await supabase.functions.invoke('book-access', { body: { bookId: id, access, price_label: priceLabel } });
  if (error || (data && data.error)) throw new Error((data && data.error) || error.message);
}
// the App Store product for a book for sale (made in App Store Connect, at the same price)
export const productIdFor = (id) => `oomlaut.book.${String(id).replace(/[^A-Za-z0-9]/g, '_')}`;

// Make the translations (all five languages, or some), again. force: redo every page, not just changed ones.
export async function startTranslation(id, langs, force) {
  const { error } = await supabase.functions.invoke('translate', { body: { bookId: id, ...(langs ? { langs } : {}), ...(force ? { force: true } : {}) } });
  if (error) throw new Error(error.message);
}

// Save the store owner's edits to one language: { title, coverTitle, credits, blurb, pages: { pid: words } }.
export async function saveTranslation(id, lang, edits, access) {
  const content = await loadStoreContent(id, access);
  content.langs = content.langs || {};
  const L = content.langs[lang] || { pages: {}, src: {} };
  for (const k of ['title', 'coverTitle', 'credits', 'blurb']) if (edits[k] != null) L[k] = edits[k].trim();
  L.pages = { ...(L.pages || {}), ...Object.fromEntries(Object.entries(edits.pages || {}).map(([pid, w]) => [pid, w.trim()])) };
  content.langs[lang] = L;
  await upload(`${id}/content.json`, new TextEncoder().encode(JSON.stringify(content)), 'application/json', bucketOf(access));
  const { error } = await supabase.rpc('set_book_lang', { book_id: id, lang, patch: { title: L.title || null, blurb: L.blurb || null, coverTitle: L.coverTitle || null } });
  if (error) throw new Error(error.message);
}

// Approved: the language is narrated (Fatima and Henry), then families see and hear the book in it.
export async function approveTranslation(id, lang, edits, access) {
  if (edits) await saveTranslation(id, lang, edits, access);
  const { error } = await supabase.functions.invoke('narrate', { body: { bookId: id, lang } });
  if (error) throw new Error(error.message);
}

// Take a language away from families again (back to waiting for review); its words and narration stay.
export async function withdrawTranslation(id, lang) {
  const { error } = await supabase.rpc('set_book_lang', { book_id: id, lang, patch: { status: 'review' } });
  if (error) throw new Error(error.message);
}

export async function startNarration(id) {
  const { error } = await supabase.functions.invoke('narrate', { body: { bookId: id } });
  if (error) throw new Error(error.message);
}

// Everything in the store, hidden books too (the owner sees all of it).
const MANAGER_COLS = 'id,title,author,blurb,shelf_id,sort,access,featured,published,bundled,cover_path,cover_title,page_count,age_range,min_age,max_age,price_label,narration_status,narration_note,source_story';
const LANG_COL = ',langs'; // (after docs/store-manager-setup.sql's languages part has run)
export async function loadAllForManager() {
  let [sh, bk] = await Promise.all([
    supabase.from('shelves').select('id,title,sort,published,langs').order('sort'),
    supabase.from('books').select(`${MANAGER_COLS},process${LANG_COL}`).order('sort'),
  ]);
  if (bk.error) bk = await supabase.from('books').select(`${MANAGER_COLS}${LANG_COL}`).order('sort'); // (no process column)
  if (bk.error) bk = await supabase.from('books').select(`${MANAGER_COLS},process`).order('sort');
  if (bk.error) bk = await supabase.from('books').select(MANAGER_COLS).order('sort'); // (no process column yet)
  if (sh.error) sh = await supabase.from('shelves').select('id,title,sort,published').order('sort'); // (no langs column yet)
  if (sh.error || bk.error) throw new Error((sh.error || bk.error).message);
  return { shelves: sh.data, books: bk.data };
}

export async function updateBook(id, patch) {
  const { error } = await supabase.from('books').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

// bundled: a book inside the app (it has no files in the store; only its row on the shelves goes)
export async function removeFromStore(id, bundled) {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw new Error(error.message);
  if (bundled) return;
  // tidy its files in both folders (best effort)
  const subs = ['', 'pages', 'narration/lily', 'narration/gregory'];
  for (const l of Object.keys(LANG_NAMES)) subs.push(`narration/${l}/lily`, `narration/${l}/gregory`);
  for (const bucket of ['books', 'sold-books']) {
    try {
      const paths = [];
      for (const sub of subs) {
        const dir = sub ? `${id}/${sub}` : id;
        const { data: d } = await supabase.storage.from(bucket).list(dir, { limit: 1000 });
        for (const f of d || []) if (f.id) paths.push(`${dir}/${f.name}`);
      }
      if (paths.length) await supabase.storage.from(bucket).remove(paths);
    } catch (e) {}
  }
}

// The credits line shown on a store book's title page.
export const storeCredits = (c) => creditsLine(c.writer, c.artist);

// Shelves: add one, or change one (title, order, shown/hidden).
export async function addShelf(title) {
  const id = slug(title);
  const { data } = await supabase.from('shelves').select('sort').order('sort', { ascending: false }).limit(1);
  const sort = ((data && data[0] && data[0].sort) || 0) + 10;
  const { error } = await supabase.from('shelves').insert({ id, title: title.trim(), sort, published: true });
  if (error) throw new Error(error.message);
  await translateShelf(id).catch(() => {});
}
// a shelf's name in the other five languages (the translation service; done in a few seconds)
export async function translateShelf(id) {
  const { data, error } = await supabase.functions.invoke('translate', { body: { shelfId: id } });
  if (error || (data && data.error)) throw new Error((data && data.error) || error.message);
  return data.langs;
}
export async function updateShelf(id, patch) {
  const { error } = await supabase.from('shelves').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  if (patch.title) await translateShelf(id).catch(() => {}); // renamed: its translations follow
}
