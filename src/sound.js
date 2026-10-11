// Paper page-turn sounds. Every call is wrapped so a sound problem can never break reading.
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const sources = {
  turn: require('../assets/turn.wav'),
  lift: require('../assets/lift.wav'),
  drop: require('../assets/drop.wav'),
};
const players = {};
let enabled = true;
let ready = false;

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

export function setPageSound(on) {
  enabled = on;
}

export function playPaper(kind = 'turn', volume = 1) {
  if (!enabled) return;
  const p = players[kind];
  if (!p) return;
  try {
    p.volume = volume;
    p.seekTo(0);
    p.play();
  } catch (e) {}
}
