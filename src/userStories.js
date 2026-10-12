// Stories made with "Create a story", saved on the phone.
import { deleteFile, keepFile, loadJSON, saveJSON } from './storage';

export async function loadUserStories() {
  const list = await loadJSON('stories', []);
  return list.map(fromSaved);
}

function fromSaved(s) {
  return {
    id: s.id,
    title: s.title,
    mine: true,
    pages: s.pages.map((p) => ({ text: p.text || '', image: p.uri ? { uri: p.uri } : null, w: p.w || 1, h: p.h || 1 })),
  };
}

// draft: { id, title, pages: [{ text, uri, w, h }] } where uri may still be a temporary picker file
export async function saveUserStory(draft, existing) {
  const pages = [];
  for (let i = 0; i < draft.pages.length; i++) {
    const p = draft.pages[i];
    if (!p.text.trim() && !p.uri) continue;
    let uri = p.uri;
    if (uri && !p.kept) uri = await keepFile(uri, `stories/${draft.id}`, `page-${i + 1}-${Date.now()}.jpg`);
    pages.push({ text: p.text.trim(), uri, w: p.w, h: p.h });
  }
  const saved = { id: draft.id, title: draft.title.trim() || 'Untitled story', pages };
  const list = await loadJSON('stories', []);
  const i = list.findIndex((s) => s.id === saved.id);
  if (i >= 0) list[i] = saved; else list.push(saved);
  await saveJSON('stories', list);
  return list.map(fromSaved);
}

export async function deleteUserStory(id) {
  const list = await loadJSON('stories', []);
  const s = list.find((x) => x.id === id);
  if (s) s.pages.forEach((p) => p.uri && deleteFile(p.uri));
  const next = list.filter((x) => x.id !== id);
  await saveJSON('stories', next);
  return next.map(fromSaved);
}
