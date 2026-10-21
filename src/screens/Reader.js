// The reader: page curl, read-aloud with highlighting, learn-to-read, interactive pictures.
import { getAmbient, onRecordRequest, setAmbientPlayer } from '../ambient';
import { AlarmClockIcon, LockIcon, MusicIcon, PlaylistIcon } from '../components/Chrome';
import { isRestricted, useControls } from '../controls';
import { useLang, useT } from '../i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOOK_FONTS, colors, fonts } from '../theme';
import { DESK_FELT, DeskFelt, Felt, IS_TABLET, DESK_BG } from '../look';
import { tokenize, cleanWord, syllablesFor } from '../story';
import { Fade, PageView, TEXT_SIZES, pageLayout } from '../components/PageView';
import { FLAP_PERSPECTIVE, flapTables } from '../flapStrips';
import { FlapPeel, snapshot, supportsCurl } from '../components/Curl';
import { bookLayout } from '../components/BookFrame';
import { artGesture } from '../components/ZoomArt';

// The paper peel needs pictures of the pages (phone only). If drawing it ever fails, or the
// pictures can't be taken, the page turns with the hinged strips instead.
const peelWorks = { ok: true };
const REC_DEMO = Platform.OS === 'web' && typeof window !== 'undefined' && /rec-demo/.test(window.location.hash);
class PeelGuard extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { peelWorks.ok = false; return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
// Redraws only the peel as the turn moves (not the whole reader).
const peelSubs = new Set();
function PeelLayer({ start, ...props }) {
  const [t, setT] = React.useState(start);
  React.useEffect(() => { peelSubs.add(setT); return () => { peelSubs.delete(setT); }; }, []);
  return <FlapPeel {...props} t={t} />;
}
import ParentGate from '../components/ParentGate';
import { printStory } from '../pdf';
import { Bar, BarMeta, BubbleIcon, HeadphonesIcon, MoonIcon, PageShape, Burger, GlassesIcon, ChevronIcon, DiamondIcon, DogEar, DotIcon, GearIcon, ListIcon, MENU_ICON, NoteIcon, Option, Panel, PauseButton, PlayButton, PlayGlyph, RecordButton, Slider, SIDE_MENU_TOP, TextIcon } from '../components/Chrome';

// Reading speed: 1 = the voice's natural pace. The default is moderately slow.
// Older settings only had Normal/Slow.
export const DEFAULT_SPEED = 0.75;
export const speedOf = (prefs) => prefs.rate || (prefs.speed === 'slow' ? 0.8 : DEFAULT_SPEED);
// Book narrators (ElevenLabs). Fatima (voice key 'lily') is the default.
// A tiny printed page: white sheet with the picture and words squares, upright or sideways.
export const NARRATORS = [['lily', 'Fatima'], ['gregory', 'Henry']]; // add more voices here (and in ci/narrate.js)
export const narratorOf = (prefs) => (NARRATORS.some(([k]) => k === prefs.narrator) ? prefs.narrator : 'lily');
const NARRATOR = 0.92; // the phone voice's normal pace
const VOICE_RECORDING = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 48000,
  numberOfChannels: 1,
  bitRate: 192000,
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, audioQuality: 127, sampleRate: 48000 },
  android: { ...RecordingPresets.HIGH_QUALITY.android, sampleRate: 48000 },
};
import { playSound, playSwitch, setEffects, setEffectsVolume, suspendSounds } from '../sound';
import { pauseSpeech, resumeSpeech, speakQueue, speakTracked, stopSpeech } from '../speech';
import { shareInvite } from '../invite';
import { audioModeChanged, fadeStopVoice, pauseVoice, playClips, playVoice, resumeVoice, stopVoice } from '../voice';
import * as WORDCLIPS from '../narration/words';
const WORDS = WORDCLIPS.WORDS || {};
const WORDS_LANG = WORDCLIPS.WORDS_LANG || {}; // (made by the next narration run)
import { getRecording, listRecordings, pageKey, removeRecording, saveRecording } from '../recordings';
import { markFinished, markFirst, markReadToday } from '../badges';
import { AUDIO, TIMINGS } from '../narration';
import { SAMPLES, SAMPLE_LANGS, THE_END } from '../narration/samples';
import Nightlight, { SunIcon } from '../components/Nightlight';
const MOON_OUTLINE = require('../../assets/icon-moon-outline.png'); // the moon logo, traced as a fine outline (the same weight as the sun)
import { tap, thunk, withTap } from '../haptics';
import { fmtTime } from '../clock';

export const MODES = [
  [<GlassesIcon />, 'self', 'Read Yourself', 'Page by page with no audio'],
  [<TextIcon text="Aa" />, 'learn', 'Learn to Read', 'Says a word when you touch it'],
  [<PlayGlyph count={2} />, 'auto', 'Auto Play', 'Reads the full story with audio'],
  [<PlayGlyph />, 'page', 'Page by Page Play', 'Reads a page at a time with audio'],
  [<HeadphonesIcon />, 'listen', 'Listen Only', 'Audio only, plays with Nightlight'],
  // ['✦', 'interactive', 'Interactive', 'Image interaction with touch'],  (hidden for now; hotspot code kept)
];

