// Finger drawings in My Notebook are kept as strokes, not pictures: each stroke is a colour, a pen size
// and its points. Points are measured in widths of the drawing (x from 0 to 1, y from 0 to the height
// in widths), so a drawing looks the same at any size. { c: '#c0392b', s: 0.02, p: [x1, y1, x2, y2, …] }

// a smooth path through the points (curves through the midpoints), as SVG path data, sized to `w`
export function strokeD(st, w) {
  const p = st.p || [];
  if (p.length < 2) return '';
  const X = (i) => (p[i] * w).toFixed(1), Y = (i) => (p[i + 1] * w).toFixed(1);
  if (p.length < 4) return `M${X(0)} ${Y(0)} L${(p[0] * w + 0.5).toFixed(1)} ${Y(0)}`; // a dot
  let d = `M${X(0)} ${Y(0)}`;
  for (let i = 2; i < p.length - 2; i += 2) {
    const mx = ((p[i] + p[i + 2]) / 2) * w, my = ((p[i + 1] + p[i + 3]) / 2) * w;
    d += ` Q${X(i)} ${Y(i)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const n = p.length - 2;
  d += ` L${X(n)} ${Y(n)}`;
  return d;
}

// the colours: white, greys and black, then an earthy palette (charcoal, cream, deep teal, slate, sage, taupe, sand,
// ochre, rust, umber); two rows of eight
export const PENS = [
  ['#ffffff', 'White'], ['#dcdcdc', 'Pale grey'], ['#b4b4b4', 'Light grey'], ['#7d7d7d', 'Grey'], ['#4a4a4a', 'Dark grey'], ['#111111', 'Black'],
  ['#1e2324', 'Charcoal'], ['#f1e8d8', 'Cream'],
  ['#2f4a4c', 'Deep teal'], ['#5f7672', 'Slate'], ['#93a08f', 'Sage'], ['#8a7660', 'Taupe'],
  ['#d2ab86', 'Sand'], ['#b98a3e', 'Ochre'], ['#9a4f36', 'Rust'], ['#4e3125', 'Umber'],
];
// the bright colours, for children: two rows of eight, the other palette (switch between them under the page)
export const PENS_BRIGHT = [
  ['#ffffff', 'White'], ['#111111', 'Black'], ['#e53935', 'Red'], ['#fb8c00', 'Orange'],
  ['#fdd835', 'Yellow'], ['#9ccc3d', 'Lime'], ['#3a9a4a', 'Green'], ['#00a29a', 'Teal'],
  ['#4fb0f0', 'Sky blue'], ['#1f5fc8', 'Blue'], ['#7e57c2', 'Purple'], ['#ec6fa8', 'Pink'],
  ['#c2185b', 'Raspberry'], ['#ffb38a', 'Peach'], ['#8d5524', 'Brown'], ['#9e9e9e', 'Grey'],
];

// Every colour (the + sheet's rainbow): twelve hues, each from pale to deep, then a row of greys
const hsl = (h, s, l) => { const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join(''); };
export const RAINBOW = [0.86, 0.72, 0.58, 0.45, 0.32, 0.2].map((l) => [0, 20, 35, 50, 75, 110, 150, 180, 205, 230, 265, 310].map((h) => hsl(h, l > 0.8 ? 0.7 : 0.62, l)))
  .concat([[0.97, 0.88, 0.78, 0.66, 0.55, 0.45, 0.36, 0.28, 0.2, 0.13, 0.07, 0].map((l) => hsl(0, 0, l))]);

// Mixing colours like paint (the Mix button): blue and yellow make green, red and yellow orange, white makes it
// paler. Each colour is treated as how much light the paint lets through, and mixing multiplies those (a weighted
// geometric mean in linear light), which is how pigments behave, not how light on a screen adds up.
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const unlin = (v) => Math.round(255 * Math.max(0, Math.min(1, v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)));
const rgbOf = (hex) => { const h = hex.replace('#', ''); const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
export function mixColours(a, b, k = 0.35) {
  const A = rgbOf(a), B = rgbOf(b);
  const out = A.map((va, i) => {
    const x = Math.max(0.012, lin(va)), y = Math.max(0.012, lin(B[i]));
    return unlin(Math.exp((1 - k) * Math.log(x) + k * Math.log(y)));
  });
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Mirror drawing: a stroke kept with m: 1 is drawn twice, once as it was drawn and once flipped left to right.
export function mirrored(st) {
  if (st.f) { const g = st.g || 160, f = st.f.slice(); for (let i = 0; i < f.length; i += 3) { const a = g - f[i + 2], b = g - f[i + 1]; f[i + 1] = a; f[i + 2] = b; } return { ...st, m: 0, f }; }
  const p = (st.p || []).slice(); for (let i = 0; i < p.length; i += 2) p[i] = +(1 - p[i]).toFixed(4);
  return { ...st, m: 0, p };
}
// The smudge: { sm: 1, s, p }: a fingertip rubbed over the drawing, blurring and blending what's under it. Its
// shape (where it rubbed) as SVG path data, and how soft (the blur, in pixels).
// k: the smudge's strength (0.5 gentle, 1 as it was, 1.8 strong)
export const smudgeOf = (st, w) => ({ d: strokeD(st, w), width: Math.max(4, (st.s || 0.03) * w), blur: Math.max(2, (st.s || 0.03) * w * 0.35 * (st.k || 1)) });
// the strokes with every mirrored one doubled (for the paint bucket, which needs all the lines as walls)
export const withMirrors = (list) => (list || []).flatMap((st) => (st.m ? [{ ...st, m: 0 }, mirrored(st)] : [st]));
export const SIZES = [['thin', 0.007], ['medium', 0.015], ['thick', 0.032]]; // a sharp pencil, a crayon, a chunky crayon

// is the point (x, y) close to any point of the stroke? (for the eraser)
export function near(st, x, y, r) {
  if (st.f) return inFill(st, x, y);
  const p = st.p || [];
  const rr = (r + (st.s || 0) / 2) ** 2;
  for (let i = 0; i < p.length; i += 2) if ((p[i] - x) ** 2 + (p[i + 1] - y) ** 2 < rr) return true;
  return false;
}

// ---- The paint bucket ----
// A fill is kept like a stroke, in the same list (so Undo and Clear treat it the same):
// { c: colour, f: [row, x0, x1, row, x0, x1, …], g: cells across } — the filled area as runs of cells on a grid
// laid over the drawing. It's worked out once, when you tap: the lines are drawn onto the grid as walls, and the
// colour spreads from the tapped spot until it meets them (small gaps in a line are closed, so it doesn't leak).
// Fills are drawn under all the lines and stretch a little under them, so the lines stay crisp on top.
const G = 160; // cells across the drawing

export function makeFill(strokes, x, y, aspect, colour) {
  const cols = G, rows = Math.round(G * aspect);
  const wall = new Uint8Array(cols * rows);
  const mark = (cx, cy, r) => {
    const r2 = r * r, x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(cols - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(rows - 1, Math.ceil(cy + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) if ((xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 <= r2) wall[yy * cols + xx] = 1;
  };
  for (const st of strokes) {
    if (st.f) continue; // other fills aren't walls: a new fill simply goes on top
    const p = st.p || [];
    const r = (st.s || 0.01) * G / 2 + 1.1; // the line, plus a little to close small gaps
    for (let i = 0; i < p.length; i += 2) {
      const ax = p[i] * G, ay = p[i + 1] * G;
      const bx = i + 2 < p.length ? p[i + 2] * G : ax, by = i + 2 < p.length ? p[i + 3] * G : ay;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5));
      for (let k = 0; k <= n; k++) mark(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, r);
    }
  }
  const sx = Math.min(cols - 1, Math.max(0, Math.floor(x * G))), sy = Math.min(rows - 1, Math.max(0, Math.floor(y * G)));
  if (wall[sy * cols + sx]) return null; // tapped right on a line
  // spread from the tapped cell
  const fill = new Uint8Array(cols * rows);
  const stack = [sy * cols + sx];
  fill[sy * cols + sx] = 1;
  while (stack.length) {
    const c = stack.pop(), cx = c % cols, cy = (c - cx) / cols;
    const nb = [cx > 0 ? c - 1 : -1, cx < cols - 1 ? c + 1 : -1, cy > 0 ? c - cols : -1, cy < rows - 1 ? c + cols : -1];
    for (const q of nb) if (q >= 0 && !fill[q] && !wall[q]) { fill[q] = 1; stack.push(q); }
  }
  // take in the tiny pockets left where lines meet (little white specks right next to the fill)
  const seen = new Uint8Array(cols * rows);
  for (let c0 = 0; c0 < cols * rows; c0++) {
    if (seen[c0] || fill[c0] || wall[c0]) continue;
    const comp = [c0]; seen[c0] = 1; let touches = false;
    for (let k = 0; k < comp.length && comp.length <= 60; k++) {
      const c = comp[k], cx = c % cols;
      const nb = [cx > 0 ? c - 1 : -1, cx < cols - 1 ? c + 1 : -1, c >= cols ? c - cols : -1, c + cols < cols * rows ? c + cols : -1];
      for (const q of nb) {
        if (q < 0) continue;
        if (fill[q]) touches = true;
        else if (!wall[q] && !seen[q]) { seen[q] = 1; comp.push(q); }
      }
    }
    if (comp.length <= 60 && touches) for (const c of comp) fill[c] = 1;
  }
  // grow it a little, so it tucks under the lines around it
  let grown = fill;
  for (let pass = 0; pass < 3; pass++) {
    const g2 = grown.slice();
    for (let c = 0; c < cols * rows; c++) if (grown[c]) {
      const cx = c % cols;
      if (cx > 0) g2[c - 1] = 1; if (cx < cols - 1) g2[c + 1] = 1;
      if (c >= cols) g2[c - cols] = 1; if (c + cols < cols * rows) g2[c + cols] = 1;
    }
    grown = g2;
  }
  // keep it as runs along each row
  const f = [];
  for (let yy = 0; yy < rows; yy++) {
    let start = -1;
    for (let xx = 0; xx <= cols; xx++) {
      const on = xx < cols && grown[yy * cols + xx];
      if (on && start < 0) start = xx;
      if (!on && start >= 0) { f.push(yy, start, xx); start = -1; }
    }
  }
  return f.length ? { c: colour, f, g: G } : null;
}

// the fill as SVG path data, sized to `w` (each run a thin rectangle, a hair taller so rows meet without seams)
export function fillD(st, w) {
  const f = st.f || [], cw = w / (st.g || G);
  let d = '';
  for (let i = 0; i < f.length; i += 3) {
    const y = (f[i] * cw).toFixed(1), x0 = (f[i + 1] * cw).toFixed(1), x1 = (f[i + 2] * cw).toFixed(1), y1 = ((f[i] + 1) * cw + 0.6).toFixed(1);
    d += `M${x0} ${y}H${x1}V${y1}H${x0}Z`;
  }
  return d;
}

// is (x, y) inside the fill? (for the eraser)
export function inFill(st, x, y) {
  const g = st.g || G, cx = Math.floor(x * g), cy = Math.floor(y * g), f = st.f || [];
  for (let i = 0; i < f.length; i += 3) if (f[i] === cy && cx >= f[i + 1] && cx < f[i + 2]) return true;
  return false;
}

// ---- Brushes: how a stroke looks (kept on the stroke as `b`; older strokes, without one, draw as ink) ----
//   ink:   a smooth line that swells where you slow down and thins where you move fast, with tapered ends,
//          like a brush pen
//   water: watercolour: soft, see-through, a little bleeding at the edges; where strokes cross they deepen
//   pencil: a fine, slightly grainy line
//   crayon: a waxy, broken line, like a wax crayon on paper
export const BRUSHES = [['ink', 'Ink'], ['water', 'Watercolour'], ['pencil', 'Pencil'], ['crayon', 'Crayon']];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// the stroke's points in pixels, softened (corner cutting) so quick scribbles still come out as curves
function smoothPts(st, w) {
  const p = st.p || [];
  let pts = [];
  for (let i = 0; i + 1 < p.length; i += 2) pts.push([p[i] * w, p[i + 1] * w]);
  for (let k = 0; k < (st.z ? 1 : 3) && pts.length > 2; k++) { // (three rounds of corner cutting: smooth curves)
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}
const circleD = (x, y, r) => `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;

// the brush-pen outline: a filled shape whose width follows the speed of the finger
// taper: how long the thin ends are (1: a pen's short taper; 2–3: a brush's long, pointed ends)
// swing: how much the speed changes the width (1: a pen; more: a soft brush)
// tiltK: how much a tilted Apple Pencil widens the line (pencil and crayon: shading with the side of the lead)
// wob: watercolour's uneven edge: the width wanders along the line (the same wander every time for a stroke)
export function inkD(st, w, taper = 1, swing = 1, tiltK = 0, wob = 0) {
  const base = Math.max(1, (st.s || 0.01) * w) / 2;
  const pts = smoothPts(st, w);
  if (!pts.length) return '';
  const n = pts.length;
  if (n < 3 || (!st.z && Math.hypot(pts[n - 1][0] - pts[0][0], pts[n - 1][1] - pts[0][1]) < base * 0.6)) return circleD(pts[0][0], pts[0][1], base * 1.05); // a dot
  // width at each point: slower is fuller (the distance between points stands for speed), and the ends taper
  const ws = [];
  let v = 0;
  const step = (i) => (i ? Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) : 0);
  const along = []; let total = 0;
  for (let i = 0; i < n; i++) { total += step(i); along.push(total); }
  for (let i = 0; i < n; i++) {
    v = i < 2 ? step(1) : v * 0.85 + step(i) * 0.15; // (speed changes gently, so the width flows)
    // Apple Pencil: how hard it presses sets the width (q: the pressure at each point, 0 to 1); a finger: the speed
    const qi = st.q && st.q.length ? st.q[Math.min(st.q.length - 1, Math.round((i / Math.max(1, n - 1)) * (st.q.length - 1)))] : null;
    const f = qi != null ? clamp(0.3 + qi * 1.25, 0.3, 1.45) : clamp(1.5 - (v / (base * 1.5 + 3)) * swing, 0.22, 1.5); // slow: full; fast: thin
    // thin, then thick, then thin again: the ends taper over a length along the line (not a number of points),
    // the same at the start as at the end, never more than a third of the line each
    const ease = (q) => q * q * (3 - 2 * q); // a smooth point, not a blunt end
    const run = Math.min(base * 9 * taper, total / 3 || 1);
    const a = st.z ? 1 : Math.min(1, 0.08 + 0.92 * ease(Math.min(1, along[i] / run)));
    const b = st.z ? 1 : Math.min(1, 0.06 + 0.94 * ease(Math.min(1, (total - along[i]) / run)));
    // Apple Pencil tilted (t: how upright at each point, 1 upright, 0 flat): the side of the lead, a wider mark
    const ti = tiltK && st.t && st.t.length ? st.t[Math.min(st.t.length - 1, Math.round((i / Math.max(1, n - 1)) * (st.t.length - 1)))] : 1;
    const tk = 1 + (1 - clamp(ti, 0, 1)) * tiltK;
    // the water spreading unevenly: a slow wander in the width, different on every stroke (seeded by where it starts)
    const sd = ((st.p && st.p[0]) || 0) * 97 + ((st.p && st.p[1]) || 0) * 61, u = along[i] / (base * 5 + 4);
    const wk = wob ? 1 + wob * (0.55 * Math.sin(u * 1.7 + sd) + 0.3 * Math.sin(u * 3.9 + sd * 2.3) + 0.15 * Math.sin(u * 8.3 + sd * 0.7)) : 1;
    ws.push(base * (st.z ? 1 : f) * tk * wk * Math.min(a, b)); // (a shape: an even line all the way round)
  }
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(n - 1, i + 1)];
    let tx = bx - ax, ty = by - ay; const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    L.push([pts[i][0] - ty * ws[i], pts[i][1] + tx * ws[i]]);
    R.push([pts[i][0] + ty * ws[i], pts[i][1] - tx * ws[i]]);
  }
  const f1 = (q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  const through = (arr) => { // smooth curves through the midpoints
    let d = '';
    for (let i = 1; i < arr.length - 1; i++) d += ` Q${f1(arr[i])} ${f1([(arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2])}`;
    return d + ` L${f1(arr[arr.length - 1])}`;
  };
  // round ends: a curve out past the last point and back
  const cap = (i, dir) => {
    const [ax, ay] = pts[Math.max(0, i - dir)], [bx, by] = pts[i];
    let tx = bx - ax, ty = by - ay; const len = Math.hypot(tx, ty) || 1;
    return [bx + (tx / len) * ws[i] * 1.3, by + (ty / len) * ws[i] * 1.3];
  };
  const Rr = R.slice().reverse();
  return `M${f1(L[0])}${through(L)} Q${f1(cap(n - 1, 1))} ${f1(Rr[0])}${through(Rr)} Q${f1(cap(0, -1))} ${f1(L[0])}Z`;
}

