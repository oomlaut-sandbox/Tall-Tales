// Draws drawings in the web preview (SVG), with the same brushes as the phone (see layersFor in strokes.js).
// Phones use Strokes.native.js.
import React from 'react';
import { View } from 'react-native';
import { byLayer, drawOrder, layersFor, mirrored, smudgeOf } from '../strokes';
import { STAMP, stampBox } from '../stamps';

const src = (m) => (typeof m === 'string' ? m : (m && (m.uri || m.default)) || '');
const GRAIN = src(require('../../assets/paper-grain.png'));
const TOOTH = src(require('../../assets/paper-tooth.png'));
const TILE = 0.7; // one repeat of the paper texture, in widths of the drawing (as on the phone)

let uid = 0;
// The paper: its tooth shows through what's drawn (lighter specks where the paper dips), a faint grain over all.
export function StrokesView({ strokes, width, height, live, noPaper }) {
  const h = React.createElement;
  const id0 = React.useMemo(() => `s${++uid}`, []);
  const defs = [];
  const groups = [];
  // behind the lines first, then everything else, each built on its own (the eraser only rubs its own layer)
  byLayer(live ? [...(strokes || []), live] : strokes || []).forEach((part, n) => {
  const id = `${id0}-${n}`;
  const all = drawOrder(part);
  let paths = [];
  all.forEach((st, i) => (st.ph ? paths.push(h('image', { key: `${i}-ph`, href: st.ph, x: 0, y: 0, width, height, preserveAspectRatio: 'xMidYMid slice' })) /* an imported photo, filling the page */ : st.stp ? (st.m ? [{ ...st, m: 0 }, mirrored(st)] : [st]).forEach((q, j) => { // a stamp: its picture
    const b = stampBox(q, width), cx = b.x + b.w / 2;
    paths.push(h('image', { key: `${i}-st${j}`, href: src((STAMP[q.stp] || {}).src), x: b.x, y: b.y, width: b.w, height: b.h, preserveAspectRatio: 'xMidYMid meet',
      transform: q.fx ? `translate(${2 * cx} 0) scale(-1 1)` : undefined }));
  }) : st.sm ? (() => { // the smudge: a blurred copy of everything so far, shown only where the finger rubbed
    const S = smudgeOf(st, width), mid = `${id}-s${i}`, fid = `${id}-sb${i}`;
    defs.push(h('mask', { key: mid, id: mid, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width, height },
      h('path', { d: S.d, fill: 'none', stroke: 'white', strokeWidth: S.width * 1.2, strokeLinecap: 'round', strokeLinejoin: 'round', filter: `url(#${mid}-f)` })));
    defs.push(h('filter', { key: `${mid}-f`, id: `${mid}-f`, x: '-20%', y: '-20%', width: '140%', height: '140%' }, h('feGaussianBlur', { stdDeviation: S.width * 0.25 }))); // (soft edges)
    defs.push(h('filter', { key: fid, id: fid, x: '-10%', y: '-10%', width: '120%', height: '120%' }, h('feGaussianBlur', { stdDeviation: S.blur })));
    paths = [h('g', { key: `${mid}-a` }, paths), h('g', { key: `${mid}-b`, mask: `url(#${mid})` }, h('g', { filter: `url(#${fid})` }, paths))];
  })() : layersFor(st, width).filter((L) => L.alpha && !L.inner).forEach((L, j) => { // (the inner rim is drawn on the phone only)
    if (L.erase) { // the eraser: everything so far goes into a group, masked where it rubbed
      const mid = `${id}-m${i}`;
      defs.push(h('mask', { key: mid, id: mid, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width, height },
        h('rect', { x: 0, y: 0, width, height, fill: 'white' }),
        h('path', { d: L.d, fill: 'none', stroke: 'black', strokeOpacity: L.alpha, strokeWidth: L.width, strokeLinecap: 'round', strokeLinejoin: 'round', filter: L.blur ? `url(#${mid}-e)` : undefined })));
      if (L.blur) defs.push(h('filter', { key: `${mid}-e`, id: `${mid}-e`, x: '-20%', y: '-20%', width: '140%', height: '140%' }, h('feGaussianBlur', { stdDeviation: L.blur })));
      paths = [h('g', { key: mid, mask: `url(#${mid})` }, paths)];
      return;
    }
    const fid = L.blur ? `${id}-${i}-${j}` : null;
    if (fid) defs.push(h('filter', { key: fid, id: fid, x: '-50%', y: '-50%', width: '200%', height: '200%' }, h('feGaussianBlur', { stdDeviation: L.blur })));
    paths.push(h('path', {
      key: `${i}-${j}`, d: L.d, fill: L.fill ? st.c : 'none', stroke: L.fill ? 'none' : st.c, strokeWidth: L.fill ? 0 : L.width,
      strokeLinecap: 'round', strokeLinejoin: 'round', opacity: L.alpha, filter: fid ? `url(#${fid})` : undefined,
      style: L.multiply ? { mixBlendMode: 'multiply' } : undefined, strokeDasharray: L.grain === 'crayon' ? '3 1.4' : L.grain ? '6 0.6' : undefined,
    }));
  })));
  groups.push(h('g', { key: id, opacity: part.a < 1 ? part.a : undefined }, paths));
  });
  const id = id0;
  const tile = TILE * width;
  defs.push(h('filter', { key: 'tooth', id: `${id}-tooth`, x: 0, y: 0, width, height, filterUnits: 'userSpaceOnUse' },
    h('feImage', { href: TOOTH, x: 0, y: 0, width: tile, height: tile, preserveAspectRatio: 'none', result: 't' }),
    h('feTile', { in: 't', result: 'tt' }),
    h('feComponentTransfer', { in: 'tt', result: 'ta' }, h('feFuncA', { type: 'linear', slope: 0.5 })),
    h('feComposite', { in: 'ta', in2: 'SourceGraphic', operator: 'atop' })));
  defs.push(h('pattern', { key: 'grain', id: `${id}-grain`, patternUnits: 'userSpaceOnUse', width: tile, height: tile },
    h('image', { href: GRAIN, x: 0, y: 0, width: tile, height: tile, preserveAspectRatio: 'none' })));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {h('svg', { width, height, viewBox: `0 0 ${width} ${height}`, style: { position: 'absolute', left: 0, top: 0 } }, h('defs', null, defs),
        h('g', { filter: `url(#${id}-tooth)` }, h('g', null, groups)),
        noPaper ? null : h('rect', { x: 0, y: 0, width, height, fill: `url(#${id}-grain)`, style: { mixBlendMode: 'multiply', pointerEvents: 'none', opacity: 0.6 } }))}
    </View>
  );
}

