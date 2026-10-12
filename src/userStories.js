// Stories made with "Create a story", saved on the phone.
// Saves are queued so quick autosaves never overwrite each other.
import { deleteFile, keepFile, loadJSON, saveJSON } from './storage';
import { pruneRecordings } from './recordings';

let queue = Promise.resolve();
const serial = (fn) => (queue = queue.then(fn, fn));

export const newPageId = () => `pg${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function loadUserStories() {
  const list = await loadJSON('stories', []);
  return list.map(fromSaved);
}

function fromSaved(s) {
  return {
    id: s.id,
    title: s.title,
    mine: true,
    pages: s.pages.map((p, i) => ({ pid: p.pid || `i${i}`, text: p.text || '', image: p.uri ? { uri: p.uri } : null, w: p.w || 1, h: p.h || 1 })),
  };
}

const hasContent = (p) => (p.text && p.text.trim()) || p.uri;

// Copy a just-picked photo into the story's own folder so it survives.
export async function keepPicture(storyId, uri) {
  return keepFile(uri, `stories/${storyId}`, `img-${Date.now()}.jpg`);
}
export function dropPicture(uri) {
  deleteFile(uri);
}

// draft: { id, title, pages: [{ pid, text, uri, w, h }] }. Empty pages are left out.
export function saveUserStory(draft) {
  return serial(async () => {
    const pages = draft.pages.filter(hasContent).map((p) => ({ pid: p.pid, text: p.text.trim(), uri: p.uri || null, w: p.w, h: p.h }));
    const list = await loadJSON('stories', []);
    const i = list.findIndex((s) => s.id === draft.id);
    if (!pages.length) {
      if (i >= 0) list.splice(i, 1);
    } else {
      const saved = { id: draft.id, title: draft.title.trim() || 'Untitled story', pages };
      if (i >= 0) list[i] = saved; else list.push(saved);
    }
    await saveJSON('stories', list);
    await pruneRecordings(draft.id, pages.map((p) => p.pid));
    return list.map(fromSaved);
  });
}

export function deleteUserStory(id) {
  return serial(async () => {
    const list = await loadJSON('stories', []);
    const s = list.find((x) => x.id === id);
    if (s) s.pages.forEach((p) => p.uri && deleteFile(p.uri));
    const next = list.filter((x) => x.id !== id);
    await saveJSON('stories', next);
    await pruneRecordings(id, []);
    return next.map(fromSaved);
  });
}
