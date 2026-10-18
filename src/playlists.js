// Playlists: books lined up to be read one after another, in order or shuffled (each child has their own).
// [{ id, name, books: [bookId], shuffle }]. "Bedtime" is there from the start.
import { loadJSON, saveJSON } from './storage';

const starter = () => [{ id: 'bedtime', name: 'Bedtime', books: [], shuffle: false }];

export async function loadPlaylists() {
  const l = await loadJSON('playlists', null);
  return Array.isArray(l) ? l : starter();
}
export const savePlaylists = (l) => saveJSON('playlists', l);
export const newPlaylist = (name) => ({ id: `pl${Date.now().toString(36)}`, name: (name || '').trim() || 'My playlist', books: [], shuffle: false });

// the order to read them in: as lined up, or shuffled (only books still on this child's shelf)
export function playOrder(pl, shelf) {
  const ids = pl.books.filter((id) => shelf.some((s) => s.id === id));
  if (!pl.shuffle) return ids;
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
