// The curling flip-up page turn, built from a few thin hinged strips.
//
// The words half of the page is cut into n strips across. During the turn (p: 0 → 1) they lift
// toward the reader around the spine (y = artH), each tilted a little more than the one before, so
// together they bend like paper with the free edge leading. Past upright, each strip shows its
// back: a slice of the next page's picture, which ends up lying flat over the top half.
//
// This works out, for a set of sample points along the turn, where each strip goes; the reader
// feeds these into ordinary animated 3D transforms (rotateX with perspective), which work the same
// on the phone and in the web preview.

const smooth = (t) => t * t * (3 - 2 * t);

export const FLAP_STRIPS = 6;
export const FLAP_PERSPECTIVE = 1400;
export const FLAP_SAMPLES = 33;

// Geometry of the strips at one moment of the turn.
export function flapAt({ textH, artH, p, n = FLAP_STRIPS, P = FLAP_PERSPECTIVE, curl = Math.PI * 0.6 }) {
  const t = Math.max(0, Math.min(1, p));
  const L = textH + (artH - textH) * smooth(t); // sheet length: words half → picture half
  const ds = L / n;
  const bend = curl * Math.sin(Math.PI * t);
  const base = Math.max(0, Math.min(Math.PI, Math.PI * t - bend / 2));
  const tip = Math.min(Math.PI, base + bend);
  const span = tip - base;
  const out = [];
  let y = artH, m = 1;
  for (let k = 0; k < n; k++) {
    const th = base + span * ((k + 0.5) / n);
    const z = ds * Math.sin(th);
    const g = P / Math.max(P * 0.3, P - z); // how much nearer the strip's far edge comes
    out.push({ top: y, scale: m, angle: th, ds });
    y += m * ds * Math.cos(th) * g;
    m *= g;
  }
  return out;
}

// Animation tables: for each strip, values at evenly spaced points of the turn.
export function flapTables({ textH, artH, n = FLAP_STRIPS, samples = FLAP_SAMPLES }) {
  const input = Array.from({ length: samples }, (_, i) => i / (samples - 1));
  const natF = textH / n, natB = artH / n;
  const strips = Array.from({ length: n }, (_, k) => ({
    k, natF, natB,
    restF: artH + k * natF, // where the front (words) slice sits on the page
    restB: artH + k * natB, // where the back (picture) slice is laid out before moving
    tyF: [], tyB: [], scale: [], rot: [], syF: [], syB: [], opF: [], opB: [], shadeF: [], shadeB: [],
  }));
  for (const p of input) {
    flapAt({ textH, artH, p, n }).forEach((g, k) => {
      const s = strips[k];
      const front = g.angle < Math.PI / 2;
      s.tyF.push(g.top - s.restF);
      s.tyB.push(g.top - s.restB);
      s.scale.push(g.scale);
      s.rot.push(`${((g.angle * 180) / Math.PI).toFixed(2)}deg`);
      s.syF.push(g.ds / natF);
      s.syB.push(g.ds / natB);
      s.opF.push(front ? 1 : 0);
      s.opB.push(front ? 0 : 1);
      // light from the reader's side: darker as a strip turns edge-on
      s.shadeF.push(0.2 * Math.sin(g.angle));
      s.shadeB.push(0.18 * Math.max(0, Math.sin(g.angle)));
    });
  }
  return { input, strips };
}
