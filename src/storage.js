// Web preview only: keeps data in memory for the session. Phones use storage.native.js.
import { keyFor, scopedKey } from './scope';
const mem = {};
// (#voice-demo: two family readers who recorded a page or two of The Rough Lives of Animals, to show the voice picker)
if (typeof window !== 'undefined' && /voice-demo/.test(window.location.hash)) {
  mem.readers = JSON.stringify([{ id: 'me', name: 'Me', char: 'orange' }, { id: 'ropa', name: 'Opa', char: 'blue' }]);
  const rec = { uri: 'demo.m4a', seconds: 5 };
  mem.recordings = JSON.stringify({ 'rough-lives:rl01': rec, 'rough-lives:rl01@ropa': rec, 'rough-lives:rl02@ropa': rec });
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
