// Stamps for drawings: Coro in different poses, and the friends (felt cutouts, kept small). A stamp is kept like a
// stroke, in the same list (so Undo, the eraser and the layers treat it the same):
//   { stp: 'wave', p: [x, y] (its middle, in widths of the drawing), w: its width (in widths), fx: flipped }
export const STAMPS = [
  ['wave', require('../assets/stamps/wave.png'), 404 / 420, 'Coro waving'],
  ['reading', require('../assets/stamps/reading.png'), 420 / 323, 'Coro reading'],
  ['jump', require('../assets/stamps/jump.png'), 420 / 402, 'Coro jumping'],
  ['skip', require('../assets/stamps/skip.png'), 420 / 416, 'Coro skipping'],
  ['thinking', require('../assets/stamps/thinking.png'), 420 / 312, 'Coro thinking'],
  ['peek', require('../assets/stamps/peek.png'), 255 / 420, 'Coro peeking'],
  ['sleeping', require('../assets/stamps/sleeping.png'), 271 / 420, 'Coro sleeping'],
  ['headphones', require('../assets/stamps/headphones.png'), 420 / 318, 'Coro listening'],
  ['shades', require('../assets/stamps/shades.png'), 418 / 420, 'Coro in sunglasses'],
  ['blue', require('../assets/stamps/blue.png'), 420 / 330, 'Blue friend'],
  ['green', require('../assets/stamps/green.png'), 420 / 347, 'Green friend'],
  ['orange', require('../assets/stamps/orange.png'), 420 / 411, 'Orange friend'],
  ['red', require('../assets/stamps/red.png'), 420 / 314, 'Red friend'],
];
export const STAMP = Object.fromEntries(STAMPS.map(([k, src, aspect, name]) => [k, { src, aspect, name }]));
// the stamp's box in pixels on a drawing `w` wide
export function stampBox(st, w) {
  const S = STAMP[st.stp] || STAMPS[0];
  const bw = (st.w || 0.26) * w, bh = bw * (S.aspect || 1);
  return { x: st.p[0] * w - bw / 2, y: st.p[1] * w - bh / 2, w: bw, h: bh };
}
// the stamp sizes, from the pen sizes (small, medium, large)
export const stampWidth = (size) => (size <= 0.008 ? 0.16 : size <= 0.016 ? 0.26 : 0.42);
