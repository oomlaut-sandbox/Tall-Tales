// Web preview: the family's own music (kept only while the page is open). Phones use myMusic.native.js.
import { addTrack, removeTrack } from './ambient';

export const cleanName = (fname) => String(fname || '').replace(/\.[A-Za-z0-9]+$/, '').replace(/[_-]+/g, ' ').trim();
export function pickFile() {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'audio/*';
      input.onchange = () => { const f = input.files && input.files[0]; resolve(f ? { uri: URL.createObjectURL(f), name: f.name } : null); };
      input.click();
    } catch (e) { resolve(null); }
  });
}
export async function addMusic(uri, name) {
  const id = `my-${Date.now()}`;
  addTrack({ id, kind: 'music', name: String(name || '').trim() || 'My music', mine: true, src: { uri } });
  return id;
}
export function removeMusic(id) { removeTrack(id); }
