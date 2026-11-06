// Classroom tools (Jörg, 30 Oct 2026): everything stays on this one iPad, no accounts, no server.
//   Book prompts: a teacher writes a prompt ("My weekend, in 4 pages"); each student in that class finds it in
//     My Workspace as a ready-started book (its title, the teacher's instructions, the pages waiting).
//   Hand in: a student's book from a prompt is handed in; the teacher reads it on
//     the Teacher's Desk, leaves a note, and sends it back or approves it. Approved books go into the Class Library
//     (My Book Collection), which can be printed or shared as one class anthology.
//   Classroom lock: no Book Store and no sharing outside the class, for everyone on this iPad.
// A book's class details live with the book (userStories.js): cls, owner (the student's profile), promptId,
// handIn ('in' handed in | 'back' sent back | 'ok' approved) and note (the teacher's note).
import { loadJSON, loadJSONFor, saveJSON, saveJSONFor } from './storage';
import { DEFAULT_CONTROLS } from './controls';
import { currentProfile } from './scope';

let prompts = [];
let loaded = false;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(prompts); } catch (e) {} });

export async function loadPrompts() {
  if (!loaded) { prompts = await loadJSON('classPrompts', []); loaded = true; emit(); }
  return prompts;
}
export const getPrompts = () => prompts;
export function onPrompts(fn) { listeners.add(fn); loadPrompts().catch(() => {}); return () => listeners.delete(fn); }
const save = () => { saveJSON('classPrompts', prompts); emit(); };

// { title, note, pages, cls } (cls: the class folder it's for), and (6 Nov 2026):
//   together: one page each, bound into one class book on the Teacher's Desk
//   hints: a few words for each page, shown where the student writes (from a starter like All About Me)
//   starter: the pages of one of the teacher's books, pictures and words, that every student starts from
//     (its pictures are kept once, in prompts/<id>/, and never deleted with a student's page: see userStories.js)
//   words: a word bank, tapped to add a word while writing
//   record: the teacher asks for the book to be read aloud before it's handed in
export const newPromptId = () => `pr${Date.now().toString(36)}`;
export function addPrompt(p) {
  const clean = (a) => (Array.isArray(a) ? a.map((w) => String(w || '').trim()).filter(Boolean) : []);
  prompts = [{ id: p.id || newPromptId(), title: (p.title || '').trim(), note: (p.note || '').trim(), pages: p.together ? 1 : (p.starter && p.starter.length) || p.pages || 4, cls: p.cls || null, at: Date.now(),
    ...(p.together ? { together: true } : null), ...(clean(p.hints).length ? { hints: (p.hints || []).map((h) => String(h || '').trim()) } : null),
    ...(p.starter && p.starter.length ? { starter: p.starter } : null), ...(clean(p.words).length ? { words: clean(p.words).slice(0, 24) } : null), ...(p.record ? { record: true } : null) }, ...prompts];
  save();
}
export const promptOf = (id) => (id ? prompts.find((p) => p.id === id) || null : null);

// Ready-made starters for a prompt: a title, instructions and a few words on each page (Jörg, 6 Nov 2026)
export const STARTERS = [
  { k: 'me', title: 'All About Me', note: 'A picture and a sentence on each page.', hints: ['This is me.', 'My family.', 'What I love to do.', 'When I grow up…'] },
  { k: 'weekend', title: 'My Weekend', note: 'A picture and a sentence on each page.', hints: ['On Saturday…', 'On Sunday…', 'The best part was…', 'Next weekend I want to…'] },
  { k: 'trip', title: 'Our Field Trip', note: 'Draw or take a picture of each part of the trip.', hints: ['Where we went.', 'What we saw.', 'What I learned.', 'My favourite part.'] },
  { k: 'science', title: 'What I Saw', note: 'Watch something change, and draw what you see.', hints: ['What I am watching.', 'What it looks like on day 1.', 'What changed.', 'What I think will happen next.'] },
];

// How each student is doing with a prompt: 'none' (not started) | 'working' | 'in' | 'back' | 'ok'
export const statusOf = (prompt, studentId, stories) => {
  const s = stories.find((x) => x.promptId === prompt.id && x.owner === studentId);
  return !s ? 'none' : s.handIn || (s.published ? 'ok' : 'working');
};
export function removePrompt(id) { prompts = prompts.filter((p) => p.id !== id); save(); }

// the prompts waiting for this student: their class's, not yet started by them
export const promptsFor = (profile, stories) => (!profile || !profile.cls ? [] : prompts.filter((p) => p.cls === profile.cls && !stories.some((s) => s.promptId === p.id && s.owner === profile.id)));

// The classroom lock: the Book Store and sharing switched off (and back on), through the parental controls.
// Controls are kept per profile (scope.js), so the lock is written to every student in the class, and to whoever
// is using the iPad now (the teacher). Its state is kept for the class ('classLocks', shared by everyone).
export const isLocked = (c) => !!c && c.store === false && c.sharing === false;
// locking keeps each child's own choices, and unlocking gives them back (not simply everything on: 31 Oct 2026)
export const locked = (c, on) => {
  if (on) return c.beforeLock ? { ...c, store: false, sharing: false } : { ...c, store: false, sharing: false, beforeLock: { store: c.store !== false, sharing: c.sharing !== false } };
  const { beforeLock, ...rest } = c;
  return { ...rest, store: beforeLock ? beforeLock.store : true, sharing: beforeLock ? beforeLock.sharing : true };
};
// on by default (Jörg, 6 Nov 2026): a class is locked until the teacher turns the lock off
export async function classLocked(cls) { const m = await loadJSON('classLocks', {}); return !(m && m[cls] === false); }
export async function lockSet(cls) { const m = await loadJSON('classLocks', {}); return !!(m && cls in m); }
export async function setClassLock(cls, on, studentIds, controls, setControls) {
  for (const id of studentIds) {
    const c = await loadJSONFor(id, 'controls', null);
    await saveJSONFor(id, 'controls', locked({ ...DEFAULT_CONTROLS, ...(c || {}) }, on));
  }
  // (only when the one reading now is in the class: the lock used to land on whoever was reading, a family
  // profile too, and stayed after classroom mode ended: Jörg, 6 Nov 2026)
  if (studentIds.includes(currentProfile())) setControls(locked(controls, on));
  const m = await loadJSON('classLocks', {});
  await saveJSON('classLocks', { ...(m || {}), [cls]: !!on });
}

// classroom mode ends: the family's own profiles (not in a class) lose any classroom lock that reached them, so
// the Book Store, sharing and the whole menu are back. The students keep theirs, hidden until classroom mode is on
// again (6 Nov 2026)
export async function unlockFamily(list, controls, setControls) {
  for (const p of list.filter((x) => !x.cls)) {
    const c = await loadJSONFor(p.id, 'controls', null);
    if (c && c.beforeLock) await saveJSONFor(p.id, 'controls', locked(c, false));
  }
  const me = list.find((x) => x.id === currentProfile());
  if (me && !me.cls && controls && controls.beforeLock) setControls(locked(controls, false));
}
