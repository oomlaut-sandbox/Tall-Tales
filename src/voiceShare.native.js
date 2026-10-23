// Sharing a book in your own voice: the family's recordings of one book packed into a single file
// ("Different – read by Opa.oomlaut"), sent with the invitation by text or email. Whoever gets it taps the file and
// opens it in Coro Reader: the readers and their pages are added to that book on their phone, and it reads in
// that voice. Nothing goes online; the file is the whole thing.
// The file: JSON { kind: 'oomlaut-voices', v: 1, storyId, title, readers: [{ id, name, photo? }], pages: [{ reader,
// pid, seconds, start?, end?, levels?, audio (base64 m4a) }] }
import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { addReader, getReaders, listRecordings, saveRecording, setBookVoice, setReaderPhoto, setTrim, MAX_READERS } from './recordings';
import { inviteMessage } from './invite';

const KIND = 'oomlaut-voices';

const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Book';

// base64 → bytes (for writing the sounds and photos back out as files)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function fromBase64(s) {
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

// The book has recordings: make the file and open the share sheet with the invitation and the file together.
// Returns false when there's nothing recorded (the caller then shares the plain invitation).
export async function shareBookWithVoices(story) {
  const recs = await listRecordings(story);
  if (!recs.length) return false;
  const readers = (await getReaders()).filter((r) => recs.some((x) => x.reader === r.id));
  const pages = [];
  for (const r of recs) {
    try {
      const audio = await new File(r.uri).base64();
      pages.push({ reader: r.reader, pid: r.pid, seconds: r.seconds, ...(r.start ? { start: r.start } : {}), ...(r.end ? { end: r.end } : {}), ...(r.levels ? { levels: r.levels } : {}), ...(r.at ? { at: r.at } : {}), audio });
    } catch (e) {}
  }
  if (!pages.length) return false;
  const people = [];
  for (const r of readers) {
    let photo = null;
    try { if (r.photo) photo = await new File(r.photo).base64(); } catch (e) {}
    people.push({ id: r.id, name: r.name, ...(photo ? { photo } : {}) });
  }
  const names = people.map((p) => p.name).join(', ');
  const file = new File(Paths.cache, `${safeName(story.title)} – read by ${safeName(names)}.oomlaut`);
  try { if (file.exists) file.delete(); } catch (e) {}
  file.write(JSON.stringify({ kind: KIND, v: 1, storyId: story.id, title: story.title, readers: people, pages }));
  const message = `${inviteMessage(story.title)}\n\nTap the attached file and open it in Coro Reader to hear it in ${names}’s voice.`;
  await Share.share({ message, url: file.uri }).catch(() => {});
  return true;
}

// A file someone sent (opened in Coro Reader): what's in it, for the "Add Opa's voice?" box (or a sheet).
export async function readVoicesFile(uri) {
  try {
    const data = JSON.parse(await new File(uri).text());
    if (data && data.kind === 'oomlaut-sheet' && data.page) return data; // a sheet for My Folder (see sheetShare)
    if (!data || data.kind !== KIND || !Array.isArray(data.pages)) return null;
    return data;
  } catch (e) { return null; }
}

// Add it: each reader joins this phone's readers (or matches one with the same name), their pages are saved for
// the book, and the book reads in the first reader's voice. Returns { ok, reason?, names }.
export async function importVoices(data) {
  const list = await getReaders();
  const map = {};
  for (const p of data.readers || []) {
    const same = list.find((x) => x.name.trim().toLowerCase() === String(p.name || '').trim().toLowerCase());
    if (same) { map[p.id] = same.id; continue; }
    if ((await getReaders()).length >= MAX_READERS) return { ok: false, reason: 'full', names: (data.readers || []).map((x) => x.name) };
    let photoUri = null;
    if (p.photo) {
      try { const f = new File(Paths.cache, `reader-${Date.now()}.jpg`); f.write(fromBase64(p.photo)); photoUri = f.uri; } catch (e) {}
    }
    const id = await addReader(p.name, null);
    if (id && photoUri) await setReaderPhoto(id, photoUri);
    if (id) map[p.id] = id;
  }
  let first = null;
  for (const pg of data.pages) {
    const who = map[pg.reader];
    if (!who || !pg.audio) continue;
    try {
      const f = new File(Paths.cache, `in-${pg.pid}-${Date.now()}.m4a`);
      f.write(fromBase64(pg.audio));
      await saveRecording(data.storyId, pg.pid, f.uri, pg.seconds || 1, pg.levels || null, who);
      if (pg.start || pg.end) await setTrim(data.storyId, pg.pid, pg.start || 0, pg.end || null, who);
      try { f.delete(); } catch (e) {}
      if (!first) first = who;
    } catch (e) {}
  }
  if (first) await setBookVoice(data.storyId, first);
  return { ok: !!first, names: (data.readers || []).map((x) => x.name) };
}
