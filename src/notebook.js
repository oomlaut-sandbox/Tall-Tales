// My Notes, kept on the phone. The first page is always the badge board (it isn't stored here);
// after it come the child's own pages, in two kinds:
//   'note':   a square for a photo or a drawing (or both: drawing on a photo), and a square of typed notes
//   'sketch': two square pages to draw on (strokes: the top one, strokes2: the bottom one)
// { pages: [{ pid, kind, text, uri, w, h, strokes: [...] }] }
import { deleteFile, keepFile, liveUri, loadJSON, saveJSON } from './storage';
import { newPageId } from './userStories';

const KEY = 'notebook';
let queue = Promise.resolve();
const serial = (fn) => (queue = queue.then(fn, fn));

export const blankNote = () => ({ pid: newPageId(), kind: 'note', text: '', uri: null, w: 1, h: 1, strokes: [] });
export const blankSketch = () => ({ pid: newPageId(), kind: 'sketch', text: '', uri: null, w: 1, h: 1, strokes: [], strokes2: [] });

export async function loadNotebook() {
  const n = await loadJSON(KEY, null);
  const pages = n && Array.isArray(n.pages) ? n.pages.map((p) => ({ ...blankNote(), ...p, uri: liveUri(p.uri), strokes: p.strokes || [], strokes2: p.strokes2 || [] })) : [];
  return { pages: pages.length ? pages : [blankNote()] };
}

export const saveNotebook = (nb) => serial(() => saveJSON(KEY, { pages: nb.pages }));

export const keepNotebookPicture = (uri) => keepFile(uri, 'notebook', `img-${Date.now()}.jpg`);
export const dropNotebookPicture = (uri) => deleteFile(liveUri(uri));