// A drawing as a picture (for the book maker): a square PNG on white, as a data address.
export async function strokesToImage(strokes, px = 1600, bg = '#ffffff', photo = null) { // eslint-disable-line no-unused-vars
  const out = document.createElement('canvas');
  out.width = px; out.height = px;
  const c = document.createElement('canvas'); // the drawing on its own sheet, so the eraser rubs down to the paper
  c.width = px; c.height = px;
  const o = out.getContext('2d');
  o.fillStyle = bg; o.fillRect(0, 0, px, px);
  for (const part of byLayer(strokes)) { // behind the lines, then the rest, each on its own sheet
  const g = c.getContext('2d');
  g.clearRect(0, 0, px, px);
  for (const st of drawOrder(part)) {
    if (st.ph) { await drawPhotoWeb(g, st, px, px); continue; }
    if (st.stp) { await drawStampWeb(g, st, px); continue; }
    for (const L of layersFor(st, px).filter((L2) => L2.alpha && !L2.inner)) {
      g.save();
      g.globalAlpha = L.alpha;
      g.globalCompositeOperation = L.erase ? 'destination-out' : L.multiply ? 'multiply' : 'source-over';
      g.filter = L.blur ? `blur(${L.blur}px)` : 'none';
      const p = new Path2D(L.d);
      if (L.fill) { g.fillStyle = st.c; g.fill(p); } else { g.strokeStyle = L.erase ? '#000' : st.c; g.lineWidth = L.width; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(p); }
      g.restore();
    }
  }
  o.globalAlpha = part.a < 1 ? part.a : 1; o.drawImage(c, 0, 0); o.globalAlpha = 1;
  }
  return out.toDataURL('image/png');
}

