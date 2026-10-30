// The Book Store catalog: shelves and books, curated in Supabase (docs/catalog-setup.sql).
// The app keeps the last copy it saw, so the store still shows something offline, and falls back
// to the books that ship inside the app if it has never reached the catalog.
import { supabase } from './account';
import { loadJSON, saveJSON } from './storage';
import { STORIES } from './story';

const KEY = 'catalog.v1';

// What the store shows before the catalog has ever loaded: the bundled books on one shelf.
export function fallbackCatalog() {
  return {
    shelves: [{ id: 'free', title: 'Free to read', sort: 10 }],
    books: STORIES.map((s, i) => ({ id: s.id, title: s.title, author: s.author || null, blurb: s.blurb || null, shelf_id: 'free', sort: i * 10, access: 'free', bundled: true, featured: i === 0, page_count: s.pages.length * 2 /* every square is a page: each screen is a picture and a words page */ })),
    fetchedAt: null,
  };
}

export async function cachedCatalog() {
  const c = await loadJSON(KEY, null);
  return c && Array.isArray(c.books) ? c : fallbackCatalog();
}

// Fetches the latest catalog (published rows only; the database only lets the app read those).
export async function refreshCatalog() {
  if (!supabase) return null;
  const cols = 'id,title,author,blurb,shelf_id,sort,access,price_label,product_id,featured,bundled,cover_path,content_path,page_count,age_range,updated_at';
  let [sh, bk] = await Promise.all([
    supabase.from('shelves').select('id,title,sort').order('sort'),
    supabase.from('books').select(`${cols},cover_title,min_age,max_age,process,langs`).order('sort'),
  ]);
  // before the languages column is added (docs/store-manager-setup.sql), the same without it
  if (bk.error) bk = await supabase.from('books').select(`${cols},cover_title,min_age,max_age,process`).order('sort');
  // before the process column is added (docs/catalog-setup.sql), the same without it
  if (bk.error) bk = await supabase.from('books').select(`${cols},cover_title,min_age,max_age`).order('sort');
  // before the Store Manager's setup has run there are no cover_title / age rating columns yet
  if (bk.error) bk = await supabase.from('books').select(`${cols},cover_title`).order('sort');
  if (bk.error) bk = await supabase.from('books').select(cols).order('sort');
  if (sh.error || bk.error) throw sh.error || bk.error;
  const c = { shelves: sh.data, books: bk.data, fetchedAt: Date.now() };
  await saveJSON(KEY, c);
  return c;
}

// The store's rows: each shelf with its books in order (empty shelves left out).
export function shelvesWithBooks(c) {
  return [...c.shelves]
    .sort((a, b) => a.sort - b.sort)
    .map((s) => ({ ...s, books: c.books.filter((b) => b.shelf_id === s.id).sort((a, b) => a.sort - b.sort) }))
    .filter((s) => s.books.length);
}

// A picture from the public "books" folder in Storage.
export function storageUrl(path) {
  if (!supabase || !path) return null;
  return supabase.storage.from('books').getPublicUrl(path).data.publicUrl;
}

// The cover to show: a bundled book's first page, or the cover picture in Storage.
export function coverFor(book) {
  const local = STORIES.find((s) => s.id === book.id);
  if (local && local.pages[0]) return local.pages[0].image;
  const url = storageUrl(book.cover_path);
  return url ? { uri: url } : null;
}

export const bundledStory = (id) => STORIES.find((s) => s.id === id) || null;

// The cover as the book maker made it: the picture with its title on top (store books from the Store Manager).
export function coverArtFor(book) {
  if (bundledStory(book.id) || !book.cover_title) return null;
  const url = storageUrl(book.cover_path);
  return url ? { uri: url, title: book.cover_title } : null;
}

// A store book in another language (30 Oct 2026): each store book carries all six languages. A language
// shows only once Jörg has approved its translation in the Store Manager and its narration is made
// (books.langs[lang].status === 'ready'); until then the book shows and reads in English.
export const STORE_LANGS = ['de', 'fr', 'es', 'ja', 'ar'];
export const storeLangReady = (book, lang) => !!(lang && lang !== 'en' && book && book.langs && book.langs[lang] && book.langs[lang].status === 'ready');
export function localizeStoreBook(book, lang) {
  if (!storeLangReady(book, lang)) return book;
  const L = book.langs[lang];
  return {
    ...book, title: L.title || book.title, blurb: L.blurb || book.blurb,
    cover_title: book.cover_title && L.coverTitle ? { ...book.cover_title, text: L.coverTitle } : book.cover_title,
  };
}

