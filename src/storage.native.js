// Saves app data on the phone (document folder, kept until the app is deleted).
// The full app will sync this to the account later; the shape stays the same.
import { keyFor, scopedKey } from './scope';
import { Directory, File, Paths } from 'expo-file-system';

function dir(name) {
  const d = new Directory(Paths.document, name);
  try { d.create({ idempotent: true, intermediates: true }); } catch (e) {}
  return d;
}

// Safe saving (31 Oct 2026): each save also refreshes a backup copy (name.bak.json, at most every few seconds),
// and a file that can't be read is never quietly treated as empty: the backup is used instead, and the damaged
// file is put aside (name.damaged-<time>.json) rather than written over, so nothing is lost for good.
const bakAt = {};
async function readJSONAsync(f) {
  if (!f.exists) return { none: true };
  try { return { ok: true, v: JSON.parse(await f.text()) }; } catch (e) { return { bad: true }; }
}
async function rawLoad(name, fallback) {
  try {
    const d = dir('data');
    const f = new File(d, `${name}.json`);
    const main = await readJSONAsync(f);
    if (main.ok) return main.v;
    const bak = await readJSONAsync(new File(d, `${name}.bak.json`));
    if (main.bad) { try { f.move(new File(d, `${name}.damaged-${Date.now()}.json`)); } catch (e) {} }
    if (bak.ok) { try { new File(d, `${name}.json`).write(JSON.stringify(bak.v)); } catch (e) {} return bak.v; }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

async function rawSave(name, value) {
  try {
    const d = dir('data');
    const text = JSON.stringify(value);
    if (text === undefined) return;
    new File(d, `${name}.json`).write(text);
    const now = Date.now();
    if (!bakAt[name] || now - bakAt[name] > 4000) { bakAt[name] = now; new File(d, `${name}.bak.json`).write(text); }
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
    const f = new File(liveUri(uri)); // (a path saved before an app update still finds its file)
    if (f.exists) f.delete();
  } catch (e) {}
}

// A file from the internet, kept in the app's own folder (music from the Store Manager: it then plays offline too)
export async function downloadKeep(url, folder, filename) {
  const target = new File(dir(folder), filename);
  try { if (target.exists) target.delete(); } catch (e) {}
  const out = await File.downloadFileAsync(url, target);
  return (out && out.uri) || target.uri;
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
