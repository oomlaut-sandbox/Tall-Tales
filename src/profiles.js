// Profiles: one for each child (Start page → Profiles). Kept on the phone for the whole family:
// { list: [{ id, name, color }], active: '<id>' }. Each child's own things are kept under their id (scope.js).
// The first profile made is 'main': it keeps everything the app had before (the notebook, badges, settings).
// A child's age lives in their own parental controls (controls.childAge), so Settings and Profiles agree.
import { loadJSON, saveJSON, saveJSONFor } from './storage';
import { currentProfile, setScope } from './scope';
import { DEFAULT_CONTROLS } from './controls';

export const MAX_PROFILES = 6;
export const PROFILE_COLORS = [
  ['red', require('../assets/profile-red.png')],
  ['blue', require('../assets/profile-blue.png')],
  ['green', require('../assets/profile-green.png')],
  ['orange', require('../assets/profile-orange.png')],
  ['pink', require('../assets/profile-pink.png')],
];
export const feltFor = (color) => (PROFILE_COLORS.find(([c]) => c === color) || PROFILE_COLORS[0])[1];

let state = { list: [], active: 'main' };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(state); } catch (e) {} });
const save = () => saveJSON('profiles', state);
export const getProfiles = () => state;
export function onProfiles(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const activeProfile = () => state.list.find((p) => p.id === state.active) || null;

// at launch, before anything else is read: the child whose things the app shows
export async function loadProfiles() {
  const s = await loadJSON('profiles', null);
  if (s && Array.isArray(s.list)) state = { list: s.list, active: s.list.some((p) => p.id === s.active) ? s.active : (s.list[0] ? s.list[0].id : 'main') };
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
export async function addProfile({ name, color, age }) {
  if (state.list.length >= MAX_PROFILES) return null;
  const id = state.list.length === 0 ? 'main' : `k${Date.now().toString(36)}`;
  const p = { id, name: (name || '').trim() || 'Reader', color: color || PROFILE_COLORS[state.list.length % PROFILE_COLORS.length][0] };
  if (id !== 'main') await saveJSONFor(id, 'controls', { ...DEFAULT_CONTROLS, childAge: age ?? null });
  state = { list: [...state.list, p], active: state.list.length === 0 ? id : state.active };
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
  state = { list, active };
  setScope(active);
  save(); emit();
}

export const profileIsActive = (id) => currentProfile() === id;
