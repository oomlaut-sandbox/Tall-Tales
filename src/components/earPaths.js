// Shapes for the notebook's rounded dog-ear, in a square of size e with the page's corner at bottom right.
export function earPaths(e, R) {
  const r = Math.max(2, Math.min(R, e * 0.9));
  return {
    // the next page, uncovered by the fold: the corner triangle, with the page's rounded corner
    under: `M ${e} 0 L ${e} ${e - r} A ${r} ${r} 0 0 1 ${e - r} ${e} L 0 ${e} Z`,
    // the folded flap: the same corner turned back over the page, its round corner pointing inward
    flap: `M 0 ${e} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${e} 0 Z`,
    fold: `M 0 ${e} L ${e} 0`,
  };
}
