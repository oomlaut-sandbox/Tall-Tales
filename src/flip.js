// The notebook cover turning over its spine, as a flat (2D) flip: it folds by shrinking towards the spine
// and comes out the other side mirrored, swelling a little across the middle so it still feels like it's
// lifting towards you. A real 3D turn (perspective + rotate) strobes and flickers on iPhone (its shadow, its
// rounded corners and the spine shadows are redrawn in 3D every frame); this is a plain scale, which the
// phone draws smoothly on the native driver.
// p: an Animated value from 0 (shut, lying on its page) to 1 (fully turned over).
const N = 24;
const pts = [];
for (let i = 0; i <= N; i++) pts.push(i / N);
// never exactly 0 (a zero scale can't be undone, which upsets touches)
const nz = (v) => (Math.abs(v) < 0.002 ? (v < 0 ? -0.002 : 0.002) : v);
const fold = pts.map((t) => nz(Math.cos(Math.PI * t)));
fold[N / 2] = 0.002; // still the front at the very middle; the back takes over just after
const swell = pts.map((t) => 1 + 0.07 * Math.sin(Math.PI * t));

export function makeFlip(p) {
  return {
    fold: p.interpolate({ inputRange: pts, outputRange: fold, extrapolate: 'clamp' }),
    swell: p.interpolate({ inputRange: pts, outputRange: swell, extrapolate: 'clamp' }),
  };
}

// the style for the turning cover. wide: the spine is on the left (sideways), otherwise along the top
export const flipStyle = (F, wide) => (wide
  ? { transformOrigin: 'left', transform: [{ scaleX: F.fold }, { scaleY: F.swell }] }
  : { transformOrigin: 'top', transform: [{ scaleY: F.fold }, { scaleX: F.swell }] });
