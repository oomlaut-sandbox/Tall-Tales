// Things to share: the sheets a child keeps. Two are always there (a warm note from Oomlaut and the Abc sheet); the
// rest are sheets sent by other Oomlaut families (a notebook page: a drawing, a photo, a note), added when a
// grown-up opens the file they were sent. Each child has their own folder.
// { sheets: [{ id, kind: 'page', from, date, page: { kind: 'note' | 'sketch', text, uri, strokes, strokes2 } }] }
import { deleteFile, keepFile, liveUri, loadJSON, saveJSON } from './storage';
import { currentProfile, onScopeChange } from './scope';
import { loadJSONFor, saveJSONFor } from './storage';

let cache = null;
// each child has their own: a new profile starts from its own file, never the last child's (31 Oct 2026)
onScopeChange(() => { cache = null; });
const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(cache); } catch (e) {} });
export function onFolder(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export async function loadFolder() {
  const f = await loadJSON('folder', null);
  // (a picture's saved path is moved to today's app folder: iOS moves the folder with every update, and an old
  // path shows a blank sheet. 6 Nov 2026)
  cache = { sheets: (f && Array.isArray(f.sheets) ? f.sheets : []).map((x) => (x.page && x.page.uri ? { ...x, page: { ...x.page, uri: liveUri(x.page.uri) } } : x)) };
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

// a drawing changed again (Draw on it): its strokes replaced, its paper kept (Jörg, 5 Nov 2026)
export async function updateSheet(id, page) {
  if (!cache) await loadFolder();
  cache = { sheets: cache.sheets.map((x) => (x.id === id ? { ...x, date: Date.now(), page: { ...x.page, ...page } } : x)) };
  await save();
}

export async function removeSheet(id) {
  if (!cache) await loadFolder();
  const s = cache.sheets.find((x) => x.id === id);
  if (s && s.page && s.page.uri) deleteFile(s.page.uri);
  cache = { sheets: cache.sheets.filter((x) => x.id !== id) };
  await save();
}

// a sheet from the Teacher's Desk, left in some students' folders (Jörg, 6 Nov 2026): each one gets their own copy of
// the paper, so throwing it away in one folder leaves the others
export async function giveSheet(ids, sheet, photoUri) {
  for (let k = 0; k < ids.length; k += 1) {
    const id = ids[k];
    const f = await loadJSONFor(id, 'folder', null);
    const sheets = f && Array.isArray(f.sheets) ? f.sheets : [];
    let uri = null;
    if (photoUri) { try { uri = await keepFile(photoUri, 'folder', `sheet-${Date.now()}-${k}.jpg`); } catch (e) {} }
    const s = { id: `s${Date.now().toString(36)}${k}`, date: Date.now(), ...sheet, page: { ...sheet.page, uri } };
    await saveJSONFor(id, 'folder', { sheets: [s, ...sheets] });
    if (id === currentProfile()) { cache = { sheets: [s, ...sheets] }; emit(); }
  }
}
