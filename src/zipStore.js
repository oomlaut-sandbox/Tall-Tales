// A tiny .zip maker and reader, just for Coro's shared files (2 Nov 2026).
// Some mail apps (Gmail on iPhone) won't attach a file type they don't know, but every app takes a .zip. A shared book
// travels as "<title>.zip" with one file inside ("book.oomlaut", the same JSON as before). Entries are stored, not
// compressed: the pictures and voices inside are already compressed, and it keeps this small and quick.
// No outside library: the zip format for stored files is short.

let CRC = null;
function crc32(bytes) {
  if (!CRC) {
    CRC = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// text ↔ UTF-8 bytes (by hand: not every phone's JavaScript has TextEncoder / TextDecoder)
export function utf8(str) {
  const out = new Uint8Array(str.length * 3);
  let o = 0;
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) { const d = str.charCodeAt(i + 1); if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; } }
    if (c < 0x80) out[o++] = c;
    else if (c < 0x800) { out[o++] = 0xc0 | (c >> 6); out[o++] = 0x80 | (c & 63); }
    else if (c < 0x10000) { out[o++] = 0xe0 | (c >> 12); out[o++] = 0x80 | ((c >> 6) & 63); out[o++] = 0x80 | (c & 63); }
    else { out[o++] = 0xf0 | (c >> 18); out[o++] = 0x80 | ((c >> 12) & 63); out[o++] = 0x80 | ((c >> 6) & 63); out[o++] = 0x80 | (c & 63); }
  }
  return out.subarray(0, o);
}
export function fromUtf8(b) {
  let s = '', chunk = [];
  const flush = () => { s += String.fromCharCode.apply(null, chunk); chunk = []; };
  for (let i = 0; i < b.length;) {
    let c = b[i++];
    if (c >= 0xf0) { c = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63); c -= 0x10000; chunk.push(0xd800 + (c >> 10), 0xdc00 + (c & 1023)); }
    else if (c >= 0xe0) chunk.push(((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63));
    else if (c >= 0xc0) chunk.push(((c & 31) << 6) | (b[i++] & 63));
    else chunk.push(c);
    if (chunk.length > 8000) flush();
  }
  flush();
  return s;
}

const u16 = (v) => [v & 255, (v >>> 8) & 255];
const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];

// one file, stored, in a zip
export function zipOne(name, data) {
  const nm = utf8(name), crc = crc32(data), n = data.length;
  const local = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(n), ...u32(n), ...u16(nm.length), ...u16(0)];
  const central = [...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(n), ...u32(n), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0)];
  const cdStart = local.length + nm.length + n, cdSize = central.length + nm.length;
  const end = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(1), ...u16(1), ...u32(cdSize), ...u32(cdStart), ...u16(0)];
  const out = new Uint8Array(cdStart + cdSize + end.length);
  let o = 0;
  const put = (a) => { out.set(a, o); o += a.length; };
  put(local); put(nm); put(data); put(central); put(nm); put(end);
  return out;
}

// the first stored file in a zip (Coro's own zips): { name, data } or null
export function unzipFirst(b) {
  let o = 0;
  const r16 = (p) => b[p] | (b[p + 1] << 8), r32 = (p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;
  while (o + 30 <= b.length && r32(o) === 0x04034b50) {
    const method = r16(o + 8), size = r32(o + 18), nl = r16(o + 26), xl = r16(o + 28);
    const name = fromUtf8(b.subarray(o + 30, o + 30 + nl));
    const at = o + 30 + nl + xl;
    if (method === 0 && !name.endsWith('/') && size > 0) return { name, data: b.subarray(at, at + size) };
    o = at + size;
  }
  return null;
}
