// Sound effects (ElevenLabs, chosen by Jörg). Off by default; the Playback menu turns them on.
// Every call is wrapped so a sound problem can never break reading.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

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
  key1: require('../assets/sfx/typewriter-1.mp3'), // typewriter keys (three, so fast typing doesn't cut one off)
  key2: require('../assets/sfx/typewriter-2.mp3'),
  key3: require('../assets/sfx/typewriter-3.mp3'),
};
// how loud each one plays (they are evened out already; effects stay below the narrator)
const LEVEL = { coverOpen: 0.7, coverClose: 0.6, peel: 0.9, flick: 0.55, slide: 0.45, setDown: 0.5, cardLift: 0.45, tap: 0.4, swish: 0.6, key1: 0.35, key2: 0.35, key3: 0.35 };

const players = {};
let ready = false;
let suspended = false; // while recording

// Sound effects are off unless switched on in the Playback menu (prefs.sound).
let enabled = false;
export function setEffects(on) { enabled = !!on; }
// The sound effects volume (Playback menu slider): 0..1, on top of each effect's own level.
let master = 1;
export function setEffectsVolume(v) { master = Math.max(0, Math.min(1, v)); }

async function init() {
  if (ready) return;
  ready = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch (e) {}
  for (const k of Object.keys(sources)) {
    try {
      players[k] = createAudioPlayer(sources[k]);
    } catch (e) {}
  }
}
init();

// Recording turns effects off so they don't end up on the recording.
export function suspendSounds(on) { suspended = on; }

// kind: one of the names above. volume: 0..1 on top of the effect's own level.
// One typewriter key strike (in the story editor), taking turns between three recordings.
let keyTurn = 0;
export function playKey() { keyTurn = (keyTurn % 3) + 1; playSound(`key${keyTurn}`); }

export function playSound(kind, volume = 1) {
  if (!enabled || suspended) return;
  const p = players[kind];
  if (!p) return;
  try {
    p.volume = Math.min(1, (LEVEL[kind] || 0.5) * volume * master);
    p.seekTo(0);
    p.play();
  } catch (e) {}
}
