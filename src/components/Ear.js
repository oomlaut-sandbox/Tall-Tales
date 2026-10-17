// The notebook's rounded dog-ear, drawn as smooth shapes (web preview: SVG; phones: Ear.native.js with Skia).
// e: its size. r: the page's corner radius (the folded flap keeps the same round corner).
import React from 'react';
import { View } from 'react-native';
import { earPaths } from './earPaths';

export function EarArt({ e, r, under, flap }) {
  const P = earPaths(e, r);
  const h = React.createElement;
  return (
    <View pointerEvents="none" style={{ width: e, height: e }}>
      {h('svg', { width: e, height: e, viewBox: `0 0 ${e} ${e}` },
        h('defs', null, h('linearGradient', { id: 'earShade', x1: '0', y1: '0', x2: '1', y2: '1' },
          h('stop', { offset: '0.5', stopColor: '#000', stopOpacity: 0.18 }), h('stop', { offset: '0.75', stopColor: '#000', stopOpacity: 0 }))),
        h('path', { d: P.under, fill: under }),
        h('path', { d: P.under, fill: 'url(#earShade)' }),
        h('path', { d: P.flap, fill: flap }),
        h('path', { d: P.fold, stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1, fill: 'none' }))}
    </View>
  );
}
