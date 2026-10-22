// My Folder: the sheets a child keeps. Two are always there (a warm note from Oomlaut and the Abc sheet); the
// rest are sheets sent by other Oomlaut families (a notebook page: a drawing, a photo, a note), added when a
// grown-up opens the file they were sent. Each child has their own folder.
// { sheets: [{ id, kind: 'page', from, date, page: { kind: 'note' | 'sketch', text, uri, strokes, strokes2 } }] }
import { deleteFile, keepFile, loadJSON, saveJSON } from './storage';

let cache = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(cache); } catch (e) {} });
export function onFolder(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export async function loadFolder() {
  const f = await loadJSON('folder', null);
  cache = { sheets: f && Array.isArray(f.sheets) ? f.sheets : [] };
  return cache;
}
async function save() { await saveJSON('folder', cache); emit(); }

export async function addSheet(sheet, photoUri) {
  if (!cache) await loadFolder();
  let uri = null;
  if (photoUri) { try { uri = await keepFile(photoUri, 'folder', `sheet-${Date.now()}.jpg`); } catch (e) {} }
  const s = { id: `s${Date.now().toString(36)}`, date: Date.now(), ...sheet, page: { ...sheet.page, uri } };
  cache = { sheets: [s, ...cache.sheets] };
  await save();
  return s;
}

export async function removeSheet(id) {
  if (!cache) await loadFolder();
  const s = cache.sheets.find((x) => x.id === id);
  if (s && s.page && s.page.uri) deleteFile(s.page.uri);
  cache = { sheets: cache.sheets.filter((x) => x.id !== id) };
  await save();
}
