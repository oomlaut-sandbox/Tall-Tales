// Music and ambient sounds: relaxing loops that can play the whole time the app is open, under the stories,
// and help with sleep. Made with ElevenLabs (ci/ambient.js). Two channels that play together: a nature
// sound (top window of the felt tape player) and a piece of music (bottom window). Each is chosen with its
// knob on the player, or on the Music and Sounds page.
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
export const SOUNDS = TRACKS.filter((x) => x.kind === 'sound');
export const MUSIC = TRACKS.filter((x) => x.kind === 'music');
export const SLEEP_TIMES = [0, 15, 30, 60]; // minutes (0: keep playing)

// sound / music: the chosen one on each channel (null: off); playing: sounding now; volume 0..1;
// showPlayer: the floating tape player; sleep: minutes until it fades out; pos: where the player was left;
// recording: a voice is being recorded (the player's little red light)
let state = { sound: null, music: null, playing: false, volume: 0.4, rate: 1, showPlayer: false, sleep: 0, sleepAt: null, pos: null, recording: false };
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => { try { fn(state); } catch (e) {} });
  saveJSON('ambient2', { sound: state.sound, music: state.music, volume: state.volume, rate: state.rate, showPlayer: state.showPlayer, pos: state.pos }).catch(() => {});
};
export const getAmbient = () => state;
export function onAmbient(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// the choices and volume come back next time, but nothing starts playing by itself
loadJSON('ambient2', null).then((s) => { if (s) state = { ...state, ...s, playing: false }; listeners.forEach((fn) => fn(state)); }).catch(() => {});

// one player per channel
const ch = { sound: { player: null, id: null, fade: null }, music: { player: null, id: null, fade: null } };
let sleepTimer = null;
let held = false; // paused while recording (the microphone mustn't hear it)

const ramp = (c, from, to, ms, done) => {
  clearInterval(c.fade);
  const steps = Math.max(1, Math.round(ms / 50));
  let k = 0;
  c.fade = setInterval(() => {
    k += 1;
    try { if (c.player) c.player.volume = from + (to - from) * (k / steps); } catch (e) {}
    if (k >= steps) { clearInterval(c.fade); c.fade = null; done && done(); }
  }, 50);
};
const release = (c) => { try { if (c.player) { c.player.pause(); c.player.remove(); } } catch (e) {} c.player = null; c.id = null; };

// make a channel sound its chosen track (or go quiet)
async function sync(kind) {
  const c = ch[kind];
  const want = state.playing && !held ? state[kind] : null;
  if (!want) {
    if (c.player) { const p = c.player; ramp(c, state.volume, 0, 500, () => { try { p.pause(); } catch (e) {} if (c.player === p && !(state.playing && state[kind])) release(c); }); }
    return;
  }
  if (c.id === want && c.player) { try { c.player.play(); ramp(c, 0, state.volume, 800); } catch (e) {} return; }
  const t = TRACKS.find((x) => x.id === want);
  if (!t) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    release(c);
    const p = createAudioPlayer(t.src);
    c.player = p;
    c.id = want;
    p.loop = true;
    p.volume = 0;
    applyRate(p);
    p.play();
    ramp(c, 0, state.volume, 1200); // fades in
    // a freshly made player may not be ready yet, and then the first play() does nothing (it used to take a
    // second tap): play again as soon as it has loaded, and check once more shortly after
    const still = () => c.player === p && state.playing && !held && state[kind] === want;
    try {
      const sub = p.addListener('playbackStatusUpdate', (st) => {
        if (!still()) { try { sub.remove(); } catch (e) {} return; }
        if (st.isLoaded && !st.playing) { try { p.play(); } catch (e) {} }
        if (st.playing) { try { sub.remove(); } catch (e) {} }
      });
    } catch (e) {}
    [250, 700, 1500].forEach((ms) => setTimeout(() => { try { if (still() && !p.playing) p.play(); } catch (e) {} }, ms));
  } catch (e) { release(c); }
}
const syncAll = () => { sync('sound'); sync('music'); };

