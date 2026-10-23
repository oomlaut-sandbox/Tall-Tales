// The drawing tools as little pictures (like the tools laid out in a tray in Paper): each is a list of shapes in a
// 60 × 120 box, tip up (the bottom is hidden by the edge of the tray). c: the pen's colour now, for the parts that
// take it (a pencil's body, a crayon, the paint on a brush). Drawn by ToolArt (Skia on the phone, SVG on the web).
//   { d: SVG path, fill } or { d, grad: [from, to], dir: 'h' | 'v' } or { d, stroke, width }
const shade = (hex, k) => { // darker (k < 0) or lighter (k > 0)
  const h = (hex || '#888888').replace('#', ''); const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const v = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  const out = v.map((x) => Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k));
  return '#' + out.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
};
export function toolShapes(kind, c) {
  switch (kind) {
    case 'eraser': return [
      { d: 'M8 36 Q8 30 14 30 L46 30 Q52 30 52 36 L52 120 L8 120 Z', grad: ['#2f2f2f', '#1c1c1c'], dir: 'h' },
      { d: 'M10 18 Q10 12 16 12 L44 12 Q50 12 50 18 L50 40 L10 40 Z', grad: ['#9a9a9a', '#7c7c7c'], dir: 'h' },
      { d: 'M44 14 Q50 14 50 20 L50 40 L44 40 Z', fill: 'rgba(0,0,0,0.18)' },
    ];
    case 'pencil': return [
      { d: 'M17 52 L43 52 L43 120 L17 120 Z', grad: [shade(c, 0.12), shade(c, -0.3)], dir: 'h' },
      { d: 'M30 52 L36 52 L36 120 L30 120 Z', fill: 'rgba(255,255,255,0.12)' },
      { d: 'M17 52 L43 52 L32 18 L28 18 Z', grad: ['#ecd3ad', '#c9a77c'], dir: 'h' }, // the sharpened wood
      { d: 'M26.2 26 L33.8 26 L31 16 Q30 12 29 16 Z', fill: shade(c, -0.25) }, // the lead, in its colour
    ];
    case 'pen': return [ // a fountain pen: the silver nib with its slit and breather hole, a band, the barrel
      { d: 'M30 6 Q34 20 42 44 Q44 52 40 60 L20 60 Q16 52 18 44 Q26 20 30 6 Z', grad: ['#d4d4d4', '#8f8f8f'], dir: 'h' },
      { d: 'M29.4 10 L30.6 10 L30.6 38 L29.4 38 Z', fill: '#4a4a4a' },
      { d: 'M30 36 m-3.4 0 a3.4 3.4 0 1 0 6.8 0 a3.4 3.4 0 1 0 -6.8 0', fill: '#4a4a4a' },
      { d: 'M17 60 L43 60 L43 68 L17 68 Z', fill: '#1d1d1d' },
      { d: 'M16 68 L44 68 L44 120 L16 120 Z', grad: [shade(c, 0.15), shade(c, -0.35)], dir: 'h' },
    ];
    case 'water': return [ // a round watercolour brush: soft bristles dipped in the colour, a silver ferrule, a wooden handle
      { d: 'M30 4 Q37 22 41 40 Q43 52 38 58 L22 58 Q17 52 19 40 Q23 22 30 4 Z', grad: [shade(c, 0.35), shade(c, -0.15)], dir: 'v' },
      { d: 'M30 4 Q33 18 35 30 L30 40 L25 30 Q27 18 30 4 Z', fill: 'rgba(255,255,255,0.18)' },
      { d: 'M20 58 L40 58 L41 80 L19 80 Z', grad: ['#d8d8d8', '#8c8c8c'], dir: 'h' },
      { d: 'M19 80 L41 80 L42 120 L18 120 Z', grad: ['#3d3d3d', '#1e1e1e'], dir: 'h' },
      { d: 'M19 72 L41 72 L41 74 L19 74 Z', fill: 'rgba(0,0,0,0.25)' },
    ];
    case 'crayon': return [ // a wax crayon: the rounded tip, a paper wrapper with a darker band
      { d: 'M21 34 Q21 14 30 10 Q39 14 39 34 Z', grad: [shade(c, 0.2), shade(c, -0.2)], dir: 'h' },
      { d: 'M19 34 L41 34 L41 120 L19 120 Z', grad: [shade(c, 0.1), shade(c, -0.3)], dir: 'h' },
      { d: 'M19 46 L41 46 L41 104 L19 104 Z', grad: ['#f2ece0', '#cfc6b4'], dir: 'h' },
      { d: 'M19 64 L41 64 L41 84 L19 84 Z', fill: shade(c, -0.15) },
    ];
    case 'roller': return [ // the paint roller (fill): the roller in the colour, its frame bending down to the handle
      { d: 'M6 12 Q6 8 10 8 L50 8 Q54 8 54 12 L54 30 Q54 34 50 34 L10 34 Q6 34 6 30 Z', grad: [shade(c, 0.2), shade(c, -0.25)], dir: 'v' },
      { d: 'M54 18 L58 18 L58 46 L32 46 L32 58 L28 58 L28 42 L54 42 Z', fill: '#2a2a2a' },
      { d: 'M24 58 L36 58 L37 120 L23 120 Z', grad: ['#3d3d3d', '#1d1d1d'], dir: 'h' },
    ];
    default: return [];
  }
}
