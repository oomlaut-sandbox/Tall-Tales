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

// fade the voice out quickly (about a third of a second), then stop it (pressing record)
export function fadeStopVoice(ms = 350) {
  const p = player, my = session;
  if (!p) { stopVoice(); return; }
  let k = 0; const steps = Math.max(1, Math.round(ms / 35));
  const iv = setInterval(() => {
    k += 1;
    try { if (player === p && session === my) p.volume = Math.max(0, 1 - k / steps); } catch (e) {}
    if (k >= steps) { clearInterval(iv); if (session === my) stopVoice(); }
  }, 35);
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
// start / end (seconds): play only that part of the file (a trimmed recording)
export function playVoice(source, { onProgress, onTime, onDone, onFail, rate = 1, start: from = 0, end: to = null } = {}) {
  stopVoice();
  const my = session;
  let tries = 0;
  const start = () => {
    if (my !== session) return; // something else started or stopped in the meantime
    tries++;
    try {
      if (player) { try { sub && sub.remove(); player.remove(); } catch (e) {} player = null; sub = null; clearInterval(ticker); ticker = null; }
      player = createAudioPlayer(typeof source === 'string' ? { uri: source } : source);
      sub = player.addListener('playbackStatusUpdate', (s) => {
        if (my !== session) return;
        if (s.duration > 0 && onProgress) { const e = to || s.duration; onProgress(Math.max(0, Math.min(1, (s.currentTime - from) / Math.max(0.1, e - from)))); }
        if (s.didJustFinish) {
          stopVoice();
          onDone && onDone();
        }
      });
      if (rate !== 1) { try { player.setPlaybackRate(rate, 'high'); } catch (e) {} }
      if (to) {
        // a trimmed recording: stop at the end point
        const stopper = setInterval(() => {
          if (my !== session || !player) { clearInterval(stopper); return; }
          let t = 0; try { t = player.currentTime || 0; } catch (e) {}
          if (t >= to) { clearInterval(stopper); stopVoice(); onDone && onDone(); }
        }, 40);
      }
      if (onTime) {
        // Status updates are too slow for word-by-word highlighting, so check the time often.
        ticker = setInterval(() => { if (my === session && player) { try { onTime(player.currentTime || 0); } catch (e) {} } }, 70);
      }
      if (from > 0) { try { player.seekTo(from).catch(() => {}); } catch (e) {} }
      player.play();
      // Watchdog: if the sound hasn't actually started, try once more with a fresh player; if it
      // still won't start, give up so the caller can use another voice (and Play works again).
      // A file that is still loading is given time (up to about 3 seconds) instead of being restarted:
      // restarting a sound that was just about to begin is what made the narration stutter and then
      // switch to the phone's voice.
      const mine = player;
      let waited = 0;
      const check = () => {
        if (my !== session || !player || player !== mine) return;
        let started = false, loaded = true;
        try { started = player.playing || (player.currentTime || 0) > from + 0.05; } catch (e) {}
        try { if (player.isLoaded === false) loaded = false; } catch (e) {}
        if (started) return;
        waited += 300;
        if (!loaded && waited < 3000) { setTimeout(check, 300); return; } // still loading: wait
        if (loaded && waited < 1200) { setTimeout(check, 300); return; } // loaded: a moment to begin
        if (tries < 2) return start();
        stopVoice();
        (onFail || onDone) && (onFail || onDone)();
      };
      setTimeout(check, 300);
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
