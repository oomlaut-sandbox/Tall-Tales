// Parent recordings, one per page. Keyed by the page's own id (not its position),
// so a recording stays with its page when pages are moved or deleted.
// { "<storyId>:<pageId>": { uri, seconds } }
import { deleteFile, keepFile, loadJSON, saveJSON } from './storage';

let all = null;

async function load() {
  if (!all) all = await loadJSON('recordings', {});
  return all;
}

export const pageKey = (page, index) => (page && page.pid) || `i${index}`;

export async function getRecording(storyId, pid) {
  return (await load())[`${storyId}:${pid}`] || null;
}

// Recordings in the story's current page order: [{ page (index), pid, uri, seconds }]
export async function listRecordings(story) {
  const r = await load();
  const out = [];
  story.pages.forEach((p, i) => {
    const rec = r[`${story.id}:${pageKey(p, i)}`];
    if (rec) out.push({ page: i, pid: pageKey(p, i), ...rec });
  });
  return out;
}

export async function saveRecording(storyId, pid, tempUri, seconds) {
  const r = await load();
  const key = `${storyId}:${pid}`;
  const uri = await keepFile(tempUri, 'recordings', `${storyId}-${pid}-${Date.now()}.m4a`);
  if (r[key] && r[key].uri !== uri) deleteFile(r[key].uri);
  r[key] = { uri, seconds };
  await saveJSON('recordings', r);
}

export async function removeRecording(storyId, pid) {
  const r = await load();
  const key = `${storyId}:${pid}`;
  if (r[key]) deleteFile(r[key].uri);
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
    deleteFile(r[key].uri);
    delete r[key];
    changed = true;
  }
  if (changed) await saveJSON('recordings', r);
}
