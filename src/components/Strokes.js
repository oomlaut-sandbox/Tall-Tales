// Draws drawings in the web preview (SVG), with the same brushes as the phone (see layersFor in strokes.js).
// Phones use Strokes.native.js.
import React from 'react';
import { View } from 'react-native';
import { layersFor } from '../strokes';

let uid = 0;
export function StrokesView({ strokes, width, height, live }) {
  const list = live ? [...(strokes || []), live] : strokes || [];
  const all = [...list.filter((st) => st.f), ...list.filter((st) => !st.f)]; // fills under every line
  const h = React.createElement;
  const id = React.useMemo(() => `s${++uid}`, []);
  const defs = [], paths = [];
  all.forEach((st, i) => layersFor(st, width).forEach((L, j) => {
    const fid = L.blur ? `${id}-${i}-${j}` : null;
    if (fid) defs.push(h('filter', { key: fid, id: fid, x: '-50%', y: '-50%', width: '200%', height: '200%' }, h('feGaussianBlur', { stdDeviation: L.blur })));
    paths.push(h('path', {
      key: `${i}-${j}`, d: L.d, fill: L.fill ? st.c : 'none', stroke: L.fill ? 'none' : st.c, strokeWidth: L.fill ? 0 : L.width,
      strokeLinecap: 'round', strokeLinejoin: 'round', opacity: L.alpha, filter: fid ? `url(#${fid})` : undefined,
      style: L.multiply ? { mixBlendMode: 'multiply' } : undefined, strokeDasharray: L.grain ? '6 0.6' : undefined,
    }));
  }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {h('svg', { width, height, viewBox: `0 0 ${width} ${height}`, style: { position: 'absolute', left: 0, top: 0 } }, h('defs', null, defs), paths)}
    </View>
  );
}

// A drawing as a picture (for the book maker): a square PNG on white, as a data address.
export async function strokesToImage(strokes, px = 1600, bg = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, px, px);
  const list = [...(strokes || []).filter((s) => s.f), ...(strokes || []).filter((s) => !s.f)];
  for (const st of list) {
    for (const L of layersFor(st, px)) {
      g.save();
      g.globalAlpha = L.alpha;
      g.globalCompositeOperation = L.multiply ? 'multiply' : 'source-over';
      g.filter = L.blur ? `blur(${L.blur}px)` : 'none';
      const p = new Path2D(L.d);
      if (L.fill) { g.fillStyle = st.c; g.fill(p); } else { g.strokeStyle = st.c; g.lineWidth = L.width; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(p); }
      g.restore();
    }
  }
  return c.toDataURL('image/png');
}
