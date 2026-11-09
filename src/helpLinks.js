// Help's links into the app: what the next screen should open when it appears (Things to share, a Garden game).
// The screen takes it once, on opening (Jörg, 9 Nov 2026).
let pending = null;
export function openNext(what) { pending = what; }
export function takeOpen(kind) {
  if (!pending || pending[kind] == null) return null;
  const v = pending[kind]; pending = null; return v;
}
