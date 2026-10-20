// Draws drawings on the phone with Skia, with natural-looking brushes (see layersFor in strokes.js): a brush pen
// that swells and tapers, soft see-through watercolour, a fine grainy pencil. (The web preview uses Strokes.js.)
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { BlendMode, BlurMask, BlurStyle, Canvas, DiscretePathEffect, PaintStyle, Path, Skia, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { layersFor } from '../strokes';

function Layer({ L, color }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(L.d), [L.d]);
  if (!path) return null;
  return (
    <Path path={path} color={color} opacity={L.alpha} style={L.fill ? 'fill' : 'stroke'} strokeWidth={L.width || 0} strokeCap="round" strokeJoin="round"
      blendMode={L.multiply ? 'multiply' : 'srcOver'}>
      {L.blur ? <BlurMask blur={L.blur} style="normal" /> : null}
      {L.grain ? <DiscretePathEffect length={2.5} deviation={0.7} /> : null}
    </Path>
  );
}
function One({ st, width }) {
  const layers = useMemo(() => layersFor(st, width), [st, width]);
  return <>{layers.map((L, i) => <Layer key={i} L={L} color={st.c} />)}</>;
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

// A drawing as a picture (for the book maker): a square PNG, `px` wide, on white. Resolves to the file's address.
export async function strokesToImage(strokes, px = 1600, bg = '#ffffff') {
  const surface = (Skia.Surface.MakeOffscreen && Skia.Surface.MakeOffscreen(px, px)) || Skia.Surface.Make(px, px);
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color(bg));
  const list = [...(strokes || []).filter((s) => s.f), ...(strokes || []).filter((s) => !s.f)];
  for (const st of list) {
    for (const L of layersFor(st, px)) {
      const path = Skia.Path.MakeFromSVGString(L.d);
      if (!path) continue;
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color(st.c));
      paint.setAlphaf(L.alpha);
      paint.setStyle(L.fill ? PaintStyle.Fill : PaintStyle.Stroke);
      if (!L.fill) { paint.setStrokeWidth(L.width); paint.setStrokeCap(StrokeCap.Round); paint.setStrokeJoin(StrokeJoin.Round); }
      if (L.blur) paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, L.blur, true));
      if (L.multiply) paint.setBlendMode(BlendMode.Multiply);
      if (L.grain) paint.setPathEffect(Skia.PathEffect.MakeDiscrete(2.5 * px / 400, 0.7 * px / 400, 0));
      canvas.drawPath(path, paint);
    }
  }
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes();
  const f = new File(Paths.cache, `drawing-${Date.now()}.png`);
  try { f.create(); } catch (e) {}
  f.write(bytes);
  return f.uri;
}
