// Plays a parent's recorded voice for a page, reporting progress for word highlighting.
import { createAudioPlayer } from 'expo-audio';

let player = null;
let sub = null;
let session = 0;

export function stopVoice() {
  session++;
  try { sub && sub.remove(); } catch (e) {}
  sub = null;
  try { player && player.pause(); } catch (e) {}
  try { player && player.remove(); } catch (e) {}
  player = null;
}

export function pauseVoice() { try { player && player.pause(); } catch (e) {} }
export function resumeVoice() { try { player && player.play(); } catch (e) {} }

// onProgress(fraction 0..1), onDone()
export function playVoice(uri, { onProgress, onDone } = {}) {
  stopVoice();
  const my = session;
  try {
    player = createAudioPlayer({ uri });
    sub = player.addListener('playbackStatusUpdate', (s) => {
      if (my !== session) return;
      if (s.duration > 0 && onProgress) onProgress(Math.min(1, s.currentTime / s.duration));
      if (s.didJustFinish) {
        stopVoice();
        onDone && onDone();
      }
    });
    player.play();
    return true;
  } catch (e) {
    stopVoice();
    return false;
  }
}
