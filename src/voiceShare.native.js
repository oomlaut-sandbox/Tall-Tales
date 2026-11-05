// Sharing a book in your own voice: the family's recordings of one book packed into a single file
// ("Different – read by Opa.oomlaut"), sent with the invitation by text or email. Whoever gets it taps the file and
// opens it in Coro: the readers and their pages are added to that book on their phone, and it reads in
// that voice. Nothing goes online; the file is the whole thing.
// The file: JSON { kind: 'oomlaut-voices', v: 1, storyId, title, readers: [{ id, name, photo? }], pages: [{ reader,
// pid, seconds, start?, end?, levels?, audio (base64 m4a) }] }
import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { addReader, getReaders, listRecordings, saveRecording, setBookVoice, setReaderPhoto, setTrim, MAX_READERS } from './recordings';
import { OPEN_HELP, inviteMessage } from './invite';
import * as ImageManipulator from 'expo-image-manipulator';
import { addReceivedStory, savedStory } from './userStories';
import { keepFile } from './storage';
import { eachZipEntry, fromUtf8, unzipFirst, utf8, zipManyToFile, zipOne } from './zipStore';

const KIND = 'oomlaut-voices';

// the file's name in plain letters only (ö → o, dashes and curly quotes → plain): some mail apps (Gmail) refuse an
// attachment whose name has other characters (Jörg, 2 Nov 2026)
const safeName = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[ßẞ]/g, 'ss').replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[^A-Za-z0-9 ._'()-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Book';

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
async function packBook(s, keepState = false) {
  const pages = [];
  for (const p of s.pages || []) {
    const img = await picData(p.uri), img2 = p.uri2 ? await picData(p.uri2) : null;
    pages.push({ ...without(p, DROP), ...(img ? { img } : null), ...(img2 ? { img2 } : null) });
  }
  let cover = null;
  if (s.cover && s.cover.uri) { const img = await picData(s.cover.uri); cover = { ...without(s.cover, DROP), ...(img ? { img } : null) }; }
  return { id: s.id, title: s.title, writer: s.writer || '', artist: s.artist || '', cover, pages, ...(keepState && !s.published ? { published: false } : null) }; // (all my books: a book still being made stays in My Workspace on the other device)
}

// Make the file and open the share sheet with the invitation and the file together: the book's recordings, and a
// book made in Coro itself. Returns false when there's nothing to send (the caller then shares the plain invitation).
// One book's file contents: its recordings (the readers and their pages) and, for a book made in Coro, the book
// itself. null when there's nothing to send.
async function bookPayload(story, keepState = false) {
  const recs = await listRecordings(story);
  // your own book, also when it's open as its Book Store copy (in another language, or from the Book Store): the
  // book you made goes with it, so it can be opened and edited on another device (Jörg, 4 Nov 2026)
  const own = story.mine ? await savedStory(story.id).catch(() => null) : story.ownId ? await savedStory(story.ownId).catch(() => null) : null;
  if (!recs.length && !own) return null;
  const readers = (await getReaders()).filter((r) => recs.some((x) => x.reader === r.id));
  const pages = [];
  for (const r of recs) {
    try {
      const audio = await new File(r.uri).base64();
      pages.push({ reader: r.reader, pid: r.pid, seconds: r.seconds, ...(r.start ? { start: r.start } : {}), ...(r.end ? { end: r.end } : {}), ...(r.levels ? { levels: r.levels } : {}), ...(r.at ? { at: r.at } : {}), audio });
    } catch (e) {}
  }
  if (!pages.length && !own) return null;
  const people = [];
  for (const r of readers) {
    let photo = null;
    try { if (r.photo) photo = await new File(r.photo).base64(); } catch (e) {}
    people.push({ id: r.id, name: r.name, ...(photo ? { photo } : {}) });
  }
  const book = own ? await packBook(own, keepState) : null;
  return { names: people.map((p) => p.name).join(', '), data: { kind: KIND, v: 2, storyId: own ? own.id : story.id, title: story.title, readers: people, pages, ...(book ? { book } : null) } };
}

// Make the file and open the share sheet with the invitation and the file together: the book's recordings, and a
// book made in Coro itself. Returns false when there's nothing to send (the caller then shares the plain invitation).
export async function shareBookWithVoices(story) {
  const got = await bookPayload(story);
  if (!got) return false;
  const { names, data } = got;
  // sent as a .zip with the book inside: every mail app takes a .zip (Gmail on iPhone refused Coro's own type: 2 Nov 2026)
  const file = new File(Paths.cache, `${safeName(story.title)}${names ? ` - read by ${safeName(names)}` : ''}.zip`);
  try { if (file.exists) file.delete(); } catch (e) {}
  file.write(zipOne('book.oomlaut', utf8(JSON.stringify(data))));
  const message = `${inviteMessage(story.title)}\n\n${names ? `The attached file has the book, read in ${names}’s voice.` : 'The attached file has the book.'}\n${OPEN_HELP}`;
  await Share.share({ message, url: file.uri }).catch(() => {});
  return true;
}

// Send all my books (Jörg, 4 Nov 2026): every book made on this phone, with its recordings, in one .zip for another
// device (AirDrop to the iPad, say). Inside: library.json (how many, their titles), then book-1.oomlaut… each the
// same as a single shared book. Written one book at a time, so even a big library never sits in memory at once.
// onStep(n, of) while packing. Returns the number of books, or 0 when there are none.
export async function shareAllBooks(stories, onStep) {
  const mine = (stories || []).filter((s) => s.mine);
  if (!mine.length) return 0;
  const day = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `Coro books ${day}.zip`);
  await zipManyToFile(file, async (k) => {
    if (k === 0) return { name: 'library.json', data: utf8(JSON.stringify({ kind: 'coro-library', v: 1, count: mine.length, titles: mine.map((s) => s.title) })) };
    const s = mine[k - 1];
    if (!s) return null;
    onStep && onStep(k, mine.length);
    const got = await bookPayload(s, true).catch(() => null);
    return got ? { name: `book-${k}.oomlaut`, data: utf8(JSON.stringify(got.data)) } : { name: `skip-${k}.txt`, data: utf8('-') };
  });
  const message = `My Coro books, ${mine.length === 1 ? '1 book' : `${mine.length} books`}.\nHow to open it: tap the file, tap the Share button, then choose Coro.`;
  await Share.share({ message, url: file.uri }).catch(() => {});
  return mine.length;
}

