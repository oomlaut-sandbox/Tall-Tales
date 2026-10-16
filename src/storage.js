// Web preview only: keeps data in memory for the session. Phones use storage.native.js.
const mem = {};
export async function loadJSON(name, fallback) {
  return name in mem ? JSON.parse(mem[name]) : fallback;
}
export async function saveJSON(name, value) {
  mem[name] = JSON.stringify(value);
}
export async function keepFile(uri) {
  return uri;
}
export function deleteFile() {}

// A file's bytes, for uploading (Book Store publishing).
export async function readBytes(uri) {
  const r = await fetch(uri);
  return new Uint8Array(await r.arrayBuffer());
}
