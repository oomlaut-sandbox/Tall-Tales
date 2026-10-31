// Sending a sheet to another Oomlaut family: one notebook page (its drawing, photo and notes) packed into a file
// ("A sheet from Annika.oomlaut") and sent by text or email. Opened in Coro, it goes into Things to share.
// The file: JSON { kind: 'oomlaut-sheet', v: 1, from, page: { kind, text, strokes, strokes2 }, photo?: base64 jpg }
import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { APP_LINK } from './invite';
import { keepFile, liveUri } from './storage';

export const SHEET_KIND = 'oomlaut-sheet';
const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 40) || 'Coro';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function fromBase64(s) {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0, buf = 0, bits = 0;
  for (let i = 0; i < clean.length; i++) {
    buf = (buf << 6) | B64.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 0xff; }
  }
  return out.subarray(0, o);
}

// photos inside a drawing (an imported photo on a layer) go along in the file too, so they arrive (31 Oct 2026)
async function packStrokes(list, pics) {
  const out = [];
  for (const st of list || []) {
    if (st && st.ph) {
      try { pics.push(await new File(liveUri(st.ph)).base64()); out.push({ ...st, ph: `embed:${pics.length - 1}` }); } catch (e) {}
    } else out.push(st);
  }
  return out;
}
export async function shareSheet(page, from, message) {
  let photo = null;
  try { if (page.uri) photo = await new File(page.uri).base64(); } catch (e) {}
  const pics = [];
  const strokes = await packStrokes(page.strokes, pics), strokes2 = await packStrokes(page.strokes2, pics);
  const data = { kind: SHEET_KIND, v: 1, from, page: { kind: page.kind, text: page.text || '', strokes, strokes2 }, ...(photo ? { photo } : {}), ...(pics.length ? { pics } : {}) };
  const file = new File(Paths.cache, `A sheet from ${safe(from)}.oomlaut`);
  try { if (file.exists) file.delete(); } catch (e) {}
  file.write(JSON.stringify(data));
  await Share.share({ message: `${message}\n\n${APP_LINK}`, url: file.uri }).catch(() => {});
}

// a received sheet's photo, written out as a file (for Things to share to keep)
export function sheetPhotoFile(b64) {
  try { const f = new File(Paths.cache, `sheet-in-${Date.now()}.jpg`); f.write(fromBase64(b64)); return f.uri; } catch (e) { return null; }
}

// A received sheet's page, made safe to draw: only well-formed strokes, colours that are colours, and the photos
// inside its drawings written out as files of our own (anything else in the file is left out).
const COLOUR = /^#[0-9a-f]{3,8}$/i;
async function unpackStrokes(list, pics) {
  const out = [];
  for (const st of Array.isArray(list) ? list : []) {
    if (!st || typeof st !== 'object') continue;
    if (st.lo) { out.push({ lo: st.lo }); continue; }
    if (st.ph !== undefined) {
      const m = typeof st.ph === 'string' && st.ph.match(/^embed:(\d+)$/);
      const b64 = m && Array.isArray(pics) ? pics[+m[1]] : null;
      if (typeof b64 !== 'string') continue;
      try {
        const f = new File(Paths.cache, `sheet-ph-${Date.now()}-${m[1]}.jpg`); f.write(fromBase64(b64));
        out.push({ ...st, ph: await keepFile(f.uri, 'folder', `sheet-ph-${Date.now()}-${m[1]}.jpg`) });
      } catch (e) {}
      continue;
    }
    if (st.c !== undefined && !(typeof st.c === 'string' && COLOUR.test(st.c))) continue;
    if (st.p !== undefined && !(Array.isArray(st.p) && st.p.every((v) => typeof v === 'number' && Number.isFinite(v)))) continue;
    out.push(st);
  }
  return out;
}
export async function unpackSheetPage(d) {
  const pg = (d && d.page) || {};
  return { kind: pg.kind === 'sketch' ? 'sketch' : 'note', text: typeof pg.text === 'string' ? pg.text.slice(0, 2000) : '',
    strokes: await unpackStrokes(pg.strokes, d && d.pics), strokes2: await unpackStrokes(pg.strokes2, d && d.pics) };
}
