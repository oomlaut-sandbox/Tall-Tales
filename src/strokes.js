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

// the colours: an earthy palette (charcoal, deep teal, slate, sage, taupe, sand, ochre, rust, umber, cream)
export const PENS = [
  ['#1e2324', 'Charcoal'], ['#2f4a4c', 'Deep teal'], ['#5f7672', 'Slate'], ['#93a08f', 'Sage'], ['#8a7660', 'Taupe'],
  ['#d2ab86', 'Sand'], ['#b98a3e', 'Ochre'], ['#9a4f36', 'Rust'], ['#4e3125', 'Umber'], ['#f1e8d8', 'Cream'],
];
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
export const BRUSHES = [['ink', 'Ink'], ['water', 'Watercolour'], ['pencil', 'Pencil']];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// the stroke's points in pixels, softened (corner cutting) so quick scribbles still come out as curves
function smoothPts(st, w) {
  const p = st.p || [];
  let pts = [];
  for (let i = 0; i + 1 < p.length; i += 2) pts.push([p[i] * w, p[i + 1] * w]);
  for (let k = 0; k < (st.z ? 1 : 2) && pts.length > 2; k++) {
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
export function inkD(st, w) {
  const base = Math.max(1, (st.s || 0.01) * w) / 2;
  const pts = smoothPts(st, w);
  if (!pts.length) return '';
  const n = pts.length;
  if (n < 3 || Math.hypot(pts[n - 1][0] - pts[0][0], pts[n - 1][1] - pts[0][1]) < base * 0.6) return circleD(pts[0][0], pts[0][1], base * 1.05); // a dot
  // width at each point: slower is fuller (the distance between points stands for speed), and the ends taper
  const ws = [];
  let v = 0;
  const step = (i) => (i ? Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) : 0);
  for (let i = 0; i < n; i++) {
    v = i < 2 ? step(1) : v * 0.82 + step(i) * 0.18;
    const f = clamp(1.28 - v / (base * 2.6 + 4), 0.45, 1.25);
    const a = st.z ? 1 : Math.min(1, 0.3 + 0.7 * (i / Math.min(6, n - 1)));
    const b = st.z ? 1 : Math.min(1, 0.18 + 0.82 * ((n - 1 - i) / Math.min(10, n - 1)));
    ws.push(base * (st.z ? 1 : f) * Math.min(a, b)); // (a shape: an even line all the way round)
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
export function layersFor(st, w) {
  if (st.f) return [{ d: fillD(st, w), fill: true, alpha: 0.94, blur: 0.5 }];
  const lw = Math.max(1, (st.s || 0.01) * w);
  const b = st.b || 'ink';
  const light = /^#f{3,6}$/i.test(st.c || '') || /^#f1e8d8$/i.test(st.c || ''); // white or cream: lighter than the paper's shadows, so no multiply
  if (b === 'water') {
    // a wash with a defined edge: the see-through body, the pigment gathering at its rim as it dries (an inner
    // glow on the phone), and a faint bloom where the water spread. Crossing strokes deepen (multiply).
    const d = strokeD(st, w);
    return [
      { d, width: lw * 1.75, alpha: light ? 0.3 : 0.07, blur: lw * 0.3, multiply: !light }, // the bloom
      { d, width: lw * 1.4, alpha: light ? 0.55 : 0.26, blur: Math.max(0.6, lw * 0.05), multiply: !light }, // the body
      { d, width: lw * 1.4, alpha: light ? 0 : 0.42, blur: Math.max(1, lw * 0.14), multiply: !light, inner: true }, // the rim
    ];
  }
  if (b === 'pencil') return [{ d: strokeD(st, w), width: Math.max(1, lw * 0.5), alpha: 0.82, grain: true }];
  return [{ d: inkD(st, w), fill: true, alpha: 1, blur: 0.3 }];
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
