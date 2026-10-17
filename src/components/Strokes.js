// Draws notebook strokes (web preview: plain SVG; phones use Strokes.native.js with Skia).
import React from 'react';
import { View } from 'react-native';
import { strokeD } from '../strokes';

export function StrokesView({ strokes, width, height, live }) {
  const all = live ? [...(strokes || []), live] : strokes || [];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {React.createElement('svg', { width, height, viewBox: `0 0 ${width} ${height}`, style: { position: 'absolute', left: 0, top: 0 } },
        all.map((st, i) => React.createElement('path', {
          key: i, d: strokeD(st, width), fill: 'none', stroke: st.c, strokeWidth: Math.max(1, st.s * width), strokeLinecap: 'round', strokeLinejoin: 'round',
        })))}
    </View>
  );
}
