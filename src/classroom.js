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

// { title, note, pages, cls } (cls: the class folder it's for)
export function addPrompt(p) {
  prompts = [{ id: `pr${Date.now().toString(36)}`, title: (p.title || '').trim(), note: (p.note || '').trim(), pages: p.pages || 4, cls: p.cls || null, at: Date.now() }, ...prompts];
  save();
}
export function removePrompt(id) { prompts = prompts.filter((p) => p.id !== id); save(); }

// the prompts waiting for this student: their class's, not yet started by them
export const promptsFor = (profile, stories) => (!profile || !profile.cls ? [] : prompts.filter((p) => p.cls === profile.cls && !stories.some((s) => s.promptId === p.id && s.owner === profile.id)));

// The classroom lock: the Book Store and sharing switched off (and back on), through the parental controls.
// Controls are kept per profile (scope.js), so the lock is written to every student in the class, and to whoever
// is using the iPad now (the teacher). Its state is kept for the class ('classLocks', shared by everyone).
export const isLocked = (c) => !!c && c.store === false && c.sharing === false;
export const locked = (c, on) => ({ ...c, store: !on, sharing: !on });
export async function classLocked(cls) { const m = await loadJSON('classLocks', {}); return !!(m && m[cls]); }
export async function setClassLock(cls, on, studentIds, controls, setControls) {
  for (const id of studentIds) {
    const c = await loadJSONFor(id, 'controls', null);
    await saveJSONFor(id, 'controls', locked({ ...DEFAULT_CONTROLS, ...(c || {}) }, on));
  }
  setControls(locked(controls, on));
  const m = await loadJSON('classLocks', {});
  await saveJSON('classLocks', { ...(m || {}), [cls]: !!on });
}
