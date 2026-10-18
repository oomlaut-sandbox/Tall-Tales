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

// crayon colours for the pens
export const PENS = [
  ['#1b1b1b', 'Black'], ['#c0392b', 'Red'], ['#e67e22', 'Orange'], ['#e5b81c', 'Yellow'],
  ['#4f8a3a', 'Green'], ['#2e6fb5', 'Blue'], ['#8a4f9e', 'Purple'], ['#8b5a3c', 'Brown'], ['#ffffff', 'White'],
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
  // grow it a little, so it tucks under the lines around it
  let grown = fill;
  for (let pass = 0; pass < 2; pass++) {
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
