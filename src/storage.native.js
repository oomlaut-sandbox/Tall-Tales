// Saves app data on the phone (document folder, kept until the app is deleted).
// The full app will sync this to the account later; the shape stays the same.
import { keyFor, scopedKey } from './scope';
import { Directory, File, Paths } from 'expo-file-system';

function dir(name) {
  const d = new Directory(Paths.document, name);
  try { d.create({ idempotent: true, intermediates: true }); } catch (e) {}
  return d;
}

async function rawLoad(name, fallback) {
  try {
    const f = new File(dir('data'), `${name}.json`);
    if (!f.exists) return fallback;
    return JSON.parse(await f.text());
  } catch (e) {
    return fallback;
  }
}

async function rawSave(name, value) {
  try {
    const f = new File(dir('data'), `${name}.json`);
    f.write(JSON.stringify(value));
  } catch (e) {}
}

// Copy a temporary file (a fresh recording or a picked photo) somewhere permanent.
export async function keepFile(uri, folder, filename) {
  const target = new File(dir(folder), filename);
  try { if (target.exists) target.delete(); } catch (e) {}
  await new File(uri).copy(target);
  return target.uri;
}

// A file kept in the app's Documents folder, at today's address: iOS gives the app a new folder path with every
// update, so a path saved before an update (…/<old id>/Documents/recordings/x.m4a) is moved onto the current one.
export function liveUri(uri) {
  if (!uri || typeof uri !== 'string') return uri;
  const k = uri.indexOf('/Documents/');
  if (k < 0) return uri;
  try {
    const base = Paths.document.uri.replace(/\/$/, '');
    return base + uri.slice(k + '/Documents'.length);
  } catch (e) { return uri; }
}

export function deleteFile(uri) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {}
}

// A file's bytes, for uploading (Book Store publishing).
export async function readBytes(uri) {
  return new File(uri).bytes();
}

// (a child's own things are kept under their profile: see scope.js)
export const loadJSON = (name, fallback) => rawLoad(scopedKey(name), fallback);
export const saveJSON = (name, value) => rawSave(scopedKey(name), value);
// another child's copy (the Profiles page)
export const loadJSONFor = (id, name, fallback) => rawLoad(keyFor(id, name), fallback);
export const saveJSONFor = (id, name, value) => rawSave(keyFor(id, name), value);
