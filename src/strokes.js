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
export const SIZES = [['thin', 0.008], ['medium', 0.018], ['thick', 0.04]];

// is the point (x, y) close to any point of the stroke? (for the eraser)
export function near(st, x, y, r) {
  const p = st.p || [];
  const rr = (r + (st.s || 0) / 2) ** 2;
  for (let i = 0; i < p.length; i += 2) if ((p[i] - x) ** 2 + (p[i + 1] - y) ** 2 < rr) return true;
  return false;
}