// What to paint for one stroke, as layers any canvas can draw (Skia on phones, SVG / canvas in the preview):
//   { d, fill: true } a filled shape, or { d, width } a line; alpha 0..1; blur in pixels; multiply: deepens
//   where it crosses other colour; grain: a slightly rough, pencil-like edge; inner: the blur only inside the
//   edge (a darker rim, like dried watercolour; drawn on the phone only)
// each stroke's layers are worked out once per size and remembered (a finished stroke never changes): redrawing the
// page while drawing then only works out the line being drawn, not every line already on the page (iPad Pro lag)
const LAYERS = new WeakMap();
export function layersFor(st, w) {
  if (!st || typeof st !== 'object') return layersOf(st, w);
  let m = LAYERS.get(st);
  if (!m) { m = new Map(); LAYERS.set(st, m); }
  let out = m.get(w);
  if (!out) { out = layersOf(st, w); m.set(w, out); }
  return out;
}
// Apple Pencil: how hard it pressed overall (0 to 1; null for a finger) and how upright it was (1 upright, 0 flat)
const mean = (a) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const pressOf = (st) => mean(st.q);
const uprightOf = (st) => { const m = mean(st.t); return m == null ? 1 : m; };
// a light touch makes a lighter mark, pressing hard a deeper one (pencil, crayon, watercolour)
const darkOf = (st, lo = 0.45) => { const q = pressOf(st); return q == null ? 1 : clamp(lo + q * (1.25 - lo), lo, 1.15); };
function layersOf(st, w) {
  if (st.sm) return []; // the smudge draws nothing of its own: it softens what's under it (see smudgeOutline)
  if (st.m) return [...layersOf({ ...st, m: 0 }, w), ...layersOf(mirrored(st), w)]; // mirror drawing: both sides
  // the eraser: a soft round line that rubs out what was drawn before it (down to the paper or the photo)
  // soft (k: how much it takes away, below 1): a feathered rub that lightens what's there instead of taking it all
  if (st.e) return st.k != null && st.k < 1
    ? [{ d: strokeD(st, w), width: Math.max(2, (st.s || 0.05) * w), alpha: st.k, blur: Math.max(1.5, (st.s || 0.05) * w * 0.3), erase: true }]
    : [{ d: strokeD(st, w), width: Math.max(2, (st.s || 0.05) * w), alpha: 1, erase: true }];
  if (st.f) return [{ d: fillD(st, w), fill: true, alpha: 0.94 }];
  const lw = Math.max(1, (st.s || 0.01) * w);
  const b = st.b || 'ink';
  const light = /^#f{3,6}$/i.test(st.c || '') || /^#f1e8d8$/i.test(st.c || ''); // white or cream: lighter than the paper's shadows, so no multiply
  if (b === 'water') {
    // a soft round brush: long pointed ends and a width that swells and thins a lot with the speed; a see-through
    // body, the pigment gathering at its rim as it dries, a faint bloom where the water spread. Crossing strokes
    // deepen (multiply). Wet into wet (painted over a wash that hadn't dried yet): no rim, it runs into the colour under it.
    // (Apple Pencil: a light touch is a pale wash, pressing harder loads more pigment)
    const B = (k, wob = 0) => inkD({ ...st, s: (st.s || 0.01) * k }, w, 2.6, 1.6, 0, wob);
    const dk = darkOf(st, 0.55);
    if (st.wet) return [
      { d: B(2.3, 0.35), fill: true, alpha: (light ? 0.3 : 0.12) * dk, blur: lw * 0.6, multiply: !light, tex: 2 }, // the bleed: it runs out into the wet wash
      { d: B(1.6, 0.18), fill: true, alpha: (light ? 0.55 : 0.3) * dk, blur: Math.max(1, lw * 0.2), multiply: !light, tex: 2 }, // the body
    ];
    const body = B(1.45, 0.14);
    return [
      { d: B(1.95, 0.32), fill: true, alpha: (light ? 0.3 : 0.08) * dk, blur: lw * 0.3, multiply: !light, tex: 2 }, // the bloom: an uneven halo where the water spread
      { d: body, fill: true, alpha: (light ? 0.55 : 0.28) * dk, blur: Math.max(0.6, lw * 0.05), multiply: !light, tex: 2 }, // the body, grainy where the pigment settles in the paper
      { d: B(0.7, 0.25), fill: true, alpha: light ? 0 : 0.1 * dk, blur: Math.max(1, lw * 0.25), multiply: !light, tex: 2 }, // pooled pigment down the middle, deeper where you slowed
      { d: body, fill: true, alpha: light ? 0 : 0.42 * dk, blur: Math.max(1, lw * 0.14), multiply: !light, inner: true, tex: 2 }, // the rim, where it dried
    ];
  }
  // pencil: a fine, smooth graphite line (thinner when fast, a short taper), the paper's tooth showing in it.
  // Pressed lightly it's faint, hard it's dark; tilted, the side of the lead shades a broad, soft, grainy band.
  if (b === 'pencil') {
    const up = uprightOf(st), side = 1 - up;
    return [{ d: inkD({ ...st, s: (st.s || 0.01) * 0.55 }, w, 1.4, 0.6, 4), fill: true, alpha: clamp(0.8 * darkOf(st, 0.35) * (1 - side * 0.55), 0.12, 0.95), tex: side > 0.3 ? 2 : 1 }];
  }
  // crayon: waxy and smooth-edged, the paper's tooth breaking it up; two soft passes that deepen where they cross
  if (b === 'crayon') {
    const k = darkOf(st, 0.5) * (1 - (1 - uprightOf(st)) * 0.4); // lighter pressed softly or laid on its side
    const d = inkD({ ...st, s: (st.s || 0.01) * 1.25 }, w, 0.8, 0.35, 2.5);
    return [
      { d, fill: true, alpha: clamp((light ? 0.75 : 0.62) * k, 0.15, 0.9), multiply: !light, tex: 2 },
      { d: inkD({ ...st, s: (st.s || 0.01) * 0.8 }, w, 0.8, 0.35, 2.5), fill: true, alpha: clamp((light ? 0.6 : 0.45) * k, 0.1, 0.75), multiply: !light, tex: 2 },
    ];
  }
  return [{ d: inkD(st, w, 1.2, 1.3), fill: true, alpha: 1 }]; // the fountain pen: solid ink, thick to thin with the speed // (no blur: lighter to draw, so pages snapshot and turn smoothly)
}

