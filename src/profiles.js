// Profiles: one for each child (Start page → Profiles). Kept on the phone for the whole family:
// { list: [{ id, name, color }], active: '<id>' }. Each child's own things are kept under their id (scope.js).
// The first profile made is 'main': it keeps everything the app had before (the notebook, badges, settings).
// A child's age lives in their own parental controls (controls.childAge), so Settings and Profiles agree.
import { loadJSON, saveJSON, saveJSONFor } from './storage';
import { currentProfile, setScope } from './scope';
import { DEFAULT_CONTROLS } from './controls';

export const MAX_PROFILES = 6;
// Teachers and Educators (Jörg, 26 Oct 2026): a classroom folder holds up to 30 students' profiles. Books are shared
// by the whole class (to make books together); each student's notebook, badges and settings stay their own.
export const MAX_CLASS = 30;
// (Jörg, 26 Oct 2026: a teacher can have several class folders, each with up to 30 students. A profile in a class
// carries the class's id as 'cls'.)
export const inClass = (cls) => state.list.filter((p) => p.cls === cls);
export const canAdd = (cls) => (state.classroom ? inClass(cls).length < MAX_CLASS : state.list.length < MAX_PROFILES);
export const maxProfiles = () => (state.classroom ? MAX_CLASS : MAX_PROFILES);
// each child picks one of the felt Coros (kept under the colour names saved before: 'blue' is now the brown
// Coro, 'orange' the yellow one, 'grey' the teal one, so children who already chose keep their place)
// (the brown Coro is the mascot's own, so it isn't offered (Jörg, 26 Oct 2026); 'photo': the profile's own picture,
// shown in a circle)
// (Jörg, 26 Oct 2026: the avatars are his photos of the felt Coros, shown whole inside a white-edged circle, not cut
// out. The keys stay the old colour names, so children who already chose keep their place: red is the rust Coro,
// green the olive one, orange the mustard one, grey the blue one.)
export const PROFILE_COLORS = [ // in this order on the screen: rust, olive, mustard, blue, then the photo circle
  ['red', require('../assets/avatar-rust.jpg')],
  ['green', require('../assets/avatar-olive.jpg')],
  ['orange', require('../assets/avatar-mustard.jpg')],
  ['grey', require('../assets/avatar-blue.jpg')],
];
// more avatars, in the Explore more avatars box (Jörg, 26 Oct 2026; more on the way)
export const MORE_AVATARS = [
  ['unicorn', require('../assets/avatar-unicorn.jpg')],
  ['elephant', require('../assets/avatar-elephant.jpg')],
  ['cat', require('../assets/avatar-cat.jpg')],
];
export const feltFor = (color) => ([...PROFILE_COLORS, ...MORE_AVATARS].find(([c]) => c === (color === 'pink' ? 'grey' : color)) || PROFILE_COLORS[0])[1]; // (red if unknown or brown, as before)

