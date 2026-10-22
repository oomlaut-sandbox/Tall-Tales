// Parent recordings, one per page. Keyed by the page's own id (not its position),
// so a recording stays with its page when pages are moved or deleted.
// { "<storyId>:<pageId>": { uri, seconds } }
import { deleteFile, keepFile, liveUri, loadJSON, saveJSON } from './storage';

let all = null;

async function load() {
  if (!all) all = await loadJSON('recordings', {});
  return all;
}

export const pageKey = (page, index) => (page && page.pid) || `i${index}`;

export async function getRecording(storyId, pid) {
  const rec = (await load())[`${storyId}:${pid}`];
  return rec ? { ...rec, uri: liveUri(rec.uri) } : null;
}

// Recordings in the story's current page order: [{ page (index), pid, uri, seconds }]
export async function listRecordings(story) {
  const r = await load();
  const out = [];
  story.pages.forEach((p, i) => {
    const rec = r[`${story.id}:${pageKey(p, i)}`];
    if (rec) out.push({ page: i, pid: pageKey(p, i), ...rec, uri: liveUri(rec.uri) });
  });
  return out;
}

// levels: the voice's loudness while recording (0..1, about 20 a second), for the trim editor's picture of the sound
export async function saveRecording(storyId, pid, tempUri, seconds, levels) {
  const r = await load();
  const key = `${storyId}:${pid}`;
  const uri = await keepFile(tempUri, 'recordings', `${storyId}-${pid}-${Date.now()}.m4a`);
  if (r[key] && r[key].uri !== uri) deleteFile(liveUri(r[key].uri));
  r[key] = { uri, seconds, ...(levels && levels.length ? { levels } : {}) };
  await saveJSON('recordings', r);
}

// Trim: only the part between start and end (seconds) plays; the file itself is kept whole, so it can be untrimmed
export async function setTrim(storyId, pid, start, end) {
  const r = await load();
  const key = `${storyId}:${pid}`;
  if (!r[key]) return;
  r[key] = { ...r[key], start, end };
  await saveJSON('recordings', r);
}

export async function removeRecording(storyId, pid) {
  const r = await load();
  const key = `${storyId}:${pid}`;
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
    if (keepPids.includes(key.slice(storyId.length + 1))) continue;
    deleteFile(liveUri(r[key].uri));
    delete r[key];
    changed = true;
  }
  if (changed) await saveJSON('recordings', r);
}