// ---- Shapes: drag on the page to draw one; it's kept as an ordinary closed stroke (so the brushes, the eraser
// and the fill all work on it). z: 1 marks it closed (no tapered ends). ----
export const SHAPES = [['circle', '○', 'Circle'], ['square', '□', 'Square'], ['triangle', '△', 'Triangle'], ['star', '☆', 'Star'], ['heart', '♡', 'Heart']];
// the outline of a shape in the box from (x0, y0) to (x1, y1), as stroke points (dense, so corners stay crisp)
export function shapePts(kind, x0, y0, x1, y1) {
  const l = Math.min(x0, x1), r = Math.max(x0, x1), t = Math.min(y0, y1), b = Math.max(y0, y1);
  const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
  const out = [];
  const push = (x, y) => out.push(+x.toFixed(4), +y.toFixed(4));
  const poly = (pts) => { // straight sides, with points along each side
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.006));
      for (let k = 0; k < n; k++) push(ax + (bx - ax) * k / n, ay + (by - ay) * k / n);
    }
    push(pts[0][0], pts[0][1]);
  };
  if (kind === 'square') poly([[l, t], [r, t], [r, b], [l, b]]);
  else if (kind === 'triangle') poly([[cx, t], [r, b], [l, b]]);
  else if (kind === 'star') {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? 0.42 : 1; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    poly(pts);
  } else if (kind === 'heart') {
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const hx = 16 * Math.sin(a) ** 3, hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      push(cx + (hx / 17) * rx, cy - ((hy + 2.5) / 15) * ry);
    }
  } else { // circle (an ellipse in the box)
    for (let i = 0; i <= 72; i++) { const a = (i / 72) * Math.PI * 2; push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
  }
  return out;
}

// The order to draw a drawing in: fills under the lines, but only up to each rub of the eraser (what is drawn after
// erasing stays on top of it). Returns the strokes in drawing order; erase strokes keep their place.
export function drawOrder(list) {
  const out = [];
  let seg = [];
  const flush = () => { out.push(...seg.filter((st) => st.f), ...seg.filter((st) => !st.f)); seg = []; };
  for (const st of list || []) { if (st.e || st.sm) { flush(); out.push(st); } else seg.push(st); } // (the eraser and the smudge work on what came before them)
  flush();
  return out;
}
