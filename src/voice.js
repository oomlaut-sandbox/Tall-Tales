// Plays a page's audio: a parent's recording (a file uri) or ElevenLabs narration (a bundled file).
// Reports progress so the words can be highlighted.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { isMuted, onMuteChange } from './sound';

let player = null;
let sub = null;
let ticker = null;
let session = 0;
// the sound switch: muted voices keep playing silently so the words still light up in time
onMuteChange((m) => { try { if (player) player.volume = m ? 0 : 1; } catch (e) {} });

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

// The phone has to be in playback mode (full speaker, not left in recording mode). Changing the
// mode while a sound is starting can silently stop that sound on iOS, so the mode is set once,
// before playing, and only again after something else (recording) has changed it.
let playbackReady = null;
export function audioModeChanged() { playbackReady = null; }
function ensurePlayback() {
  if (!playbackReady) playbackReady = setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  return playbackReady;
}

// source: a file uri string or a bundled audio file. onProgress(fraction 0..1), onTime(seconds), onDone()
// Returns true straight away; the sound starts as soon as the audio mode is ready.
export function playVoice(source, { onProgress, onTime, onDone, onFail, rate = 1 } = {}) {
  stopVoice();
  const my = session;
  let tries = 0;
  const start = () => {
    if (my !== session) return; // something else started or stopped in the meantime
    tries++;
    try {
      if (player) { try { sub && sub.remove(); player.remove(); } catch (e) {} player = null; sub = null; clearInterval(ticker); ticker = null; }
      player = createAudioPlayer(typeof source === 'string' ? { uri: source } : source);
      try { player.volume = isMuted() ? 0 : 1; } catch (e) {}
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
      // Watchdog: if the sound hasn't actually started, try once more with a fresh player; if it
      // still won't start, give up so the caller can use another voice (and Play works again).
      setTimeout(() => {
        if (my !== session || !player) return;
        let started = false;
        try { started = player.playing || (player.currentTime || 0) > 0.05; } catch (e) {}
        if (started) return;
        if (tries < 2) return start();
        stopVoice();
        (onFail || onDone) && (onFail || onDone)();
      }, 900);
    } catch (e) {
      stopVoice();
      (onFail || onDone) && (onFail || onDone)();
    }
  };
  const ready = ensurePlayback();
  if (ready && ready.then) ready.then(start); else start();
  return true;
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
