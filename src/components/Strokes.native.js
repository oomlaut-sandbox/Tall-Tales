// Draws notebook drawings on the phone with Skia: plain solid lines. (The web preview uses Strokes.js.)
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { fillD, strokeD } from '../strokes';

function One({ st, width }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(st.f ? fillD(st, width) : strokeD(st, width)), [st, width]);
  if (!path) return null;
  if (st.f) return <Path path={path} color={st.c} style="fill" />; // a paint-bucket fill
  // a plain, solid line
  return <Path path={path} color={st.c} style="stroke" strokeWidth={Math.max(1, st.s * width)} strokeCap="round" strokeJoin="round" />;
}

export function StrokesView({ strokes, width, height, live }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <Canvas style={{ width, height }}>
        {/* fills first, under every line, then the lines */}
        {(strokes || []).map((st, i) => (st.f ? <One key={i} st={st} width={width} /> : null))}
        {(strokes || []).map((st, i) => (st.f ? null : <One key={i} st={st} width={width} />))}
        {live ? <One st={live} width={width} /> : null}
      </Canvas>
    </View>
  );
}
