// Web preview only: keeps data in memory for the session. Phones use storage.native.js.
import { keyFor, scopedKey } from './scope';
const mem = {};
// (#voice-demo: two family readers who recorded a page or two of The Rough Lives of Animals, to show the voice picker)
if (typeof window !== 'undefined' && /voice-demo/.test(window.location.hash)) {
  mem.readers = JSON.stringify([{ id: 'me', name: 'Me' }, { id: 'ropa', name: 'Opa', ...(window.__demoPhoto ? { photo: window.__demoPhoto } : {}) }]);
  const rec = { uri: 'demo.m4a', seconds: 5 };
  mem.recordings = JSON.stringify({ 'rough-lives:rl01': rec, 'rough-lives:rl01@ropa': rec, 'rough-lives:rl02@ropa': rec });
}
// (#garden: the Garden already unlocked, to show it)
if (typeof window !== 'undefined' && /garden/.test(window.location.hash)) {
  mem.controls = JSON.stringify({ ...require('./controls').DEFAULT_CONTROLS, garden: true });
}
// (#my-book: one book you made already on the shelf, to show what's offered for your own books)
if (typeof window !== 'undefined' && /my-book/.test(window.location.hash)) {
  mem[keyFor('main', 'stories')] = JSON.stringify([{ id: 'demo-mine', title: 'Our Trip to Oma’s', writer: 'Mia', artist: 'Mia', cover: null,
    pages: [{ pid: 'd1', text: 'We sat by the lake until the sun went down.', uri: window.__demoPage || null, w: 1078, h: 1078, ...(/over-demo/.test(window.location.hash) ? { textOn: 'top', textLook: 'dark' } : null) }, // (#my-book-over-demo: its words on the picture) // (__demoPage: a family photo for the App Store screenshots)
       { pid: 'd2', text: 'She made pancakes as big as plates!', uri: null, w: 1, h: 1 },
       // (#my-book-both-demo: a page with words on both its pictures)
       ...(/both-demo/.test(window.location.hash) ? [{ pid: 'd3', text: 'The water was still.', uri: window.__demoPage || null, w: 1078, h: 1078, uri2: window.__demoPage || null, w2: 1078, h2: 1078, textOn: 'top', textLook: 'dark', both: true, text2: 'And then we jumped in!', textLook2: 'light', textAt2: { x: 0.5, y: 0.3 } }] : [])] }]);
}
// (#class-demo: a class, Room 4, with Ava and Leo; a book prompt; Leo's book handed in, and one approved: the classroom tools)
if (typeof window !== 'undefined' && /class-demo/.test(window.location.hash)) {
  mem.profiles = JSON.stringify({ classroom: { name: 'Room 4' }, classes: [{ id: 'c1', name: 'Room 4' }], active: 's1',
    list: [{ id: 's1', name: 'Ava', color: 'green', cls: 'c1' }, { id: 's2', name: 'Leo', color: 'orange', cls: 'c1' }] });
  mem.classPrompts = JSON.stringify([{ id: 'pr1', title: 'My Weekend', note: 'A picture and a sentence on each page. What was the best part?', pages: 4, cls: 'c1', at: 1 }]);
  mem.stories = JSON.stringify([
    { id: 'leo1', title: 'The Big Snow', writer: 'Leo', artist: 'Leo', cover: null, cls: 'c1', owner: 's2', promptId: 'pr0', handIn: 'in', published: false,
      pages: [{ pid: 'l1', text: 'It snowed all night.', uri: window.__demoPage || null, w: 1078, h: 1078 }] },
    { id: 'ava0', title: 'Our Class Pet', writer: 'Ava', artist: 'Ava', cover: null, cls: 'c1', owner: 's1', promptId: 'pr0', handIn: 'ok', published: true,
      pages: [{ pid: 'a1', text: 'Our hamster is called Biscuit.', uri: null, w: 1, h: 1 }] }]);
}
// (#kid-mode: Quick and Safe Kid already on, to show the lock on the bars)
if (typeof window !== 'undefined' && /kid-mode/.test(window.location.hash)) {
  mem.controls = JSON.stringify(require('./controls').quickSafeControls(6));
}
async function rawLoad(name, fallback) {
  return name in mem ? JSON.parse(mem[name]) : fallback;
}
async function rawSave(name, value) {
  mem[name] = JSON.stringify(value);
}
export async function keepFile(uri) {
  return uri;
}
export function deleteFile() {}
export const liveUri = (uri) => uri;

// (web preview: music from the Store Manager simply plays from the internet)
export async function downloadKeep(url) { return url; }

// A file's bytes, for uploading (Book Store publishing).
export async function readBytes(uri) {
  const r = await fetch(uri);
  return new Uint8Array(await r.arrayBuffer());
}

// (a child's own things are kept under their profile: see scope.js)
export const loadJSON = (name, fallback) => rawLoad(scopedKey(name), fallback);
export const saveJSON = (name, value) => rawSave(scopedKey(name), value);
// another child's copy (the Profiles page)
export const loadJSONFor = (id, name, fallback) => rawLoad(keyFor(id, name), fallback);
export const saveJSONFor = (id, name, value) => rawSave(keyFor(id, name), value);
