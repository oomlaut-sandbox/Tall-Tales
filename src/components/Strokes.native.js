// Draws drawings on the phone with Skia, with natural-looking brushes (see layersFor in strokes.js): a brush pen
// that swells and tapers, soft see-through watercolour, a fine grainy pencil, a waxy crayon. Everything lies on
// paper with a texture: the paper's tooth shows through what's drawn (lighter specks where the paper dips), and a
// faint grain lies over the whole page. (The web preview uses Strokes.js.)
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { BlendMode, BlurMask, BlurStyle, Canvas, DiscretePathEffect, Group, ImageShader, PaintStyle, Path, Rect, Skia, StrokeCap, StrokeJoin, TileMode, useImage } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { drawOrder, layersFor } from '../strokes';

const GRAIN = require('../../assets/paper-grain.png'); // 512 × 512, repeats without seams
const TOOTH = require('../../assets/paper-tooth.png');
export const TILE = 0.7; // one repeat of the paper texture, in widths of the drawing (the same at every size)

const grainOf = (L) => (L.grain === 'crayon' ? [4, 1.5] : [2.5, 0.7]); // the rough edge: segment length, how far it wanders

function Layer({ L, color }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(L.d), [L.d]);
  if (!path) return null;
  const [gl, gd] = grainOf(L);
  return (
    <Path path={path} color={L.erase ? '#000000' : color} opacity={L.alpha} style={L.fill ? 'fill' : 'stroke'} strokeWidth={L.width || 0} strokeCap="round" strokeJoin="round"
      blendMode={L.erase ? 'clear' : L.multiply ? 'multiply' : 'srcOver'}>
      {L.blur ? <BlurMask blur={L.blur} style={L.inner ? 'inner' : 'normal'} /> : null}
      {L.grain ? <DiscretePathEffect length={gl} deviation={gd} /> : null}
    </Path>
  );
}
// the strokes in drawing order, in runs: a run of textured strokes (pencil, crayon, watercolour) is drawn on its own
// layer with the paper's tooth over it, so the ink of the fountain pen stays solid. tex: 0 none, 1 light, 2 strong
const texOf = (st, w) => (st.e ? -1 : Math.max(0, ...layersFor(st, w).map((L) => L.tex || 0)));
export function runsOf(list, w) {
  const runs = [];
  for (const st of list) {
    const t = texOf(st, w);
    const last = runs[runs.length - 1];
    if (last && last.tex === t && t > 0) last.list.push(st);
    else runs.push({ tex: t, list: [st] });
  }
  return runs;
}
const TOOTH_OF = { 1: 0.45, 2: 0.7 }; // (gentle: the paper shows, it doesn't take over)
function One({ st, width }) {
  const layers = useMemo(() => layersFor(st, width), [st, width]);
  return <>{layers.filter((L) => L.alpha).map((L, i) => <Layer key={i} L={L} color={st.c} />)}</>;
}

// noPaper: on a photo (no paper grain over the photo; the tooth still shows in what's drawn)
export function StrokesView({ strokes, width, height, live, noPaper }) {
  const grain = useImage(GRAIN);
  const tooth = useImage(TOOTH);
  const k = (TILE * width) / 512;
  const tex = (img) => <ImageShader image={img} tx="repeat" ty="repeat" rect={{ x: 0, y: 0, width: 512, height: 512 }} transform={[{ scale: k }]} />;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <Canvas style={{ width, height }}>
        {/* the drawing on its own layer: the eraser rubs down to the paper, and the tooth only marks what's drawn */}
        <Group layer>
          {/* fills under the lines, the eraser rubbing out what came before it (see drawOrder) */}
          {runsOf(drawOrder(live ? [...(strokes || []), live] : strokes), width).map((r, i) => (r.tex > 0 ? (
            <Group key={i} layer>
              {r.list.map((st, j) => <One key={j} st={st} width={width} />)}
              {tooth ? <Rect x={0} y={0} width={width} height={height} blendMode="srcATop" opacity={TOOTH_OF[r.tex]}>{tex(tooth)}</Rect> : null}
            </Group>
          ) : r.list.map((st, j) => <One key={`${i}-${j}`} st={st} width={width} />)))}
        </Group>
        {grain && !noPaper ? <Rect x={0} y={0} width={width} height={height} blendMode="multiply" opacity={0.6}>{tex(grain)}</Rect> : null}
      </Canvas>
    </View>
  );
}

