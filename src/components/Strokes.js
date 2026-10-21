// Draws drawings in the web preview (SVG), with the same brushes as the phone (see layersFor in strokes.js).
// Phones use Strokes.native.js.
import React from 'react';
import { View } from 'react-native';
import { drawOrder, layersFor } from '../strokes';

let uid = 0;
export function StrokesView({ strokes, width, height, live }) {
  const all = drawOrder(live ? [...(strokes || []), live] : strokes || []);
  const h = React.createElement;
  const id = React.useMemo(() => `s${++uid}`, []);
  const defs = [];
  let paths = [];
  all.forEach((st, i) => layersFor(st, width).filter((L) => L.alpha && !L.inner).forEach((L, j) => { // (the inner rim is drawn on the phone only)
    if (L.erase) { // the eraser: everything so far goes into a group, masked where it rubbed
      const mid = `${id}-m${i}`;
      defs.push(h('mask', { key: mid, id: mid, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width, height },
        h('rect', { x: 0, y: 0, width, height, fill: 'white' }),
        h('path', { d: L.d, fill: 'none', stroke: 'black', strokeWidth: L.width, strokeLinecap: 'round', strokeLinejoin: 'round' })));
      paths = [h('g', { key: mid, mask: `url(#${mid})` }, paths)];
      return;
    }
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
  const out = document.createElement('canvas');
  out.width = px; out.height = px;
  const c = document.createElement('canvas'); // the drawing on its own sheet, so the eraser rubs down to the paper
  c.width = px; c.height = px;
  const g = c.getContext('2d');
  const list = drawOrder(strokes);
  for (const st of list) {
    for (const L of layersFor(st, px).filter((L2) => L2.alpha && !L2.inner)) {
      g.save();
      g.globalAlpha = L.alpha;
      g.globalCompositeOperation = L.erase ? 'destination-out' : L.multiply ? 'multiply' : 'source-over';
      g.filter = L.blur ? `blur(${L.blur}px)` : 'none';
      const p = new Path2D(L.d);
      if (L.fill) { g.fillStyle = st.c; g.fill(p); } else { g.strokeStyle = L.erase ? '#000' : st.c; g.lineWidth = L.width; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(p); }
      g.restore();
    }
  }
  const o = out.getContext('2d');
  o.fillStyle = bg; o.fillRect(0, 0, px, px);
  o.drawImage(c, 0, 0);
  return out.toDataURL('image/png');
}