export function Seg({ value, options, onChange, stacked }) {
  return (
    <View style={stacked ? { gap: 8 } : { flexDirection: 'row', gap: 8 }}>
      {options.map(([v, l, family]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[styles.seg, stacked && { flex: 0, paddingVertical: 12 }, value === v && { backgroundColor: colors.green }]}>
          <Text style={[styles.segText, family && { fontFamily: family, fontWeight: '400', fontSize: 17 }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Reader({ u, story, prefs, setPrefs, openMenu, goLibrary, toast, menuRequest, landscape, setToastSpot, autoStart, onFinished, onSettings, onPlaylists }) {
  const tr = useT(); // the reader's own panel, in the app's language
  const appLang = useLang();
  const controls = useControls(); // parental controls: recording, sharing and printing may be switched off
  const insets = useSafeAreaInsets();
  const pages = useMemo(() => [...story.pages, { end: true }], [story]);
  const [idx, setIdx] = useState(0);
  // While recording (and a little after, for 'Saved your voice…'), speech bubbles sit in the middle of the
  // picture page (top, or left when sideways) so they don't cover the words being read.
  const bookRef = useRef(null);
  // badges (My Notebook): a day with reading, and a book read all the way to The End
  useEffect(() => { markReadToday(); }, []);
  useEffect(() => { if (pages[idx] && pages[idx].end) { markFinished(story, story.cover || (story.pages.find((pg) => pg.image) || {}).image); if (onFinished) onFinished(); } }, [idx]);
  const [size, setSize] = useState(null); // book area {w,h}
  const [hl, setHl] = useState(-1);
  const [bubble, setBubble] = useState(null);
  const [reading, setReading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState(null); // 'play' | 'rec' | null
  const [flipPair, setFlipPair] = useState(null); // {a, b, dir} while a page turn is on screen
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (!setToastSpot) return undefined;
    let t;
    if (recording || REC_DEMO) {
      const place = () => bookRef.current && bookRef.current.measureInWindow && bookRef.current.measureInWindow((x, y, w, h) => {
        if (!w) return;
        const sideways = w > h * 1.2;
        setToastSpot(sideways ? { x, y, w: w / 2, h } : { x, y, w, h: h / 2 });
      });
      place();
    } else {
      t = setTimeout(() => setToastSpot(null), 6000); // 'Saved your voice…' still shows over the picture
    }
    return () => clearTimeout(t);
  }, [recording, size]);
  useEffect(() => () => setToastSpot && setToastSpot(null), []);
  // web preview only (#rec-demo): shows where the recording bubble goes
  useEffect(() => { if (REC_DEMO) setTimeout(() => toast(tr('Recording page {n}. Turn the page to keep going, or tap ● to stop.', { n: 2 })), 1500); }, []);
  const [recView, setRecView] = useState('main'); // main | list | settings | help
  const [recList, setRecList] = useState([]);
  const [playView, setPlayView] = useState('main'); // 'main' | 'voices' inside Playback Options
  const [speedDraft, setSpeedDraft] = useState(null); // speed while the slider is being dragged
  const [volDraft, setVolDraft] = useState(null); // the sound effects volume while its slider is moving
  const [printChoice, setPrintChoice] = useState(false);
  const [printGate, setPrintGate] = useState(null); // layout waiting for the grown-up check
  const [printing, setPrinting] = useState(false);
  const doPrint = async (layout) => {
    setPrintGate(null);
    setPrinting(true);
    toast(tr('Getting the book ready to print…'));
    try {
      await printStory({ title: story.title, author: story.author, pages: story.pages.map((p) => ({ text: p.text, image: p.image, image2: p.image2 })) }, layout, prefs.font);
    } catch (e) {
      toast(tr('Couldn’t print the book. Please try again.')); // plain words, never the phone's technical message
    }
    setPrinting(false);
  };
  // Voice recording: mono (one voice), 48 kHz, high-bitrate AAC — fuller than the stereo preset.
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const recStart = useRef(0);
  const pendingRec = useRef(false);
  const recAuto = useRef(false); // recording carried on to the next page by itself (no instructions bubble again)
  const usingVoice = useRef(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const flipP = useRef(new Animated.Value(0)).current; // 0 = page a showing, 1 = page b (a + 1)
  const prog = useRef(0); // the same progress, as a plain number
  const [recPages, setRecPages] = useState([]); // pages that have a recording of the parent's voice
  const refreshRecPages = useCallback(() => { listRecordings(story).then((l) => setRecPages(l.map((r) => r.page))).catch(() => {}); }, [story]);
  useEffect(() => { refreshRecPages(); }, [refreshRecPages]);
  const [shareGate, setShareGate] = useState(false); // 'Share Book' on the last page, behind the parent gate
  const [peel, setPeel] = useState(null); // {front, back, corner}: pictures for the paper peel
  const peelOn = useRef(false);
  const cache = useRef({}); // page index -> picture of that page
  const pageX0 = useRef(0); // the book's left edge on screen (for which corner to peel)
  const pageY0 = useRef(0); // the book's top edge on screen (sideways: top or bottom corner)


  const refs = { prev: useRef(null), cur: useRef(null), next: useRef(null) };
  const st = useRef({});
  // Listen Only (bedtime and quiet time): reads like Auto Play, but the words, page turns and play buttons
  // rest, and the screen dims to a soft night level
  const listen = prefs.mode === 'listen';
  st.current = { idx, size, reading, paused, mode: listen ? 'auto' : prefs.mode, turning: !!flipPair, pages, recording };
  if (idx > pages.length - 1) setIdx(pages.length - 1);
  const pendingRead = useRef(false);
  const autoTimer = useRef(null);
  const anim = useRef(null);

  // A plain black strip over the camera area (so pictures aren't hidden), and the solid black bar
  // at the bottom with the menu, title and play controls (no play controls in Read Yourself).
  // The book floats on dark grey (see BookFrame): two equal squares, about 30 points of grey all
  // round; the black bars take what height is left. Stacked upright; side by side on a sideways iPad.
  const { width: winW, height: winH } = useWindowDimensions();
  const BL = bookLayout(winW, winH, insets, u * 13);
  const wide = BL.wide;
  st.current.wide = wide;
  const topH = BL.topH;
  const showControls = (prefs.mode !== 'self' && !listen) || recording;
  const barH = BL.barH;
  // a small 'Your voice' mark when this page will play the parent's recording
  const mineHere = prefs.voice === 'mine' && recPages.includes(idx) && prefs.mode !== 'self' && !recording;
  const panelPos = wide ? { bottom: 0, inset: BL.rightW } : { bottom: barH };
  const n = story.pages.length;
  const tokens = useMemo(() => (pages[idx] && pages[idx].text ? tokenize(pages[idx].text) : []), [pages, idx]);

  useEffect(() => {
    if (!prefs.mode) setTimeout(() => setPanel('play'), 350);
    return () => { stopSpeech(); clearTimeout(autoTimer.current); cancelAnimationFrame(anim.current); };
  }, []);
  // the menu's Playback Settings opens this panel; only a new request does (not one left over from an
  // earlier book, which used to pop the panel open whenever another book was opened)
  const lastMenuRequest = useRef(menuRequest);
  useEffect(() => { if (menuRequest && menuRequest !== lastMenuRequest.current) setPanel('play'); lastMenuRequest.current = menuRequest; }, [menuRequest]);

  /* ---------- reading ---------- */
  // pressing record: the reading fades away quickly, and nothing starts reading until recording is over
  const recordingSoon = useRef(false);
  const hushForRecording = () => {
    recordingSoon.current = true;
    fadeStopVoice(350); stopSpeech();
    usingVoice.current = false; clearTimeout(autoTimer.current); pendingRead.current = false;
    setReading(false); setPaused(false); setHl(-1);
  };
  // between two pages while a book plays on by itself (Pause stays white then too)
  const [between, setBetween] = useState(false);
  const stopReading = useCallback(() => {
    stopSpeech();
    stopVoice();
    usingVoice.current = false;
    clearTimeout(autoTimer.current);
    setReading(false); setPaused(false); setHl(-1); setBetween(false);
  }, []);

  // switch how the book plays (and start reading when the new mode reads aloud)
  // quiet: switch without starting to read (Cancel in the Listen Only box)
  const chooseMode = (id, sc, quiet) => {
    stopReading();
    setPrefs((p) => ({ ...p, mode: id, ...(id === 'listen' && p.mode !== 'listen' ? { prevMode: p.mode } : {}) }));
    if (id === 'listen' && prefs.mode !== 'listen') setScene(sc || 'choose'); // Listen Only from the options: sun or moon?
    st.current.mode = id === 'listen' ? 'auto' : id;
    // Listen Only waits for the choice (Daydream or Nightlight) before it reads
    const waits = id === 'listen' && prefs.mode !== 'listen' && (sc || 'choose') === 'choose';
    if (!quiet && !waits && (id === 'auto' || id === 'page' || id === 'listen')) setTimeout(() => readPage(st.current.idx), 300);
  };
  // the moon on the bar: into the nightlight (Listen Only), and back to how it was before
  const canMoon = controls.playback !== false && !controls.playMode && controls.nightlight !== false;
  // Listen Only shows a choice first (the screen dims, a small box: the sun for Daydream, the moon for the nightlight);
  // a playlist keeps the last choice for every book after the first
  const [scene, setScene] = useState(() => (autoStart && prefs.listenScene ? prefs.listenScene : 'choose'));
  const pickScene = (sc) => { setScene(sc); setPrefs((p) => ({ ...p, listenScene: sc })); setTimeout(() => readPage(st.current.idx), 900); /* the story starts as the scene fades in */ };
  const nightEnabled = listen && controls.nightlight !== false; // Settings → Nightlight mode can switch the nightlight off
  const choosing = nightEnabled && scene === 'choose';
  const nightOn = nightEnabled && !choosing; // the nightlight or Daydream is showing (the lock and alarm are on the bar)
  const dayOn = nightOn && scene === 'day';
  // the choice box stays on screen while it dissolves over the nightlight or Daydream fading in underneath
  const [boxUp, setBoxUp] = useState(false);
  const [fromChoice, setFromChoice] = useState(false);
  useEffect(() => { if (choosing) { setBoxUp(true); setFromChoice(true); } }, [choosing]);
  const cancelListen = () => { setBoxUp(false); chooseMode(prefs.prevMode && prefs.prevMode !== 'listen' ? prefs.prevMode : 'auto', null, true); };
  // the nightlight's lock lives on the bar beside the moon; where it sits, so it stays tappable over the blocker
  const [nlLocked, setNlLocked] = useState(false);
  const [lockRect, setLockRect] = useState(null);
  const nlLockRef = useRef(null);
  const [alarmOpen, setAlarmOpen] = useState(false); // the nightlight's alarm popup (the alarm clock on the bar)
  const lockNight = () => { const n = nlLockRef.current; if (n && n.measureInWindow) n.measureInWindow((x, y, width, height) => { setLockRect({ x, y, width, height }); setNlLocked(true); }); else setNlLocked(true); };
  useEffect(() => { if (prefs.mode !== 'listen') setNlLocked(false); }, [prefs.mode]);
  // the moon on the bar: into Listen Only (the sun / moon choice), and back out again
  const toggleNight = () => {
    if (prefs.mode === 'listen') { chooseMode(prefs.prevMode && prefs.prevMode !== 'listen' ? prefs.prevMode : 'auto'); return; }
    chooseMode('listen'); // the same choice as from the menu: Daydream or the nightlight
  };

  const wordAt = (ch) => {
    for (let i = 0; i < tokens.length; i++) if (tokens[i].start <= ch && ch < tokens[i].end + 1) return i;
    return -1;
  };

  const readPage = useCallback((pageIndex) => {
    if (st.current.recording || recordingSoon.current) return; // never read aloud over a recording
    const p = st.current.pages[pageIndex];
    if (!p) { setReading(false); return; }
    // the last page: the narrator says "The End", softly and slowly (the same clip for every book),
    // a moment after the page has landed. No clip yet: the phone's voice says it, slowly.
    if (p.end) {
      const lang = story.lang || 'en';
      const vk = narratorOf(prefs);
      const clip = THE_END?.[vk]?.[lang] || THE_END?.lily?.[lang];
      setReading(true); setPaused(false); setBetween(false);
      const done = () => { usingVoice.current = false; setReading(false); };
      clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(() => {
        if (st.current.idx !== pageIndex) return done();
        if (clip && playVoice(clip, { onDone: done, onFail: done })) { usingVoice.current = true; return; }
        speakTracked(tr('The End'), { lang, rate: NARRATOR * 0.8 * speedOf(prefs), onDone: done });
      }, 900);
      return;
    }
    const toks = tokenize(p.text);
    setReading(true); setPaused(false); setBetween(false);
    const hlChar = (ch) => {
      for (let i = 0; i < toks.length; i++) if (toks[i].start <= ch && ch < toks[i].end + 1) { setHl(i); break; }
    };
    const afterPage = () => {
      usingVoice.current = false;
      setHl(-1); setReading(false);
      if (st.current.mode === 'auto' && pageIndex < st.current.pages.length - 1) {
        setBetween(true); // still playing: on to the next page
        autoTimer.current = setTimeout(() => { pendingRead.current = true; flip(1); }, 800);
      }
    };
    // The book's narrator: ElevenLabs audio when the book has it (exact word timings),
    // otherwise the phone's own voice.
    const narrate = () => {
      const voiceKey = narratorOf(prefs);
      // books from the store bring their own narration (downloaded); the app's own books have it built in
      // a book shown in another language has no narration in that language yet: the phone reads it in that language
      // a translated book: its ElevenLabs narration in that language (kept as e.g. different@de), or, if there
      // is none yet, the phone reads it in that language
      const other = story.lang && story.lang !== 'en';
      const sk = other ? `${story.id}@${story.lang}` : story.id;
      if (other && !AUDIO[voiceKey]?.[sk]?.[p.pid] && !AUDIO.lily?.[sk]?.[p.pid]) { speakTracked(p.text, { lang: story.lang, rate: NARRATOR * speedOf(prefs), onWord: hlChar, onDone: afterPage }); return; }
      const own = !other && story.narration ? (story.narration[voiceKey]?.[p.pid] || story.narration.lily?.[p.pid]) : null;
      const audio = own ? { uri: own.uri } : AUDIO[voiceKey]?.[sk]?.[p.pid] || AUDIO.lily?.[sk]?.[p.pid];
      const times = own ? own.words : (TIMINGS[AUDIO[voiceKey]?.[sk]?.[p.pid] ? voiceKey : 'lily']?.[sk]?.[p.pid] || {}).words;
      if (audio && times && times.length === toks.length && playVoice(audio, {
        rate: speedOf(prefs) / DEFAULT_SPEED, // narration is already made at the default pace
        onTime: (t) => {
          let i = -1;
          while (i + 1 < times.length && times[i + 1] <= t + 0.05) i++;
          setHl(i);
        },
        onDone: afterPage,
        onFail: () => { // the narration file wouldn't play: read it with the phone's voice instead
          usingVoice.current = false;
          if (st.current.idx === pageIndex) speakTracked(p.text, { lang: story.lang, rate: NARRATOR * speedOf(prefs), onWord: hlChar, onDone: afterPage });
        },
      })) {
        usingVoice.current = true;
        return;
      }
      speakTracked(p.text, { lang: story.lang, rate: NARRATOR * speedOf(prefs), onWord: hlChar, onDone: afterPage });
    };
    if (prefs.voice === 'mine') {
      getRecording(story.id, pageKey(p, pageIndex)).then((rec) => {
        if (st.current.idx !== pageIndex) return;
        if (rec && playVoice(rec.uri, { rate: speedOf(prefs) / DEFAULT_SPEED, // a parent's own pace at the default setting
           onProgress: (f) => hlChar(Math.floor(f * p.text.length)), onDone: afterPage,
           onFail: () => { if (st.current.idx === pageIndex) narrate(); } })) {
          usingVoice.current = true;
        } else {
          narrate();
        }
      });
      return;
    }
    narrate();
  }, [prefs.speed, prefs.rate, prefs.voice, prefs.narrator, story]);
  // a playlist: each book starts reading by itself
  useEffect(() => { if (!autoStart && !listen) return undefined; if (listen && scene === 'choose' && controls.nightlight !== false) return undefined; /* Listen Only: reads once Daydream or Nightlight is chosen */ const tm = setTimeout(() => readPage(0), 1200); return () => clearTimeout(tm); }, []);

  useEffect(() => {
    if (pendingRec.current) { pendingRec.current = false; recAuto.current = true; setTimeout(startRec, 350); }
  }, [idx]);

  /* ---------- recording ---------- */
  const startRec = async () => {
    if (st.current.idx >= story.pages.length) return;
    hushForRecording();
    setPanel(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { recordingSoon.current = false; return toast(tr('Oomlaut Reader needs the microphone to record. You can allow it in Settings.')); }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      audioModeChanged();
      await recorder.prepareToRecordAsync();
      recorder.record();
      recStart.current = Date.now();
      suspendSounds(true);
      setRecording(true);
      if (!recAuto.current) toast(tr('Recording page {n}. Turn the page to keep going, or tap ● to stop.', { n: st.current.idx + 1 }));
      recAuto.current = false;
    } catch (e) {
      recordingSoon.current = false;
      toast(tr('Recording couldn’t start. Try again.'));
    }
  };

  // the felt tape player's Record button: records (or stops) here, like the red button in the bar
  const recToggle = useRef(null);
  recToggle.current = () => {
    if (!controls.recording) return;
    if (st.current.recording) stopRec(true); else startRec();
  };
  useEffect(() => onRecordRequest(() => recToggle.current && recToggle.current()), []);

  const stopRec = async (save) => {
    if (!st.current.recording) return;
    const page = st.current.idx;
    const seconds = (Date.now() - recStart.current) / 1000;
    setRecording(false);
    st.current.recording = false;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      audioModeChanged();
      if (save && recorder.uri && seconds > 0.7) {
        await saveRecording(story.id, pageKey(story.pages[page], page), recorder.uri, seconds);
        if (prefsRef.current.voice !== 'mine') setPrefs((p) => ({ ...p, voice: 'mine' }));
        toast(tr('Saved your voice for page {n}.', { n: page + 1 }));
        markFirst('firstRecording'); // a badge in My Notebook
        refreshRecPages();
      }
    } catch (e) {
      toast(tr('That recording couldn’t be saved.'));
    }
    suspendSounds(false);
    recordingSoon.current = false;
  };

  const openRecList = async () => {
    setRecList(await listRecordings(story));
    refreshRecPages();
    setRecView('list');
  };

  useEffect(() => () => { if (st.current.recording) recorder.stop().catch(() => {}); }, []);

  useEffect(() => {
    // after a page turn, continue reading in Auto and Page-by-Page modes
    if (pendingRead.current || st.current.mode === 'page') {
      const go = pendingRead.current || st.current.mode === 'page';
      pendingRead.current = false;
      if (go && (st.current.mode === 'auto' || st.current.mode === 'page')) setTimeout(() => readPage(idx), 250);
    }
  }, [idx]);

  const onPlay = () => {
    const mode = st.current.mode;
    if (!mode) return setPanel('play');
    if (mode === 'self') return toast(tr('Read Yourself is on, so there’s no audio. Pick another mode to listen.'));
    if (st.current.recording) return;
    if (paused) { usingVoice.current ? resumeVoice() : resumeSpeech(); setPaused(false); return; }
    // Play always (re)reads the page, so it can never get stuck thinking it's still reading.
    stopReading();
    setTimeout(() => readPage(st.current.idx), 60);
  };
  const onPause = () => {
    if (between) { clearTimeout(autoTimer.current); setBetween(false); return; } // between two pages: stop going on
    if (!reading) return;
    if (usingVoice.current) { pauseVoice(); setPaused(true); return; }
    if (Platform.OS === 'android') return stopReading(); // Android voices can't pause mid-sentence
    pauseSpeech(); setPaused(true);
  };

  const onWord = (i, raw) => {
    const mode = st.current.mode;
    // Tapping a word only does something in Learn to Read (it no longer interrupts narration).
    if (mode !== 'learn' || st.current.turning || st.current.recording) return;
    const w = cleanWord(raw);
    if (!w) return;
    stopReading();
    setHl(i);
    const done = () => setTimeout(() => setHl(-1), 400);
    if (mode === 'learn') {
      // Say the whole word once, clearly, in the chosen narrator's voice (the phone's voice if needed).
      // a translated book: the narrator says the word in that language (the phone's voice only if there's no clip)
      const foreign = story.lang && story.lang !== 'en';
      const nk = narratorOf(prefsRef.current);
      const wordClip = foreign
        ? (WORDS_LANG[nk]?.[story.lang]?.[w.toLocaleLowerCase(story.lang)] || WORDS_LANG.lily?.[story.lang]?.[w.toLocaleLowerCase(story.lang)])
        : WORDS[nk]?.[w.toLowerCase()];
      if (wordClip) { playClips([wordClip], { onDone: done }); return; }
      speakQueue([{ text: w, rate: 0.7, lang: story.lang }], done);
    }
  };

  const onHotspot = (h) => {
    stopReading();
    setBubble(h);
    if (h.word) {
      const i = tokens.findIndex((t) => cleanWord(t.word).toLowerCase() === h.word);
      setHl(i);
    }
    speakQueue([{ text: h.say, rate: 0.85 }], () => setTimeout(() => setHl(-1), 400));
    setTimeout(() => setBubble((b) => (b === h ? null : b)), 2600);
  };

  /* ---------- page turning ---------- */
  // Like a flip calendar: the words half lifts up along the spine (showing the next page's words
  // underneath), then the next page's picture comes down onto the top half. Going back plays it in
  // reverse. Progress runs from 0 (page a) to 1 (page b = a + 1).
  // On the phone the lifting half bends like paper (FlapCurl, drawn from pictures of the two pages);
  // the web preview, or a phone where that drawing fails, uses a stiff flap instead.
  // Only one turn at a time: taps and swipes that arrive mid-turn are ignored.
  const busy = useRef(false);
  const stepPage = (dir) => setIdx((i) => Math.max(0, Math.min(pages.length - 1, i + dir)));
  const canTurn = (dir) => {
    if (dir < 0 && st.current.recording) return false;
    return dir > 0 ? st.current.idx < st.current.pages.length - 1 : st.current.idx > 0;
  };

  const setProgress = (p) => {
    prog.current = p;
    flipP.setValue(p);
    if (peelOn.current) peelSubs.forEach((f) => f(p));
  };
  const startFlip = async (dir, corner = 'right') => {
    const i = st.current.idx;
    const a = dir > 0 ? i : i - 1;
    let pics = null;
    if (supportsCurl && peelWorks.ok) { // upright and sideways: the paper peel
      // pictures of both pages for the paper peel
      const fa = dir > 0 ? await snapshot(refs.cur) : (cache.current[a] || (await snapshot(refs.prev)));
      const fb = dir > 0 ? (cache.current[a + 1] || (await snapshot(refs.next))) : await snapshot(refs.cur);
      // sideways the words page peels from its bottom-right corner (or top-right when the finger
      // starts high up); in the peel's upright frame those are its 'left' and 'right' corners
      if (fa && fb) pics = { front: fa, back: fb, corner: st.current.wide ? (corner === 'top' ? 'right' : 'left') : corner };
    }
    peelOn.current = !!pics;
    setPeel(pics);
    setProgress(dir > 0 ? 0 : 1);
    setFlipPair({ a, b: a + 1, dir });
  };
  const endFlip = (dir, commit) => {
    if (commit) { stepPage(dir); setHl(-1); setBubble(null); }
    // let the new page draw underneath before taking the turning layers away
    setTimeout(() => { setFlipPair(null); setPeel(null); peelOn.current = false; busy.current = false; }, 40);
  };
  const runFlip = (to, ms, then) => {
    if (peelOn.current) {
      // the peel is redrawn from the progress, frame by frame
      const from = prog.current, t0 = Date.now();
      const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      const step = () => {
        const x = Math.min(1, (Date.now() - t0) / Math.max(1, ms));
        setProgress(from + (to - from) * ease(x));
        if (x < 1) anim.current = requestAnimationFrame(step);
        else then && then();
      };
      anim.current = requestAnimationFrame(step);
      return;
    }
    requestAnimationFrame(() => {
      Animated.timing(flipP, { toValue: to, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' })
        .start(() => { prog.current = to; then && then(); });
    });
  };

  const flip = async (dir) => {
    if (busy.current || st.current.turning || !canTurn(dir) || !st.current.size) return false;
    busy.current = true;
    if (st.current.recording && dir > 0) { await stopRec(true); pendingRec.current = st.current.idx + 1 < story.pages.length; }
    else if (!pendingRead.current) stopReading();
    playSound('swish');
    await startFlip(dir);
    runFlip(dir > 0 ? 1 : 0, 900, () => endFlip(dir, true));
    return true;
  };

  // Swipes: left or up turns forward, right or down turns back. The page follows the finger.
  const drag = useRef({});
  const swipeDir = (g) => {
    const horiz = Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2;
    const vert = Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2;
    if (!horiz && !vert) return null;
    return { horiz, dir: horiz ? (g.dx < 0 ? 1 : -1) : (g.dy < 0 ? 1 : -1) };
  };
  const beginDrag = (sd, x0, y0) => {
    busy.current = true;
    const d = { ...sd, p: sd.dir > 0 ? 0 : 1, ready: false, ended: null };
    drag.current = d;
    stopReading();
    // peel from the bottom corner on the side the finger started
    const corner = st.current.wide ? (y0 != null && st.current.size && y0 < st.current.size.h / 2 ? 'top' : 'bottom')
      : st.current.size && x0 < st.current.size.w / 2 ? 'left' : 'right';
    startFlip(sd.dir, corner).then(() => {
      d.ready = true;
      if (d.ended) finishDrag(d, d.ended); // finger already lifted while the pages were being prepared
      else setProgress(d.p);
    });
  };
  const pan = useMemo(() => PanResponder.create({
    // Touches that start on empty paper come here straight away; touches that start on a word or
    // button are only taken over once they turn into a swipe.
    onStartShouldSetPanResponder: () => !busy.current && !st.current.turning,
    onMoveShouldSetPanResponderCapture: (_, g) => {
      if (busy.current || st.current.turning) return false;
      if (artGesture.active || g.numberActiveTouches > 1) return false; // zooming or magnifying the picture
      const sd = swipeDir(g);
      return !!sd && canTurn(sd.dir);
    },
    onPanResponderGrant: (_, g) => {
      drag.current = {};
      const sd = swipeDir(g);
      if (sd && canTurn(sd.dir)) beginDrag(sd, g.x0 - (pageX0.current || 0), g.y0 - (pageY0.current || 0));
    },
    onPanResponderMove: (_, g) => {
      let d = drag.current;
      if (!d.dir) {
        // decide on the first real movement whether this is a page-turning swipe
        if (busy.current || st.current.turning) return;
        const sd = swipeDir(g);
        if (!sd || !canTurn(sd.dir)) return;
        beginDrag(sd, g.x0 - (pageX0.current || 0), g.y0 - (pageY0.current || 0));
        d = drag.current;
      }
      const { w: W, h: H } = st.current.size;
      const amount = d.horiz ? -g.dx / (W * (st.current.wide ? 0.42 : 0.8)) : -g.dy / (H * 0.55);
      d.p = d.dir > 0 ? Math.max(0, Math.min(1, amount)) : 1 - Math.max(0, Math.min(1, -amount));
      if (d.ready) setProgress(d.p);
    },
    onPanResponderRelease: (_, g) => endDrag(g),
    onPanResponderTerminate: (_, g) => endDrag(g),
  }), []);

  const endDrag = (g) => {
    const d = drag.current;
    if (!d.dir) return;
    drag.current = {};
    const end = { vx: g.vx, vy: g.vy };
    if (!d.ready) { d.ended = end; return; }
    finishDrag(d, end);
  };
  const finishDrag = (d, g) => {
    const vel = d.horiz ? g.vx : g.vy;
    const commit = d.dir > 0 ? d.p > 0.4 || vel < -0.35 : d.p < 0.6 || vel > 0.35;
    if (commit && st.current.recording) {
      const keepGoing = st.current.idx + 1 < story.pages.length;
      stopRec(true).then(() => { pendingRec.current = keepGoing; });
    }
    if (commit) playSound('swish');
    const target = commit ? (d.dir > 0 ? 1 : 0) : (d.dir > 0 ? 0 : 1);
    runFlip(target, 240 + 420 * Math.abs(target - prog.current), () => endFlip(d.dir, commit));
  };

  // Keep fresh pictures of the neighbouring pages ready, so a turn starts without a delay.
  useEffect(() => {
    cache.current = {};
    if (!supportsCurl || !size || flipPair) return;
    const t = setTimeout(async () => {
      if (refs.next.current) cache.current[idx + 1] = await snapshot(refs.next);
      if (refs.prev.current) cache.current[idx - 1] = await snapshot(refs.prev);
    }, 500);
    return () => clearTimeout(t);
  }, [idx, size, prefs.textScale, prefs.font, !!flipPair]);

  /* ---------- render ---------- */
  const W = size?.w || 0, H = size?.h || 0;
  pageY0.current = wide ? (winH - H) / 2 : 0;
  const edgeW = Math.max(44, W * 0.12); // width of the tap-to-turn strips along each edge
  const flipT = useMemo(() => {
    if (!W || !H) return null;
    const artH = pageLayout(W, H).artH, textH = H - artH;
    return { artH, textH, tables: flapTables({ textH, artH }) };
  }, [W, H]);
  const pageProps = (i) => ({
    page: pages[i], end: !!pages[i]?.end, width: W, height: H, textScale: prefs.textScale || 1, fontKey: prefs.font || 'serif',
    onReadAgain: () => { stopReading(); setIdx(0); }, onLibrary: goLibrary, onShare: controls.sharing ? () => setShareGate(true) : null,
  });
  const showHot = false; // Interactive mode is switched off for now
  const layers = [];
  const prevEl = idx > 0 ? <PageView key={`p${idx - 1}`} ref={refs.prev} {...pageProps(idx - 1)} /> : null;
  const nextEl = idx < pages.length - 1 ? <PageView key={`p${idx + 1}`} ref={refs.next} {...pageProps(idx + 1)} /> : null;
  const curEl = (
    <PageView key={`p${idx}`} ref={refs.cur} {...pageProps(idx)} zoomable={!listen} highlight={hl} onWord={listen ? undefined : onWord}
      showHotspots={showHot} onHotspot={onHotspot} bubble={bubble} />
  );
  const abs = (el, k, style) => (el ? <Animated.View key={k} style={[StyleSheet.absoluteFill, style]}>{el}</Animated.View> : null);
  const peeling = !!(flipPair && size && flipT && peel);
  if (flipPair && size && flipT && peel) {
    // phone: the words half peels up like paper (drawn from pictures of both pages)
    const { a, b } = flipPair;
    const view = (i, k) => <PageView key={k} {...pageProps(i)} />;
    layers.push(abs(prevEl, 'p'), abs(nextEl, 'n'), abs(curEl, 'c'));
    layers.push(
      <View key="fb" pointerEvents="none" style={StyleSheet.absoluteFill}>{view(b, `p${b}`)}</View>,
      wide
        ? <View key="fat" pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W / 2, height: H, overflow: 'hidden' }}>{view(a, `t${a}`)}</View>
        : <View key="fat" pointerEvents="none" style={[styles.half, { top: 0, height: flipT.artH }]}>{view(a, `t${a}`)}</View>,
    );
  } else if (flipPair && size && wide) {
    // Sideways iPad: the words page (right) turns over the spine like a real book's page. Its back
    // shows the next page's picture, which ends up on the left.
    const { a, b } = flipPair;
    const half = W / 2;
    const view = (i, k) => <PageView key={k} {...pageProps(i)} />;
    layers.push(abs(prevEl, 'p'), abs(nextEl, 'n'), abs(curEl, 'c'));
    const turn = flipP.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] });
    const frontOp = flipP.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] });
    const backOp = flipP.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });
    const shade = flipP.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.22, 0] });
    layers.push(
      <View key="fb" pointerEvents="none" style={StyleSheet.absoluteFill}>{view(b, `p${b}`)}</View>,
      <View key="fal" pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: half, height: H, overflow: 'hidden' }}>{view(a, `l${a}`)}</View>,
      <Animated.View key="leaf" pointerEvents="none" style={{ position: 'absolute', left: half, top: 0, width: half, height: H, transformOrigin: 'left', transform: [{ perspective: 2400 }, { rotateY: turn }] }}>
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', opacity: frontOp, backfaceVisibility: 'hidden' }}>
          <View style={{ position: 'absolute', left: -half, top: 0, width: W, height: H }}>{view(a, `r${a}`)}</View>
        </Animated.View>
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', opacity: backOp, transform: [{ scaleX: -1 }] }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>{view(b, `b${b}`)}</View>
        </Animated.View>
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#000', opacity: shade }} />
      </Animated.View>,
    );
  } else if (flipPair && size && flipT) {
    // A page turn in progress (see "page turning" above): page b underneath, page a's picture on
    // top, a soft shadow, and the words half of page a curling up as hinged strips.
    const { a, b } = flipPair;
    const { artH, textH, tables } = flipT;
    const view = (i, k) => <PageView key={k} {...pageProps(i)} />;
    const ip = (arr) => flipP.interpolate({ inputRange: tables.input, outputRange: arr });
    const shadow = flipP.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
    // The normal pages stay mounted underneath (the finger's touch belongs to them; removing them
    // would lose the rest of a swipe). The turning layers are drawn on top.
    layers.push(abs(prevEl, 'p'), abs(nextEl, 'n'), abs(curEl, 'c'));
    layers.push(
      <View key="fb" pointerEvents="none" style={StyleSheet.absoluteFill}>{view(b, `p${b}`)}</View>,
      <View key="fat" pointerEvents="none" style={[styles.half, { top: 0, height: artH }]}>{view(a, `t${a}`)}</View>,
      <Animated.View key="sh1" pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: artH, height: textH * 0.6, opacity: shadow }}>
        <Fade edge="top" size={textH * 0.6} max={0.32} />
      </Animated.View>,
      <Animated.View key="sh2" pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: artH * 0.4, height: artH * 0.6, opacity: flipP.interpolate({ inputRange: [0, 0.5, 0.75, 1], outputRange: [0, 0.2, 1, 0] }) }}>
        <Fade edge="bottom" size={artH * 0.6} max={0.32} />
      </Animated.View>,
    );
    tables.strips.forEach((s) => {
      const move = (ty, sy) => [{ translateY: ip(ty) }, { scale: ip(s.scale) }, { perspective: FLAP_PERSPECTIVE }, { rotateX: ip(s.rot) }, { scaleY: ip(sy) }];
      layers.push(
        // front of the strip: a slice of page a's words
        <Animated.View key={`sf${s.k}`} pointerEvents="none" style={[styles.strip, { top: s.restF, height: s.natF, opacity: ip(s.opF), transform: move(s.tyF, s.syF) }]}>
          <View style={{ position: 'absolute', left: 0, top: -s.restF, width: W, height: H }}>{view(a, `f${s.k}`)}</View>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: ip(s.shadeF) }]} />
        </Animated.View>,
        // back of the strip: a slice of page b's picture (mirrored, so it reads right once turned over)
        <Animated.View key={`sb${s.k}`} pointerEvents="none" style={[styles.strip, { top: s.restB, height: s.natB, opacity: ip(s.opB), transform: move(s.tyB, s.syB) }]}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: s.natB, overflow: 'hidden', transform: [{ scaleY: -1 }] }}>
            <View style={{ position: 'absolute', left: 0, top: -(artH - (s.k + 1) * s.natB), width: W, height: H }}>{view(b, `g${s.k}`)}</View>
          </View>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: ip(s.shadeB) }]} />
        </Animated.View>,
      );
    });
  } else layers.push(abs(prevEl, 'p'), abs(nextEl, 'n'), abs(curEl, 'c'));

  return (
    <View style={[styles.screen, wide && { flexDirection: 'row' }]}>
      <Felt />
      {/* the black strip over the camera: along the top, or down the left side when sideways */}
      <View style={wide ? { width: BL.leftW, backgroundColor: colors.bar } : { height: topH, backgroundColor: colors.bar }}><Felt /></View>
      <View style={styles.desk}>
        {/* the charcoal felt, as on the other screens */}
        <DeskFelt spot="reader1" />
      <Felt />
      {/* a small, quiet red dot when this page has a voice recording: top right on phones, top left on iPad */}
      {recPages.includes(idx) && !recording ? (
        // tap it (it's small, so the finger gets a generous area) to hear what it means
        <Pressable onPress={() => toast(tr('This red dot means you’ve recorded this page in your own voice.'))} hitSlop={20}
          accessibilityRole="button" accessibilityLabel={tr('This page has a voice recording')}
          style={[styles.recMark, IS_TABLET ? { left: 14 } : { right: 14 }]} />
      ) : null}
      <View style={[styles.bookShadow, { width: BL.bookW, height: BL.bookH }]}>
      <View ref={bookRef} collapsable={false} style={styles.book} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...(listen ? {} : pan.panHandlers)}>
        {size ? layers : null}
        {/* Tap anywhere along the left or right edge to turn back or forward (swipes work anywhere). */}
        {size && idx > 0 && !listen ? <Pressable onPress={() => flip(-1)} accessibilityLabel={tr('Previous page')} style={[styles.edge, { left: 0, width: edgeW }]} /> : null}
        {size && idx < pages.length - 1 && !listen ? <Pressable onPress={() => flip(1)} accessibilityLabel={tr('Next page')} style={[styles.edge, { right: 0, width: edgeW }]} /> : null}
        {/* the dog-ear hides while a page is turning, and comes back once the new page has landed */}
        {idx < pages.length - 1 && !flipPair && !listen ? <View style={{ position: 'absolute', right: 0, bottom: 0, zIndex: 20 }}><DogEar u={u} under={colors.earUnder} onPress={() => flip(1)} /></View> : null}
      </View>
      </View>
      {/* Listen Only: the soft night level (nothing under it can be touched) */}

      </View>
      {wide ? (
        // sideways: the menu bar runs down the right side; same icons, page tag shortened to "2/16"
        <View style={[styles.sideBar, { width: BL.rightW, paddingTop: SIDE_MENU_TOP /* fixed a little down from the top corner */, paddingBottom: Math.max(16, insets.bottom) }]}>
          <Felt />
          <View style={{ width: BL.rightW, alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center' }}>
              <View style={styles.small}><Burger u={u} onPress={openMenu} /></View>
              {/* restricted kid mode: a small lock (Settings, behind the grown-up question) */}
              {isRestricted(controls) && onSettings ? (
                <Pressable onPress={onSettings} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Settings')} style={[styles.small, { marginTop: u * 7 }]}>
                  <LockIcon size={u * 6.2} weight={Math.max(2.5, u * 0.8)} />
                </Pressable>
              ) : null}
              {/* music and sounds: the little floating Audio Player */}
              <Pressable onPress={withTap(() => setAmbientPlayer(!getAmbient().showPlayer))} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Music and Sounds')} style={[styles.small, { marginTop: isRestricted(controls) && onSettings ? u * 4 : u * 7 }]}>{/* closer when it sits beside the lock */}
                <MusicIcon size={u * 5.6} color="#8e8e8e" />
              </Pressable>
              {/* the nightlight: a small light grey moon (Listen Only with the sunset sun) */}
              {canMoon ? (
                <Pressable onPress={withTap(toggleNight)} hitSlop={12} accessibilityRole="button" accessibilityLabel={dayOn ? tr('Close Daydream') : tr('Nightlight')} style={[styles.small, { marginTop: u * 4 }]}>
                  {dayOn ? <SolidSun size={u * 4.6} color="#e0e0e0" /> : <MoonIcon size={u * 4.6} color={prefs.mode === 'listen' ? '#e0e0e0' : '#9a9a9a'} />}
                </Pressable>
              ) : null}
              {nightOn ? (
                <>
                <Pressable ref={nlLockRef} onPress={withTap(lockNight, thunk)} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Lock the screen')} style={[styles.small, { marginTop: u * 4 }]}>
                  <LockIcon size={u * 4.6} color="#9a9a9a" />
                </Pressable>
                <Pressable onPress={withTap(() => setAlarmOpen(true))} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Wake-up alarm')} style={[styles.small, { marginTop: u * 4, alignItems: 'center' }]}>
                    <AlarmClockIcon size={u * 4.8} color={prefs.alarmOn ? '#e0e0e0' : '#9a9a9a'} />
                    {/* the alarm time, under the clock (sideways) */}
                    {prefs.alarmOn ? <Text style={[styles.alarmTime, { marginTop: u * 1.6 }]}>{fmtTime(prefs.alarmTime || '07:00')}</Text> : null}
                  </Pressable>
                </>
              ) : null}
            </View>
            <View style={{ alignItems: 'center' }}>
            {showControls ? (
              <View style={[styles.small, { alignItems: 'center', gap: 14 }]}>
                {/* while recording, the time so far floats in a small grey box just above the pulsing record button
                    (it takes no room, so the buttons never move) */}
{controls.recording ? (
                <View>
                  {recording ? <RecTimer start={recStart.current} style={{ position: 'absolute', left: -20, right: -20, bottom: '100%', marginBottom: 16, alignItems: 'center' }} /> : null}
                  <RecordButton active={recording} onPress={() => (recording ? stopRec(true) : (hushForRecording(), setRecView('main'), setPanel('rec')))} />
                </View>
                ) : null}
                <PauseButton onPress={onPause} disabled={recording} active={(reading && !paused) || between} />
                <PlayButton onPress={onPlay} active={(reading && !paused) || between} disabled={recording} />
              </View>
            ) : null}
            </View>
          </View>
        </View>
      ) : (
      <View style={[styles.bottomBar, { height: barH, paddingBottom: insets.bottom }]}>
        <Felt />
        <View style={styles.small}><Burger u={u} onPress={openMenu} /></View>
        {/* restricted kid mode: a small lock, a little apart from the menu (Settings, behind the grown-up question) */}
        {isRestricted(controls) && onSettings ? (
          <Pressable onPress={onSettings} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Settings')} style={[styles.small, { marginLeft: u * 7 }]}>
            <LockIcon size={u * 6.2} weight={Math.max(2.5, u * 0.8)} />
          </Pressable>
        ) : null}
        {/* music and sounds: opens (or hides) the little floating Audio Player; a little apart from the menu (or the lock) */}
        <Pressable onPress={withTap(() => setAmbientPlayer(!getAmbient().showPlayer))} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Music and Sounds')} style={[styles.small, { marginLeft: isRestricted(controls) && onSettings ? u * 4 : u * 7 }]}>{/* closer when it sits beside the lock */}
          <MusicIcon size={u * 5.6} color="#8e8e8e" />
        </Pressable>
        {canMoon ? (
          <Pressable onPress={withTap(toggleNight)} hitSlop={12} accessibilityRole="button" accessibilityLabel={dayOn ? tr('Close Daydream') : tr('Nightlight')} style={[styles.small, { marginLeft: u * 4 }]}>
            {dayOn ? <SolidSun size={u * 4.6} color="#e0e0e0" /> : <MoonIcon size={u * 4.6} color={prefs.mode === 'listen' ? '#e0e0e0' : '#9a9a9a'} />}
          </Pressable>
        ) : null}
        {nightOn ? (
          <>
          <Pressable ref={nlLockRef} onPress={withTap(lockNight, thunk)} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Lock the screen')} style={[styles.small, { marginLeft: u * 4 }]}>
            <LockIcon size={u * 4.6} color="#9a9a9a" />
          </Pressable>
          <Pressable onPress={withTap(() => setAlarmOpen(true))} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Wake-up alarm')} style={[styles.small, { marginLeft: u * 4, flexDirection: 'row', alignItems: 'center' }]}>
              <AlarmClockIcon size={u * 4.8} color={prefs.alarmOn ? '#e0e0e0' : '#9a9a9a'} />
              {/* the alarm time, right of the clock */}
              {prefs.alarmOn ? <Text style={[styles.alarmTime, { marginLeft: u * 2.4 }]}>{fmtTime(prefs.alarmTime || '07:00')}</Text> : null}
            </Pressable>
          </>
        ) : null}
        {/* no page numbers in the reader (the store shows how long a book is) */}
        <View style={{ flex: 1 }} />
        {showControls ? (
          <View style={[styles.small, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            {/* while recording, the time so far floats in a small grey box just left of the pulsing record button
                (it takes no room, so the buttons never move) */}
{controls.recording ? (
            <View>
              {recording ? <RecTimer start={recStart.current} style={{ position: 'absolute', right: '100%', marginRight: 14, top: 0, bottom: 0, justifyContent: 'center' }} /> : null}
              <RecordButton active={recording} onPress={() => (recording ? stopRec(true) : (hushForRecording(), setRecView('main'), setPanel('rec')))} />
            </View>
            ) : null}
            <PauseButton onPress={onPause} disabled={recording} active={(reading && !paused) || between} />
            <PlayButton onPress={onPlay} active={(reading && !paused) || between} disabled={recording} />
          </View>
        ) : null}
      </View>
      )}

      {/* The peeling page is drawn over the whole screen, so it can lift past the book's edges. */}
      {flipPair && size && flipT && peel ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
          {wide ? (
            <PeelGuard><PeelLayer start={prog.current} sideways width={H} height={W} artH={H} corner={peel.corner} front={peel.front} back={peel.back}
              ox={BL.leftW + (winW - BL.leftW - BL.rightW - W) / 2} oy={(winH - H) / 2} canvasW={winW} canvasH={winH} /></PeelGuard>
          ) : (
            <PeelGuard><PeelLayer start={prog.current} width={W} height={H} artH={flipT.artH} corner={peel.corner} front={peel.front} back={peel.back}
              ox={(winW - W) / 2} oy={topH + (winH - topH - barH - H) / 2} canvasW={winW} canvasH={winH} /></PeelGuard>
          )}
        </View>
      ) : null}
      {/* Listen Only: the nightlight (the book almost hidden, a soft breathing sun, brightness, a lock) */}
      {/* Listen Only, first: the screen dims and a small dark box asks: Daydream (the sun) or the nightlight (the moon) */}
      {boxUp && nightEnabled ? <ListenChoice area={wide ? { left: 0, top: 0, width: winW - BL.rightW, height: winH } : { left: 0, top: 0, width: winW, height: winH - barH }}
        onDay={() => pickScene('day')} onNight={() => pickScene('night')} onCancel={cancelListen} onGone={() => setBoxUp(false)} tr={tr} /> : null}
      {nightOn ? (
        <Nightlight key={scene} quick={fromChoice} day={dayOn} video={prefs.dayVideo || 0} onVideo={(i) => setPrefs((p) => ({ ...p, dayVideo: i }))} title={story.title} playing={reading && !paused} onPlay={onPlay} onPause={onPause} locked={nlLocked} lockRect={lockRect} onUnlock={() => setNlLocked(false)} onSleep={() => { stopReading(); clearTimeout(autoTimer.current); }} eclipse={prefs.eclipse ?? 0} onEclipse={(v) => setPrefs((p) => ({ ...p, eclipse: Math.round(v * 100) / 100 }))}
          alarmTime={prefs.alarmTime || '07:00'} alarmSound={prefs.alarmSound || 'forest-birds'} alarmOn={!!prefs.alarmOn} alarmOpen={alarmOpen} onAlarmClose={() => setAlarmOpen(false)} onAlarm={(patch) => setPrefs((p) => ({ ...p, ...patch }))}
          wide={wide} end={!!(pages[idx] && pages[idx].end)}
          area={wide ? { left: 0, top: 0, width: winW - BL.rightW, height: winH } : { left: 0, top: 0, width: winW, height: winH - barH }} />
      ) : null}
      <Panel open={panel === 'play'} side="right" title={playView === 'voices' ? tr('Voices') : tr('Reading Options')} {...panelPos} onClose={() => { setPanel(null); setPlayView('main'); }}>
        {playView === 'voices' ? (
          <>
            {NARRATORS.map(([k, label]) => (
              // tapping a voice chooses it and plays a short sample of it
              <Option key={k} glyph={<BubbleIcon />} title={label} sub={tr(k === 'lily' ? 'Warm and gentle' : 'Pleasant older man')} selected={narratorOf(prefs) === k}
                onPress={() => { stopReading(); setPrefs((p) => ({ ...p, narrator: k })); { const smp = SAMPLE_LANGS?.[k]?.[appLang] || SAMPLES[k]; if (smp) playVoice(smp); } toast(tr('{name} will read the stories.', { name: label })); }} />
            ))}
            <Text style={styles.help}>{tr('The voice reads the stories aloud and sounds out words in Learn to Read. Pages you recorded in your own voice still play in yours.')}</Text>
            <Pressable onPress={() => setPlayView('main')} hitSlop={8}><Text style={styles.backlink}>{tr('‹ Back to Reading Options')}</Text></Pressable>
          </>
        ) : (
          <>
        {MODES.map(([g, id, t, s]) => (
          <React.Fragment key={id}>
          <Option glyph={g} title={tr(t)} sub={tr(s)} selected={prefs.mode === id} onPress={() => {
            chooseMode(id);
            setPanel(null);
            if (id === 'auto' || id === 'page' || id === 'listen') { /* reading starts in chooseMode */ }
            else if (id === 'learn') toast(tr('Tap any word to hear it.'));
            else if (id === 'self') toast(tr('Reading on your own. Turn the page when you’re ready.'));
            else toast(tr('Tap the glowing circles in the picture.'));
          }} />
          </React.Fragment>
        ))}
        <Option glyph={<BubbleIcon />} title={tr('Voices')} sub={tr('Narrator: {name}', { name: (NARRATORS.find(([k]) => k === narratorOf(prefs)) || NARRATORS[0])[1] })} onPress={() => setPlayView('voices')} />
        {onPlaylists ? <Option glyph={<PlaylistIcon />} title={tr('Playlists')} sub={tr('Books read one after another')} onPress={() => { setPanel(null); setPlayView('main'); onPlaylists(); }} /> : null}
        <View style={styles.setting}>
          <Text style={styles.help}>{tr('Playback speed')}</Text>
          <Slider value={speedDraft ?? speedOf(prefs)} min={0.5} max={1.5} step={0.05} leftLabel={tr('Slower')} rightLabel={tr('Faster')}
            format={(v) => `${v.toFixed(2).replace(/0$/, '')}×`}
            onChange={setSpeedDraft}
            onDone={(v) => { setSpeedDraft(null); setPrefs((p) => ({ ...p, rate: Math.round(v * 100) / 100 })); }} />
        </View>
        <View style={styles.setting}>
          <Text style={styles.help}>{tr('Text size')}</Text>
          <Seg value={prefs.textScale || 1} options={TEXT_SIZES.map(([label, v]) => [v, tr(label)])} onChange={(v) => setPrefs((p) => ({ ...p, textScale: v }))} />
        </View>
        <View style={styles.setting}>
          <Text style={styles.help}>{tr('Book font')}</Text>
          <Seg stacked value={prefs.font || 'serif'} options={Object.entries(BOOK_FONTS).map(([k, f]) => [k, tr(f.label), f.family])} onChange={(v) => setPrefs((p) => ({ ...p, font: v }))} />
        </View>
        <View style={styles.setting}>
          <Text style={styles.help}>{tr('Sound effects')}</Text>
          <Seg value={prefs.sound ? 'on' : 'off'} options={[['off', tr('Off')], ['on', tr('On')]]}
            onChange={(v) => { const on = v === 'on'; setPrefs((p) => ({ ...p, sound: on })); setEffects(on); if (on) playSound('swish'); }} />
          {/* how loud the sound effects are (only while they're on); a swish plays at the new level */}
          {prefs.sound ? (
            <Slider value={volDraft ?? (prefs.soundVol == null ? 0.5 : prefs.soundVol)} min={0.05} max={1} step={0.05} leftLabel={tr('Quieter')} rightLabel={tr('Louder')}
              format={(v) => `${Math.round(v * 100)}%`} showValue={false}
              onChange={setVolDraft}
              onDone={(v) => { setVolDraft(null); const vol = Math.round(v * 100) / 100; setPrefs((p) => ({ ...p, soundVol: vol })); setEffectsVolume(vol); playSound('swish'); }} />
          ) : null}
        </View>
        {/* Print: two choices, each a little picture of the page (not when the parental controls turn sharing off) */}
        {controls.sharing ? <View style={styles.setting}>
          <Text style={styles.help}>{printing ? tr('Getting ready to print…') : tr('Print this book')}</Text>
          <View style={{ flexDirection: 'row', gap: 14, opacity: printing ? 0.4 : 1 }}>
            {[['stacked', 'Portrait'], ['landscape', 'Landscape']].map(([lay, label]) => (
              <Pressable key={lay} disabled={printing} onPress={() => { setPanel(null); setPrintGate(lay); }} accessibilityRole="button" accessibilityLabel={tr(lay === 'stacked' ? 'Print, portrait pages' : 'Print, landscape pages')} style={styles.printBtn}>
                <View style={styles.printIc}><PageShape wide={lay === 'landscape'} /></View>
                <Text style={styles.printLabel}>{tr(label)}</Text>
              </Pressable>
            ))}
          </View>
        </View> : null}
          </>
        )}
      </Panel>
      <ParentGate visible={shareGate} reason={tr('Sharing opens your phone’s messages and email.')} onCancel={() => setShareGate(false)}
        onPass={() => {
          setShareGate(false);
          shareInvite(story.title);
        }} />
      <ParentGate visible={!!printGate} reason={tr('Printing opens your phone’s print options.')} onPass={() => doPrint(printGate)} onCancel={() => setPrintGate(null)} />

      <Panel open={panel === 'rec'} side="right" title={tr('Recording Options')} {...panelPos} onClose={() => { setPanel(null); recordingSoon.current = false; }}>
        {recView === 'main' ? (
          <>
            <Option glyph={<DotIcon />} title={tr('Start Recording')} sub={tr('Read this story in your own voice, starting on page {n}', { n: Math.min(idx + 1, n) })} disabled={idx >= n} onPress={startRec} />
            <Option glyph={<ListIcon />} title={tr('Your Recordings')} sub={tr('Listen to or remove the pages you recorded')} onPress={openRecList} />
            <Option glyph={<GearIcon size={MENU_ICON} />} title={tr('Recording Settings')} sub={tr('Choose whose voice reads the story')} onPress={() => setRecView('settings')} />
            <Option glyph={<TextIcon text="?" />} title={tr('Help')} sub={tr('How recording works')} onPress={() => setRecView('help')} />
          </>
        ) : (
          <Pressable onPress={() => setRecView('main')} hitSlop={8}><Text style={styles.back}>{tr('‹ Back')}</Text></Pressable>
        )}
        {recView === 'list' ? (
          recList.length ? recList.map((r) => (
            <View key={r.pid} style={styles.row}>
              <Text style={styles.rowText}>{tr('Page {n} · {s}s', { n: r.page + 1, s: Math.round(r.seconds) })}</Text>
              <Pressable style={styles.rowBtn} onPress={() => { stopReading(); playVoice(r.uri); }}><Text style={styles.rowBtnText}>{tr('Play')}</Text></Pressable>
              <Pressable style={styles.rowBtn} onPress={async () => { stopVoice(); await removeRecording(story.id, r.pid); openRecList(); toast(tr('Removed your recording of page {n}.', { n: r.page + 1 })); }}><Text style={styles.rowBtnText}>{tr('Remove')}</Text></Pressable>
            </View>
          )) : <Text style={styles.help}>{tr('Nothing recorded yet. Tap Start Recording to read this story in your own voice.')}</Text>
        ) : null}
        {recView === 'settings' ? (
          <>
            <Text style={styles.help}>{tr('Who reads the story aloud')}</Text>
            <Seg value={prefs.voice || 'narrator'} options={[['narrator', tr('Narrator')], ['mine', tr('Your voice')]]} onChange={(v) => { stopReading(); setPrefs((p) => ({ ...p, voice: v })); }} />
            <Text style={styles.help}>{tr('Pages you haven’t recorded use the narrator.')}</Text>
          </>
        ) : null}
        {recView === 'help' ? (
          <>
            <Text style={styles.help}>{tr('Tap Start Recording and read the page out loud. Turn the page and keep reading: each page saves on its own.')}</Text>
            <Text style={styles.help}>{tr('Tap the red button to stop. Your recordings stay on this phone, and the story will read back in your voice.')}</Text>
          </>
        ) : null}
      </Panel>
    </View>
  );
}

// The recording timer: a small grey box with the time recorded so far (0:03), beside the pulsing record button.
function RecTimer({ start, style }) {
  const tr = useT();
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(t);
  }, [start]);
  return (
    <View pointerEvents="none" style={style}>
      <View style={styles.recBox} accessibilityLabel={tr('Recording, {n} seconds', { n: secs })}>
        <Text style={styles.recBoxTime}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alarmTime: { color: '#b0b0b0', fontFamily: fonts.ui, fontSize: 14, fontWeight: '400', letterSpacing: 0.3 },
  screen: { flex: 1, backgroundColor: DESK_BG },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DESK_BG },
  bookShadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  book: { flex: 1, overflow: 'hidden', backgroundColor: colors.paper },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 14, marginTop: 3 },
  recMark: { position: 'absolute', top: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.highlight, opacity: 0.75, zIndex: 5 },
  mineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.deepRed },
  mineText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 12 },
  sideBar: { backgroundColor: colors.bar, alignItems: 'flex-end', zIndex: 30 },
  bottomBar: { backgroundColor: colors.bar, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10, zIndex: 30 },
  small: { transform: [{ scale: 0.86 }] },
  edge: { position: 'absolute', top: 0, bottom: 0, zIndex: 15 },
  half: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', backfaceVisibility: 'hidden' },
  strip: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', transformOrigin: 'top' },
  recBox: { backgroundColor: '#4a4a4a', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, alignItems: 'center' },
  recBoxTime: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14, fontVariant: ['tabular-nums'], minWidth: 34, textAlign: 'center' },
  back: { color: colors.muted, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  setting: { gap: 8, paddingTop: 10, paddingBottom: 8 },
  printBtn: { alignItems: 'center', gap: 6 },
  printIc: { width: 64, height: 64, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  printLabel: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  backlink: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, fontWeight: '700', paddingVertical: 6 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2a2a2a', padding: 12 },
  rowText: { flex: 1, color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  rowBtn: { backgroundColor: colors.tile, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 }, // pills
  rowBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 10, borderRadius: 22 }, // pills
  segText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
});

