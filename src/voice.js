// Plays a page's audio: a parent's recording (a file uri) or ElevenLabs narration (a bundled file).
// Reports progress so the words can be highlighted.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

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
  // Make sure the phone is in playback mode (full speaker), not left in recording mode.
  setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
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

// Play several short clips one after another (Learn to Read: word parts, then the whole word).
// Anything else that plays or stops audio in between ends the chain.
export function playClips(clips, { gap = 220, onDone } = {}) {
  const step = (i) => {
    if (i >= clips.length) { onDone && onDone(); return; }
    let mine;
    const ok = playVoice(clips[i], {
      onDone: () => {
        // playVoice stops itself when a clip finishes, which moves the session on by one
        const after = session;
        if (after !== mine + 1) return;
        if (i + 1 >= clips.length) { onDone && onDone(); return; }
        setTimeout(() => { if (session === after) step(i + 1); }, gap);
      },
    });
    mine = session;
    if (!ok) onDone && onDone();
  };
  step(0);
}
