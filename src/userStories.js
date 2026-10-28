// Stories made with "Make a book", saved on the phone.
// Saves are queued so quick autosaves never overwrite each other.
import { deleteFile, keepFile, liveUri, loadJSON, saveJSON } from './storage';
import { pruneRecordings } from './recordings';
import { markFirst } from './badges';

let queue = Promise.resolve();
const serial = (fn) => (queue = queue.then(fn, fn));

export const newPageId = () => `pg${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function loadUserStories() {
  const list = await loadJSON('stories', []);
  return list.map(fromSaved);
}

// The credits line for a title page: 'Written by A.' / 'Illustrated by B.' / 'Written by A and illustrated by B.'
// (or 'Written and illustrated by A.' when it's the same person). Empty if neither was given.
export function creditsLine(writer, artist) {
  const w = (writer || '').trim(), a = (artist || '').trim();
  if (w && a) return w.toLowerCase() === a.toLowerCase() ? `Written and illustrated by ${w}.` : `Written by ${w} and illustrated by ${a}.`;
  if (w) return `Written by ${w}.`;
  if (a) return `Illustrated by ${a}.`;
  return '';
}

// The phone's app folder gets a new address after every update, so saved pictures are found again by their place
// inside it (liveUri), never by the old full address (Jörg's pictures vanished after an update, 27 Oct 2026).
const liveCover = (c) => (c && c.uri ? { ...c, uri: liveUri(c.uri), ...(c.src ? { src: liveUri(c.src) } : null) } : c);
function liveStory(s) {
  return { ...s, cover: liveCover(s.cover), pages: (s.pages || []).map((p) => ({ ...p, uri: liveUri(p.uri), uri2: liveUri(p.uri2), src: liveUri(p.src), src2: liveUri(p.src2) })) };
}
function fromSaved(s0) {
  const s = liveStory(s0);
  const bodyPages = s.pages.map((p, i) => ({ src: p.src || null, edit: p.edit || null, src2: p.src2 || null, edit2: p.edit2 || null, pid: p.pid || `i${i}`, text: p.text || '', image: p.uri ? { uri: p.uri } : null, w: p.w || 1, h: p.h || 1, image2: p.uri2 && !(p.text || '').trim() ? { uri: p.uri2 } : null, w2: p.w2 || 1, h2: p.h2 || 1, src: p.src || null, edit: p.edit || null, src2: (!p.text.trim() && p.src2) || null, edit2: p.edit2 || null }));
  const credits = creditsLine(s.writer, s.artist);
  const coverImg = s.cover && s.cover.uri ? { uri: s.cover.uri } : (bodyPages[0] && bodyPages[0].image) || null;
  // Every book opens like 'Different': the cover, a blank back of the cover, and a title page with the credits.
  const titlePage = { pid: `title-${s.id}`, titlePage: true, text: `${(s.title || 'Untitled story').replace(/\.+$/, '')}.${credits ? ` ${credits}` : ''}`, image: coverImg, w: 1600, h: 1600 };
  return {
    id: s.id,
    title: s.title,
    writer: s.writer || '',
    artist: s.artist || '',
    author: [s.writer, s.artist].filter((x) => x && x.trim()).filter((x, i, a) => a.indexOf(x) === i).join(' and ') || undefined,
    mine: true,
    published: !!s.published, // finished with 'Finish and publish to library': in My Book Collection; until then in Work in Progress (Jörg, 28 Oct 2026)
    cover: s.cover && s.cover.uri ? s.cover : null, // made in the Cover Editor (picture and, if wanted, the title)
    pages: [titlePage, ...bodyPages],
  };
}

const hasContent = (p) => (p.text && p.text.trim()) || p.uri || p.uri2;

// Copy a just-picked photo into the story's own folder so it survives.
export async function keepPicture(storyId, uri) {
  return keepFile(uri, `stories/${storyId}`, `img-${Date.now()}.jpg`);
}
export function dropPicture(uri) {
  deleteFile(liveUri(uri));
}

// draft: { id, title, pages: [{ pid, text, uri, w, h }] }. Empty pages are left out.
// publish: the book is finished and goes into My Book Collection. Saves after that keep it there (editing a
// published book never takes it back to Work in Progress); books made before 28 Oct 2026 start in Work in Progress.
export function saveUserStory(draft, { publish = false } = {}) {
  return serial(async () => {
    // (the photo editor's originals and settings are kept too, so a photo can be edited again after the book is reopened)
    const pages = draft.pages.filter(hasContent).map((p) => ({ pid: p.pid, text: p.text.trim(), uri: p.uri || null, w: p.w, h: p.h, uri2: (!p.text.trim() && p.uri2) || null, w2: p.w2 || 1, h2: p.h2 || 1,
      ...(p.src ? { src: p.src } : null), ...(p.edit ? { edit: p.edit } : null), ...(p.src2 && !p.text.trim() ? { src2: p.src2 } : null), ...(p.edit2 ? { edit2: p.edit2 } : null) }));
    // a book is kept as soon as there's anything made in it: a page or a cover (nothing lost: Jörg, 28 Oct 2026).
    // (a title alone isn't enough: 'What's your book about?' names every new book, even one that's left at once)
    const started = pages.length || (draft.cover && draft.cover.uri);
    const list = await loadJSON('stories', []);
    const i = list.findIndex((s) => s.id === draft.id);
    if (!started) {
      if (i >= 0) list.splice(i, 1);
    } else {
      const saved = { id: draft.id, title: draft.title.trim() || 'Untitled story', writer: (draft.writer || '').trim(), artist: (draft.artist || '').trim(), pages, cover: draft.cover && draft.cover.uri ? draft.cover : null, published: !!(publish || (i >= 0 && list[i].published)) };
      if (i >= 0) list[i] = saved; else list.push(saved);
    }
    await saveJSON('stories', list);
    await pruneRecordings(draft.id, pages.map((p) => p.pid));
    if (pages.length) markFirst('firstBook'); // a badge in My Notebook
    return list.map(fromSaved);
  });
}

export function deleteUserStory(id) {
  return serial(async () => {
    const list = await loadJSON('stories', []);
    const s = list.find((x) => x.id === id);
    if (s) { s.pages.forEach((p) => [p.uri, p.uri2, p.src, p.src2].forEach((x) => x && deleteFile(liveUri(x)))); if (s.cover) [s.cover.uri, s.cover.src].forEach((x) => x && deleteFile(liveUri(x))); }
    const next = list.filter((x) => x.id !== id);
    await saveJSON('stories', next);
    await pruneRecordings(id, []);
    return next.map(fromSaved);
  });
}
