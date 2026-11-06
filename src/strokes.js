import { getStroke } from 'perfect-freehand';

// Finger drawings in My Notes are kept as strokes, not pictures: each stroke is a colour, a pen size
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
// the bright natural colours (Jörg, 5 Nov 2026; instead of the old bright ones, no neons): the primaries first, then
// their mixes, then the softer shades of sky, water, moss and sunset
export const PENS_NATURAL = [
  ['#d1453b', 'Poppy red'], ['#f2c14e', 'Sunflower'], ['#3f6e9e', 'Lake blue'], ['#4e7d4f', 'Leaf green'],
  ['#f0a04b', 'Apricot'], ['#6a4c93', 'Plum'], ['#7fb3d5', 'Sky blue'], ['#2e8a88', 'Sea teal'],
  ['#7a9a4a', 'Moss green'], ['#a8c47c', 'Spring green'], ['#e07a5f', 'Sunset coral'], ['#a63d57', 'Berry'],
  ['#e5989b', 'Rose'], ['#9c89b8', 'Lavender'],
];
export const PENS_BRIGHT = PENS_NATURAL; // (the old name, for anything that still asks for it)

const hsl = (h, s, l) => { const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join(''); };

// The colour wheel (like Procreate's Disc, Jörg 5 Nov 2026): the ring picks the colour (h: 0 to 360, red at the
// right, round the other way from a clock), the disc inside how strong (s: 0 grey to 1 full, left to right) and how
// light (v: 1 at the top to 0 black at the bottom). assets/hue-ring.png, sv-white.png and sv-black.png are drawn from
// the same rule, so what you tap is what you get.
export function hsvHex(h, s, v) {
  const f = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); };
  return '#' + [f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export function hsvOf(hex) {
  const [r, g, b] = rgbOf(hex || '#000000').map((x) => x / 255);
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
export const GREYS = ['#ffffff', '#d9d9d9', '#b0b0b0', '#868686', '#5c5c5c', '#333333', '#111111'];

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
  if (st.stp) return { ...st, m: 0, p: [+(1 - st.p[0]).toFixed(4), st.p[1]], fx: st.fx ? 0 : 1 }; // a stamp: across, and facing the other way
  if (st.f) { const g = st.g || 160, f = st.f.slice(); for (let i = 0; i < f.length; i += 3) { const a = g - f[i + 2], b = g - f[i + 1]; f[i + 1] = a; f[i + 2] = b; } return { ...st, m: 0, f }; }
  const p = (st.p || []).slice(); for (let i = 0; i < p.length; i += 2) p[i] = +(1 - p[i]).toFixed(4);
  return { ...st, m: 0, p };
}
// The smudge: { sm: 1, s, p }: a fingertip rubbed over the drawing, blurring and blending what's under it. Its
// shape (where it rubbed) as SVG path data, and how soft (the blur, in pixels).
// k: the smudge's strength (0.5 gentle, 1 as it was, 1.8 strong)
// the smudge: a soft brush that softens what's under it. Version 2 (v: 2, Jörg 5 Nov 2026: 'a very subtle, soft brush
// that gently blends colours below'): narrower, and a much lighter blur
export const smudgeOf = (st, w) => {
  const width = Math.max(st.v === 2 ? 3 : 4, (st.s || 0.03) * w);
  return { d: strokeD(st, w), width, blur: st.v === 2 ? Math.max(0.8, width * 0.16 * (st.k || 1)) : Math.max(2, width * 0.35 * (st.k || 1)) };
};
// the strokes with every mirrored one doubled (for the paint bucket, which needs all the lines as walls)
export const withMirrors = (list) => (list || []).flatMap((st) => (st.m ? [{ ...st, m: 0 }, mirrored(st)] : [st]));
// The blend tool (v: 3, Jörg 5 Nov 2026: 'gently blur colour areas together and drag paint, very soft brush
// edges'): under a very soft round brush, the paint is mixed with a softened copy of itself, pulled a little the
// way the finger moved. Here only the shape of it; Strokes.native.js does the mixing. k: Gentle 0.5, Normal 1, Strong 1.8.
export function blendOf(st, w) {
  const width = Math.max(4, (st.s || 0.03) * w), k = st.k || 1;
  const p = st.p || [], pts = [];
  for (let i = 0; i < p.length; i += 2) pts.push([p[i] * w, p[i + 1] * w]);
  // the way the finger moved, every so often along the rub (for the pull)
  const step = Math.max(2, width * 0.25), dirs = [];
  let last = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const b = pts[i], dx = b[0] - last[0], dy = b[1] - last[1], d = Math.hypot(dx, dy);
    if (d >= step) { dirs.push({ a: last, b, ux: dx / d, uy: dy / d }); last = b; }
  }
  if (last !== pts[pts.length - 1] && dirs.length) { const q = dirs[dirs.length - 1]; dirs.push({ a: last, b: pts[pts.length - 1], ux: q.ux, uy: q.uy }); }
  return {
    d: strokeD(st, w), pts, dirs, width,
    soft: width * 0.32, // how soft the brush's edge is
    blur: 0.6 + width * 0.25 * k, // how much the colours run together
    pull: width * 0.5 * k, // how far paint is dragged
    amount: Math.min(1, 0.45 + 0.3 * k), // how much of the mix shows (Gentle a little over half)
  };
}
export const SIZES = [['thin', 0.007], ['medium', 0.015], ['thick', 0.032]]; // a sharp pencil, a crayon, a chunky crayon
// the eraser's and the smudge's own widths for the three sizes (Jörg, 5 Nov 2026: much smaller, one fine enough
// for details). As a share of the page's width: on a phone about 2, 6 and 14 points for the eraser.
export const TOOL_SIZES = { eraser: [0.006, 0.016, 0.038], smudge: [0.012, 0.022, 0.036] };
export const toolSize = (tool, size) => {
  const i = Math.max(0, SIZES.findIndex(([, v]) => v === size));
  return TOOL_SIZES[tool][i];
};

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
const G = 160; // cells across the drawing (fills made before 29 Oct 2026)
export const FILL_G = 320; // new fills: twice as fine, so their edges are smooth
export const FILL_TOL = 12; // like Photoshop's tolerance: colours this close (0–255, each of red, green, blue) count as the same

