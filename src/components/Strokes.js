// Draws notebook drawings in the web preview (SVG): plain solid lines. Phones use Strokes.native.js.
import React from 'react';
import { View } from 'react-native';
import { fillD, strokeD } from '../strokes';

export function StrokesView({ strokes, width, height, live }) {
  const list = live ? [...(strokes || []), live] : strokes || [];
  const all = [...list.filter((st) => st.f), ...list.filter((st) => !st.f)]; // fills under every line
  const h = React.createElement;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {h('svg', { width, height, viewBox: `0 0 ${width} ${height}`, style: { position: 'absolute', left: 0, top: 0 } },
        all.map((st, i) => (st.f ? h('path', { key: i, d: fillD(st, width), fill: st.c }) : h('path', { key: i, d: strokeD(st, width), fill: 'none', stroke: st.c, strokeWidth: Math.max(1, st.s * width), strokeLinecap: 'round', strokeLinejoin: 'round' }))))}
    </View>
  );
}
