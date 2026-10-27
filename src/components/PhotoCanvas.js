// Photo editing, web preview only: the same layout drawn with plain views (the finished picture is made in the
// app, with Skia; on the web the page keeps the original photo).
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { frameOf, LOOKS } from './photoLayout';

export async function loadPhoto() { return null; }
export async function composePhoto() { return null; }

export function PhotoPreview({ uri, edit, size }) {
  const [dim, setDim] = useState(null);
  useEffect(() => { Image.getSize(uri, (w, h) => setDim({ w, h }), () => setDim({ w: 1, h: 1 })); }, [uri]);
  const F = frameOf(edit.layout, size);
  let photo = null;
  if (dim) {
    const turned = (edit.rot || 0) % 180 !== 0;
    const rw = turned ? dim.h : dim.w, rh = turned ? dim.w : dim.h;
    const base = edit.layout === 'fit' ? Math.min(F.w / rw, F.h / rh) : Math.max(F.w / rw, F.h / rh);
    const s = base * (edit.zoom || 1), w = dim.w * s, h = dim.h * s;
    photo = (
      <Image source={{ uri }} style={{ position: 'absolute', width: w, height: h, left: F.w / 2 + (edit.ox || 0) * F.w - w / 2, top: F.h / 2 + (edit.oy || 0) * F.h - h / 2,
        transform: [{ rotate: `${edit.rot || 0}deg` }, { scaleX: edit.flip ? -1 : 1 }], filter: (LOOKS[edit.look] || LOOKS.none).css }} />
    );
  }
  return (
    <View style={{ width: size, height: size, backgroundColor: edit.bg || '#ffffff' }}>
      <View style={{ position: 'absolute', left: F.x, top: F.y, width: F.w, height: F.h, overflow: 'hidden', borderRadius: edit.layout === 'circle' ? F.w / 2 : 0 }}>{photo}</View>
    </View>
  );
}
