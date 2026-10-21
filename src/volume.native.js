// "Your volume is turned down": when the phone's own volume is all the way down and a book, music or sounds start,
// a speech bubble says so (at most once a minute). App.js tells it how to show a bubble.
import { VolumeManager } from 'react-native-volume-manager';

let bubble = null;
let last = 0;
export function setVolumeBubble(fn) { bubble = fn; }
export function checkVolume(message) {
  if (!bubble || Date.now() - last < 60000) return;
  Promise.resolve()
    .then(() => VolumeManager.getVolume())
    .then((r) => {
      const v = typeof r === 'number' ? r : r && typeof r.volume === 'number' ? r.volume : 1;
      if (v <= 0.02) { last = Date.now(); bubble(message); }
    })
    .catch(() => {});
}
