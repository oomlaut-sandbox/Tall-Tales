// The back button (Jörg, 27 Oct 2026): back to exactly what was on screen before. The app keeps a list of the
// screens you've been on; each remembers how far down it was scrolled, which page of a book was open, and which
// page of the book maker. Going back puts all of that back as it was.
import { useRef } from 'react';

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
