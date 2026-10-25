// Draws drawings on the phone with Skia, with natural-looking brushes (see layersFor in strokes.js): a brush pen
// that swells and tapers, soft see-through watercolour, a fine grainy pencil, a waxy crayon. Everything lies on
// paper with a texture: the paper's tooth shows through what's drawn (lighter specks where the paper dips), and a
// faint grain lies over the whole page. (The web preview uses Strokes.js.)
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { AlphaType, BackdropBlur, BlendMode, BlurMask, BlurStyle, Canvas, ClipOp, ColorType, DiscretePathEffect, Group, Image as SkImage, ImageShader, PaintStyle, Path, Rect, Skia, StrokeCap, StrokeJoin, TileMode, useImage } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { byLayer, drawOrder, layersFor, mirrored, smudgeOf } from '../strokes';
import { STAMP, stampBox } from '../stamps';

const GRAIN = require('../../assets/paper-grain.png'); // 512 × 512, repeats without seams
const TOOTH = require('../../assets/paper-tooth.png');
export const TILE = 0.7; // one repeat of the paper texture, in widths of the drawing (the same at every size)

const grainOf = (L) => (L.grain === 'crayon' ? [4, 1.5] : [2.5, 0.7]); // the rough edge: segment length, how far it wanders

const Layer = React.memo(function Layer({ L, color }) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(L.d), [L.d]);
  if (!path) return null;
  const [gl, gd] = grainOf(L);
  return (
    <Path path={path} color={L.erase ? '#000000' : color} opacity={L.alpha} style={L.fill ? 'fill' : 'stroke'} strokeWidth={L.width || 0} strokeCap="round" strokeJoin="round"
      blendMode={L.erase ? 'dstOut' : L.multiply ? 'multiply' : 'srcOver'}>
      {L.blur ? <BlurMask blur={L.blur} style={L.inner ? 'inner' : 'normal'} /> : null}
      {L.grain ? <DiscretePathEffect length={gl} deviation={gd} /> : null}
    </Path>
  );
});
// the strokes in drawing order, in runs: a run of textured strokes (pencil, crayon, watercolour) is drawn on its own
// layer with the paper's tooth over it, so the ink of the fountain pen stays solid. tex: 0 none, 1 light, 2 strong
const texOf = (st, w) => (st.e || st.sm ? -1 : Math.max(0, ...layersFor(st, w).map((L) => L.tex || 0)));
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
// the smudge's shape as an outline Skia can clip to (the rubbed line, as wide as the fingertip)
// soft edges: three rubs, wide and light, then narrower and stronger, so the blur fades out at its edges
const SMUDGE_PASSES = [[1.6, 0.25], [1.2, 0.5], [0.85, 1]];
function smudgePaths(st, w) {
  const S = smudgeOf(st, w);
  const p = Skia.Path.MakeFromSVGString(S.d);
  if (!p) return [];
  return SMUDGE_PASSES.map(([kw, kb]) => {
    const out = p.copy();
    out.stroke({ width: S.width * kw, cap: StrokeCap.Round, join: StrokeJoin.Round });
    return { path: out, blur: S.blur * kb };
  });
}
function Smudge({ st, width }) {
  const parts = useMemo(() => (st.m ? [{ ...st, m: 0 }, mirrored(st)] : [st]).flatMap((q) => smudgePaths(q, width)), [st, width]);
  // blurs what has been drawn so far, only where the finger rubbed
  return <>{parts.map((P, i) => <BackdropBlur key={i} blur={P.blur} clip={P.path} />)}</>;
}
// a stamp: its picture in its box (flipped when it faces the other way; mirror drawing: on both sides)
function StampPic({ st, width }) {
  const img = useImage((STAMP[st.stp] || {}).src);
  if (!img) return null;
  const b = stampBox(st, width);
  const pic = <SkImage image={img} x={b.x} y={b.y} width={b.w} height={b.h} fit="contain" />;
  return st.fx ? <Group transform={[{ translateX: 2 * (b.x + b.w / 2) }, { scaleX: -1 }]}>{pic}</Group> : pic;
}
const One = React.memo(function One({ st, width }) {
  if (st.stp) return st.m ? <><StampPic st={{ ...st, m: 0 }} width={width} /><StampPic st={mirrored(st)} width={width} /></> : <StampPic st={st} width={width} />;
  if (st.sm) return <Smudge st={st} width={width} />;
  const layers = useMemo(() => layersFor(st, width), [st, width]);
  return <>{layers.filter((L) => L.alpha).map((L, i) => <Layer key={i} L={L} color={st.c} />)}</>;
});

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
        {/* behind the lines first, then everything else, each on its own layer (the eraser only rubs its own layer) */}
        {byLayer(live ? [...(strokes || []), live] : strokes).map((part, n) => (part.length ? (
        <Group key={n} layer>
          {/* fills under the lines, the eraser rubbing out what came before it (see drawOrder) */}
          {runsOf(drawOrder(part), width).map((r, i) => (r.tex > 0 ? (
            <Group key={i} layer>
              {r.list.map((st, j) => <One key={j} st={st} width={width} />)}
              {tooth ? <Rect x={0} y={0} width={width} height={height} blendMode="srcATop" opacity={TOOTH_OF[r.tex]}>{tex(tooth)}</Rect> : null}
            </Group>
          ) : r.list.map((st, j) => <One key={`${i}-${j}`} st={st} width={width} />)))}
        </Group>
        ) : null))}
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
const stampCache = {};
async function stampImage(k) {
  if (k in stampCache) return stampCache[k];
  try {
    const a = Asset.fromModule((STAMP[k] || {}).src); await a.downloadAsync();
    stampCache[k] = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(await new File(a.localUri || a.uri).bytes()));
  } catch (e) { stampCache[k] = null; }
  return stampCache[k];
}
// draws a stamp onto a canvas (for the exported picture and the eyedropper)
async function drawStamp(canvas, st, px) {
  for (const q of st.m ? [{ ...st, m: 0 }, mirrored(st)] : [st]) {
    const img = await stampImage(q.stp);
    if (!img) continue;
    const b = stampBox(q, px);
    canvas.save();
    canvas.translate(b.x + b.w / 2, b.y + b.h / 2);
    if (q.fx) canvas.scale(-1, 1);
    const p = Skia.Paint(); p.setAntiAlias(true);
    canvas.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(-b.w / 2, -b.h / 2, b.w, b.h), p);
    canvas.restore();
  }
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
  for (const part of byLayer(strokes)) {
  if (!part.length) continue;
  canvas.saveLayer(); // the drawing on its own layer, so the eraser rubs down to the paper, not through it (behind the lines, then the rest)
  for (const r of runsOf(drawOrder(part), px)) {
   if (r.tex > 0) canvas.saveLayer();
   for (const st of r.list) {
    if (st.stp) { await drawStamp(canvas, st, px); continue; }
    if (st.sm) { // the smudge: blur what's there so far, inside where the finger rubbed
      for (const q of st.m ? [{ ...st, m: 0 }, mirrored(st)] : [st]) {
        for (const P of smudgePaths(q, px)) {
        canvas.save();
        canvas.clipPath(P.path, ClipOp.Intersect, true);
        canvas.saveLayer(undefined, null, Skia.ImageFilter.MakeBlur(P.blur, P.blur, TileMode.Clamp, null));
        canvas.restore();
        canvas.restore();
        }
      }
      continue;
    }
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
      if (L.erase) paint.setBlendMode(BlendMode.DstOut);
      if (L.grain) { const [gl, gd] = grainOf(L); paint.setPathEffect(Skia.PathEffect.MakeDiscrete(gl * px / 400, gd * px / 400, 0)); }
      canvas.drawPath(path, paint);
    }
   }
   if (r.tex > 0) { if (T.tooth) canvas.drawRect(Skia.XYWHRect(0, 0, px, px), texPaint(T.tooth, px, BlendMode.SrcATop, TOOTH_OF[r.tex])); canvas.restore(); }
  }
  canvas.restore();
  }
  if (T.grain && !photo) canvas.drawRect(Skia.XYWHRect(0, 0, px, px), texPaint(T.grain, px, BlendMode.Multiply, 0.6));
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes();
  const f = new File(Paths.cache, `drawing-${Date.now()}.png`);
  try { f.create(); } catch (e) {}
  f.write(bytes);
  return f.uri;
}

