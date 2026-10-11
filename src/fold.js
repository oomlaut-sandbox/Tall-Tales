// Page-curl geometry (same model as the web prototype).
// The page is W x H with the spine at x = 0. C is the corner being lifted (W,0) or (W,H);
// P is where that corner has been dragged to. The fold is the perpendicular bisector of PC.

export function constrain(P, C, W, H) {
  const S = [0, C[1]];
  let dx = P[0] - S[0], dy = P[1] - S[1], d = Math.hypot(dx, dy);
  if (d > W) P = [S[0] + (dx * W) / d, S[1] + (dy * W) / d];
  const S2 = [0, H - C[1]], D = Math.hypot(W, H);
  dx = P[0] - S2[0]; dy = P[1] - S2[1]; d = Math.hypot(dx, dy);
  if (d > D) P = [S2[0] + (dx * D) / d, S2[1] + (dy * D) / d];
  return P;
}

function clip(poly, keep) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ka = keep(a), kb = keep(b);
    if (ka >= 0) out.push(a);
    if ((ka >= 0) !== (kb >= 0)) {
      const t = ka / (ka - kb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

// Returns null when the page is flat (nothing lifted).
export function computeFold(Pin, C, W, H) {
  const P = constrain(Pin, C, W, H);
  const vx = C[0] - P[0], vy = C[1] - P[1], len = Math.hypot(vx, vy);
  if (len < 0.5) return null;
  const nx = vx / len, ny = vy / len;
  const M = [(P[0] + C[0]) / 2, (P[1] + C[1]) / 2];
  const rect = [[0, 0], [W, 0], [W, H], [0, H]];
  const side = (q) => (q[0] - M[0]) * nx + (q[1] - M[1]) * ny;
  return {
    P, M, nx, ny,
    front: clip(rect, (q) => -side(q)), // part of the turning page still lying flat
    cut: clip(rect, side), // part that has lifted (drawn reflected as the page's back)
    angle: Math.atan2(nx, -ny), // direction of the fold line
    depth: Math.min(len / 2, W),
  };
}

export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
