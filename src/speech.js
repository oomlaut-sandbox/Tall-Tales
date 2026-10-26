// Read-aloud with word tracking. Uses the phone's voice for now; ElevenLabs narration
// (with exact word timings) will replace this per book later.
import * as Speech from 'expo-speech';

// The phone's own computer voice is never played (Jörg, 26 Oct 2026): Fatima's narration, or a family member's
// recording, are the only voices. Where neither exists, the words still light up at reading pace, in silence.
export const SYSTEM_VOICE = false;

let voiceId;
let session = 0;

export async function pickVoice() {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const en = voices.filter((v) => /^en/i.test(v.language));
    const prefer = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Serena', 'Daniel'];
    const found = prefer.map((n) => en.find((v) => (v.name || '').includes(n))).find(Boolean);
    const enhanced = en.find((v) => v.quality === 'Enhanced' || v.quality === Speech.VoiceQuality?.Enhanced);
    voiceId = (enhanced || found || en[0] || {}).identifier;
  } catch (e) {}
}
pickVoice();

export function stopSpeech() {
  session++;
  try {
    Speech.stop();
  } catch (e) {}
}

// Speak `text`; onWord(charIndex) is called as speech progresses (real boundaries when the
// platform reports them, otherwise an estimate), onDone when finished or stopped.
// lang: the book's language ('de', 'fr', 'es', 'ja'); the phone's own voice for that language is used
const LOCALES = { en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', ja: 'ja-JP', ar: 'ar-SA' };
const voiceFor = (lang) => (!lang || lang === 'en' ? { language: 'en-US', voice: voiceId } : { language: LOCALES[lang] || lang });
export function speakTracked(text, { rate = 0.92, onWord, onDone, lang } = {}) {
  stopSpeech();
  const my = session;
  let gotBoundary = false;
  const t0 = Date.now();
  const cps = 14 * rate;
  const timer = setInterval(() => {
    if (my !== session) return clearInterval(timer);
    if (!gotBoundary && onWord) onWord(Math.floor(((Date.now() - t0) / 1000) * cps));
  }, 120);
  const finish = () => {
    clearInterval(timer);
    if (my === session && onDone) onDone();
  };
  if (!SYSTEM_VOICE) {
    // silent: the estimate above lights the words; the page ends when they'd have been read
    const ms = Math.max(1200, (text.length / cps) * 1000 + 400);
    const end = setTimeout(finish, ms);
    const stopEnd = () => clearTimeout(end);
    return () => { stopEnd(); clearInterval(timer); stopSpeech(); };
  }
  Speech.speak(text, {
    rate,
    pitch: 1.05,
    ...voiceFor(lang),
    onBoundary: (e) => {
      gotBoundary = true;
      const ch = e && (e.charIndex ?? e.charIndexStart);
      if (onWord && typeof ch === 'number') onWord(ch);
    },
    onDone: finish,
    onStopped: () => clearInterval(timer),
    onError: finish,
  });
  return () => {
    clearInterval(timer);
    stopSpeech();
  };
}

export function speakQueue(items, onDone) {
  // items: [{text, rate}] spoken one after another
  stopSpeech();
  const my = session;
  let i = 0;
  const next = () => {
    if (my !== session) return;
    if (i >= items.length) return onDone && onDone();
    const it = items[i++];
    if (!SYSTEM_VOICE) { setTimeout(next, 300); return; } // (no computer voice: nothing is said)
    Speech.speak(it.text, { rate: it.rate ?? 0.8, ...voiceFor(it.lang), onDone: () => setTimeout(next, it.pause ?? 180), onError: next });
  };
  next();
}

export function pauseSpeech() {
  try {
    Speech.pause();
  } catch (e) {}
}
export function resumeSpeech() {
  try {
    Speech.resume();
  } catch (e) {}
}
