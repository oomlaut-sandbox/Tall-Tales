// A drawing tool as a little picture (shapes from toolShapes.js), drawn with Skia on the phone.
import React, { useMemo } from 'react';
import { Canvas, Group, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { toolShapes } from './toolShapes';

export default function ToolArt({ kind, color, width = 60, height = 120 }) {
  const shapes = useMemo(() => toolShapes(kind, color).map((s) => ({ ...s, path: Skia.Path.MakeFromSVGString(s.d) })), [kind, color]);
  const k = width / 60;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Group transform={[{ scale: k }]}>
        {shapes.map((s, i) => (s.path ? (
          <Path key={i} path={s.path} color={s.fill || '#000'} style={s.stroke ? 'stroke' : 'fill'} strokeWidth={s.width || 0}>
            {s.grad ? <LinearGradient start={vec(s.dir === 'v' ? 30 : 0, 0)} end={s.dir === 'v' ? vec(30, 120) : vec(60, 0)} colors={s.grad} /> : null}
          </Path>
        ) : null))}
      </Group>
    </Canvas>
  );
}