// The eyedropper: the colour at (x, y) (in widths of the drawing) as you see it: the drawing over its photo or the
// white paper, worked out on a small picture of the page. aspect: the page's height in widths (2 for a tall page).
export async function colourAt(strokes, x, y, aspect = 1, photo = null) {
  const px = 240, ph = Math.round(px * aspect);
  const surface = (Skia.Surface.MakeOffscreen && Skia.Surface.MakeOffscreen(px, ph)) || Skia.Surface.Make(px, ph);
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('#ffffff'));
  if (photo) {
    try {
      const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(await new File(photo).bytes()));
      if (img) { // as the page shows it: filling the page, cropped from its middle
        const w = img.width(), h = img.height(), k = Math.min(w / px, h / ph), sw = px * k, sh = ph * k;
        canvas.drawImageRect(img, Skia.XYWHRect((w - sw) / 2, (h - sh) / 2, sw, sh), Skia.XYWHRect(0, 0, px, ph), Skia.Paint());
      }
    } catch (e) {}
  }
  for (const part of byLayer(strokes)) {
  canvas.saveLayer();
  for (const st of drawOrder(part)) {
    if (st.sm) continue;
    if (st.stp) { await drawStamp(canvas, st, px); continue; }
    for (const L of layersFor(st, px)) {
      if (!L.alpha) continue;
      const path = Skia.Path.MakeFromSVGString(L.d);
      if (!path) continue;
      const paint = Skia.Paint();
      paint.setAntiAlias(true); paint.setColor(Skia.Color(st.c)); paint.setAlphaf(L.alpha);
      paint.setStyle(L.fill ? PaintStyle.Fill : PaintStyle.Stroke);
      if (!L.fill) { paint.setStrokeWidth(L.width); paint.setStrokeCap(StrokeCap.Round); paint.setStrokeJoin(StrokeJoin.Round); }
      if (L.blur) paint.setMaskFilter(Skia.MaskFilter.MakeBlur(L.inner ? BlurStyle.Inner : BlurStyle.Normal, L.blur, true));
      if (L.multiply) paint.setBlendMode(BlendMode.Multiply);
      if (L.erase) paint.setBlendMode(BlendMode.DstOut);
      canvas.drawPath(path, paint);
    }
  }
  canvas.restore();
  }
  surface.flush();
  const img = surface.makeImageSnapshot();
  const cx = Math.max(0, Math.min(px - 1, Math.round(x * px))), cy = Math.max(0, Math.min(ph - 1, Math.round(y * px)));
  const d = img.readPixels(cx, cy, { width: 1, height: 1, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
  if (!d || d.length < 3) return null;
  return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
}