// pix: the page as you see it, FILL_G cells across ({ cols, rows, data: RGBA }), so the fill also stops where the
// colour changes by more than the tolerance (another fill, a stamp, a photo), not only at lines (Jörg, 29 Oct 2026)
export function makeFill(strokes, x, y, aspect, colour, pix = null, tol = FILL_TOL) {
  const GG = pix ? FILL_G : G, cols = GG, rows = Math.round(GG * aspect), K = GG / G; // K: cells per old cell
  const wall = new Uint8Array(cols * rows);
  const mark = (cx, cy, r) => {
    const r2 = r * r, x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(cols - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(rows - 1, Math.ceil(cy + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) if ((xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 <= r2) wall[yy * cols + xx] = 1;
  };
  for (const st of strokes) {
    if (st.f || st.stp || st.ph) continue; // other fills (and stamps) aren't walls: a new fill simply goes on top
    const p = st.p || [];
    const r = (st.s || 0.01) * GG / 2 + 1.1 * K; // the line, plus a little to close small gaps
    for (let i = 0; i < p.length; i += 2) {
      const ax = p[i] * GG, ay = p[i + 1] * GG;
      const bx = i + 2 < p.length ? p[i + 2] * GG : ax, by = i + 2 < p.length ? p[i + 3] * GG : ay;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5));
      for (let k = 0; k <= n; k++) mark(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, r);
    }
  }
  const sx = Math.min(cols - 1, Math.max(0, Math.floor(x * GG))), sy = Math.min(rows - 1, Math.max(0, Math.floor(y * GG)));
  if (wall[sy * cols + sx]) return null; // tapped right on a line
  // the tolerance: a cell whose colour is further from the tapped colour than tol (in red, green or blue) is a wall too
  const edge = new Uint8Array(cols * rows); // walls that are only a change of colour (not a line): the fill barely tucks under these
  if (pix && pix.cols === cols && pix.rows === rows) {
    const D = pix.data, s0 = (sy * cols + sx) * 4, r0 = D[s0], g0 = D[s0 + 1], b0 = D[s0 + 2];
    for (let c = 0; c < cols * rows; c++) {
      const o = c * 4;
      if (!wall[c] && (Math.abs(D[o] - r0) > tol || Math.abs(D[o + 1] - g0) > tol || Math.abs(D[o + 2] - b0) > tol)) { wall[c] = 1; edge[c] = 1; }
    }
  }
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
    const POCKET = 60 * K * K;
    for (let k = 0; k < comp.length && comp.length <= POCKET; k++) {
      const c = comp[k], cx = c % cols;
      const nb = [cx > 0 ? c - 1 : -1, cx < cols - 1 ? c + 1 : -1, c >= cols ? c - cols : -1, c + cols < cols * rows ? c + cols : -1];
      for (const q of nb) {
        if (q < 0) continue;
        if (fill[q]) touches = true;
        else if (!wall[q] && !seen[q]) { seen[q] = 1; comp.push(q); }
      }
    }
    if (comp.length <= POCKET && touches) for (const c of comp) fill[c] = 1;
  }
  // grow it a little, so it tucks under the lines around it
  let grown = fill;
  for (let pass = 0; pass < 3 * K; pass++) {
    const g2 = grown.slice();
    const into = (q) => { if (pass < K || !edge[q]) g2[q] = 1; }; // (under lines all the way; a colour's edge only by a cell, to hide its soft rim)
    for (let c = 0; c < cols * rows; c++) if (grown[c]) {
      const cx = c % cols;
      if (cx > 0) into(c - 1); if (cx < cols - 1) into(c + 1);
      if (c >= cols) into(c - cols); if (c + cols < cols * rows) into(c + cols);
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
  return f.length ? { c: colour, f, g: GG } : null;
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
    const f = qi != null ? clamp(0.2 + pres(qi) * 1.25, 0.25, 1.45) : clamp(1.5 - (v / (base * 1.5 + 3)) * swing, 0.22, 1.5); // slow: full; fast: thin
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

// perfect-freehand (MIT, Steve Ruiz): a pressure-sensitive outline for a line, the way a real pen swells and tapers
// (Jörg, 4 Nov 2026). Used for the fountain pen's new strokes (pf: 1) and for the quick live line while drawing.
// q: the Apple Pencil's pressure at each point (a finger: the speed stands in for it). live: the end still moving
// (no taper at the tip, so the line stays under the pen).
// Watercolour (Jörg, 5 Nov 2026), after Tyler Hobbs' way of painting it: the stroke's shape (perfect-freehand, the
// same one shown while painting) is laid down many times, each copy very faint and its edge pushed in or out a
// little, differently each time. Where the copies agree (the middle) the colour builds up; at the edge they don't, so
// it comes out soft and uneven, like a wash. Then the pigment that gathered at the rim as it dried, and a faint bloom
// where the water ran. Each stroke's wobble comes from its own points, so it looks the same every time it's drawn.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// the outline, every point pushed out (or in) along the edge by `push`, plus a gentle wander of up to `amp` that
// changes every `scale` along the way
function wobbled(poly, push, amp, scale, rnd) {
  const n = poly.length;
  let area = 0; const cum = [0];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
    if (i < n - 1) cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[n - 1] || 1, sgn = area > 0 ? -1 : 1;
  const K = Math.max(3, Math.ceil(L / scale));
  const knots = Array.from({ length: K }, () => rnd() * 2 - 1);
  return poly.map((p, i) => {
    const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
    let nx = b[1] - a[1], ny = a[0] - b[0];
    const k = Math.hypot(nx, ny) || 1; nx = (nx / k) * sgn; ny = (ny / k) * sgn;
    const u = (cum[i] / L) * K, k0 = Math.floor(u) % K, f = u - Math.floor(u), e = (1 - Math.cos(Math.PI * f)) / 2;
    const off = push + amp * (knots[k0] * (1 - e) + knots[(k0 + 1) % K] * e);
    return [p[0] + nx * off, p[1] + ny * off];
  });
}
const WASH_COPIES = 14;
// (worked out once per stroke and size: the copies take a moment, and the page is drawn again often)
const washCache = new WeakMap();
function watercolour(st, w, lw, light, dk) {
  const hit = washCache.get(st);
  if (hit && hit.w === w) return hit.out;
  const out = paintWash(st, w, lw, light, dk);
  washCache.set(st, { w, out });
  return out;
}
function paintWash(st, w, lw, light, dk) {
  const size = lw * 1.35 * 1.1; // (the same width as the shape shown while painting)
  const O = pfOutline(st, w, size, { thinning: 0.5 });
  if (O.length < 4) return [];
  const p = st.p || [];
  const rnd = seeded(((p[0] || 0) * 7919 + (p[1] || 0) * 104729 + p.length * 31) * 100000);
  const m = light ? null : true;
  const out = [
    // the bloom: where the water ran a little past the brush
    { d: outlineD(wobbled(O, size * 0.25, size * 0.3, size * 2, rnd)), fill: true, alpha: (light ? 0.06 : 0.025) * dk, blur: size * 0.1, multiply: m, tex: 3 },
  ];
  for (let i = 0; i < WASH_COPIES; i++) {
    const sc = size * (0.5 + rnd() * 1.6);
    // (gentler, Jörg 5 Nov 2026: about as strong as the shape shown while painting, and every other copy laid on
    // normally instead of multiplied, so a stroke over paint mixes with it more than it darkens it)
    out.push({ d: outlineD(wobbled(O, size * (rnd() * 0.3 - 0.2), size * (0.12 + rnd() * 0.22), sc, rnd)), fill: true, alpha: (light ? 0.06 : 0.034) * dk, multiply: i % 2 ? null : m, tex: 3 });
  }
  // the rim, where the pigment gathered as it dried: thin and uneven
  out.push({ d: outlineD(wobbled(O, -size * 0.06, size * 0.14, size * 0.9, rnd)), fill: true, alpha: light ? 0 : 0.16 * dk, blur: Math.max(0.7, size * 0.06), multiply: m, inner: true, tex: 3 });
  return out;
}

// the fountain pen's width: the thickest size a little thinner than the others would make it (Jörg, 5 Nov 2026:
// its lines were too fat)
// Apple Pencil pressure (q, 0 to 1 as the phone gives it) as the stroke feels it (Jörg, 5 Nov 2026: 'zero pressure
// effects'): an ordinary touch only reaches about a third of the way, so the low end is opened up: a feather-light
// touch about 0.3, a normal one about 0.6, pressing hard 1
export const pres = (q) => (q == null ? null : Math.max(0.08, Math.min(1, Math.sqrt(Math.max(0, q) * 1.8))));
// the pencil's width and its line (see layersOf): steady and smoothed, no tapered ends, pressure widens it
const pencilSize = (lw) => Math.max(1.2, lw * 0.5);
const PENCIL_OF = (st) => ({ thinning: st.q && st.q.some((v) => v > 0) ? 0.55 : 0, taper: false, streamline: 0.55, smoothing: 0.6 });
const penSize = (st, lw) => lw * ((st.s || 0.01) > 0.025 ? 1.05 : 1.5);
export function pfOutline(st, w, size, { thinning = 0.6, taper = true, live = false, streamline = 0.45, smoothing = 0.55 } = {}) {
  const p = st.p || [];
  const pts = [];
  for (let i = 0; i + 1 < p.length; i += 2) {
    const q = st.q && st.q.length ? st.q[Math.min(st.q.length - 1, i / 2)] : null;
    pts.push([p[i] * w, p[i + 1] * w, q != null && q > 0 ? pres(q) : 0.5]);
  }
  if (!pts.length) return [];
  const t = taper ? Math.max(size * 2.5, 6) : 0;
  return getStroke(pts, { size, thinning, smoothing, streamline, simulatePressure: !(st.q && st.q.some((v) => v > 0)),
    start: { taper: t, cap: true }, end: { taper: live ? 0 : t, cap: true }, last: !live });
}
// an outline as SVG path data: smooth curves through the midpoints, each outline point its own curve's control point.
// (Not the shorter 'T' recipe: there each curve guesses its control point from the one before, and when the points
// are unevenly spaced the guesses swing side to side, a zigzag edge while drawing: Jörg's video, 5 Nov 2026.)
export function outlineD(pts) {
  const n = pts.length;
  if (n < 4) return '';
  const f = (v) => v.toFixed(2);
  const mid = (a, b) => `${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2)}`;
  let d = `M${mid(pts[0], pts[1])}`;
  for (let i = 1; i <= n; i++) { const a = pts[i % n], b = pts[(i + 1) % n]; d += `Q${f(a[0])} ${f(a[1])} ${mid(a, b)}`; }
  return d + 'Z';
}
// the quick look of a line while it's being drawn: one plain shape in its colour (the full brush, with the paper's
// texture, is painted when the pen lifts: like Procreate and Paper). null: draw it the full way (eraser, smudge,
// shapes, stamps, fills).
export function liveLook(st, w) {
  if (!st || st.e || st.sm || st.stp || st.f || st.z || st.ph) return null;
  const lw = Math.max(1, (st.s || 0.01) * w), b = st.b || 'ink';
  const look = b === 'pencil' ? { size: pencilSize(lw), pencil: true, alpha: 1 }
    : b === 'water' ? { size: lw * 1.35 * 1.1, thinning: 0.5, alpha: 0.42 } // (the body's size: see layersOf)
    : b === 'crayon' ? { size: lw * 1.35, thinning: 0.3, alpha: 0.7 }
    : { size: penSize(st, lw), thinning: 0.6, alpha: 1 };
  const one = (x) => outlineD(pfOutline(x, w, look.size, look.pencil ? { ...PENCIL_OF(x), live: true } : { thinning: look.thinning, live: true }));
  // soft: the watercolour's soft edge already while painting (Jörg, 5 Nov 2026), like the finished stroke's
  return { d: [one(st), ...(st.m ? [one(mirrored(st))] : [])].join(' '), alpha: look.alpha, color: st.c || '#111111', soft: b === 'water' && st.wc ? Math.max(0.8, look.size * 0.1) : 0 };
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
const darkOf = (st, lo = 0.45) => { const q = pres(pressOf(st)); return q == null ? 1 : clamp(lo + q * (1.15 - lo), lo, 1.15); };
// the pencil with Apple Pencil pressure (Jörg, 5 Nov 2026): along the line it's paler and finer where it's pressed
// lightly, darker and a little wider where it's pressed hard, like a real pencil. Drawn in short pieces, each its own
// shade of the colour (towards the paper's white when light), all solid so the joins don't show.
const PAPER = [247, 245, 240];
const tint = (hex, k) => { const c = rgbOf(hex || '#111111'); return '#' + c.map((v, i) => Math.round(PAPER[i] + (v - PAPER[i]) * k).toString(16).padStart(2, '0')).join(''); };
function pencilPressed(st, w, lw) {
  const p = st.p, q = st.q, n = p.length / 2;
  const LEVELS = 5, run = 3; // (at most five shades a line, each one shape: light enough to redraw while erasing)
  const at = (k) => q[Math.min(q.length - 1, k)] || 0;
  const paths = Array(LEVELS).fill('');
  for (let i = 0; i < n - 1; i += run) {
    const j = Math.min(n - 1, i + run);
    const f = pres((at(i) + at(j)) / 2) || 0.5;
    const L = Math.min(LEVELS - 1, Math.floor(f * LEVELS));
    let d = `M${(p[i * 2] * w).toFixed(1)} ${(p[i * 2 + 1] * w).toFixed(1)}`;
    for (let k = i + 1; k <= j; k++) d += ` L${(p[k * 2] * w).toFixed(1)} ${(p[k * 2 + 1] * w).toFixed(1)}`;
    paths[L] += d + ' ';
  }
  const out = [];
  paths.forEach((d, L) => {
    if (!d) return;
    const f = (L + 0.5) / LEVELS;
    out.push({ d, width: Math.max(0.8, lw * (0.2 + f * 0.5)), alpha: 1, color: tint(st.c, 0.3 + f * 0.7) });
  });
  return out.length ? out : [{ d: strokeD(st, w), width: Math.max(1.2, lw * 0.45), alpha: 0.92 }];
}
function layersOf(st, w) {
  if (st.stp || st.ph) return []; // a stamp or an imported photo is a picture (drawn by the canvas itself), not paint
  if (st.sm) return []; // the smudge draws nothing of its own: it softens what's under it (see smudgeOutline)
  if (st.m) return [...layersOf({ ...st, m: 0 }, w), ...layersOf(mirrored(st), w)]; // mirror drawing: both sides
  // the eraser: a soft round line that rubs out what was drawn before it (down to the paper or the photo)
  // soft (k: how much it takes away, below 1): a feathered rub that lightens what's there instead of taking it all
  if (st.e) return st.k != null && st.k < 1
    ? [{ d: strokeD(st, w), width: Math.max(2, (st.s || 0.05) * w), alpha: st.k, blur: Math.max(1.5, (st.s || 0.05) * w * 0.3), erase: true }]
    : [{ d: strokeD(st, w), width: Math.max(2, (st.s || 0.05) * w), alpha: 1, erase: true }];
  if (st.f) return [{ d: fillD(st, w), fill: true, alpha: 0.94, blur: Math.max(0.5, (w / (st.g || 160)) * 0.6) }]; // (a soft edge, so it isn't stepped: 29 Oct 2026)
  const lw = Math.max(1, (st.s || 0.01) * w);
  const b = st.b || 'ink';
  const light = /^#f{3,6}$/i.test(st.c || '') || /^#f1e8d8$/i.test(st.c || ''); // white or cream: lighter than the paper's shadows, so no multiply
  if (b === 'water') {
    if (st.wc) return watercolour(st, w, lw, light, darkOf(st, 0.6));
    // a soft round brush: long pointed ends and a width that swells and thins a lot with the speed; a see-through
    // body, the pigment gathering at its rim as it dries, a faint bloom where the water spread. Crossing strokes
    // deepen (multiply). Wet into wet (painted over a wash that hadn't dried yet): no rim, it runs into the colour under it.
    // (Apple Pencil: a light touch is a pale wash, pressing harder loads more pigment)
    // (calmer, Jörg 27 Oct 2026: the width follows the hand less wildly, shorter points at the ends, an even body
    // with more colour, a gentle edge; it still deepens where strokes cross)
    // new strokes (pf, Jörg 5 Nov 2026): the shape comes from perfect-freehand, the same shape that's shown while
    // painting, so nothing jumps on lift and the edge doesn't wobble with the finger's speed
    const B = st.pf
      ? (k) => outlineD(pfOutline(st, w, lw * k * 1.1, { thinning: 0.5 }))
      : (k, wob = 0) => inkD({ ...st, s: (st.s || 0.01) * k }, w, 1.5, 0.75, 0, wob);
    const dk = darkOf(st, 0.6);
    if (st.wet) return [
      { d: B(1.9, 0.15), fill: true, alpha: (light ? 0.3 : 0.12) * dk, blur: lw * 0.4, multiply: !light, tex: 2 }, // the bleed into the wet wash
      { d: B(1.4, 0.06), fill: true, alpha: (light ? 0.6 : 0.42) * dk, blur: Math.max(1, lw * 0.15), multiply: !light, tex: 2 }, // the body
    ];
    const body = B(1.35, 0.06);
    return [
      { d: B(1.6, 0.12), fill: true, alpha: (light ? 0.25 : 0.07) * dk, blur: lw * 0.22, multiply: !light, tex: 2 }, // a faint soft edge
      { d: body, fill: true, alpha: (light ? 0.6 : 0.42) * dk, blur: Math.max(0.6, lw * 0.04), multiply: !light, tex: 2 }, // the body
      { d: body, fill: true, alpha: light ? 0 : 0.28 * dk, blur: Math.max(1, lw * 0.12), multiply: !light, inner: true, tex: 2 }, // a light rim, where it dried
    ];
  }
  // pencil (Jörg, 27 Oct 2026): a plain, smooth, fine line of even width, like a sharp pencil or a fineliner.
  // No speed swing, no taper, no grain. Apple Pencil: pressing harder makes it a little darker, that's all.
  // (5 Nov 2026, Jörg: 'just make it a solid line, with the pressure variation, line smoothing on'): one solid shape,
  // smoothed, the same one shown while drawing; Apple Pencil pressure makes it thinner and thicker along the line
  if (b === 'pencil') {
    const d = outlineD(pfOutline(st, w, pencilSize(lw), PENCIL_OF(st)));
    if (d) return [{ d, fill: true, alpha: 1 }];
    return [{ d: strokeD(st, w), width: pencilSize(lw), alpha: 1 }];
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
  if (st.pf) { const d = outlineD(pfOutline(st, w, penSize(st, lw))); if (d) return [{ d, fill: true, alpha: 1 }]; } // (perfect-freehand: 4 Nov 2026)
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

// Two layers: what was drawn "behind the lines" (bk: 1: colouring in underneath) and everything else on top. The
// eraser and the smudge only work on the layer they were used on. Returns [behind, front] (either may be empty).
// Layers (Jörg, 27 Oct 2026): four fixed layers, 1 at the bottom to 4 on top (ly; none means 1). In each layer,
// behind the lines first, then the rest, each on its own sheet, so the eraser only rubs its own sheet.
export const DRAW_LAYERS = [1, 2, 3, 4];
// An imported photo (Jörg, 29 Oct 2026): { ph: its file, ly: the layer it went on } — it fills the page (cropped
// from its middle, like a page picture), on that layer, so drawing on the layers above sits over it and the eraser
// on its own layer rubs it away.
// Each layer's transparency (Jörg, 30 Oct 2026): kept with the drawing, as one note at its start: { lo: { 2: 0.5 } }
// (layer: how much shows, 0 to 1; a layer not in it shows fully). It isn't a stroke: undo, the eraser and fills skip it.
export const isMeta = (st) => !!(st && st.lo);
export const layerAlphas = (list) => ((list || []).find(isMeta) || {}).lo || {};
export const layerAlpha = (list, n) => { const a = layerAlphas(list)[n]; return a == null ? 1 : a; };
export const inkOf = (list) => (list || []).filter((st) => !isMeta(st)); // the strokes alone
export function withLayerAlpha(list, n, a) {
  const lo = { ...layerAlphas(list), [n]: Math.round(Math.max(0, Math.min(1, a)) * 100) / 100 };
  Object.keys(lo).forEach((k) => { if (lo[k] >= 1) delete lo[k]; });
  return Object.keys(lo).length ? [{ lo }, ...inkOf(list)] : inkOf(list);
}
// (each part carries its layer's transparency as .a)
export const byLayer = (list) => {
  const all = inkOf(list), lo = layerAlphas(list);
  return DRAW_LAYERS.flatMap((n) => {
    const mine = all.filter((st) => (st.ly || 1) === n);
    const a = lo[n] == null ? 1 : lo[n];
    return [mine.filter((st) => st.bk), mine.filter((st) => !st.bk)].map((part) => Object.assign(part, { a }));
  });
};
