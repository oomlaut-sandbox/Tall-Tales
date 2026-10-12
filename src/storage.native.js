// Saves app data on the phone (document folder, kept until the app is deleted).
// The full app will sync this to the account later; the shape stays the same.
import { Directory, File, Paths } from 'expo-file-system';

function dir(name) {
  const d = new Directory(Paths.document, name);
  try { d.create({ idempotent: true, intermediates: true }); } catch (e) {}
  return d;
}

export async function loadJSON(name, fallback) {
  try {
    const f = new File(dir('data'), `${name}.json`);
    if (!f.exists) return fallback;
    return JSON.parse(await f.text());
  } catch (e) {
    return fallback;
  }
}

export async function saveJSON(name, value) {
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

export function deleteFile(uri) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {}
}
