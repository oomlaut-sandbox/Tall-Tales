// The corkboard at the bottom of My Library: yellow sticky notes and photos, pinned anywhere.
// Each pin: { id, kind: 'note' | 'photo', text?, uri?, x, y (0..1, where its middle sits on the board), rot (degrees) }
import { deleteFile, keepFile, loadJSON, saveJSON } from './storage';

export const MAX_PINS = 12;
let cache = null;

export async function loadPins() {
  const b = await loadJSON('corkboard', null);
  cache = b && Array.isArray(b.pins) ? b.pins : [];
  return cache;
}
async function save() { await saveJSON('corkboard', { pins: cache }); }

// the Book Playlists sheet, always pinned in the board's lower left corner: no pin's middle may land where the
// pin would cover any of it (Jörg, 29 Oct 2026)
export const inSheet = (x, y) => x < 0.45 && y > 0.5;
// somewhere free-ish on the board, a little tilted
function spot() {
  const taken = cache || [];
  let best = null;
  for (let k = 0; k < 60; k++) {
    const x = 0.16 + Math.random() * 0.68, y = 0.15 + Math.random() * 0.7;
    if (inSheet(x, y)) continue; // never over the Book Playlists sheet
    const d = taken.length ? Math.min(...taken.map((p) => (p.x - x) ** 2 + ((p.y - y) * 0.75) ** 2)) : 1;
    if (!best || d > best.d) best = { x, y, d };
  }
  return { x: best.x, y: best.y, rot: Math.round((Math.random() * 14 - 7) * 10) / 10 };
}

export async function pinNote(text) {
  if (!cache) await loadPins();
  const p = { id: `p${Date.now().toString(36)}`, kind: 'note', text: text.trim(), ...spot() };
  cache = [...cache, p].slice(-MAX_PINS);
  await save();
  return cache;
}

export async function pinPhoto(uri) {
  if (!cache) await loadPins();
  let kept = uri;
  try { kept = await keepFile(uri, 'corkboard', `pin-${Date.now()}.jpg`); } catch (e) {}
  const p = { id: `p${Date.now().toString(36)}`, kind: 'photo', uri: kept, ...spot() };
  const next = [...cache, p];
  if (next.length > MAX_PINS) { const gone = next.shift(); if (gone.uri) deleteFile(gone.uri); }
  cache = next;
  await save();
  return cache;
}

export async function movePin(id, x, y) {
  if (!cache) await loadPins();
  cache = cache.map((p) => (p.id === id ? { ...p, x: Math.max(0.08, Math.min(0.92, x)), y: Math.max(0.1, Math.min(0.9, y)) } : p));
  await save();
  return cache;
}

export async function unpin(id) {
  if (!cache) await loadPins();
  const p = cache.find((q) => q.id === id);
  if (p && p.uri) deleteFile(p.uri);
  cache = cache.filter((q) => q.id !== id);
  await save();
  return cache;
}