let state = { list: [], active: 'main' };
let seq = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(state); } catch (e) {} });
const save = () => saveJSON('profiles', state);
export const getProfiles = () => state;
export function onProfiles(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const activeProfile = () => state.list.find((p) => p.id === state.active) || null;

// at launch, before anything else is read: the child whose things the app shows
export async function loadProfiles() {
  const s = await loadJSON('profiles', null);
  if (s && Array.isArray(s.list)) state = { classroom: s.classroom || null, classes: s.classes || [], list: s.list, active: s.list.some((p) => p.id === s.active) ? s.active : (s.list[0] ? s.list[0].id : 'main') };
  // two profiles that got the same id (a class list added before ids had a running count): each gets its own
  { const seen = new Set(); let fixed = false;
    const list = state.list.map((p, k) => { if (!seen.has(p.id)) { seen.add(p.id); return p; } fixed = true; const id = `k${Date.now().toString(36)}d${k}`; seen.add(id); return { ...p, id }; });
    if (fixed) { state = { ...state, list }; save(); } }
  // a classroom from before class folders: it becomes the first folder, with everyone in it
  if (state.classroom && !state.classes.length) state = { ...state, classes: [{ id: 'c1', name: state.classroom.name || '' }], list: state.list.map((p) => (p.cls ? p : { ...p, cls: 'c1' })) };
  setScope(state.active);
  return state;
}

export function switchProfile(id) {
  if (id === state.active || !state.list.some((p) => p.id === id)) return;
  state = { ...state, active: id };
  setScope(id);
  save(); emit();
}

// a new child: the first one keeps what's already on the phone; later ones start fresh, with their age set
export async function addProfile({ name, color, age, photo, cls }) {
  if (!canAdd(cls)) return null;
  // (a list of names is added within the same millisecond: a running count and a random part keep every id its own)
  const id = state.list.length === 0 ? 'main' : `k${Date.now().toString(36)}${(seq += 1).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const p = { id, name: (name || '').trim() || 'Reader', color: color || PROFILE_COLORS[state.list.length % PROFILE_COLORS.length][0], ...(photo ? { photo } : {}), ...(cls ? { cls } : {}) };
  if (id !== 'main') await saveJSONFor(id, 'controls', { ...DEFAULT_CONTROLS, childAge: age ?? null });
  state = { ...state, list: [...state.list, p], active: state.list.length === 0 ? id : state.active };
  setScope(state.active);
  save(); emit();
  return p;
}

export function updateProfile(id, patch) {
  state = { ...state, list: state.list.map((p) => (p.id === id ? { ...p, ...patch, name: ((patch.name ?? p.name) || '').trim() || 'Reader' } : p)) };
  save(); emit();
}

// a child's profile goes (their notebook and badges stay on the phone, unused); the last one can go too,
// and then the app is simply the family's again
export function removeProfile(id) {
  const list = state.list.filter((p) => p.id !== id);
  const active = state.active === id ? (list[0] ? list[0].id : 'main') : state.active;
  state = { ...state, list, active };
  setScope(active);
  save(); emit();
}

// several at once (Select on the bar, then the trash can)
export function removeProfiles(ids) {
  const list = state.list.filter((p) => !ids.includes(p.id));
  const active = ids.includes(state.active) ? (list[0] ? list[0].id : 'main') : state.active;
  state = { ...state, list, active };
  setScope(active);
  save(); emit();
}

export const profileIsActive = (id) => currentProfile() === id;

// the classroom folder: set it up with the class's name (or change the name), or end it (the students' profiles
// stay; no new ones past the family's six)
export const classroom = () => state.classroom || null;
export function setClassroom(name) {
  const n = (name || '').trim();
  let classes = state.classes || [];
  let list = state.list;
  // the first class folder: everyone already here goes into it
  if (!classes.length) { classes = [{ id: 'c1', name: n }]; list = list.map((p) => (p.cls ? p : { ...p, cls: 'c1' })); }
  state = { ...state, classroom: { name: n }, classes, list };
  save(); emit();
}
export const getClasses = () => state.classes || [];
export function addClass(name) {
  const id = `c${Date.now().toString(36)}`;
  state = { ...state, classes: [...(state.classes || []), { id, name: (name || '').trim() }] };
  save(); emit();
  return id;
}
export function renameClass(id, name) {
  state = { ...state, classes: (state.classes || []).map((c) => (c.id === id ? { ...c, name: (name || '').trim() } : c)) };
  save(); emit();
}
// several class folders at once, with their students' profiles (Select on the bar, then the trash can)
export function removeClasses(ids) {
  const list = state.list.filter((p) => !ids.includes(p.cls));
  const active = list.some((p) => p.id === state.active) ? state.active : (list[0] ? list[0].id : 'main');
  state = { ...state, classes: (state.classes || []).filter((c) => !ids.includes(c.id)), list, active };
  setScope(active);
  save(); emit();
}
// an empty class folder can go
export function removeClass(id) {
  if (inClass(id).length) return false;
  state = { ...state, classes: (state.classes || []).filter((c) => c.id !== id) };
  save(); emit();
  return true;
}
export function endClassroom() {
  state = { ...state, classroom: null };
  save(); emit();
}
