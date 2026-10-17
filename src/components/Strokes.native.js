// Draws notebook drawings on the phone with Skia, like pencil crayons: each line is laid down in a few
// slightly offset, see-through passes, and the paper's grain shows through the colour.
// (The web preview uses Strokes.js.)
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, Group, ImageShader, Paint, Path, Rect, Skia, rect, useImage } from '@shopify/react-native-skia';
import { strokeD } from '../strokes';

const GRAIN = require('../../assets/crayon-grain.png');

function One({ st, width }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(strokeD(st, width)), [st, width]);
  if (!path) return null;
  const w = Math.max(1, st.s * width);
  const o = Math.max(0.6, w * 0.22); // how far the extra passes wander from the line
  return (
    <Group>
      <Path path={path} color={st.c} opacity={0.82} style="stroke" strokeWidth={w} strokeCap="round" strokeJoin="round" />
      <Group transform={[{ translateX: o }, { translateY: -o * 0.6 }]}>
        <Path path={path} color={st.c} opacity={0.35} style="stroke" strokeWidth={w * 0.7} strokeCap="round" strokeJoin="round" />
      </Group>
      <Group transform={[{ translateX: -o * 0.7 }, { translateY: o * 0.5 }]}>
        <Path path={path} color={st.c} opacity={0.3} style="stroke" strokeWidth={w * 0.55} strokeCap="round" strokeJoin="round" />
      </Group>
    </Group>
  );
}

export function StrokesView({ strokes, width, height, live }) {
  const grain = useImage(GRAIN);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <Canvas style={{ width, height }}>
        {/* the crayon lines on their own layer, then the paper's tooth taken out of them */}
        <Group layer={<Paint />}>
          {(strokes || []).map((st, i) => <One key={i} st={st} width={width} />)}
          {live ? <One st={live} width={width} /> : null}
          {grain ? (
            <Rect x={0} y={0} width={width} height={height} blendMode="dstOut" opacity={0.75}>
              <ImageShader image={grain} tx="repeat" ty="repeat" fit="none" rect={rect(0, 0, 256, 256)} />
            </Rect>
          ) : null}
        </Group>
      </Canvas>
    </View>
  );
}
