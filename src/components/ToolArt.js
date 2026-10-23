// A drawing tool as a little picture (shapes from toolShapes.js), drawn as SVG in the web preview.
import React from 'react';
import { View } from 'react-native';
import { toolShapes } from './toolShapes';

let uid = 0;
export default function ToolArt({ kind, color, width = 60, height = 120 }) {
  const h = React.createElement;
  const id = React.useMemo(() => `t${++uid}`, []);
  const shapes = toolShapes(kind, color);
  const defs = [];
  const paths = shapes.map((s, i) => {
    let fill = s.fill || '#000';
    if (s.grad) {
      const gid = `${id}-${i}`;
      defs.push(h('linearGradient', { key: gid, id: gid, x1: 0, y1: 0, x2: s.dir === 'v' ? 0 : 1, y2: s.dir === 'v' ? 1 : 0 },
        h('stop', { offset: '0%', stopColor: s.grad[0] }), h('stop', { offset: '100%', stopColor: s.grad[1] })));
      fill = `url(#${gid})`;
    }
    return h('path', { key: i, d: s.d, fill: s.stroke ? 'none' : fill, stroke: s.stroke, strokeWidth: s.width });
  });
  return (
    <View pointerEvents="none" style={{ width, height }}>
      {h('svg', { width, height, viewBox: '0 0 60 120' }, h('defs', null, defs), paths)}
    </View>
  );
}