// Play: whatever is chosen (the first sound if nothing is chosen yet)
export function playAmbient() {
  if (!state.sound && !state.music) set({ sound: 'campfire', music: 'gentle-guitar' }); // nothing chosen yet (the windows say Select…): Play starts campfire and guitar
  set({ playing: true });
  syncAll();
  armSleep(state.sleep);
}
export function pauseAmbient() { set({ playing: false }); syncAll(); }
export function toggleAmbient() { if (state.playing) pauseAmbient(); else playAmbient(); }
// bedtime: the music fades away slowly and stops (after the last book in Listen Only)
export function fadeOutAmbient(ms = 20000) {
  if (!state.playing) return;
  for (const c of Object.values(ch)) { const p = c.player; ramp(c, state.volume, 0, ms, () => { try { p && p.pause(); } catch (e) {} }); }
  setTimeout(() => set({ playing: false }), ms);
}
export function stopAmbient() { set({ playing: false, sound: null, music: null }); clearTimeout(sleepTimer); syncAll(); }

// choose a track on a channel (null: off); choosing one starts playing
export function chooseAmbient(kind, id) {
  set({ [kind]: id, playing: id ? true : state.playing && !!(kind === 'sound' ? state.music : state.sound) });
  syncAll();
  if (id) armSleep(state.sleep);
}
// a knob click: the next choice on that channel, then off, then round again
export function stepAmbient(kind) {
  const list = kind === 'sound' ? SOUNDS : MUSIC;
  const i = list.findIndex((x) => x.id === state[kind]);
  chooseAmbient(kind, i + 1 < list.length ? list[i + 1].id : null);
}
// how fast the sounds and music play (1: as made; slower is calmer and a little deeper)
const applyRate = (p) => { try { if (p) p.setPlaybackRate(state.rate || 1, 'high'); } catch (e) {} };
export function setAmbientRate(r) {
  set({ rate: Math.max(0.5, Math.min(1, Math.round(r * 100) / 100)) });
  for (const c of Object.values(ch)) applyRate(c.player);
}
export function setAmbientVolume(v) {
  const vol = Math.max(0, Math.min(1, v));
  set({ volume: vol });
  for (const c of Object.values(ch)) try { if (c.player && !c.fade) c.player.volume = vol; } catch (e) {}
}
export function setAmbientPlayer(show) { set({ showPlayer: !!show }); }
export function setPlayerPos(pos) { set({ pos }); }

// the sleep timer: after so many minutes the sound fades out slowly and stops
function armSleep(min) {
  clearTimeout(sleepTimer); sleepTimer = null;
  if (!min || !state.playing) { if (state.sleepAt) set({ sleepAt: null }); return; }
  set({ sleepAt: Date.now() + min * 60000 });
  sleepTimer = setTimeout(() => {
    for (const c of Object.values(ch)) { const p = c.player; ramp(c, state.volume, 0, 20000, () => { try { p && p.pause(); } catch (e) {} }); }
    setTimeout(() => set({ playing: false, sleepAt: null }), 20000);
  }, min * 60000);
}
export function setSleepTimer(min) { set({ sleep: min }); armSleep(min); }

// while recording a voice, the music pauses (and the player's red light is on), and comes back afterwards
export function holdAmbient(on) {
  held = !!on;
  set({ recording: !!on });
  try {
    for (const c of Object.values(ch)) if (on && c.player) c.player.pause();
    if (!on) syncAll();
  } catch (e) {}
}

// the player's Record button: the open book records (or stops); tells the caller if nothing could record
const recordListeners = new Set();
export function onRecordRequest(fn) { recordListeners.add(fn); return () => recordListeners.delete(fn); }
export function requestRecord() {
  if (!recordListeners.size) return false;
  recordListeners.forEach((fn) => { try { fn(); } catch (e) {} });
  return true;
}
