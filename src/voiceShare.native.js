// Sharing a book in your own voice: the family's recordings of one book packed into a single file
// ("Different – read by Opa.oomlaut"), sent with the invitation by text or email. Whoever gets it taps the file and
// opens it in Coro: the readers and their pages are added to that book on their phone, and it reads in
// that voice. Nothing goes online; the file is the whole thing.
// The file: JSON { kind: 'oomlaut-voices', v: 1, storyId, title, readers: [{ id, name, photo? }], pages: [{ reader,
// pid, seconds, start?, end?, levels?, audio (base64 m4a) }] }
import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { addReader, getReaders, listRecordings, saveRecording, setBookVoice, setReaderPhoto, setTrim, MAX_READERS } from './recordings';
import { inviteMessage } from './invite';
import * as ImageManipulator from 'expo-image-manipulator';
import { addReceivedStory, savedStory } from './userStories';
import { keepFile } from './storage';

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

// A book made in Coro goes in the file too, whole (Jörg, 31 Oct 2026: a friend's book wouldn't open, because only its
// voices came, and the book itself wasn't on the phone): its words, the look of its words over pictures, its cover and
// its pictures (made smaller, so the file stays small enough to send). book: { id, title, writer, artist,
// cover: {…, img}, pages: [{…, img, img2}] } (img: base64 JPEG).
async function picData(uri) {
  if (!uri) return null;
  try {
    const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    if (r && r.base64) return r.base64;
  } catch (e) {}
  try { return await new File(uri).base64(); } catch (e) { return null; }
}
const DROP = ['uri', 'uri2', 'src', 'src2', 'edit', 'edit2'];
const without = (o, keys) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !keys.includes(k)));
async function packBook(s) {
  const pages = [];
  for (const p of s.pages || []) {
    const img = await picData(p.uri), img2 = p.uri2 ? await picData(p.uri2) : null;
    pages.push({ ...without(p, DROP), ...(img ? { img } : null), ...(img2 ? { img2 } : null) });
  }
  let cover = null;
  if (s.cover && s.cover.uri) { const img = await picData(s.cover.uri); cover = { ...without(s.cover, DROP), ...(img ? { img } : null) }; }
  return { id: s.id, title: s.title, writer: s.writer || '', artist: s.artist || '', cover, pages };
}

// Make the file and open the share sheet with the invitation and the file together: the book's recordings, and a
// book made in Coro itself. Returns false when there's nothing to send (the caller then shares the plain invitation).
export async function shareBookWithVoices(story) {
  const recs = await listRecordings(story);
  const own = story.mine ? await savedStory(story.id).catch(() => null) : null;
  if (!recs.length && !own) return false;
  const readers = (await getReaders()).filter((r) => recs.some((x) => x.reader === r.id));
  const pages = [];
  for (const r of recs) {
    try {
      const audio = await new File(r.uri).base64();
      pages.push({ reader: r.reader, pid: r.pid, seconds: r.seconds, ...(r.start ? { start: r.start } : {}), ...(r.end ? { end: r.end } : {}), ...(r.levels ? { levels: r.levels } : {}), ...(r.at ? { at: r.at } : {}), audio });
    } catch (e) {}
  }
  if (!pages.length && !own) return false;
  const people = [];
  for (const r of readers) {
    let photo = null;
    try { if (r.photo) photo = await new File(r.photo).base64(); } catch (e) {}
    people.push({ id: r.id, name: r.name, ...(photo ? { photo } : {}) });
  }
  const names = people.map((p) => p.name).join(', ');
  const book = own ? await packBook(own) : null;
  const file = new File(Paths.cache, `${safeName(story.title)}${names ? ` – read by ${safeName(names)}` : ''}.oomlaut`);
  try { if (file.exists) file.delete(); } catch (e) {}
  file.write(JSON.stringify({ kind: KIND, v: 2, storyId: story.id, title: story.title, readers: people, pages, ...(book ? { book } : null) }));
  const message = `${inviteMessage(story.title)}\n\n${names ? `Tap the attached file and open it in Coro to hear it in ${names}’s voice.` : 'Tap the attached file and open it in Coro to read the book.'}`;
  await Share.share({ message, url: file.uri }).catch(() => {});
  return true;
}

// A file someone sent (opened in Coro): what's in it, for the "Add Opa's voice?" box (or a sheet).
export async function readVoicesFile(uri) {
  try {
    const data = JSON.parse(await new File(uri).text());
    if (data && data.kind === 'oomlaut-sheet' && data.page) return data; // a sheet for Things to share (see sheetShare)
    if (!data || data.kind !== KIND || !Array.isArray(data.pages)) return null;
    return data;
  } catch (e) { return null; }
}

// a book that came in the file: its pictures written into its own folder, then it joins this phone's books
async function unpackBook(b) {
  const folder = `stories/${b.id}`;
  const put = async (b64, name) => {
    if (!b64) return null;
    const tmp = new File(Paths.cache, `in-${Date.now()}-${name}`);
    tmp.write(fromBase64(b64));
    const uri = await keepFile(tmp.uri, folder, name);
    try { tmp.delete(); } catch (e) {}
    return uri;
  };
  const pages = [];
  for (const p of b.pages || []) {
    const uri = await put(p.img, `img-${p.pid}.jpg`), uri2 = await put(p.img2, `img-${p.pid}-2.jpg`);
    pages.push({ ...without(p, ['img', 'img2']), text: p.text || '', uri: uri || null, uri2: uri2 || null });
  }
  let cover = null;
  if (b.cover && b.cover.img) cover = { ...without(b.cover, ['img']), uri: await put(b.cover.img, 'cover.jpg') };
  await addReceivedStory({ id: b.id, title: b.title || 'Untitled book', writer: b.writer || '', artist: b.artist || '', cover, pages });
}

// Add it: the book first, when it came in the file (made in Coro); then each reader joins this phone's readers (or
// matches one with the same name), their pages are saved for the book, and the book reads in the first reader's
// voice. Returns { ok, reason?, names, book? }.
export async function importVoices(data) {
  let book = false;
  if (data.book && data.book.id && Array.isArray(data.book.pages)) {
    try { await unpackBook(data.book); book = true; } catch (e) { return { ok: false, names: [] }; }
  } else if (/^s\d{10,}$/.test(String(data.storyId || ''))) {
    // only the voices of a book made in Coro, and that book isn't on this phone (a file from an older Coro)
    const mine = await savedStory(data.storyId).catch(() => null);
    if (!mine) return { ok: false, reason: 'nobook', names: (data.readers || []).map((x) => x.name) };
  }
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
  return { ok: !!first || book, book, names: (data.readers || []).map((x) => x.name) };
}
