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
  const [sh, bk] = await Promise.all([
    supabase.from('shelves').select('id,title,sort').order('sort'),
    supabase.from('books').select('id,title,author,blurb,shelf_id,sort,access,price_label,product_id,featured,bundled,cover_path,content_path,page_count,age_range,updated_at').order('sort'),
  ]);
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

export const accessLabel = (b) => (b.access === 'free' ? 'Free' : b.access === 'member' ? 'Members' : b.price_label || 'Members or buy');
