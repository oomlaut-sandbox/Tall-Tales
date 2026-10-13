// Shape of the curling words-half during a page turn (used by the Skia drawing on the phone).
//
// The page is W x H. The picture fills the top artH; the words fill the rest. The sheet is hinged
// along the spine (y = artH). As the turn progresses (p: 0 → 1) the sheet lifts toward the reader
// and over onto the top half. It bends most in the middle of the turn, with the free edge leading,
// so it reads as paper rather than a stiff board.
//
// Returns strips (two triangles each) sorted back-to-front, each with screen points, texture points
// (page coordinates on the snapshot to draw from) and a brightness for simple lighting.
//   face 'front': the current page's words half (snapshot a)
//   face 'back':  the next page's picture (snapshot b), seen once the sheet passes upright

export const FLAP_INDICES = [0, 1, 2, 1, 3, 2];

const smooth = (t) => t * t * (3 - 2 * t);

export function flapMesh({ W, H, artH, p, rows = 28, curl = Math.PI * 0.6, focal = 1800 }) {
  const textH = H - artH;
  const L = textH + (artH - textH) * smooth(Math.max(0, Math.min(1, p)));
  const bend = curl * Math.sin(Math.PI * p);
  const base = Math.max(0, Math.min(Math.PI, Math.PI * p - bend / 2));
  const tip = Math.min(Math.PI, base + bend);
  const span = tip - base;

  // Walk along the sheet from the spine, a little at a time.
  const pts = [{ y: artH, z: 0, phi: base }];
  const ds = L / rows;
  for (let k = 0; k < rows; k++) {
    const phiMid = base + span * ((k + 0.5) / rows);
    const prev = pts[k];
    pts.push({ y: prev.y + ds * Math.cos(phiMid), z: prev.z + ds * Math.sin(phiMid), phi: base + span * ((k + 1) / rows) });
  }

  // Perspective: nearer (higher z) points spread out from the middle of the page.
  const cx = W / 2, cy = H / 2;
  const proj = (x, y, z) => {
    const s = focal / Math.max(focal * 0.35, focal - z);
    return { x: cx + (x - cx) * s, y: cy + (y - cy) * s };
  };

  const strips = [];
  for (let k = 0; k < rows; k++) {
    const a = pts[k], b = pts[k + 1];
    const phi = (a.phi + b.phi) / 2;
    const front = phi < Math.PI / 2;
    const u0 = k / rows, u1 = (k + 1) / rows;
    const texY = (u) => (front ? artH + u * textH : artH - u * artH);
    const verts = [proj(0, a.y, a.z), proj(W, a.y, a.z), proj(0, b.y, b.z), proj(W, b.y, b.z)];
    const tex = [{ x: 0, y: texY(u0) }, { x: W, y: texY(u0) }, { x: 0, y: texY(u1) }, { x: W, y: texY(u1) }];
    // Light from the reader's side: the sheet darkens as it turns edge-on.
    const light = front ? 1 - 0.3 * Math.sin(phi) : 0.78 - 0.22 * Math.cos(phi);
    strips.push({ face: front ? 'front' : 'back', z: (a.z + b.z) / 2, verts, tex, light: Math.max(0.45, Math.min(1, light)) });
  }
  strips.sort((m, n) => m.z - n.z);
  return strips;
}
