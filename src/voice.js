// Plays a page's audio: a parent's recording (a file uri) or ElevenLabs narration (a bundled file).
// Reports progress so the words can be highlighted.
import { createAudioPlayer } from 'expo-audio';

let player = null;
let sub = null;
let ticker = null;
let session = 0;

export function stopVoice() {
  session++;
  try { sub && sub.remove(); } catch (e) {}
  sub = null;
  clearInterval(ticker); ticker = null;
  try { player && player.pause(); } catch (e) {}
  try { player && player.remove(); } catch (e) {}
  player = null;
}

export function pauseVoice() { try { player && player.pause(); } catch (e) {} }
export function resumeVoice() { try { player && player.play(); } catch (e) {} }

// source: a file uri string or a bundled audio file. onProgress(fraction 0..1), onTime(seconds), onDone()
export function playVoice(source, { onProgress, onTime, onDone, rate = 1 } = {}) {
  stopVoice();
  const my = session;
  try {
    player = createAudioPlayer(typeof source === 'string' ? { uri: source } : source);
    sub = player.addListener('playbackStatusUpdate', (s) => {
      if (my !== session) return;
      if (s.duration > 0 && onProgress) onProgress(Math.min(1, s.currentTime / s.duration));
      if (s.didJustFinish) {
        stopVoice();
        onDone && onDone();
      }
    });
    if (rate !== 1) { try { player.setPlaybackRate(rate, 'high'); } catch (e) {} }
    if (onTime) {
      // Status updates are too slow for word-by-word highlighting, so check the time often.
      ticker = setInterval(() => { if (my === session && player) { try { onTime(player.currentTime || 0); } catch (e) {} } }, 70);
    }
    player.play();
    return true;
  } catch (e) {
    stopVoice();
    return false;
  }
}
