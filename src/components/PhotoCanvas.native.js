// Photo editing for the book maker (Jörg, 26 Oct 2026): one drawing, used twice: live in the editor's square, and
// at full size (1600 px) when Done is tapped, so the saved page looks exactly like the preview.
// The photo itself is never changed: the page keeps the original (src) and how it was set out (edit).
import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, ClipOp, ImageFormat, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { frameOf, LOOKS } from './photoLayout';

// the photo, upright (the phone's turning is baked in first), ready to draw
const cache = {};
export async function loadPhoto(uri) {
  if (cache[uri]) return cache[uri];
  let src = uri;
  try { src = (await ImageManipulator.manipulateAsync(uri, [], { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG })).uri; } catch (e) {}
  const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(await new File(src).bytes()));
  if (img) cache[uri] = img;
  return img;
}

// draw the page: the background, then the photo inside its frame (a square, an inset square or a circle)
function draw(canvas, S, img, e) {
  canvas.clear(Skia.Color(e.bg || '#ffffff'));
  if (!img) return;
  const F = frameOf(e.layout, S);
  canvas.save();
  if (e.layout === 'circle') { const p = Skia.Path.Make(); p.addOval(Skia.XYWHRect(F.x, F.y, F.w, F.h)); canvas.clipPath(p, ClipOp.Intersect, true); }
  else canvas.clipRect(Skia.XYWHRect(F.x, F.y, F.w, F.h), ClipOp.Intersect, true);
  const iw = img.width(), ih = img.height();
  const turned = (e.rot || 0) % 180 !== 0;
  const rw = turned ? ih : iw, rh = turned ? iw : ih;
  const base = e.layout === 'fit' ? Math.min(F.w / rw, F.h / rh) : Math.max(F.w / rw, F.h / rh);
  const s = base * (e.zoom || 1);
  canvas.translate(F.x + F.w / 2 + (e.ox || 0) * F.w, F.y + F.h / 2 + (e.oy || 0) * F.h);
  canvas.rotate(e.rot || 0, 0, 0);
  canvas.scale(e.flip ? -s : s, s);
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const m = LOOKS[e.look] && LOOKS[e.look].m;
  if (m) paint.setColorFilter(Skia.ColorFilter.MakeMatrix(m));
  canvas.drawImage(img, -iw / 2, -ih / 2, paint);
  canvas.restore();
}

// the live preview
export function PhotoPreview({ uri, edit, size }) {
  const [img, setImg] = useState(null);
  useEffect(() => { let on = true; loadPhoto(uri).then((i) => on && setImg(i)).catch(() => {}); return () => { on = false; }; }, [uri]);
  const pic = useMemo(() => createPicture((c) => draw(c, size, img, edit), Skia.XYWHRect(0, 0, size, size)), [img, size, JSON.stringify(edit)]);
  return <Canvas style={{ width: size, height: size }}><Picture picture={pic} /></Canvas>;
}

// the finished page picture: a square JPEG in the cache (the book maker keeps it with the book)
export async function composePhoto(uri, edit, px = 1600) {
  const img = await loadPhoto(uri);
  if (!img) return null;
  const surface = (Skia.Surface.MakeOffscreen && Skia.Surface.MakeOffscreen(px, px)) || Skia.Surface.Make(px, px);
  draw(surface.getCanvas(), px, img, edit);
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 90);
  const f = new File(Paths.cache, `photo-${Date.now()}.jpg`);
  try { f.create(); } catch (e) {}
  f.write(bytes);
  return { uri: f.uri, w: px, h: px };
}