// The eyedropper (web preview): the colour at (x, y) on a small picture of the page (the drawing over its photo)
async function pageCanvas(strokes, px, ph, photo) {
  const c = document.createElement('canvas'); c.width = px; c.height = ph;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, px, ph);
  if (photo) {
    await new Promise((res) => { const im = new window.Image(); im.crossOrigin = 'anonymous'; im.onload = () => { const k = Math.min(im.width / px, im.height / ph), sw = px * k, sh = ph * k; g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, 0, 0, px, ph); res(); }; im.onerror = res; im.src = photo; });
  }
  const d = document.createElement('canvas'); d.width = px; d.height = ph;
  const h = d.getContext('2d');
  for (const part of byLayer(strokes)) {
  h.clearRect(0, 0, px, ph);
  for (const st of drawOrder(part)) {
    if (st.sm) continue;
    if (st.ph) { await drawPhotoWeb(h, st, px, ph); continue; }
    if (st.stp) { await drawStampWeb(h, st, px); continue; }
    for (const L of layersFor(st, px).filter((L2) => L2.alpha && !L2.inner)) {
      h.save(); h.globalAlpha = L.alpha;
      h.globalCompositeOperation = L.erase ? 'destination-out' : L.multiply ? 'multiply' : 'source-over';
      h.filter = L.blur ? `blur(${L.blur}px)` : 'none';
      const p = new Path2D(L.d);
      if (L.fill) { h.fillStyle = st.c; h.fill(p); } else { h.strokeStyle = L.erase ? '#000' : st.c; h.lineWidth = L.width; h.lineCap = 'round'; h.lineJoin = 'round'; h.stroke(p); }
      h.restore();
    }
  }
  g.globalAlpha = part.a < 1 ? part.a : 1; g.drawImage(d, 0, 0); g.globalAlpha = 1;
  }
  return g;
}
export async function pagePixels(strokes, cols, aspect = 1, photo = null) {
  const rows = Math.round(cols * aspect);
  try { const g = await pageCanvas(strokes, cols, rows, photo); return { cols, rows, data: g.getImageData(0, 0, cols, rows).data }; } catch (e) { return null; }
}
export async function colourAt(strokes, x, y, aspect = 1, photo = null) {
  const px = 240, ph = Math.round(px * aspect);
  const g = await pageCanvas(strokes, px, ph, photo);
  try {
    const v = g.getImageData(Math.max(0, Math.min(px - 1, Math.round(x * px))), Math.max(0, Math.min(ph - 1, Math.round(y * px))), 1, 1).data;
    return '#' + [v[0], v[1], v[2]].map((n) => n.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

// an imported photo onto a canvas (web preview): filling w × h, cropped from its middle
async function drawPhotoWeb(g, st, w, h) {
  const im = await new Promise((res) => { const i = new window.Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = st.ph; });
  if (!im) return;
  const k = Math.min(im.width / w, im.height / h), sw = w * k, sh = h * k;
  g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, 0, 0, w, h);
}
// a stamp onto a canvas (web preview): its picture, loaded once
const webStamps = {};
function webStamp(k) {
  if (!webStamps[k]) webStamps[k] = new Promise((res) => { const im = new window.Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src((STAMP[k] || {}).src); });
  return webStamps[k];
}
export async function drawStampWeb(g, st, px) {
  for (const q of st.m ? [{ ...st, m: 0 }, mirrored(st)] : [st]) {
    const im = await webStamp(q.stp);
    if (!im) continue;
    const b = stampBox(q, px);
    g.save(); g.translate(b.x + b.w / 2, b.y + b.h / 2); if (q.fx) g.scale(-1, 1);
    g.drawImage(im, -b.w / 2, -b.h / 2, b.w, b.h); g.restore();
  }
}
