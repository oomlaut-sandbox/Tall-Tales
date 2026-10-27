// The back button (Jörg, 27 Oct 2026): back to exactly what was on screen before. The app keeps a list of the
// screens you've been on; each remembers how far down it was scrolled, which page of a book was open, and which
// page of the book maker. Going back puts all of that back as it was.
import { useEffect, useRef } from 'react';

const scrollY = {}; // how far down each screen was scrolled (kept all the time)
const restore = {}; // screens being returned to by the back button: scroll them back to where they were
const pageOf = {}; // 'reader:<book id>' / 'maker:<book id>' -> the page that was open

export function markBack(screen) { restore[screen] = true; }
export function rememberPage(kind, id, i) { if (id != null) pageOf[kind + ':' + id] = i; }
// the page to open on: the remembered one only when the back button brought us here
let backInto = null;
export function markBackInto(kind, id) { backInto = kind + ':' + id; }
export function startPage(kind, id) {
  const k = kind + ':' + id;
  if (backInto !== k) return 0;
  backInto = null;
  return pageOf[k] || 0;
}

// the props for a screen's main ScrollView: it remembers its place, and is put back there after Back
export function useScrollMemory(key) {
  const ref = useRef(null);
  const done = useRef(false);
  return {
    ref,
    scrollEventThrottle: 32,
    onScroll: (e) => { scrollY[key] = e.nativeEvent.contentOffset.y; },
    onContentSizeChange: (w, h) => {
      if (done.current || !restore[key]) return;
      const y = scrollY[key] || 0;
      if (h < y) return; // not all there yet
      done.current = true; restore[key] = false;
      if (ref.current) ref.current.scrollTo({ y, animated: false });
    },
  };
}
// an ordinary move (not Back): nothing is waiting to be put back
export function clearBack() { Object.keys(restore).forEach((k) => { restore[k] = false; }); backInto = null; }

// Steps inside a screen (Jörg, 27 Oct 2026: Back always goes back to the last step): the book maker's
// 'What's your book about?' -> cover -> page 1 -> page 2, a pop-up or panel that's open, the menu... Each one,
// while it's showing, offers a way back; the most recent one is taken first, then the screen before.
const steps = [];
let seq = 0;
const stepWatchers = new Set();
const told = () => stepWatchers.forEach((f) => { try { f(); } catch (e) {} });
export function onStepsChange(f) { stepWatchers.add(f); return () => stepWatchers.delete(f); }
export function hasStep() { return steps.length > 0; }
export function useBackStep(active, fn) {
  const r = useRef(fn);
  r.current = fn;
  useEffect(() => {
    if (!active) return undefined;
    const s = { t: ++seq, run: () => r.current() };
    steps.push(s); told();
    return () => { const k = steps.indexOf(s); if (k >= 0) steps.splice(k, 1); told(); };
  }, [!!active]);
}
// Back: the last step, if there is one (true), otherwise false (the screen before)
export function takeStep() {
  if (!steps.length) return false;
  const s = steps.reduce((a, b) => (b.t > a.t ? b : a));
  s.run();
  return true;
}

// screens where the back button stays away (the drawing editor: Jörg, 27 Oct 2026)
let hidden = 0;
export function backHidden() { return hidden > 0; }
export function useHideBack() {
  useEffect(() => { hidden += 1; told(); return () => { hidden -= 1; told(); }; }, []);
}
