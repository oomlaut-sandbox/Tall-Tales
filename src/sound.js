// Sound effects (ElevenLabs, chosen by Jörg). Off by default; the Playback menu turns them on.
// Every call is wrapped so a sound problem can never break reading.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { holdAmbient } from './ambient';

const sources = {
  coverOpen: require('../assets/sfx/cover-open.mp3'),
  coverClose: require('../assets/sfx/cover-close.mp3'),
  peel: require('../assets/sfx/page-peel.mp3'),
  flick: require('../assets/sfx/page-flick.mp3'),
  slide: require('../assets/sfx/book-slide.mp3'),
  setDown: require('../assets/sfx/book-set-down.mp3'),
  cardLift: require('../assets/sfx/card-lift.mp3'),
  tap: require('../assets/sfx/tap.mp3'),
  swish: require('../assets/sfx/page-swish.mp3'), // the page turn: a soft paper swish
  lightSwitch: require('../assets/sfx/light-switch.mp3'), // a soft light-switch click (the Listen Only choice)
  key1: require('../assets/sfx/typewriter-1.mp3'), // typewriter keys (three, so fast typing doesn't cut one off)
  key2: require('../assets/sfx/typewriter-2.mp3'),
  key3: require('../assets/sfx/typewriter-3.mp3'),
};
// how loud each one plays (they are evened out already; effects stay below the narrator)
const LEVEL = { coverOpen: 0.7, coverClose: 0.6, peel: 0.9, flick: 0.55, slide: 0.45, setDown: 0.5, cardLift: 0.45, tap: 0.4, swish: 0.6, lightSwitch: 0.5, key1: 0.35, key2: 0.35, key3: 0.35 };

const players = {};
let ready = false;
let suspended = false; // while recording

// Sound effects are off unless switched on in the Playback menu (prefs.sound).
let enabled = false;
export function setEffects(on) { enabled = !!on; }
// The sound effects volume (Playback menu slider, 0..1, the middle by default). Effects are mixed well
// under the narrator: even with the slider all the way up they play at half their own level, and at the
// default (the middle) at a quarter, so the voice always stays clearly on top.
const EFFECTS_MAX = 0.5;
let master = 0.5 * EFFECTS_MAX;
export function setEffectsVolume(v) { master = Math.max(0, Math.min(1, v)) * EFFECTS_MAX; }

async function init() {
  if (ready) return;
  ready = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch (e) {}
  // two players for each sound, taking turns: a quick second page turn starts fresh on the other one
  // instead of being lost while the first is still being rewound
  for (const k of Object.keys(sources)) {
    try {
      players[k] = [createAudioPlayer(sources[k]), createAudioPlayer(sources[k])];
    } catch (e) {}
  }
}
init();

// Recording turns effects off so they don't end up on the recording.
// (while recording, the music and ambient sounds pause too, so the microphone only hears the voice)
export function suspendSounds(on) { suspended = on; holdAmbient(on); }

// kind: one of the names above. volume: 0..1 on top of the effect's own level.
// One typewriter key strike (in the story editor), taking turns between three recordings.
let keyTurn = 0;
export function playKey() { keyTurn = (keyTurn % 3) + 1; playSound(`key${keyTurn}`); }

const turn = {};
// the only sound effect kept: the page turn in books (covers, taps, card lifts and typewriter keys are retired)
const KEEP = new Set(['swish']);
export function playSound(kind, volume = 1) {
  if (!enabled || suspended || !KEEP.has(kind)) return;
  const pair = players[kind];
  if (!pair) return;
  turn[kind] = ((turn[kind] || 0) + 1) % pair.length;
  const p = pair[turn[kind]];
  try {
    p.volume = Math.min(1, (LEVEL[kind] || 0.5) * volume * master);
    // rewind first, then play (playing before the rewind has finished could start at the end and be silent)
    Promise.resolve(p.seekTo(0)).catch(() => {}).then(() => { try { p.play(); } catch (e) {} });
  } catch (e) {}
}

// the light-switch click when choosing Daydream or the nightlight: part of that moment, so it plays even when the
// page-turn sound effects are off (quietly, never while recording)
export function playSwitch() {
  if (suspended) return;
  const pair = players.lightSwitch;
  if (!pair) return;
  const p = pair[0];
  try {
    p.volume = 0.35;
    Promise.resolve(p.seekTo(0)).catch(() => {}).then(() => { try { p.play(); } catch (e) {} });
  } catch (e) {}
}

// The Garden's pebbles: six recordings of a stone landing on a pebble beach, taken in turn so quick throws don't cut
// each other off. Part of the game, so they play even when the page-turn sound effects are off (never while recording).
const PEBBLES = [
  require('../assets/sfx/pebble-1.mp3'), require('../assets/sfx/pebble-2.mp3'), require('../assets/sfx/pebble-3.mp3'),
  require('../assets/sfx/pebble-4.mp3'), require('../assets/sfx/pebble-5.mp3'), require('../assets/sfx/pebble-6.mp3'),
];
let pebblePlayers = null;
let lastPebble = -1;
export function playPebble(volume = 1) {
  if (suspended) return;
  try {
    if (!pebblePlayers) pebblePlayers = PEBBLES.map((s) => createAudioPlayer(s));
    let k; do { k = Math.floor(Math.random() * PEBBLES.length); } while (k === lastPebble);
    lastPebble = k;
    const p = pebblePlayers[k];
    p.volume = Math.max(0.15, Math.min(1, volume * 0.8));
    Promise.resolve(p.seekTo(0)).catch(() => {}).then(() => { try { p.play(); } catch (e) {} });
  } catch (e) {}
}
