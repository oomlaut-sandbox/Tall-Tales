// Sending a sheet to another Oomlaut family: one notebook page (its drawing, photo and notes) packed into a file
// ("A sheet from Annika.oomlaut") and sent by text or email. Opened in Coro Reader, it goes into My Folder.
// The file: JSON { kind: 'oomlaut-sheet', v: 1, from, page: { kind, text, strokes, strokes2 }, photo?: base64 jpg }
import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { APP_LINK } from './invite';

export const SHEET_KIND = 'oomlaut-sheet';
const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 40) || 'Coro Reader';

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

export async function shareSheet(page, from, message) {
  let photo = null;
  try { if (page.uri) photo = await new File(page.uri).base64(); } catch (e) {}
  const data = { kind: SHEET_KIND, v: 1, from, page: { kind: page.kind, text: page.text || '', strokes: page.strokes || [], strokes2: page.strokes2 || [] }, ...(photo ? { photo } : {}) };
  const file = new File(Paths.cache, `A sheet from ${safe(from)}.oomlaut`);
  try { if (file.exists) file.delete(); } catch (e) {}
  file.write(JSON.stringify(data));
  await Share.share({ message: `${message}\n\n${APP_LINK}`, url: file.uri }).catch(() => {});
}

// a received sheet's photo, written out as a file (for My Folder to keep)
export function sheetPhotoFile(b64) {
  try { const f = new File(Paths.cache, `sheet-in-${Date.now()}.jpg`); f.write(fromBase64(b64)); return f.uri; } catch (e) { return null; }
}