// a library file (Send all my books): its titles, for the box that asks whether to add them; null when it isn't one
async function readLibrary(uri) {
  let info = null;
  await eachZipEntry(new File(uri), (name, data) => {
    if (name === 'library.json') { try { const j = JSON.parse(fromUtf8(data)); if (j && j.kind === 'coro-library') info = j; } catch (e) {} }
    return false; // (only the first entry)
  });
  return info ? { kind: 'coro-library', uri, count: info.count || 0, titles: info.titles || [] } : null;
}
// every book in a library file joins this phone's books, one at a time. onStep(n, of). Returns how many came in.
export async function importLibrary(lib, onStep) {
  let n = 0, k = 0;
  await eachZipEntry(new File(lib.uri), async (name, data) => {
    if (!/^book-\d+\.oomlaut$/.test(name)) return true;
    k++; onStep && onStep(k, lib.count);
    try { const d = JSON.parse(fromUtf8(data)); if (d && d.kind === KIND) { const r = await importVoices(d); if (r && (r.ok || r.book)) n++; } } catch (e) {}
    return true;
  });
  return n;
}

// A file someone sent (opened in Coro): what's in it, for the "Add Opa's voice?" box (or a sheet).
export async function readVoicesFile(uri) {
  try {
    // a .zip (how Coro sends books since 2 Nov 2026) holds the same file inside; older .oomlaut files still open
    let text;
    if (/\.zip$/i.test(decodeURIComponent(uri))) {
      const lib = await readLibrary(uri).catch(() => null); // all the books from another device
      if (lib) return lib;
      const inner = unzipFirst(await new File(uri).bytes());
      if (!inner) return null;
      text = fromUtf8(inner.data);
    } else text = await new File(uri).text();
    const data = JSON.parse(text);
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
  await addReceivedStory({ id: b.id, title: b.title || 'Untitled book', writer: b.writer || '', artist: b.artist || '', cover, pages, ...(b.published === false ? { published: false } : null) });
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
