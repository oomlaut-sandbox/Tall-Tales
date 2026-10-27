// Shared by the photo editor's preview and the finished page (native and web): where the photo sits on the
// square page for each layout, and the colour looks.
export const LAYOUTS = [
  ['fill', 'Full page'],
  ['fit', 'Whole photo'],
  ['border', 'White border'],
  ['circle', 'Circle'],
];
export function frameOf(layout, S) {
  if (layout === 'border') { const m = S * 0.08; return { x: m, y: m, w: S - 2 * m, h: S - 2 * m }; }
  if (layout === 'circle') { const d = S * 0.84; return { x: (S - d) / 2, y: (S - d) / 2, w: d, h: d }; }
  return { x: 0, y: 0, w: S, h: S };
}
// colour matrices (4 × 5, no offsets) and the matching web preview filter
export const LOOKS = {
  none: { label: 'Original', m: null, css: 'none' },
  bw: { label: 'Black & white', m: [0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0, 0, 0, 1, 0], css: 'grayscale(1)' },
  sepia: { label: 'Sepia', m: [0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131, 0, 0, 0, 0, 0, 1, 0], css: 'sepia(1)' },
  warm: { label: 'Warm', m: [1.08, 0, 0, 0, 0, 0, 1.02, 0, 0, 0, 0, 0, 0.88, 0, 0, 0, 0, 0, 1, 0], css: 'sepia(0.25) saturate(1.1)' },
  cool: { label: 'Cool', m: [0.9, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1.12, 0, 0, 0, 0, 0, 1, 0], css: 'hue-rotate(-12deg) saturate(0.9)' },
};
export const PAGE_COLORS = ['#ffffff', '#f4f1ea', '#d9d4c7', '#a8a39a', '#36393b', '#1e1a17', '#2f5d3a', '#1f3a5f', '#c4683f', '#c9a227'];
export const DEFAULT_EDIT = { layout: 'fill', bg: '#ffffff', zoom: 1, ox: 0, oy: 0, rot: 0, flip: false, look: 'none' };
