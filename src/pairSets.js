// Find the pairs: a family's own picture sets (Jörg, 11 Nov 2026). A set is a name and fifteen square photos, kept on
// the phone with the profile's other things; nothing is uploaded. The game plays Coro's pictures or one of these.
import { deleteFile, keepFile, loadJSON, saveJSON } from './storage';

export const SET_SIZE = 15;
const empty = { sets: [], chosen: null };

export async function loadPairSets() {
  try {
    const d = await loadJSON('pairSets', null);
    if (!d || !Array.isArray(d.sets)) return { ...empty };
    return { sets: d.sets.filter((s) => s && s.id).map((s) => ({ id: s.id, name: s.name || '', pics: (s.pics || []).filter(Boolean).slice(0, SET_SIZE) })), chosen: d.chosen || null };
  } catch (e) { return { ...empty }; }
}
export async function savePairSets(data) {
  try { await saveJSON('pairSets', { sets: data.sets, chosen: data.chosen || null }); } catch (e) {}
}
let n = 0;
// a picked photo, copied somewhere permanent
export async function keepPairPicture(uri) {
  n += 1;
  return keepFile(uri, 'pairs', `pic-${Date.now()}-${n}.jpg`);
}
export const dropPairPicture = (uri) => deleteFile(uri);
export const newSetId = () => `set-${Date.now().toString(36)}`;
