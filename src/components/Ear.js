// The notebook's rounded dog-ear, drawn as smooth shapes (web preview: SVG; phones: Ear.native.js with Skia).
// e: its size. r: the page's corner radius (the folded flap keeps the same round corner).
// The drawing reaches P points further up and left, for the flap's soft shadow on the page.
import React from 'react';
import { View } from 'react-native';
import { EAR_PAD as P, earPaths } from './earPaths';

export function EarArt({ e, r, under, flap }) {
  const D = earPaths(e, r);
  const S = e + P;
  const h = React.createElement;
  return (
    <View pointerEvents="none" style={{ width: S, height: S }}>
      {h('svg', { width: S, height: S, viewBox: `0 0 ${S} ${S}` },
        h('defs', null,
          h('linearGradient', { id: 'earShade', x1: '0', y1: '0', x2: '1', y2: '1' },
            h('stop', { offset: '0.5', stopColor: '#000', stopOpacity: 0.18 }), h('stop', { offset: '0.75', stopColor: '#000', stopOpacity: 0 })),
          h('filter', { id: 'earBlur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, h('feGaussianBlur', { stdDeviation: 3.2 }))),
        h('g', { transform: `translate(${P} ${P})` },
          h('path', { d: D.under, fill: under }),
          h('path', { d: D.under, fill: 'url(#earShade)' }),
          // the lifted corner's shadow, cast softly onto the page around it
          h('path', { d: D.flap, fill: '#000', opacity: 0.3, transform: 'translate(-2.5 -2)', filter: 'url(#earBlur)' }),
          h('path', { d: D.flap, fill: flap }),
          h('path', { d: D.fold, stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1, fill: 'none' })))}
    </View>
  );
}
