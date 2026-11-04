// Store books added to My Library (Jörg, 4 Nov 2026): "Add to My Library" on a store book's card puts it on the
// family's shelf beside the others. Only the store's row is kept here (title, cover, languages); the pages still
// come from the store when the book is opened, in the reading language, so nothing big is stored on the phone.
// The whole family shares the list (like the books themselves); the parental controls still hide books rated for
// older children.
import { useEffect, useState } from 'react';
import { loadJSONFor, saveJSONFor } from './storage';

let rows = [];
let loaded = false;
const subs = new Set();
const tell = () => subs.forEach((f) => f(rows));

export async function loadStoreLibrary() {
  if (!loaded) {
    loaded = true;
    try { const r = await loadJSONFor('app', 'storeLibrary', []); if (Array.isArray(r)) rows = r; } catch (e) {}
    tell();
  }
  return rows;
}
const save = () => { saveJSONFor('app', 'storeLibrary', rows); tell(); };

export const inStoreLibrary = (id) => rows.some((r) => r.id === id);
export function addToStoreLibrary(book) {
  if (!book || inStoreLibrary(book.id)) return;
  rows = [...rows, { ...book, addedAt: Date.now() }];
  save();
}
export function removeFromStoreLibrary(ids) {
  rows = rows.filter((r) => !ids.includes(r.id));
  save();
}
// a newer copy of a row from the catalogue (a new cover or translation)
export function refreshStoreLibrary(books) {
  if (!rows.length || !books) return;
  let changed = false;
  rows = rows.map((r) => { const b = books.find((x) => x.id === r.id); if (b && b.updated_at !== r.updated_at) { changed = true; return { ...b, addedAt: r.addedAt }; } return r; });
  if (changed) save();
}

export function useStoreLibrary() {
  const [list, setList] = useState(rows);
  useEffect(() => { subs.add(setList); loadStoreLibrary().then(() => setList(rows)); return () => { subs.delete(setList); }; }, []);
  return list;
}