// A store book that isn't inside the app: its words and pictures, and the narration made for it
// (Fatima and Henry, with word timings), fetched from the store. Shaped like the app's own books.
// In another language: that language's words, and only that language's narration is fetched
// (narration/<lang>/<voice>/), so a phone never downloads audio for languages it doesn't read in.
const VOICE_KEYS = ['lily', 'gregory'];
export async function loadStoreBook(book, lang = 'en', appUserId = null) {
  // a book for sale: its files are private; the server checks the purchase and hands out short-lived links
  let files = null;
  if (book.access === 'paid' && !book.bundled) {
    const { data, error } = await supabase.functions.invoke('open-book', { body: { bookId: book.id, appUserId } });
    if (error || !data || data.error || !data.files) {
      let msg = data && data.error;
      try { if (!msg && error && error.context && error.context.json) msg = (await error.context.json()).error; } catch (e) {}
      throw new Error(msg || 'This book could not be downloaded. Check the internet connection and try again.');
    }
    files = data.files;
  }
  const base = (p) => (files ? files[p] || null : storageUrl(`${book.content_path || book.id}/${p}`));
  const fresh = (u) => (files || !u ? u : `${u}?v=${encodeURIComponent(book.updated_at || '')}`);
  const r = await fetch(fresh(base('content.json')));
  if (!r.ok) throw new Error('This book could not be downloaded. Check the internet connection and try again.');
  const c = await r.json();
  const L = storeLangReady(book, lang) && c.langs && c.langs[lang] && c.langs[lang].pages ? c.langs[lang] : null;
  const nDir = L ? `narration/${lang}` : 'narration';
  const narration = {};
  await Promise.all(VOICE_KEYS.map(async (v) => {
    try {
      const tu = base(`${nDir}/${v}/timings.json`);
      if (!tu) return;
      const t = await fetch(fresh(tu));
      if (!t.ok) return;
      const times = await t.json();
      narration[v] = {};
      for (const [pid, info] of Object.entries(times)) narration[v][pid] = { uri: fresh(base(`${nDir}/${v}/${pid}.mp3`)), words: info.words };
    } catch (e) {}
  }));
  const credits = [c.writer, c.artist].some((x) => x && x.trim())
    ? (() => { const w = (c.writer || '').trim(), a = (c.artist || '').trim(); if (w && a) return w.toLowerCase() === a.toLowerCase() ? `Written and illustrated by ${w}.` : `Written by ${w} and illustrated by ${a}.`; return w ? `Written by ${w}.` : `Illustrated by ${a}.`; })()
    : '';
  // the cover is always in the public folder (a book for sale too: the store shows it to everyone)
  const coverImg = c.cover ? { uri: files ? storageUrl(`${book.content_path || book.id}/${c.cover}`) : fresh(base(c.cover)) } : null;
  const words = (p) => (L ? (L.pages[p.pid] != null ? L.pages[p.pid] : p.text || '') : p.text || '');
  const pages = c.pages.map((p) => ({ pid: p.pid, text: words(p), image: p.image ? { uri: fresh(base(p.image)) } : null, w: p.w || 1, h: p.h || 1, image2: p.image2 ? { uri: fresh(base(p.image2)) } : null }));
  // like the books made in the app: the cover, a blank back of the cover, then a title page with the credits
  const title = (L && L.title) || c.title || '';
  const cred = L ? (L.credits || '') : credits;
  const titlePage = { pid: `title-${c.id}`, titlePage: true, text: `${title.replace(/[.。]+$/, '')}${lang === 'ja' && L ? '。' : '.'}${cred ? ` ${cred}` : ''}`, image: coverImg, w: 1600, h: 1600 };
  const coverTitle = c.coverTitle && L && L.coverTitle ? { ...c.coverTitle, text: L.coverTitle } : c.coverTitle || null;
  return {
    id: c.id, title, author: c.author || undefined, store: true,
    ...(L ? { lang } : {}),
    cover: coverImg ? { uri: coverImg.uri, title: coverTitle } : null,
    pages: [titlePage, ...pages],
    narration, narrationLang: L ? lang : 'en',
  };
}

export const accessLabel = (b) => (b.access === 'free' ? 'Free' : 'Members'); // (membership only: 29 Oct 2026)

// A book's age rating: the youngest age it's for (and the oldest it's aimed at, or null for "and up").
// Set per book in the Store Manager; books inside the app have their own (story.js: minAge / maxAge).
export function ageOf(book, story) {
  const min = book && book.min_age != null ? book.min_age : story && story.minAge != null ? story.minAge : null;
  const max = book && book.min_age != null ? (book.max_age != null ? book.max_age : null) : story && story.maxAge != null ? story.maxAge : null;
  return { min, max };
}
// shown as "4–7" or "7+"
export const ageText = ({ min, max }) => (min == null ? null : max != null ? `${min}–${max}` : `${min}+`);
// may a child of this age see it? (only books rated older than the child are hidden; younger books are fine)
export const ageAllowed = (rating, childAge) => childAge == null || rating.min == null || rating.min <= childAge;
