// Music and ambient sounds (Playback Options → Music and sounds): relaxing loops that can play the whole
// time the app is open, under the stories, and help with sleep. Made with ElevenLabs (ci/ambient.js).
// A small floating tape player (components/TapePlayer.js) shows what's playing and can be dragged anywhere.
// Everything here is wrapped so a sound problem can never break reading.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { loadJSON, saveJSON } from './storage';

export const TRACKS = [
  { id: 'crickets', kind: 'sound', name: 'Crickets', src: require('../assets/ambient/crickets.mp3') },
  { id: 'brook', kind: 'sound', name: 'Babbling brook', src: require('../assets/ambient/brook.mp3') },
  { id: 'forest-birds', kind: 'sound', name: 'Birds in the forest', src: require('../assets/ambient/forest-birds.mp3') },
  { id: 'rain', kind: 'sound', name: 'Soft rain', src: require('../assets/ambient/rain.mp3') },
  { id: 'waves', kind: 'sound', name: 'Ocean waves', src: require('../assets/ambient/waves.mp3') },
  { id: 'campfire', kind: 'sound', name: 'Campfire', src: require('../assets/ambient/campfire.mp3') },
  { id: 'night-forest', kind: 'sound', name: 'Night forest', src: require('../assets/ambient/night-forest.mp3') },
  { id: 'wind-chimes', kind: 'sound', name: 'Wind chimes', src: require('../assets/ambient/wind-chimes.mp3') },
  { id: 'music-box', kind: 'music', name: 'Music box lullaby', src: require('../assets/ambient/music-box.mp3') },
  { id: 'soft-piano', kind: 'music', name: 'Soft piano', src: require('../assets/ambient/soft-piano.mp3') },
  { id: 'gentle-guitar', kind: 'music', name: 'Gentle guitar', src: require('../assets/ambient/gentle-guitar.mp3') },
  { id: 'dreamy-harp', kind: 'music', name: 'Dreamy harp', src: require('../assets/ambient/dreamy-harp.mp3') },
];
export const SLEEP_TIMES = [0, 15, 30, 60]; // minutes (0: keep playing)

// track: the chosen one (null: off); playing: sounding now; volume 0..1; showPlayer: the floating tape player;
// sleep: minutes until it fades out (0 = no timer), sleepAt: when; pos: where the player was left
let state = { track: null, playing: false, volume: 0.4, showPlayer: true, sleep: 0, sleepAt: null, pos: null };
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => { try { fn(state); } catch (e) {} });
  saveJSON('ambient', { track: state.track, volume: state.volume, showPlayer: state.showPlayer, pos: state.pos }).catch(() => {});
};
export const getAmbient = () => state;
export function onAmbient(fn) { listeners.add(fn); return () => listeners.delete(fn); }

let player = null;
let fade = null;
let sleepTimer = null;
let held = false; // paused while recording (the microphone mustn't hear it)

// the chosen track and volume come back next time, but nothing starts playing by itself
loadJSON('ambient', null).then((s) => { if (s) state = { ...state, ...s, playing: false }; listeners.forEach((fn) => fn(state)); }).catch(() => {});

const ramp = (from, to, ms, done) => {
  clearInterval(fade);
  const steps = Math.max(1, Math.round(ms / 50));
  let k = 0;
  fade = setInterval(() => {
    k += 1;
    try { if (player) player.volume = from + (to - from) * (k / steps); } catch (e) {}
    if (k >= steps) { clearInterval(fade); fade = null; done && done(); }
  }, 50);
};

const release = () => { try { if (player) { player.pause(); player.remove(); } } catch (e) {} player = null; };

async function start(id) {
  const t = TRACKS.find((x) => x.id === id);
  if (!t) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    release();
    player = createAudioPlayer(t.src);
    player.loop = true;
    player.volume = 0;
    player.play();
    ramp(0, state.volume, 1200); // fades in
  } catch (e) { release(); }
}

export function playAmbient(id) {
  const next = id || state.track || TRACKS[0].id;
  set({ track: next, playing: true, showPlayer: state.showPlayer });
  if (!held) start(next);
  armSleep(state.sleep);
}
export function pauseAmbient() {
  set({ playing: false });
  const p = player;
  ramp(state.volume, 0, 600, () => { try { p && p.pause(); } catch (e) {} });
}
export function toggleAmbient() { if (state.playing) pauseAmbient(); else playAmbient(); }
export function stopAmbient() {
  set({ playing: false, track: null });
  clearTimeout(sleepTimer); sleepTimer = null;
  ramp(state.volume, 0, 600, release);
}
export function nextAmbient(dir = 1) {
  const i = Math.max(0, TRACKS.findIndex((x) => x.id === state.track));
  playAmbient(TRACKS[(i + dir + TRACKS.length) % TRACKS.length].id);
}
export function setAmbientVolume(v) {
  const vol = Math.max(0, Math.min(1, v));
  set({ volume: vol });
  try { if (player && !fade) player.volume = vol; } catch (e) {}
}
export function setAmbientPlayer(show) { set({ showPlayer: !!show }); }
export function setPlayerPos(pos) { set({ pos }); }

// the sleep timer: after so many minutes the sound fades out slowly and stops
function armSleep(min) {
  clearTimeout(sleepTimer); sleepTimer = null;
  if (!min || !state.playing) { if (state.sleepAt) set({ sleepAt: null }); return; }
  const at = Date.now() + min * 60000;
  set({ sleepAt: at });
  sleepTimer = setTimeout(() => {
    const p = player;
    ramp(state.volume, 0, 20000, () => { try { p && p.pause(); } catch (e) {} set({ playing: false, sleepAt: null }); });
  }, min * 60000);
}
export function setSleepTimer(min) { set({ sleep: min }); armSleep(min); }

// while recording a voice, the music pauses, and comes back afterwards
export function holdAmbient(on) {
  held = !!on;
  try {
    if (on && player) player.pause();
    else if (!on && state.playing) { if (player) player.play(); else start(state.track); }
  } catch (e) {}
}
