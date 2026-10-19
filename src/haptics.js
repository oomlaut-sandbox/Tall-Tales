// Haptic feedback: small clicks you feel under the finger on the dials, knobs, sliders and buttons.
// On by default; Settings → Haptic feedback turns it off (for the whole phone, every profile).
import * as Haptics from 'expo-haptics';
import { loadJSON, saveJSON } from './storage';


let on = true;
const listeners = new Set();
loadJSON('haptics', true).then((v) => { on = v !== false; listeners.forEach((fn) => fn(on)); }).catch(() => {});
export const hapticsOn = () => on;
export function setHapticsOn(v) { on = !!v; saveJSON('haptics', on).catch(() => {}); listeners.forEach((fn) => fn(on)); if (on) tap(); }
export function onHaptics(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const safe = (f) => { if (!on) return; try { const p = f(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
// a dial or slider moves one notch
export const tick = () => safe(() => Haptics.selectionAsync());
// a button is pressed
export const tap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
// something bigger: a dial reaching a full hour, a knob clicking to the next choice, recording starting
export const withTap = (fn, kind = tap) => (...a) => { kind(); return fn ? fn(...a) : undefined; };
export const thunk = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