// Listen Only's choice: the screen dims, and a dark grey rounded square floats in the middle with the simple sun on
// the left (Daydream), a thin white line down the middle, and the moon on the right (the nightlight)
function ListenChoice({ area, onDay, onNight, onCancel, onGone, tr }) {
  const dim = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const [picked, setPicked] = useState(null); // 'day' or 'night': its icon turns solid, a soft click, then off we go
  useEffect(() => {
    Animated.sequence([
      Animated.timing(dim, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);
  // chosen: the box and its dark layer dissolve while the nightlight or Daydream fades in underneath (it starts dark)
  const pick = (which) => {
    if (picked) return;
    setPicked(which);
    playSwitch(); tap();
    setTimeout(() => {
      (which === 'day' ? onDay : onNight)();
      Animated.parallel([
        Animated.timing(pop, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(dim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start(() => onGone && onGone());
    }, 260);
  };
  const side = Math.min(240, area.width * 0.6);
  const ink = 'rgba(255,255,255,0.88)';
  const word = { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.ui, fontSize: 12, fontWeight: '300', letterSpacing: 1.2, marginBottom: side * 0.09 };
  return (
    <>
      <Animated.View style={{ position: 'absolute', ...area, zIndex: 45, backgroundColor: 'rgba(0,0,0,0.75)', opacity: dim }} onStartShouldSetResponder={() => true} />
      <View pointerEvents="box-none" style={{ position: 'absolute', ...area, zIndex: 46, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View pointerEvents={picked ? 'none' : 'auto'} style={{ alignItems: 'flex-end', opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
          <View style={{ width: side, height: side, borderRadius: 30, backgroundColor: '#2b2b2d', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            {/* what this is: Listening Only mode (nothing plays until Daydream or Nightlight is chosen) */}
            <Text style={{ color: 'rgba(255,255,255,0.92)', fontFamily: fonts.ui, fontSize: 15, fontWeight: '500', letterSpacing: 0.3, textAlign: 'center', marginTop: side * 0.1 }}>{tr('Listening Only mode')}</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginTop: -side * 0.02 }}>
            <Pressable onPress={() => pick('day')} style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={tr('Daydream')}>
              <Text style={word}>{tr('Daydream')}</Text>
              {picked === 'day' ? <SolidSun size={side * 0.16} color={ink} /> : <SunIcon size={side * 0.16} color={ink} />}
            </Pressable>
            <View style={{ width: 1.1, height: side * 0.5, backgroundColor: ink }} />{/* the same fine stroke as the sun and the moon */}
            <Pressable onPress={() => pick('night')} style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={tr('Nightlight')}>
              <Text style={word}>{tr('Nightlight')}</Text>
              {picked === 'night'
                ? <View style={{ width: side * 0.16, height: side * 0.16, alignItems: 'center', justifyContent: 'center' }}><MoonIcon size={side * 0.16 * (226 / 246)} color={ink} /></View>
                : <Image source={MOON_OUTLINE} style={{ width: side * 0.16, height: side * 0.16, tintColor: ink }} resizeMode="contain" />}
            </Pressable>
            </View>
          </View>
          {/* Cancel: small, light grey, under the box's bottom right corner: back out of Listen Only */}
          <Pressable onPress={withTap(onCancel)} hitSlop={14} style={{ marginTop: 12, marginRight: 6 }} accessibilityRole="button">
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: fonts.ui, fontSize: 12.5, letterSpacing: 0.4 }}>{tr('Cancel')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

// Daydream's mark on the bar (in place of the moon): a small solid sun; tap it to close Daydream
function SolidSun({ size, color }) {
  const r = size * 0.24;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={{ position: 'absolute', width: Math.max(1.6, size * 0.09), height: size * 0.2, borderRadius: size * 0.05, backgroundColor: color, transform: [{ rotate: `${i * 45}deg` }, { translateY: -size * 0.39 }] }} />
      ))}
      <View style={{ width: r * 2, height: r * 2, borderRadius: r, backgroundColor: color }} />
    </View>
  );
}

