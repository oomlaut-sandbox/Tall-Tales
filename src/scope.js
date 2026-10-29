// Profiles: each child has their own copy of some things on the phone. Their files are kept under the
// child's name (p.<profile id>.<name>); the first child keeps the files the app had before profiles existed
// (profile id 'main'), so nothing is lost when profiles are first set up.
// Each child's own:  My Notes, badges and reading days, playlists, playback choices, parental controls,
// Things to share (the sheets they were sent) and the corkboard.
// Shared by the family: the books (bought, made and the membership), parents' recordings, the language,
// music and sounds.
export const PER_CHILD = new Set(['notebook', 'readingLog', 'playlists', 'prefs', 'controls', 'folder', 'corkboard']);

let current = 'main';
const listeners = new Set();
export const currentProfile = () => current;
export const keyFor = (id, name) => (PER_CHILD.has(name) && id && id !== 'main' ? `p.${id}.${name}` : name);
export const scopedKey = (name) => keyFor(current, name);
export function setScope(id) {
  current = id || 'main';
  listeners.forEach((fn) => { try { fn(current); } catch (e) {} });
}
export function onScopeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
