// Accessibility settings from the phone (Jörg, 27 Oct 2026): Reduce Motion and VoiceOver.
// useReduceMotion(): true when the phone asks for less movement (Settings → Accessibility → Motion → Reduce Motion).
// Then the app swaps slides, springs and pop-ups for gentle fades, and skips films that play by themselves.
// (Page turns and the notebook cover opening are left as they are.)
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let reduce = false, reader = false;
const subs = new Set();
const tell = () => subs.forEach((f) => { try { f(); } catch (e) {} });
try {
  AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduce = !!v; tell(); }).catch(() => {});
  AccessibilityInfo.isScreenReaderEnabled().then((v) => { reader = !!v; tell(); }).catch(() => {});
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduce = !!v; tell(); });
  AccessibilityInfo.addEventListener('screenReaderChanged', (v) => { reader = !!v; tell(); });
} catch (e) {}

export const reduceMotion = () => reduce;
export const screenReader = () => reader;
function useFlag(get) {
  const [v, setV] = useState(get());
  useEffect(() => { const f = () => setV(get()); subs.add(f); f(); return () => { subs.delete(f); }; }, []);
  return v;
}
export const useReduceMotion = () => useFlag(reduceMotion);
export const useScreenReader = () => useFlag(screenReader);
// say something out loud with VoiceOver (e.g. the words on a page that just turned)
export function announce(text) {
  if (!reader || !text) return;
  try { AccessibilityInfo.announceForAccessibility(String(text)); } catch (e) {}
}
