// Parent recordings, one per page: { "<storyId>:<pageIndex>": { uri, seconds } }
import { deleteFile, keepFile, loadJSON, saveJSON } from './storage';

let all = null;

async function load() {
  if (!all) all = await loadJSON('recordings', {});
  return all;
}

export async function getRecording(storyId, page) {
  return (await load())[`${storyId}:${page}`] || null;
}

export async function listRecordings(storyId, pageCount) {
  const r = await load();
  const out = [];
  for (let i = 0; i < pageCount; i++) if (r[`${storyId}:${i}`]) out.push({ page: i, ...r[`${storyId}:${i}`] });
  return out;
}

export async function saveRecording(storyId, page, tempUri, seconds) {
  const r = await load();
  const key = `${storyId}:${page}`;
  const uri = await keepFile(tempUri, 'recordings', `${storyId}-p${page + 1}-${Date.now()}.m4a`);
  if (r[key] && r[key].uri !== uri) deleteFile(r[key].uri);
  r[key] = { uri, seconds };
  await saveJSON('recordings', r);
}

export async function removeRecording(storyId, page) {
  const r = await load();
  const key = `${storyId}:${page}`;
  if (r[key]) deleteFile(r[key].uri);
  delete r[key];
  await saveJSON('recordings', r);
}
