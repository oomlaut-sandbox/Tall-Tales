// The family's own music: a grown-up uploads an audio file from the phone (from Files: mp3, m4a, wav…) or records
// one (a parent or grandparent singing a lullaby), names it, and it joins the Music list (Music and Sounds, the
// Audio Player, the nightlight alarm). It is copied into the app's own folder. (Songs bought in Apple Music are
// protected and can't be used; files saved in Files can.)
import { Directory, File, Paths } from 'expo-file-system';
import { loadJSON, saveJSON } from './storage';
import { addTrack, removeTrack } from './ambient';

const folder = () => { const d = new Directory(Paths.document, 'my-music'); try { d.create({ idempotent: true, intermediates: true }); } catch (e) {} return d; };
// the file is found again by its name (the app's folder can move when the app is updated)
const track = (m) => ({ id: m.id, kind: m.kind || 'music', name: m.name, mine: true, src: { uri: new File(folder(), m.file).uri } });
let list = [];
loadJSON('myMusic', []).then((l) => { list = Array.isArray(l) ? l : []; list.forEach((m) => addTrack(track(m))); }).catch(() => {});

export const cleanName = (fname) => String(fname || '').replace(/\.[A-Za-z0-9]+$/, '').replace(/[_-]+/g, ' ').trim();

// choose an audio file on the phone: { uri, name } (or null)
export async function pickFile() {
  let r = null;
  try { r = await File.pickFileAsync(undefined, 'audio/*'); } catch (e) {
    try { r = await File.pickFileAsync(); } catch (e2) { return null; }
  }
  if (Array.isArray(r)) r = r[0];
  if (r && r.canceled) return null;
  if (r && r.result) r = Array.isArray(r.result) ? r.result[0] : r.result;
  if (!r) return null;
  const f = r instanceof File ? r : new File(r.uri || r);
  const name = f.name || decodeURIComponent(String(f.uri).split('/').pop() || '');
  return { uri: f.uri, name };
}

// keep a file (picked or recorded) as a new piece of music with this name; resolves to its id
export async function addMusic(uri, name, fname, kind = 'music') {
  const ext = (String(fname || uri).match(/\.[A-Za-z0-9]+$/) || ['.m4a'])[0];
  const id = `my-${Date.now()}`;
  const m = { id, kind, name: String(name || '').trim() || (kind === 'sound' ? 'My sound' : 'My music'), file: id + ext };
  try { new File(uri).copy(new File(folder(), m.file)); } catch (e) { return null; }
  list = [...list, m];
  saveJSON('myMusic', list);
  addTrack(track(m));
  return id;
}

export function removeMusic(id) {
  const m = list.find((x) => x.id === id);
  if (m) { try { const f = new File(folder(), m.file); if (f.exists) f.delete(); } catch (e) {} }
  list = list.filter((x) => x.id !== id);
  saveJSON('myMusic', list);
  removeTrack(id);
}