let texCache = null;
async function textures() {
  if (texCache) return texCache;
  const load = async (mod) => {
    try {
      const a = Asset.fromModule(mod); await a.downloadAsync();
      const data = Skia.Data.fromBytes(await new File(a.localUri || a.uri).bytes());
      return Skia.Image.MakeImageFromEncoded(data);
    } catch (e) { return null; }
  };
  texCache = { grain: await load(GRAIN), tooth: await load(TOOTH) };
  return texCache;
}
const texPaint = (img, px, blend, alpha = 1) => {
  const k = (TILE * px) / 512;
  const m = Skia.Matrix(); m.scale(k, k);
  const p = Skia.Paint();
  p.setShader(img.makeShaderOptions(TileMode.Repeat, TileMode.Repeat, 1, 1, m)); // (linear filtering)
  p.setBlendMode(blend); p.setAlphaf(alpha);
  return p;
};

// A drawing as a picture (for the book maker): a square PNG, `px` wide, on white. Resolves to the file's address.
// photo: a photo to lie underneath (filling the square, cropped from its middle), for a drawing on a photo.
export async function strokesToImage(strokes, px = 1600, bg = '#ffffff', photo = null) {
  const T = await textures();
  const surface = (Skia.Surface.MakeOffscreen && Skia.Surface.MakeOffscreen(px, px)) || Skia.Surface.Make(px, px);
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color(bg));
  if (photo) {
    try {
      const data = Skia.Data.fromBytes(await new File(photo).bytes());
      const img = Skia.Image.MakeImageFromEncoded(data);
      if (img) {
        const w = img.width(), h = img.height(), s = Math.min(w, h);
        canvas.drawImageRect(img, Skia.XYWHRect((w - s) / 2, (h - s) / 2, s, s), Skia.XYWHRect(0, 0, px, px), Skia.Paint());
      }
    } catch (e) {}
  }
  canvas.saveLayer(); // the drawing on its own layer, so the eraser rubs down to the paper, not through it
  for (const r of runsOf(drawOrder(strokes), px)) {
   if (r.tex > 0) canvas.saveLayer();
   for (const st of r.list) {
    for (const L of layersFor(st, px)) {
      if (!L.alpha) continue;
      const path = Skia.Path.MakeFromSVGString(L.d);
      if (!path) continue;
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color(st.c));
      paint.setAlphaf(L.alpha);
      paint.setStyle(L.fill ? PaintStyle.Fill : PaintStyle.Stroke);
      if (!L.fill) { paint.setStrokeWidth(L.width); paint.setStrokeCap(StrokeCap.Round); paint.setStrokeJoin(StrokeJoin.Round); }
      if (L.blur) paint.setMaskFilter(Skia.MaskFilter.MakeBlur(L.inner ? BlurStyle.Inner : BlurStyle.Normal, L.blur, true));
      if (L.multiply) paint.setBlendMode(BlendMode.Multiply);
      if (L.erase) paint.setBlendMode(BlendMode.Clear);
      if (L.grain) { const [gl, gd] = grainOf(L); paint.setPathEffect(Skia.PathEffect.MakeDiscrete(gl * px / 400, gd * px / 400, 0)); }
      canvas.drawPath(path, paint);
    }
   }
   if (r.tex > 0) { if (T.tooth) canvas.drawRect(Skia.XYWHRect(0, 0, px, px), texPaint(T.tooth, px, BlendMode.SrcATop, TOOTH_OF[r.tex])); canvas.restore(); }
  }
  canvas.restore();
  if (T.grain && !photo) canvas.drawRect(Skia.XYWHRect(0, 0, px, px), texPaint(T.grain, px, BlendMode.Multiply, 0.6));
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes();
  const f = new File(Paths.cache, `drawing-${Date.now()}.png`);
  try { f.create(); } catch (e) {}
  f.write(bytes);
  return f.uri;
}
