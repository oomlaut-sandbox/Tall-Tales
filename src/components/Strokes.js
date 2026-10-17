// Draws notebook drawings in the web preview (SVG), like pencil crayons: a few slightly offset,
// see-through passes per line, with a grain filter so the paper shows through. Phones use Strokes.native.js.
import React from 'react';
import { View } from 'react-native';
import { strokeD } from '../strokes';

let seq = 0;
export function StrokesView({ strokes, width, height, live }) {
  const id = React.useMemo(() => `crayon${++seq}`, []);
  const all = live ? [...(strokes || []), live] : strokes || [];
  const h = React.createElement;
  const pass = (st, i, k, dx, dy, op, wf) => h('path', {
    key: `${i}-${k}`, d: strokeD(st, width), transform: `translate(${dx} ${dy})`, fill: 'none', stroke: st.c, opacity: op,
    strokeWidth: Math.max(1, st.s * width * wf), strokeLinecap: 'round', strokeLinejoin: 'round',
  });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {h('svg', { width, height, viewBox: `0 0 ${width} ${height}`, style: { position: 'absolute', left: 0, top: 0 } },
        h('defs', null, h('filter', { id, x: 0, y: 0, width: '100%', height: '100%' },
          h('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9 0.45', numOctaves: 2, seed: 3, result: 'n' }),
          h('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.55', result: 'm' }),
          h('feComposite', { in: 'SourceGraphic', in2: 'm', operator: 'in' }))),
        h('g', { filter: `url(#${id})` }, all.map((st, i) => {
          const o = Math.max(0.6, st.s * width * 0.22);
          return h('g', { key: i }, pass(st, i, 0, 0, 0, 0.82, 1), pass(st, i, 1, o, -o * 0.6, 0.35, 0.7), pass(st, i, 2, -o * 0.7, o * 0.5, 0.3, 0.55));
        })))}
    </View>
  );
}
