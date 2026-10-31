// Music and sounds from the Store Manager (Jörg, 31 Oct 2026): pieces added on the server join the tape player and
// Music and Sounds without an app update. The list is kept on the phone (so it's there offline, straight away),
// and refreshed from the server when the app opens. A piece plays from the internet the first time it's chosen and
// is kept on the phone while it plays, so after that it works offline (at bedtime, on a plane). A piece can name its
// musician; one can be the featured musician (Music and Sounds). The pieces built into the app are untouched.
import { supabase } from './account';
import { downloadKeep, liveUri, loadJSON, saveJSON } from './storage';
import { TRACKS, addTrack, removeTrack, setTrackFetcher, updateTrack } from './ambient';

const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) {} });
export function onRemoteTracks(fn) { listeners.add(fn); return () => listeners.delete(fn); }

let rows = []; // the server's rows (shown ones only)
let kept = {}; // { [id]: { v, uri } }: the pieces kept on the phone, and which version
const publicUrl = (path) => { try { return supabase.storage.from('tracks').getPublicUrl(path).data.publicUrl; } catch (e) { return null; } };
const extOf = (path) => (String(path || '').match(/\.[A-Za-z0-9]+$/) || ['.mp3'])[0];

const toTrack = (r) => {
  const k = kept[r.id];
  const src = k && k.v === r.version ? { uri: liveUri(k.uri) } : { uri: publicUrl(r.file) };
  return { id: `r-${r.id}`, kind: r.kind === 'sound' ? 'sound' : 'music', name: r.name, names: r.langs || {}, remote: { id: r.id, version: r.version, file: r.file },
    artist: r.artist || null, artistNote: r.artist_note || null, artistLink: r.artist_link || null, featured: !!r.featured, fade: !!r.fade, src };
};

function apply(list) {
  rows = (list || []).filter((r) => r && r.id && r.file).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const ids = new Set(rows.map((r) => `r-${r.id}`));
  TRACKS.filter((x) => x.remote && !ids.has(x.id)).map((x) => x.id).forEach((id) => removeTrack(id)); // taken out in the Store Manager
  for (const r of rows) {
    const t = toTrack(r);
    if (TRACKS.some((x) => x.id === t.id)) updateTrack(t); else addTrack(t);
  }
  emit();
}

// the first time a piece plays, it's kept on the phone (the next time it plays from there)
setTrackFetcher(async (t) => {
  const r = t.remote; if (!r) return;
  const k = kept[r.id];
  if (k && k.v === r.version) return;
  if (k && k.busy) return;
  kept[r.id] = { ...(k || {}), busy: true };
  try {
    const url = publicUrl(r.file);
    const uri = await downloadKeep(url, 'tracks', `${r.id}-${r.version}${extOf(r.file)}`);
    kept[r.id] = { v: r.version, uri };
    saveJSON('remoteTrackFiles', kept).catch(() => {});
    const cur = TRACKS.find((x) => x.id === t.id);
    if (cur) updateTrack({ ...cur, src: { uri: liveUri(uri) } });
  } catch (e) { kept[r.id] = k || undefined; if (!kept[r.id]) delete kept[r.id]; }
});

let started = false;
export async function startRemoteTracks() {
  if (started) return; started = true;
  try { kept = (await loadJSON('remoteTrackFiles', {})) || {}; Object.keys(kept).forEach((id) => { if (kept[id] && kept[id].busy) delete kept[id]; }); } catch (e) { kept = {}; }
  try { const cached = await loadJSON('remoteTracks', []); if (Array.isArray(cached) && cached.length) apply(cached); } catch (e) {}
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from('tracks').select('id,kind,name,langs,artist,artist_note,artist_link,file,version,sort,featured,fade').eq('hidden', false).order('sort');
    if (error) return;
    apply(data || []);
    saveJSON('remoteTracks', data || []).catch(() => {});
  } catch (e) { /* offline: the kept list stays */ }
}
// the featured musician's piece (Music and Sounds), if there is one
export const featuredTrack = () => TRACKS.find((x) => x.remote && x.featured) || null;
