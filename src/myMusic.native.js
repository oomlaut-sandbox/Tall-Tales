// The family's own music: a grown-up picks an audio file on the phone (from Files: an mp3, m4a, wav…), it is copied
// into the app's own folder and joins the Music list (Music and Sounds, the Audio Player, the nightlight alarm).
// Songs bought in Apple Music can't be used (they're protected); files saved in Files can.
import { Directory, File, Paths } from 'expo-file-system';
import { loadJSON, saveJSON } from './storage';
import { addTrack, removeTrack } from './ambient';

const folder = () => { const d = new Directory(Paths.document, 'my-music'); try { d.create({ idempotent: true, intermediates: true }); } catch (e) {} return d; };
// the file is found again by its name (the app's folder can move when the app is updated)
const track = (m) => ({ id: m.id, kind: 'music', name: m.name, mine: true, src: { uri: new File(folder(), m.file).uri } });
let list = [];
loadJSON('myMusic', []).then((l) => { list = Array.isArray(l) ? l : []; list.forEach((m) => addTrack(track(m))); }).catch(() => {});

// pick a file and add it; resolves to its id (or null when nothing was picked)
export async function pickMusic() {
  let r = null;
  try { r = await File.pickFileAsync(undefined, 'audio/*'); } catch (e) {
    try { r = await File.pickFileAsync(); } catch (e2) { return null; }
  }
  if (Array.isArray(r)) r = r[0];
  if (r && r.canceled) return null;
  if (r && r.result) r = Array.isArray(r.result) ? r.result[0] : r.result;
  if (!r) return null;
  const src = r instanceof File ? r : new File(r.uri || r);
  const fname = src.name || decodeURIComponent(String(src.uri).split('/').pop() || 'music.m4a');
  const ext = (fname.match(/\.[A-Za-z0-9]+$/) || ['.m4a'])[0];
  const id = `my-${Date.now()}`;
  const m = { id, name: fname.replace(/\.[A-Za-z0-9]+$/, '').replace(/[_-]+/g, ' ').trim() || 'My music', file: id + ext };
  try { src.copy(new File(folder(), m.file)); } catch (e) { return null; }
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
