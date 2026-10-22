// Recordings of people reading a book in their own voice: up to three readers for the whole family (Mom,
// Grandpa, Kai…), each with their own recording of a page. Keyed by the page's own id (not its position), so a
// recording stays with its page when pages are moved or deleted.
// { "<storyId>:<pageId>": { uri, seconds, levels?, start?, end? } }            the first reader ('me')
// { "<storyId>:<pageId>@<readerId>": { … } }                                 every other reader
// Readers: [{ id, name, photo? }] (family-wide; a photo chosen or taken, so a child who can't read yet can tell
// Grandpa from Mom; without one, the first letter of the name). Which voice each book plays: { <storyId>: 'narrator' | <readerId> }.
import { deleteFile, keepFile, liveUri, loadJSON, saveJSON } from './storage';

export const MAX_READERS = 3;
let all = null;
let readers = null;
let voices = null;

async function load() {
  if (!all) all = await loadJSON('recordings', {});
  return all;
}

export const pageKey = (page, index) => (page && page.pid) || `i${index}`;
const keyOf = (storyId, pid, reader = 'me') => (reader === 'me' ? `${storyId}:${pid}` : `${storyId}:${pid}@${reader}`);
const readerOfKey = (key) => { const k = key.lastIndexOf('@'); return k > key.indexOf(':') ? key.slice(k + 1) : 'me'; };
const live = (rec) => (rec ? { ...rec, uri: liveUri(rec.uri) } : null);

// ---- readers ----
export async function getReaders() {
  if (!readers) {
    readers = await loadJSON('readers', null);
    if (!Array.isArray(readers)) {
      // before readers existed: anything already recorded becomes the first reader, 'Me'
      const r = await load();
      readers = Object.keys(r).length ? [{ id: 'me', name: 'Me' }] : [];
    }
  }
  return readers.map((x) => (x.photo ? { ...x, photo: liveUri(x.photo) } : x));
}
export async function addReader(name, photo) {
  const list = await getReaders();
  if (list.length >= MAX_READERS) return null;
  const id = list.some((x) => x.id === 'me') ? `r${Date.now().toString(36)}` : 'me';
  readers = [...list, { id, name: name.trim() || 'Me' }];
  await saveJSON('readers', readers);
  if (photo) await setReaderPhoto(id, photo);
  return id;
}
// a reader's photo (from the phone's photos or the camera), kept in the app's own folder
export async function setReaderPhoto(id, uri) {
  await getReaders();
  let kept = uri;
  try { kept = await keepFile(uri, 'readers', `${id}-${Date.now().toString(36)}.jpg`); } catch (e) {}
  const old = (readers.find((x) => x.id === id) || {}).photo;
  readers = readers.map((x) => (x.id === id ? { ...x, photo: kept } : x));
  await saveJSON('readers', readers);
  if (old && old !== kept) { try { deleteFile(old); } catch (e) {} }
}
// a reader removed: their recordings and photo go too; books set to their voice go back to the narrator
export async function removeReader(id) {
  const list = await getReaders();
  const gone = list.find((x) => x.id === id);
  if (!gone) return;
  const r = await load();
  for (const key of Object.keys(r)) {
    if (readerOfKey(key) !== id) continue;
    try { deleteFile(liveUri(r[key].uri)); } catch (e) {}
    delete r[key];
  }
  await saveJSON('recordings', r);
  if (gone.photo) { try { deleteFile(gone.photo); } catch (e) {} }
  readers = list.filter((x) => x.id !== id);
  await saveJSON('readers', readers);
  if (!voices) voices = await loadJSON('bookVoices', {});
  const v = { ...voices };
  Object.keys(v).forEach((k) => { if (v[k] === id) delete v[k]; });
  voices = v;
  await saveJSON('bookVoices', voices);
}
export async function renameReader(id, name) {
  const list = await getReaders();
  readers = list.map((x) => (x.id === id ? { ...x, name: name.trim() || x.name } : x));
  await saveJSON('readers', readers);
}

// ---- which voice a book plays ----
export async function getBookVoice(storyId) {
  if (!voices) voices = await loadJSON('bookVoices', {});
  return voices[storyId] || null;
}
export async function setBookVoice(storyId, voice) {
  if (!voices) voices = await loadJSON('bookVoices', {});
  voices = { ...voices, [storyId]: voice };
  await saveJSON('bookVoices', voices);
}

// ---- recordings ----
export async function getRecording(storyId, pid, reader = 'me') {
  return live((await load())[keyOf(storyId, pid, reader)]);
}

// Recordings in the story's current page order, every reader: [{ page (index), pid, reader, uri, seconds, … }]
export async function listRecordings(story) {
  const r = await load();
  const out = [];
  const byPid = {};
  for (const key of Object.keys(r)) {
    if (!key.startsWith(`${story.id}:`)) continue;
    const reader = readerOfKey(key);
    const pid = reader === 'me' ? key.slice(story.id.length + 1) : key.slice(story.id.length + 1, key.lastIndexOf('@'));
    (byPid[pid] = byPid[pid] || []).push({ reader, rec: r[key] });
  }
  story.pages.forEach((p, i) => {
    (byPid[pageKey(p, i)] || []).forEach(({ reader, rec }) => out.push({ page: i, pid: pageKey(p, i), reader, ...live(rec) }));
  });
  return out;
}

// levels: the voice's loudness while recording (0..1, about 20 a second), for the trim editor's picture of the sound
export async function saveRecording(storyId, pid, tempUri, seconds, levels, reader = 'me') {
  const r = await load();
  const key = keyOf(storyId, pid, reader);
  const uri = await keepFile(tempUri, 'recordings', `${storyId}-${pid}-${reader}-${Date.now()}.m4a`);
  if (r[key] && r[key].uri !== uri) deleteFile(liveUri(r[key].uri));
  r[key] = { uri, seconds, ...(levels && levels.length ? { levels } : {}) };
  await saveJSON('recordings', r);
}

// Trim: only the part between start and end (seconds) plays; the file itself is kept whole, so it can be untrimmed
export async function setTrim(storyId, pid, start, end, reader = 'me') {
  const r = await load();
  const key = keyOf(storyId, pid, reader);
  if (!r[key]) return;
  r[key] = { ...r[key], start, end };
  await saveJSON('recordings', r);
}

export async function removeRecording(storyId, pid, reader = 'me') {
  const r = await load();
  const key = keyOf(storyId, pid, reader);
  if (r[key]) deleteFile(liveUri(r[key].uri));
  delete r[key];
  await saveJSON('recordings', r);
}

// Clean up recordings for pages that no longer exist (or a whole deleted story).
export async function pruneRecordings(storyId, keepPids = []) {
  const r = await load();
  let changed = false;
  for (const key of Object.keys(r)) {
    if (!key.startsWith(`${storyId}:`)) continue;
    if (keepPids.includes(key.slice(storyId.length + 1).replace(/@[^@]*$/, ''))) continue;
    deleteFile(liveUri(r[key].uri));
    delete r[key];
    changed = true;
  }
  if (changed) await saveJSON('recordings', r);
}
