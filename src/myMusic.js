// Web preview: the family's own music, picked with the browser's file chooser (kept only while the page is open).
// Phones use myMusic.native.js.
import { addTrack, removeTrack } from './ambient';

export function pickMusic() {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'audio/*';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) { resolve(null); return; }
        const id = `my-${Date.now()}`;
        addTrack({ id, kind: 'music', name: f.name.replace(/\.[A-Za-z0-9]+$/, '').replace(/[_-]+/g, ' ').trim() || 'My music', mine: true, src: { uri: URL.createObjectURL(f) } });
        resolve(id);
      };
      input.click();
    } catch (e) { resolve(null); }
  });
}
export function removeMusic(id) { removeTrack(id); }
