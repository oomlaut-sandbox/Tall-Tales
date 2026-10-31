// The reader: page curl, read-aloud with highlighting, learn-to-read, interactive pictures.
import { onRecordRequest } from '../ambient';
import { AlarmClockIcon, ConfirmBox, IDLE, LockIcon, PlaylistIcon, barGeo, slotStyle } from '../components/Chrome';
const MOON_NUDGE = 0.4; // (in u) the crescent's optical nudge in its slot
import { isRestricted, useControls } from '../controls';
import { useLang, useT } from '../i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOOK_FONTS, colors, fonts } from '../theme';
import { DeskFelt, Felt, IS_TABLET, DESK_BG } from '../look';
import { readText } from '../components/WordsOver';
import { tokenize, cleanWord } from '../story';
import { recordingDone } from '../rating';
import { AMBER, Fade, PageView, TEXT_SIZES, pageLayout } from '../components/PageView';
import { FLAP_PERSPECTIVE, flapTables } from '../flapStrips';
import { FlapPeel, SnapUnder, snapshot, supportsCurl } from '../components/Curl';
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
import { Toast, BackRing, LineIcon, BulbIcon, BubbleIcon, HeadphonesIcon, MoonIcon, PageShape, Burger, GlassesIcon, DogEar, DotIcon, ListIcon, Option, Panel, PauseButton, PlayButton, PlayGlyph, RecordButton, Slider, TextIcon, sideTop } from '../components/Chrome';

// Reading speed: 1 = the voice's natural pace. The default is moderately slow.
// Older settings only had Normal/Slow.
export const DEFAULT_SPEED = 0.75;
// each narrator keeps their own speed: Henry sounds best a little quicker, 1.0 to start (Jörg, 28 Oct 2026)
const NARRATOR_SPEED = { lily: DEFAULT_SPEED, gregory: 1.0 };
export const speedOf = (prefs) => {
  const who = narratorOf(prefs);
  if (prefs.rate && (prefs.rateFor || 'lily') === who) return prefs.rate;
  return who === 'lily' && prefs.speed === 'slow' ? 0.8 : NARRATOR_SPEED[who] || DEFAULT_SPEED;
};
// Book narrators (ElevenLabs). Fatima (voice key 'lily') is the default.
// A tiny printed page: white sheet with the picture and words squares, upright or sideways.
export const NARRATORS = [['lily', 'Fatima'], ['gregory', 'Henry']]; // add more voices here (and in ci/narrate.js)
// narrators who read only certain books (picked in that book's 'Who reads this book?' box; the book remembers it)
const LISTEN_TIP_SEEN = {}; // Listen Only's 'how to close' bubble, shown once per launch for each scene
// James (voice files under 'johnny') reads Different: off for now (Jörg, 26 Oct 2026). Back: [['johnny', 'James', ['different']]]
export const BOOK_NARRATORS = [];
export const narratorOf = (prefs) => (NARRATORS.some(([k]) => k === prefs.narrator) ? prefs.narrator : 'lily');
const NARRATOR = 0.92; // the phone voice's normal pace
const VOICE_RECORDING = {
  ...RecordingPresets.HIGH_QUALITY,
  // (mono AAC at a standard 44.1 kHz / 128 kbps: the phone's encoder always accepts it, so the file always plays)
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  isMeteringEnabled: true, // how loud the voice is, for the trim editor's picture of the sound
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, sampleRate: 44100 },
  android: { ...RecordingPresets.HIGH_QUALITY.android, sampleRate: 44100 },
};
import { checkVolume } from '../volume';
import { playSound, playSwitch, setEffects, setEffectsVolume, suspendSounds } from '../sound';
import { rememberPage, startPage, useBackStep, useHideBack } from '../nav';
import { pauseSpeech, resumeSpeech, speakQueue, speakTracked, stopSpeech } from '../speech';
import { shareInvite } from '../invite';
import { shareBookWithVoices } from '../voiceShare';
import { audioModeChanged, fadeStopVoice, pauseVoice, playClips, playVoice, resumeVoice, stopVoice } from '../voice';
import * as WORDCLIPS from '../narration/words';
const WORDS = WORDCLIPS.WORDS || {};
const WORDS_LANG = WORDCLIPS.WORDS_LANG || {}; // (made by the next narration run)
import { loadJSON, saveJSON } from '../storage';
import { announce } from '../a11y';
import { getBookVoice, getReaders, getRecording, listRecordings, pageKey, removeRecording, saveRecording, setBookVoice, setTrim } from '../recordings';
import ReaderPick from '../components/ReaderPick';
import VoicePick, { VoiceFace } from '../components/VoicePick';
const SCISSORS = require('../../assets/icon-scissors.png');
const ENVELOPE = require('../../assets/icon-envelope.png'); // share (the envelope everywhere now: Jörg, 28 Oct 2026) // Edit this book (a book you made)
import TrimEditor from '../components/TrimEditor';
const TRASH = require('../../assets/icon-trash.png');
import { markFinished, markFirst, markReadToday } from '../badges';
import { AUDIO, TIMINGS } from '../narration';
import { SAMPLES, SAMPLE_LANGS, THE_END } from '../narration/samples';
import Nightlight, { SUN_SOLID, SunIcon } from '../components/Nightlight';
const MOON_OUTLINE = require('../../assets/icon-moon-outline.png'); // the moon logo, traced as a fine outline (the same weight as the sun)
import { tap, thunk, withTap } from '../haptics';
import { fmtTime } from '../clock';

export const MODES = [
  [<GlassesIcon />, 'self', 'Read Yourself', 'Page by page with no audio'],
  [<TextIcon text="Aa" />, 'learn', 'Learn to Read', 'Says a word when you touch it'],
  [<PlayGlyph count={2} />, 'auto', 'Auto Play', 'Reads the full story with audio'],
  [<PlayGlyph />, 'page', 'Page by Page Play', 'Reads a page at a time with audio'],
  [<HeadphonesIcon />, 'listen', 'Listen Only', 'Audio only, with Daydream or the Nightlight'],
  // ['✦', 'interactive', 'Interactive', 'Image interaction with touch'],  (hidden for now; hotspot code kept)
];

export function Seg({ value, options, onChange, stacked }) {
  return (
    <View style={stacked ? { gap: 8 } : { flexDirection: 'row', gap: 8 }}>
      {options.map(([v, l, family]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[styles.seg, stacked && { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingVertical: 12 }, value === v && { backgroundColor: colors.green }]}>
          <Text style={[styles.segText, family && { fontFamily: family, fontWeight: '400', fontSize: 17 }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Reader({ coverShut = false, onOpenCover, u, story, prefs, setPrefs, openMenu, goLibrary, onCover, toast, menuRequest, landscape, setToastSpot, autoStart, startRecording, onFinished, onSettings, onPlaylists, onShown, onEdit, onBackToBooks }) { // onEdit: scissors on the bar, for a book you made (Jörg, 27 Oct 2026)
  const tr = useT(); // the reader's own panel, in the app's language
  const appLang = useLang();
  const controls = useControls(); // parental controls: recording, sharing and printing may be switched off
  const insets = useSafeAreaInsets();
  const pages = useMemo(() => [...story.pages, { end: true }], [story]);
  // a book's own photos (files on the phone): decoded once up front, so the page-turn layers draw them at once
  useEffect(() => { story.pages.forEach((pg) => [pg.image, pg.image2].forEach((im) => { if (im && im.uri) Image.prefetch(im.uri).catch(() => {}); })); }, [story]);
  const [idx, setIdx] = useState(() => Math.min(startPage('reader', story.id), story.pages.length - 1)); // (Back: the page that was open)
  useEffect(() => { rememberPage('reader', story.id, idx); }, [idx, story.id]);
  // While recording (and a little after, for 'Saved your voice…'), speech bubbles sit in the middle of the
  // picture page (top, or left when sideways) so they don't cover the words being read.
  const bookRef = useRef(null);
  // badges (My Notes): a day with reading, and a book read all the way to The End
  useEffect(() => { markReadToday(); }, []);
  // VoiceOver: the words on the page that just turned are read out (Jörg, 27 Oct 2026)
  useEffect(() => { const pg = pages[idx]; if (!pg) return; announce(pg.end ? tr('The End') : pg.titlePage ? (story.title || '') : readText(pg)); }, [idx]);
  useEffect(() => { if (pages[idx] && pages[idx].end) { markFinished(story, story.cover || (story.pages.find((pg) => pg.image) || {}).image); if (onFinished) onFinished(); } }, [idx]);
  const [size, setSize] = useState(null); // book area {w,h}
  const [deskW, setDeskW] = useState(0); // the felt's width (the bulb sits halfway between its left edge and the book)
  // tells App once the book is laid out and drawn (the opening cover then steps aside, never before)
  const shownSent = useRef(false);
  useEffect(() => {
    if (!size || shownSent.current || !onShown) return;
    shownSent.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => onShown())));
  }, [size]);
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
  useEffect(() => { if (REC_DEMO) setTimeout(() => toast(tr('Pssst… Record the whole book at once. We’ll do the rest.'), 6000), 1500); }, []);
  const [recView, setRecView] = useState('main'); // main | list | settings | help
  const [recList, setRecList] = useState([]);
  const [recDel, setRecDel] = useState(null); // 'Delete this recording?' (asked first: 31 Oct 2026)
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
      await printStory({ title: story.title, author: story.author, pages: story.pages.map((p) => ({ text: p.text, image: p.image, image2: p.image2, textOn: p.textOn, textAt: p.textAt, textLook: p.textLook, textInk: p.textInk, textSize: p.textSize, both: p.both, text2: p.text2, textAt2: p.textAt2, textLook2: p.textLook2, textInk2: p.textInk2, textSize2: p.textSize2 })) }, layout, prefs.font);
    } catch (e) {
      toast(tr('Couldn’t print the book. Please try again.')); // plain words, never the phone's technical message
    }
    setPrinting(false);
  };
  // Voice recording: mono (one voice), 48 kHz, high-bitrate AAC — fuller than the stereo preset.
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const recStart = useRef(0);
  const pendingRec = useRef(false);
  const recLevels = useRef([]);
  const meterTimer = useRef(null);
  const [trimRec, setTrimRec] = useState(() => (Platform.OS === 'web' && typeof window !== 'undefined' && /trim-demo/.test(window.location.hash)
    ? { page: 1, pid: 'demo', uri: '', seconds: 14, start: 1.2, end: 11.5, levels: Array.from({ length: 280 }, (_, i) => Math.abs(Math.sin(i / 9)) * (0.4 + 0.6 * Math.abs(Math.sin(i / 37)))) } : null)); // the recording open in the trim editor (web preview #trim-demo shows a sample)
  const [savedPage, setSavedPage] = useState(null); // { n, k }: the page just saved, shown for a moment
  useEffect(() => { if (!savedPage) return undefined; const t = setTimeout(() => setSavedPage(null), 2600); return () => clearTimeout(t); }, [savedPage]);
  const recAuto = useRef(false); // recording carried on to the next page by itself (no instructions bubble again)
  const usingVoice = useRef(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const flipP = useRef(new Animated.Value(0)).current; // 0 = page a showing, 1 = page b (a + 1)
  const prog = useRef(0); // the same progress, as a plain number
  const [recAll, setRecAll] = useState([]); // every recording of this book: { page, reader }
  const recPages = recAll.map((r) => r.page); // pages someone has recorded
  const refreshRecPages = useCallback(() => { listRecordings(story).then((l) => setRecAll(l.map((r) => ({ page: r.page, reader: r.reader })))).catch(() => {}); }, [story]);
  // who reads this book aloud: 'narrator' or one of the family's readers (each book remembers its own)
  const [voice, setVoice] = useState(prefs.voice === 'mine' ? 'me' : 'narrator');
  const voiceRef = useRef(voice); voiceRef.current = voice;
  // a narrator only this book has (James reads Different; his voice files keep the key 'johnny'): kept as the book's voice 'narrator:johnny'
  const bookNarrators = BOOK_NARRATORS.filter(([, , books]) => books.includes(story.id));
  const [bookNarr, setBookNarr] = useState(null);
  const bookNarrRef = useRef(null); bookNarrRef.current = bookNarr;
  const nkOf = (pr) => bookNarrRef.current || narratorOf(pr); // whose narration plays
  const [readers, setReaders] = useState([]);
  useEffect(() => {
    getReaders().then(setReaders).catch(() => {});
    getBookVoice(story.id).then((v) => {
      if (v && v.startsWith('narrator:')) { const k = v.slice(9); if (bookNarrators.some(([b]) => b === k)) { setBookNarr(k); setVoice('narrator'); } return; }
      if (v) setVoice(v);
    }).catch(() => {});
  }, [story.id]);
  const recReader = useRef('me'); // who is recording now
  const [askReader, setAskReader] = useState(false); // the 'Who's reading?' box before recording
  const askToRecord = () => { hushForRecording(); setPanel(null); setRecTip(false); setAskReader(true); };
  // A book with no audio at all (made in Coro, or an older one nobody has recorded): the first time it opens, a
  // speech bubble over the record button says so (once per book) (Jörg, 26 Oct 2026)
  const [recTip, setRecTip] = useState(false);
  useEffect(() => {
    const narrated = (story.narration && Object.keys(story.narration).length) || Object.values(AUDIO).some((v) => v && v[story.id]);
    if (narrated || startRecording || listen) return undefined;
    let off = false;
    const tm = setTimeout(async () => {
      const seen = (await loadJSON('recTipSeen', {}).catch(() => ({}))) || {};
      if (off || seen[story.id]) return;
      const l = await listRecordings(story).catch(() => []);
      if (off || (l && l.length)) return;
      setRecTip(true); saveJSON('recTipSeen', { ...seen, [story.id]: Date.now() }).catch(() => {});
    }, 2200);
    return () => { off = true; clearTimeout(tm); };
  }, [story.id]);
  useEffect(() => { if (!recTip) return undefined; const tm = setTimeout(() => setRecTip(false), 12000); return () => clearTimeout(tm); }, [recTip]);
  useEffect(() => { if (!startRecording) return undefined; const tm = setTimeout(askToRecord, 900); return () => clearTimeout(tm); }, []); // straight from Finish: 'Who's reading?'
  useEffect(() => { refreshRecPages(); }, [refreshRecPages]);
  // Who can read this book: the narrator, and everyone in the family who recorded at least one of its pages
  const familyOptions = readers.filter((r) => recAll.some((x) => x.reader === r.id)).map((r) => ({ id: r.id, name: r.id === 'me' && r.name === 'Me' ? tr('Me') : r.name, photo: r.photo }));
  const voiceOptions = [{ id: 'narrator', name: tr('Narrator'), narrator: true }, ...familyOptions]; // (the Play panel's list)
  const shownVoice = voiceOptions.some((o) => o.id === voice) ? voice : 'narrator';
  // the box from the face on the bar: every voice by name (Fatima, Henry, then the family: Me, Opa…)
  // a narrator with no audio for this book (every narrator, in a book made in Coro) is greyed out (Jörg, 26 Oct 2026)
  const narrHas = (k) => !!((story.narration && story.narration[k]) || (AUDIO[k] && (AUDIO[k][story.id] || (story.lang && AUDIO[k][`${story.id}@${story.lang}`]))));
  const boxOptions = [...NARRATORS.map(([k, label]) => ({ id: `narrator:${k}`, name: label, narrator: true, off: !narrHas(k) })), ...bookNarrators.map(([k, label]) => ({ id: `narrator:${k}`, name: label, narrator: true, off: !narrHas(k) })), ...familyOptions];
  const boxValue = shownVoice === 'narrator' ? `narrator:${bookNarr || narratorOf(prefs)}` : shownVoice;
  const showVoices = true; // the face is always on the bar: there are always the two narrators to choose from
  const [voiceBox, setVoiceBox] = useState(false);
  const [editReaders, setEditReaders] = useState(false); // the scissors: the 'Who's reading?' box for editing the readers // the 'Who reads this book?' box from the face on the bar
  // Back closes what's open on top of the book first (Jörg, 27 Oct 2026)
  useBackStep(!!panel, () => { setPanel(null); setPlayView('main'); });
  useBackStep(voiceBox, () => setVoiceBox(false));
  useBackStep(editReaders, () => setEditReaders(false));
  // a book the family recorded opens in their voice (the grown-up setting, on unless switched off), unless a voice
  // was already chosen for this book; the reader with the most recorded pages reads
  const voiceAuto = useRef(false);
  useEffect(() => {
    if (voiceAuto.current || !recAll.length || !readers.length || controls.familyVoices === false) return;
    voiceAuto.current = true;
    getBookVoice(story.id).then((v) => {
      if (v) return; // chosen before (the narrator too): kept
      const count = {}; recAll.forEach((x) => { count[x.reader] = (count[x.reader] || 0) + 1; });
      const best = Object.keys(count).filter((id) => readers.some((r) => r.id === id)).sort((a, b) => count[b] - count[a])[0];
      if (best) setVoice(best);
    }).catch(() => {});
  }, [recAll, readers]);
  // picking a voice: the book remembers it; a page that was reading starts again in the new voice
  const restartInVoice = useRef(false);
  const pickVoice = (id0) => {
    const was = reading || between;
    stopReading();
    let id = id0;
    if (id0.startsWith('narrator:')) {
      const k = id0.slice(9); id = 'narrator';
      if (bookNarrators.some(([b]) => b === k)) { setBookNarr(k); bookNarrRef.current = k; setVoice(id); setBookVoice(story.id, id0); if (was) restartInVoice.current = true; return; }
      setBookNarr(null); bookNarrRef.current = null;
      if (k !== narratorOf(prefs)) setPrefs((p) => ({ ...p, narrator: k }));
    }
    setVoice(id); setBookVoice(story.id, id);
    if (was) restartInVoice.current = true;
  };
  const [shareGate, setShareGate] = useState(false); // 'Share book' on the last page, behind the parent gate
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
  const listenRef = useRef(listen); listenRef.current = listen;
  st.current = { idx, size, reading, paused, mode: listen ? 'auto' : prefs.mode, turning: !!flipPair, pages, recording, amber: !!prefs.amber };
  if (idx > pages.length - 1) setIdx(pages.length - 1);
  const pendingRead = useRef(false);
  const autoTimer = useRef(null);
  const anim = useRef(null);

  // A plain black strip over the camera area (so pictures aren't hidden), and the solid black bar
  // at the bottom with the menu, title and play controls (no play controls in Read Yourself).
  // The book floats on dark grey (see BookFrame): two equal squares, about 30 points of grey all
  // round; the black bars take what height is left. Stacked upright; side by side on a sideways iPad.
  const { width: winW, height: winH } = useWindowDimensions();
  const BL = bookLayout(winW, winH, insets, u * 17); // the bar: the same size as on every screen
  const wide = BL.wide;
  st.current.wide = wide;
  const topH = BL.topH;
  const showControls = (prefs.mode !== 'self' && !listen) || recording;
  const barH = BL.barH;
  // a small 'Your voice' mark when this page will play the parent's recording
  const mineHere = voice !== 'narrator' && recAll.some((x) => x.page === idx && x.reader === voice) && prefs.mode !== 'self' && !recording;
  const panelPos = wide ? { bottom: 0, inset: BL.rightW } : { bottom: barH };
  const n = story.pages.length;
  const tokens = useMemo(() => (pages[idx] && readText(pages[idx]) ? tokenize(readText(pages[idx])) : []), [pages, idx]); // (words on both pictures: top, then bottom)

  useEffect(() => {
    if (!prefs.mode) setTimeout(() => setPanel('play'), 350);
    return () => { stopSpeech(); clearTimeout(autoTimer.current); cancelAnimationFrame(anim.current); };
  }, []);
  // the menu's Playback Settings opens this panel; only a new request does (not one left over from an
  // earlier book, which used to pop the panel open whenever another book was opened)
  const lastMenuRequest = useRef(menuRequest);
  // (from the main menu; on the shut cover the book opens first, so the panel isn't hidden under it)
  useEffect(() => { if (menuRequest && menuRequest !== lastMenuRequest.current) { if (coverShut && onOpenCover) { onOpenCover(); setTimeout(() => setPanel('play'), 1100); } else setPanel('play'); } lastMenuRequest.current = menuRequest; }, [menuRequest]);

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
  const pickScene = (sc) => {
    setScene(sc); setPrefs((p) => ({ ...p, listenScene: sc })); setTimeout(() => readPage(st.current.idx), 900); /* the story starts as the scene fades in */
    // a speech bubble once it's showing: how to get out again (once per launch for each of Daydream and the nightlight)
    // Each has 'Don't show this message again' (Jörg, 30 Oct 2026): ticked, it never shows again for that one
    if (!LISTEN_TIP_SEEN[sc]) {
      LISTEN_TIP_SEEN[sc] = true;
      loadJSON('listenTipOff', {}).catch(() => ({})).then((off) => { if (!(off && off[sc])) setTimeout(() => setListenTip(sc), 1600); });
    }
  };
  const [listenTip, setListenTip] = useState(null); // 'day' | 'night': the bubble showing
  const nightEnabled = listen && controls.nightlight !== false; // Settings → Nightlight mode can switch the nightlight off
  const choosing = nightEnabled && scene === 'choose';
  const nightOn = nightEnabled && !choosing; // the nightlight or Daydream is showing (the lock and alarm are on the bar)
  useEffect(() => { if (!nightOn) setListenTip(null); }, [nightOn]); // (leaving Listen Only puts its bubble away)
  useHideBack(nightOn); // (no back button over the nightlight)
  useHideBack(voiceBox); // (nor over the voice box: it has its own close arrow, in that corner)
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
  const toggleRef = useRef(null);
  const nlOut = useRef(new Animated.Value(1)).current;
  const [leavingNight, setLeavingNight] = useState(false);
  const toggleNight = () => {
    // on the shut cover: the book opens first, then the moon does its job
    if (coverShut && onOpenCover) { onOpenCover(); setTimeout(() => toggleRef.current && toggleRef.current(), 1150); return; }
    if (prefs.mode === 'listen') {
      const back = prefs.prevMode && prefs.prevMode !== 'listen' ? prefs.prevMode : 'auto';
      if (!nightOn) { chooseMode(back); return; }
      if (leavingNight) return;
      // a soft dissolve back to the book, then the mode changes
      setLeavingNight(true);
      Animated.timing(nlOut, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        chooseMode(back);
        setTimeout(() => { nlOut.setValue(1); setLeavingNight(false); }, 60);
      });
      return;
    }
    chooseMode('listen'); // the same choice as from the menu: Daydream or the nightlight
  };
  toggleRef.current = toggleNight; // (the latest one: once the cover is open it goes straight on)

  const wordAt = (ch) => {
    for (let i = 0; i < tokens.length; i++) if (tokens[i].start <= ch && ch < tokens[i].end + 1) return i;
    return -1;
  };

  const readPage = useCallback((pageIndex) => {
    if (st.current.recording || recordingSoon.current || pendingRec.current) return; // never read aloud over a recording (or between two recorded pages)
    const p = st.current.pages[pageIndex];
    if (!p) { setReading(false); return; }
    // the last page: the narrator says "The End", softly and slowly (the same clip for every book),
    // a moment after the page has landed. No clip yet: the phone's voice says it, slowly.
    if (p.end) {
      const lang = story.lang || 'en';
      const vk = nkOf(prefs);
      const clip = story.mine ? null : THE_END?.[vk]?.[lang] || THE_END?.lily?.[lang]; // (a book made in Coro: no narrator says it either: Jörg, 26 Oct 2026)
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
    const toks = tokenize(readText(p));
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
      checkVolume(tr('Your volume is turned down.'));
      const voiceKey = nkOf(prefs);
      // books from the store bring their own narration (downloaded); the app's own books have it built in
      // a book shown in another language has no narration in that language yet: the phone reads it in that language
      // a translated book: its ElevenLabs narration in that language (kept as e.g. different@de), or, if there
      // is none yet, the phone reads it in that language
      const other = story.lang && story.lang !== 'en';
      const sk = other ? `${story.id}@${story.lang}` : story.id;
      // a store book brings narration in the language it opened in (narrationLang), the other languages too (30 Oct 2026)
      const ownLang = !!story.narration && (story.narrationLang || 'en') === (story.lang || 'en');
      if (other && !ownLang && !AUDIO[voiceKey]?.[sk]?.[p.pid] && !AUDIO.lily?.[sk]?.[p.pid]) { speakTracked(readText(p), { lang: story.lang, rate: NARRATOR * speedOf(prefs), onWord: hlChar, onDone: afterPage }); return; }
      const own = ownLang ? (story.narration[voiceKey]?.[p.pid] || story.narration.lily?.[p.pid]) : null;
      const audio = own ? { uri: own.uri } : AUDIO[voiceKey]?.[sk]?.[p.pid] || AUDIO.lily?.[sk]?.[p.pid];
      const times = own ? own.words : (TIMINGS[AUDIO[voiceKey]?.[sk]?.[p.pid] ? voiceKey : 'lily']?.[sk]?.[p.pid] || {}).words;
      // narration with word timings that don't match the words (the text changed since it was made) still plays in
      // the narrator's voice, just without the words lighting up: never the phone's robotic voice when there is audio
      const tm = times && times.length === toks.length ? times : [];
      if (audio && playVoice(audio, {
        rate: speedOf(prefs) / DEFAULT_SPEED, // narration is already made at the default pace
        onTime: (t) => {
          let i = -1;
          while (i + 1 < tm.length && tm[i + 1] <= t + 0.05) i++;
          setHl(i);
        },
        onDone: afterPage,
        onFail: () => { // the narration file wouldn't play: read it with the phone's voice instead
          usingVoice.current = false;
          if (st.current.idx === pageIndex) speakTracked(readText(p), { lang: story.lang, rate: NARRATOR * speedOf(prefs), onWord: hlChar, onDone: afterPage });
        },
      })) {
        usingVoice.current = true;
        return;
      }
      speakTracked(readText(p), { lang: story.lang, rate: NARRATOR * speedOf(prefs), onWord: hlChar, onDone: afterPage });
    };
    if (voiceRef.current && voiceRef.current !== 'narrator') {
      getRecording(story.id, pageKey(p, pageIndex), voiceRef.current).then((rec) => {
        if (st.current.idx !== pageIndex) return;
        if (rec && playVoice(rec.uri, { rate: speedOf({ ...prefs, narrator: 'lily' }) / DEFAULT_SPEED, /* (a family voice: Fatima's pace setting, not Henry's) */ start: rec.start || 0, end: rec.end || null, // a parent's own pace at the default setting; only the trimmed part
           /* (no words lighting up in a family recording: a guess from the time never kept in step: Jörg, 28 Oct 2026) */ onDone: afterPage,
           onFail: () => { if (st.current.idx === pageIndex) narrate(); } })) {
          usingVoice.current = true;
        } else {
          narrate();
        }
      });
      return;
    }
    narrate();
  }, [prefs.speed, prefs.rate, prefs.voice, prefs.narrator, story, voice]);
  // a new voice picked while reading: the page starts again in it
  useEffect(() => { if (!restartInVoice.current) return; restartInVoice.current = false; const tm = setTimeout(() => readPage(st.current.idx), 150); return () => clearTimeout(tm); }, [voice, readPage]);
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
      if (!perm.granted) { recordingSoon.current = false; pendingRec.current = false; return toast(tr('Coro needs the microphone to record. You can allow it in Settings.')); }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      audioModeChanged();
      await recorder.prepareToRecordAsync();
      recorder.record();
      recStart.current = Date.now();
      // sample the voice's loudness about 20 times a second (decibels: about -50 quiet .. 0 loud)
      recLevels.current = [];
      clearInterval(meterTimer.current);
      meterTimer.current = setInterval(() => {
        try { const st0 = recorder.getStatus(); const db = st0 && typeof st0.metering === 'number' ? st0.metering : null; if (db != null) recLevels.current.push(Math.max(0, Math.min(1, (db + 50) / 50))); } catch (e) {}
      }, 50);
      suspendSounds(true);
      setRecording(true);
      if (!recAuto.current) toast(tr('Pssst… Record the whole book at once. We’ll do the rest.'), 6000);
      recAuto.current = false;
    } catch (e) {
      recordingSoon.current = false; pendingRec.current = false;
      toast(tr('Recording couldn’t start. Try again.'));
    }
  };

  // the felt tape player's Record button: records (or stops) here, like the red button in the bar
  const recToggle = useRef(null);
  recToggle.current = () => {
    if (!controls.recording) return;
    if (st.current.recording) stopRec(true); else askToRecord();
  };
  useEffect(() => onRecordRequest(() => recToggle.current && recToggle.current()), []);

  // keep: recording carries on to the next page, so nothing may start reading in between
  const recSession = useRef(0); // pages recorded since the grown-up pressed record
  const stopRec = async (save, keep = false) => {
    if (!st.current.recording) return;
    if (keep) { pendingRec.current = true; recordingSoon.current = true; }
    const page = st.current.idx;
    const seconds = (Date.now() - recStart.current) / 1000;
    clearInterval(meterTimer.current);
    // keep about 20 samples a second at most, rounded (small to store)
    const levels = recLevels.current.map((v) => Math.round(v * 100) / 100);
    setRecording(false);
    st.current.recording = false;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      audioModeChanged();
      if (save && recorder.uri && seconds > 0.7) {
        await saveRecording(story.id, pageKey(story.pages[page], page), recorder.uri, seconds, levels, recReader.current);
        if (voiceRef.current !== recReader.current) { setVoice(recReader.current); setBookVoice(story.id, recReader.current); } // the book now reads in this reader's voice
        setSavedPage({ n: page + 1, k: Date.now(), who: recReader.current }); // a green 'Page 2 saved' beside the recording box (no speech bubble)
        markFirst('firstRecording'); // a badge in My Notes
        recSession.current += 1;
        refreshRecPages();
      }
    } catch (e) {
      toast(tr('That recording couldn’t be saved.'));
    }
    suspendSounds(false);
    if (!keep) { const n = recSession.current; recSession.current = 0; recordingDone(n); } // a grown-up just recorded a few pages: maybe ask for a rating
    recordingSoon.current = keep;
  };

  const readerName = (id) => { const x = readers.find((y) => y.id === id); return x ? (x.id === 'me' && x.name === 'Me' ? tr('Me') : x.name) : tr('Me'); };
  const readerIndex = (id) => { const k = readers.findIndex((y) => y.id === id); return k < 0 ? 99 : k; };
  const openRecList = async () => {
    getReaders().then(setReaders).catch(() => {});
    setRecList(await listRecordings(story));
    refreshRecPages();
    setRecView('list');
  };

  useEffect(() => () => { clearInterval(meterTimer.current); if (st.current.recording) recorder.stop().catch(() => {}); }, []);

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
      const nk = nkOf(prefsRef.current);
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
      const cached = (k) => { const c = cache.current[k]; return c && c.amber === !!st.current.amber ? c.img : null; }; // only a picture in today's light
      const fa = dir > 0 ? await snapshot(refs.cur) : (cached(a) || (await snapshot(refs.prev)));
      const fb = dir > 0 ? (cached(a + 1) || (await snapshot(refs.next))) : await snapshot(refs.cur);
      // sideways the words page peels from its bottom-right corner (or top-right when the finger
      // starts high up); in the peel's upright frame those are its 'left' and 'right' corners
      if (fa && fb) pics = { front: fa, back: fb, corner: st.current.wide ? (corner === 'top' ? 'right' : 'left') : corner };
    }
    peelOn.current = !!pics;
    flipPics.current = pics ? { dir, i, fa: pics.front, fb: pics.back, amber: !!st.current.amber } : null;
    setPeel(pics);
    setProgress(dir > 0 ? 0 : 1);
    setFlipPair({ a, b: a + 1, dir });
  };
  // the picture of the page just left is kept for turning straight back to it (Jörg, 31 Oct 2026: turning back in a
  // book made in the app waited while that page's picture was taken again, holding the old page on screen)
  const flipPics = useRef(null);
  const ownPhotosRef = useRef(false);
  const carry = useRef(null);
  const endFlip = (dir, commit) => {
    const fp = flipPics.current; flipPics.current = null;
    if (commit && fp && ownPhotosRef.current) carry.current = { at: fp.i, img: dir > 0 ? fp.fa : fp.fb, amber: fp.amber }; // (books with their own photos only: the books inside the app turn as before)
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
    if (st.current.recording && dir > 0) { const keep = st.current.idx + 1 < story.pages.length; await stopRec(true, keep); pendingRec.current = keep; }
    else if (!pendingRead.current) stopReading();
    playSound('swish');
    await startFlip(dir);
    runFlip(dir > 0 ? 1 : 0, 900, () => endFlip(dir, true));
    return true;
  };

  // The first time a book opens: after a short pause the bottom right corner of the page lifts halfway and
  // settles back, to show that pages turn like paper (only ever once; not in Listen Only)
  const hinted = useRef(false);
  useEffect(() => {
    if (!size || hinted.current || listen) return undefined;
    hinted.current = true;
    const tm = setTimeout(async () => {
      if (busy.current || st.current.turning || !canTurn(1) || !supportsCurl) return;
      busy.current = true;
      await startFlip(1, 'right');
      runFlip(0.3, 520, () => setTimeout(() => runFlip(0, 360, () => endFlip(1, false)), 120));
    }, 1400);
    return () => clearTimeout(tm);
  }, [size]);

  // Back from the first spread: the cover swings shut (App shows it; swipe up there to go back to the library)
  const coverRef = useRef(null);
  coverRef.current = () => { if (onCover && !st.current.recording) { stopReading(); onCover(); } };
  const atCover = () => !!onCover && st.current.idx === 0 && !st.current.recording && st.current.mode !== undefined && !listenRef.current;
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
      if (sd && sd.dir < 0 && atCover()) return true; // back from the first spread: the cover closes
      return !!sd && canTurn(sd.dir);
    },
    onPanResponderGrant: (_, g) => {
      drag.current = {};
      const sd = swipeDir(g);
      if (sd && sd.dir < 0 && atCover()) { drag.current = { closed: true }; coverRef.current && coverRef.current(); return; }
      if (sd && canTurn(sd.dir)) beginDrag(sd, g.x0 - (pageX0.current || 0), g.y0 - (pageY0.current || 0));
    },
    onPanResponderMove: (_, g) => {
      let d = drag.current;
      if (d.closed) return; // the cover is closing
      if (!d.dir) {
        // decide on the first real movement whether this is a page-turning swipe
        if (busy.current || st.current.turning) return;
        const sd = swipeDir(g);
        if (sd && sd.dir < 0 && atCover()) { drag.current = { dir: 0, closed: true }; coverRef.current && coverRef.current(); return; }
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
      stopRec(true, keepGoing);
    }
    if (commit) playSound('swish');
    const target = commit ? (d.dir > 0 ? 1 : 0) : (d.dir > 0 ? 0 : 1);
    runFlip(target, 240 + 420 * Math.abs(target - prog.current), () => endFlip(d.dir, commit));
  };

  // Keep fresh pictures of the neighbouring pages ready, so a turn starts without a delay.
  // Each picture remembers whether Amber light was on when it was taken, and a picture still being taken when the
  // page or the light changes is thrown away, so a turn never shows the old colour.
  const cacheGen = useRef(0);
  useEffect(() => {
    cache.current = {};
    const gen = ++cacheGen.current, amber = !!prefs.amber;
    if (!supportsCurl || !size || flipPair) return;
    // the page just turned away from: its picture from the turn, ready at once (no new picture needed)
    const c = carry.current; carry.current = null;
    if (c && c.img && c.amber === amber && (c.at === idx - 1 || c.at === idx + 1)) cache.current[c.at] = { img: c.img, amber };
    const take = async () => {
      const n = refs.next.current && !cache.current[idx + 1] ? await snapshot(refs.next) : null;
      const p = refs.prev.current && !cache.current[idx - 1] ? await snapshot(refs.prev) : null;
      if (gen !== cacheGen.current) return; // the page or the light changed meanwhile
      if (n) cache.current[idx + 1] = { img: n, amber };
      if (p) cache.current[idx - 1] = { img: p, amber };
    };
    const t = setTimeout(take, 500);
    return () => clearTimeout(t);
  }, [idx, size, prefs.textScale, prefs.font, !!prefs.amber, !!flipPair]);
  // A book's own photos (books made in the app, store books) can take a moment to be drawn: a picture of the next or
  // the previous page taken before its photo was there turned with an empty or half-drawn picture, a flash
  // (Jörg, 31 Oct 2026). So once that page's photo has really been drawn, its picture for the turn is taken again.
  // (The books inside the app draw their pictures at once and aren't affected.)
  const retakeT = useRef({});
  const retake = (which) => {
    if (!supportsCurl || !size || flipPair) return;
    const gen = cacheGen.current, amber = !!prefs.amber, at = which === 'next' ? idx + 1 : idx - 1;
    clearTimeout(retakeT.current[which]);
    retakeT.current[which] = setTimeout(async () => {
      if (gen !== cacheGen.current || st.current.turning) return;
      const img = await snapshot(which === 'next' ? refs.next : refs.prev);
      if (img && gen === cacheGen.current) cache.current[at] = { img, amber };
    }, 120); // (a beat after it's drawn on screen)
  }; // (Amber light on or off: fresh pictures, so the next page never turns in the old colour)

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
    page: pages[i], end: !!pages[i]?.end, width: W, height: H, textScale: prefs.textScale || 1, fontKey: prefs.font || 'serif', amber: !!prefs.amber,
    onReadAgain: () => { stopReading(); setIdx(0); }, onLibrary: goLibrary, onShare: controls.sharing ? () => setShareGate(true) : null,
  });
  const showHot = false; // Interactive mode is switched off for now
  const layers = [];
  const prevEl = idx > 0 ? <PageView key={`p${idx - 1}`} ref={refs.prev} {...pageProps(idx - 1)} onArtLoad={() => retake('prev')} /> : null;
  const nextEl = idx < pages.length - 1 ? <PageView key={`p${idx + 1}`} ref={refs.next} {...pageProps(idx + 1)} onArtLoad={() => retake('next')} /> : null;
  const curEl = (
    <PageView key={`p${idx}`} ref={refs.cur} {...pageProps(idx)} zoomable={!listen} highlight={hl} onWord={listen ? undefined : onWord}
      showHotspots={showHot} onHotspot={onHotspot} bubble={bubble} />
  );
  const abs = (el, k, style) => (el ? <Animated.View key={k} style={[StyleSheet.absoluteFill, style]}>{el}</Animated.View> : null);
  // The three pages (before, now, after), each kept under its own page number: when a turn lands, the page that was
  // waiting underneath simply becomes the current one (it isn't built again, so its picture never blinks)
  // Page b under a turn, only where it can be seen: its words side. Its picture side always lies under page a's
  // picture (or the turning leaf) until the turn ends, and a fresh copy of a's picture on top of it flashed b's
  // picture through while it loaded (Jörg, 30 Oct 2026). So b's picture side is clipped away and the real page a
  // (already loaded) shows there instead.
  const underB = (b, artH, wideTurn) => (
    <View key="fb" pointerEvents="none" style={wideTurn ? { position: 'absolute', left: W / 2, top: 0, width: W / 2, height: H, overflow: 'hidden' } : { position: 'absolute', left: 0, right: 0, top: artH, bottom: 0, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: wideTurn ? -W / 2 : 0, top: wideTurn ? 0 : -artH, width: W, height: H }}><PageView key={`p${b}`} {...pageProps(b)} seeThrough /></View>
    </View>
  );
  const ownPhotos = useMemo(() => pages.some((pg) => (pg.image && pg.image.uri) || (pg.image2 && pg.image2.uri)), [pages]); // (a book with its own photos)
  ownPhotosRef.current = ownPhotos;
  const pageLayers = () => [abs(prevEl, `w${idx - 1}`), abs(nextEl, `w${idx + 1}`), abs(curEl, `w${idx}`)];
  const peeling = !!(flipPair && size && flipT && peel);
  if (flipPair && size && flipT && peel) {
    // phone: the words half peels up like paper (drawn from pictures of both pages)
    const { a, b } = flipPair;
    const view = (i, k) => <PageView key={k} {...pageProps(i)} />;
    layers.push(...pageLayers());
    // a book with its own photos (made in the app, or from the store): page b underneath is drawn from its picture,
    // which is already there, instead of a fresh copy whose photos would have to load mid-turn (the flashes:
    // Jörg, 31 Oct 2026). The books inside the app turn exactly as before.
    if (ownPhotos && peel.back) layers.push(<View key="fb" pointerEvents="none" style={StyleSheet.absoluteFill}><SnapUnder image={peel.back} width={W} height={H} clip={wide ? { x: W / 2, y: 0, w: W / 2, h: H } : { x: 0, y: flipT.artH, w: W, h: H - flipT.artH }} /></View>);
    else layers.push(underB(b, flipT.artH, wide));
    // turning BACK (every book): as the leaf lifts off the picture square it uncovers page a's picture (the page
    // being turned back to), drawn from its picture, not page b's, which stayed showing there until the turn ended
    // and then jumped (Jörg, 31 Oct 2026: 'it holds the old image for a long time'; the books inside the app did it too)
    if (flipPair.dir < 0 && peel.front) layers.push(<View key="fa" pointerEvents="none" style={StyleSheet.absoluteFill}><SnapUnder image={peel.front} width={W} height={H} clip={wide ? { x: 0, y: 0, w: W / 2, h: H } : { x: 0, y: 0, w: W, h: flipT.artH }} /></View>);
  } else if (flipPair && size && wide) {
    // Sideways iPad: the words page (right) turns over the spine like a real book's page. Its back
    // shows the next page's picture, which ends up on the left.
    const { a, b } = flipPair;
    const half = W / 2;
    const view = (i, k) => <PageView key={k} {...pageProps(i)} />;
    layers.push(...pageLayers());
    const turn = flipP.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] });
    const frontOp = flipP.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] });
    const backOp = flipP.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });
    const shade = flipP.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.22, 0] });
    layers.push(
      underB(b, 0, true),
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
    layers.push(...pageLayers());
    layers.push(
      underB(b, artH, false),
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
  } else layers.push(...pageLayers());

  const bulbL = deskW ? Math.max(2, (deskW - BL.bookW) / 4 - 10) : 12; // the bulb: halfway between the felt's left edge and the book
  const backBottom = Math.max(6, (winH - BL.bookH) / 4 - 10); // sideways: the back button centred in the bottom margin (the book sits in the middle, top to bottom)
  // Reading Options' modes and the page's look, shown in the Reading Options panel and under the voices in the
  // voice box (Jörg, 27 Oct 2026). done: closes whichever one it's in.
  const modeRows = (done) => MODES.map(([g, id, t, s]) => (
          <React.Fragment key={id}>
          <Option glyph={g} title={tr(t)} sub={tr(s)} selected={prefs.mode === id} onPress={() => {
            chooseMode(id);
            done();
            if (id === 'auto' || id === 'page' || id === 'listen') { /* reading starts in chooseMode */ }
            else if (id === 'learn') toast(tr('Tap any word to hear it.'));
            else if (id === 'self') toast(tr('Reading on your own. Turn the page when you’re ready.'));
            else toast(tr('Tap the glowing circles in the picture.'));
          }} />
          </React.Fragment>
        ));
  const lookRows = (
    <>
        <View style={styles.setting}>
          <Text style={styles.help}>{tr('Text size')}</Text>
          <Seg value={prefs.textScale || 1} options={TEXT_SIZES.map(([label, v]) => [v, tr(label)])} onChange={(v) => setPrefs((p) => ({ ...p, textScale: v }))} />
        </View>
        <View style={styles.setting}>
          <Text style={styles.help}>{tr('Book font')}</Text>
          <Seg stacked value={prefs.font || 'serif'} options={Object.entries(BOOK_FONTS).map(([k, f]) => [k, tr(f.label), f.family])} onChange={(v) => setPrefs((p) => ({ ...p, font: v }))} />
        </View>
        {/* Amber light: warm, softer pages for the evening */}
        <View style={styles.setting}>
          <Text style={styles.help}>{tr('Amber light')}</Text>
          <Seg value={prefs.amber ? 'on' : 'off'} options={[['off', tr('Off')], ['on', tr('On')]]} onChange={(v) => setPrefs((p) => ({ ...p, amber: v === 'on' }))} />
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
    </>
  );
  return (
    <View style={[styles.screen, wide && { flexDirection: 'row' }]}>
      <Felt />
      {/* the black strip over the camera: along the top, or down the left side when sideways */}
      <View style={wide ? { width: BL.leftW, backgroundColor: colors.bar } : { height: topH, backgroundColor: colors.bar }}><Felt /></View>
      <View style={styles.desk} onLayout={(e) => setDeskW(e.nativeEvent.layout.width)}>
        {/* the charcoal felt, as on the other screens */}
        <DeskFelt spot="reader1" />
      <Felt />
      {/* a small, quiet red dot when this page has a voice recording: top right on phones, top left on iPad */}
      {recPages.includes(idx) && !recording ? (
        // tap it (it's small, so the finger gets a generous area) to hear what it means
        <Pressable onPress={() => toast(tr('This red dot means you’ve recorded this page in your own voice.'))} hitSlop={20}
          accessibilityRole="button" accessibilityLabel={tr('This page has a voice recording')}
          style={[styles.recMark, !wide ? { top: 'auto', bottom: 14, left: bulbL + 4 } /* upright: bottom left, clear of the back button (Jörg, 28 Oct 2026) */ : IS_TABLET ? { left: bulbL + 32 } : { right: 14 }]} />
      ) : null}
      {/* sideways: Edit this book (white scissors) in the felt's bottom right corner, between the book and the bar,
          mirroring the bulb (the bar has no room for it there: Jörg, 27 Oct 2026) */}
      {/* sideways: back to My Books in the felt's bottom left corner, and the scissors well above it (Jörg, 28 Oct 2026) */}
      {/* back to My Books, centred in the felt margins (Jörg, 28 Oct 2026): upright, in the right margin level with the
          bulb (mirroring it); sideways, in the bottom left corner, centred in the left and the bottom margins */}
      {onBackToBooks && !nightOn ? (
        <BackRing onPress={() => { stopReading(); onBackToBooks(); }} label={tr('My Book Collection')}
          style={wide ? { position: 'absolute', zIndex: 6, left: bulbL, bottom: backBottom } : { position: 'absolute', zIndex: 6, right: bulbL, top: 8 }} />
      ) : null}
      {/* share this book (an envelope, Jörg, 28 Oct 2026): upright in the felt's bottom right corner, sideways above the
          scissors (or above Back in books that can't be edited) */}
      {controls.sharing && !nightOn ? (
        <Pressable onPress={withTap(() => setShareGate(true))} hitSlop={14} accessibilityRole="button" accessibilityLabel={tr('Share book')}
          style={wide ? { position: 'absolute', zIndex: 6, left: bulbL - 1, bottom: backBottom + barGeo(u).step * (onEdit ? 2 : 1) - 1 }
            : { position: 'absolute', zIndex: 6, right: Math.max(7, bulbL - 3), bottom: Math.max(4, ((winH - topH - barH - BL.bookH) / 2 - 22) / 2) } /* halfway between the page and the bar */}>
          <Image source={ENVELOPE} style={{ width: 22, height: 22, tintColor: '#ffffff' }} resizeMode="contain" />
        </Pressable>
      ) : null}
      {wide && onEdit && !nightOn ? (
        <Pressable onPress={withTap(() => { stopReading(); onEdit(); })} hitSlop={14} accessibilityRole="button" accessibilityLabel={tr('Edit this book')}
          style={{ position: 'absolute', zIndex: 6, left: bulbL - 1, bottom: backBottom + barGeo(u).step - 1 /* one bar step above Back, centre to centre */ }}>
          <Image source={SCISSORS} style={{ width: 22, height: 22, tintColor: '#ffffff' }} resizeMode="contain" />
        </Pressable>
      ) : null}
      {/* Amber light: a very fine light bulb at the top left of the felt turns it on and off */}
      {!listen ? (
        <Pressable onPress={withTap(() => setPrefs((p) => ({ ...p, amber: !p.amber })))} hitSlop={14} accessibilityRole="switch" accessibilityState={{ checked: !!prefs.amber }}
          accessibilityLabel={tr('Amber light')} style={[styles.bulb, { left: bulbL }]}>
          <BulbIcon size={20} on={!!prefs.amber} />
        </Pressable>
      ) : null}
      <View style={[styles.bookShadow, { width: BL.bookW, height: BL.bookH }]}>
      <View ref={bookRef} collapsable={false} style={styles.book} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...(listen ? {} : pan.panHandlers)}>
        {size ? layers : null}
        {/* Tap anywhere along the left or right edge to turn back or forward (swipes work anywhere). */}
        {size && idx > 0 && !listen ? <Pressable onPress={() => flip(-1)} accessibilityLabel={tr('Previous page')} style={[styles.edge, { left: 0, width: edgeW }]} /> : null}
        {size && idx < pages.length - 1 && !listen ? <Pressable onPress={() => flip(1)} accessibilityLabel={tr('Next page')} style={[styles.edge, { right: 0, width: edgeW }]} /> : null}
        {/* while recording: a red dot and a small grey box ('■ Recording 0:04') at the top left of the words page;
            tapping it stops the recording */}
        {/* (and to its right, a green 'Page 2 saved' for a moment after each page is saved) */}
        {size && (recording || REC_DEMO || savedPage) ? (
          <RecTimer start={recStart.current || DEMO_T0} onStop={() => stopRec(true)} running={recording || REC_DEMO} saved={savedPage ? savedPage.n : null} who={readerName(savedPage && savedPage.who ? savedPage.who : recReader.current)}
            style={size.w > size.h * 1.25 ? { top: size.h * 0.06, left: size.w * 0.52 } : { top: size.h * 0.5 + size.w * 0.07, left: size.w * 0.04 }} />
        ) : null}
        {/* the dog-ear hides while a page is turning, and comes back once the new page has landed */}
        {idx < pages.length - 1 && !flipPair && !listen ? <View style={{ position: 'absolute', right: 0, bottom: 0, zIndex: 20 }}><DogEar u={u} bare={idx > 0} under={prefs.amber ? AMBER.under : colors.earUnder} flap={prefs.amber ? AMBER.flap : undefined} onPress={() => flip(1)} /></View> : null}
      </View>
      </View>
      {/* Listen Only: the soft night level (nothing under it can be touched) */}

      </View>
      {/* The black bar: the same fixed layout as every other screen's (barGeo): menu, house, note in their slots,
          then the moon (or sun), and in Listen Only the lock and the alarm clock; Record / Pause / Play at the far end */}
      {(() => {
        const G = barGeo(u);
        const v = wide;
        const S = slotStyle(u, v);
        const extras = (
          <>
            {/* restricted kid mode: a small lock (Settings, behind the grown-up question) */}
            {isRestricted(controls) && onSettings ? (
              <Pressable onPress={onSettings} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Settings')} style={S}>
                <LockIcon size={u * 5.2} weight={Math.max(2.5, u * 0.7)} />
              </Pressable>
            ) : null}
            {canMoon ? (
              <Pressable onPress={withTap(toggleNight)} hitSlop={12} accessibilityRole="button" accessibilityLabel={dayOn ? tr('Close Daydream') : tr('Nightlight')} style={S}>
                {dayOn ? <SolidSun size={u * 5.3} color="#e0e0e0" /> : <View style={{ transform: [v ? { translateY: 0 } : { translateX: u * MOON_NUDGE }] }}><MoonIcon size={u * 4.6} color={prefs.mode === 'listen' ? '#e0e0e0' : IDLE} /></View>}
              </Pressable>
            ) : null}
            {onEdit && !nightOn && !v ? ( /* (sideways: on the felt instead, bottom right) */
              <Pressable onPress={withTap(() => { stopReading(); onEdit(); })} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Edit this book')} style={S}>
                <Image source={SCISSORS} style={{ width: u * 4.8, height: u * 4.8, tintColor: IDLE }} resizeMode="contain" />
              </Pressable>
            ) : null}
            {nightOn ? (
              <>
              <Pressable ref={nlLockRef} onPress={withTap(lockNight, thunk)} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Lock the screen')} style={S}>
                <LockIcon size={u * 5} color={IDLE} />
              </Pressable>
              <Pressable onPress={withTap(() => setAlarmOpen(true))} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Wake-up alarm')} style={S}>
                {/* upright: its bottom lines up with the lock's, a few points to the left */}
                <View style={{ transform: v ? [] : [{ translateX: -3 }, { translateY: u * 0.154 }] }}><AlarmClockIcon size={u * 5.1} color={prefs.alarmOn ? '#e0e0e0' : IDLE} /></View>
                {/* the alarm time: right of the clock (upright), under it (sideways); it takes no room in the slot */}
                {prefs.alarmOn ? (v
                  ? <Text numberOfLines={1} style={[styles.alarmTime, { position: 'absolute', top: G.step / 2 + u * 4.6, left: -20, right: -20, textAlign: 'center' }]}>{fmtTime(prefs.alarmTime || '07:00')}</Text>
                  : <Text style={[styles.alarmTime, { position: 'absolute', left: G.step / 2 + u * 5.2 - 3, width: u * 24 }]}>{fmtTime(prefs.alarmTime || '07:00')}</Text>) : null}
              </Pressable>
              </>
            ) : null}
          </>
        );
        // Record / Pause / Play: drawn at the size of the other icons and in slots of the same step, so they're part
        // of the one row; Play's far edge is as far from the screen's edge as the menu is from its own
        // (the triangle's far point is 16k from its slot's middle)
        const ck = 0.65;
        const cs = { ...slotStyle(u, v) };
        // the voice face: it opens the voice box, which also holds the reading modes, so it stays on the bar in every
        // mode (Read Yourself and Listen Only hide Play and Record, but never the way back: Jörg, 27 Oct 2026)
        const faceEl = (
          <View style={[cs, !v && { transform: [{ translateX: -u * 1.8 + 2 }] }]}>{/* upright: a little to the left, clear of the red button */}
            <Pressable onPress={withTap(() => setVoiceBox(true))} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Who reads this book?')}>
              {(() => { const f = familyOptions.find((o) => o.id === shownVoice); return <VoiceFace photo={f && f.photo} name={f && f.name} narrator={!f} size={u * 7} />; })()}
            </Pressable>
          </View>
        );
        const ctlEls = showControls ? (
          <View style={v ? { alignItems: 'center', marginBottom: sideTop(u, winH) + 16 * ck - G.step / 2 } : { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginRight: -(G.step / 2 - 16 * ck) }}>
            {/* who reads (the face) and Record */}
            <View style={{ flexDirection: v ? 'column' : 'row', alignSelf: v ? 'stretch' : 'auto' }}>
              {showVoices ? faceEl : null}
              {controls.recording ? <View style={cs}><RecordButton k={ck} active={recording} onPress={() => (recording ? stopRec(true) : (hushForRecording(), setRecView('main'), setPanel('rec')))} /></View> : null}
            </View>
            {/* one button that is Play, or Pause while it reads, upright and sideways alike (Jörg, 26 Oct 2026): it sits
                where Play was, and Record and the voice face move up beside it */}
            {(reading && !paused) || between
              ? <View style={cs}><PauseButton k={ck} onPress={onPause} disabled={recording} active /></View>
              : <View style={[cs, v && { transform: [...(cs.transform || []), { translateX: -2 }] }]}><PlayButton k={ck} onPress={onPlay} active={false} disabled={recording} /></View>}
          </View>
        ) : (!nightOn ? (
          <View style={v ? { alignItems: 'center', marginBottom: sideTop(u, winH) + 16 * ck - G.step / 2 } : { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginRight: -(G.step / 2 - 16 * ck) }}>{faceEl}</View>
        ) : null);
        return v ? (
          <View style={[styles.sideBar, { width: BL.rightW, paddingTop: sideTop(u, winH) }]}>
            <Felt />
            <View style={{ width: BL.rightW, alignItems: 'center', flex: 1 }}>
              <Burger u={u} vertical lock={false} onPress={openMenu} />
              {extras}
              <View style={{ flex: 1 }} />
              {ctlEls}
              {!showControls ? <View style={{ height: Math.max(16, insets.bottom) }} /> : null}
            </View>
          </View>
        ) : (
          <View style={[styles.bottomBar, { height: barH, paddingBottom: insets.bottom }]}>
            <Felt />
            <View style={{ height: G.row, flexDirection: 'row', alignItems: 'center', paddingHorizontal: G.edge }}>
              <Burger u={u} vertical={false} lock={false} onPress={openMenu} />
              {extras}
              <View style={{ flex: 1 }} />
              {ctlEls}
            </View>
          </View>
        );
      })()}

      {recTip ? (
        // the record tip: a black speech bubble just above the red record button (tap to close)
        <Pressable onPress={() => setRecTip(false)} accessibilityRole="button" accessibilityLabel={tr('Close')}
          style={{ position: 'absolute', zIndex: 60, maxWidth: 300, right: wide ? BL.rightW + 12 : 12, bottom: wide ? 90 : barH + 12 }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 22 }}>
            <Text style={{ color: colors.white, fontFamily: fonts.ui, fontSize: 16, lineHeight: 22 }}>{tr('Record yourself reading this book, then share it or enjoy it together. Books you make are read in your own voice.')}</Text>
          </View>
          {!wide ? <View style={{ position: 'absolute', bottom: -9, right: 55, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(0,0,0,0.9)' }} /> : null}
        </Pressable>
      ) : null}
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
      {boxUp && nightEnabled ? <ListenChoice area={wide ? { left: 0, top: 0, width: winW - BL.rightW, height: winH } : { left: 0, top: 0, width: winW, height: winH - barH }} center={wide ? { left: BL.leftW, width: winW - BL.leftW - BL.rightW } : null}
        onDay={() => pickScene('day')} onNight={() => pickScene('night')} onCancel={cancelListen} onGone={() => setBoxUp(false)} tr={tr} /> : null}
      {listenTip && nightOn ? <Toast tone={listenTip === 'night' ? 'amber' : undefined} message={tr(listenTip === 'day' ? 'Tap the sun icon to close Listen Only mode.' : 'Tap the moon in the menu bar to close Listen Only mode.')} ms={0}
        check={tr('Don’t show this message again')} button={tr('Got it!')}
        onDismiss={(ticked) => { const sc = listenTip; setListenTip(null); if (ticked) loadJSON('listenTipOff', {}).catch(() => ({})).then((off) => saveJSON('listenTipOff', { ...(off || {}), [sc]: true })).catch(() => {}); }} /> : null}
      {nightOn ? (
        // leaving Listen Only (the sun or moon on the bar): the nightlight or Daydream dissolves away
        <Animated.View pointerEvents={leavingNight ? 'none' : 'box-none'} style={[StyleSheet.absoluteFill, { zIndex: 40, opacity: nlOut }]}>
        <Nightlight key={scene} quick={fromChoice} day={dayOn} video={prefs.dayVideo || 0} onVideo={(i) => setPrefs((p) => ({ ...p, dayVideo: i }))} title={story.title} playing={reading && !paused} onPlay={onPlay} onPause={onPause} locked={nlLocked} lockRect={lockRect} lockSize={u * 5} onUnlock={() => setNlLocked(false)} onSleep={() => { stopReading(); clearTimeout(autoTimer.current); }} eclipse={prefs.eclipse ?? 0} onEclipse={(v) => setPrefs((p) => ({ ...p, eclipse: Math.round(v * 100) / 100 }))}
          alarmTime={prefs.alarmTime || '07:00'} alarmSound={prefs.alarmSound || 'forest-birds'} alarmOn={!!prefs.alarmOn} alarmOpen={alarmOpen} onAlarmClose={() => setAlarmOpen(false)} onAlarm={(patch) => setPrefs((p) => ({ ...p, ...patch }))}
          wide={wide} end={!!(pages[idx] && pages[idx].end)}
          area={wide ? { left: 0, top: 0, width: winW - BL.rightW, height: winH } : { left: 0, top: 0, width: winW, height: winH - barH }} />
        </Animated.View>
      ) : null}
      {recDel ? (
        <ConfirmBox title={tr('Delete this recording?')} confirm={tr('Delete')} cancel={tr('Keep')}
          onConfirm={async () => { const r = recDel; setRecDel(null); await removeRecording(story.id, r.pid, r.reader); openRecList(); }} onCancel={() => setRecDel(null)} />
      ) : null}
      {trimRec ? <TrimEditor rec={trimRec} title={tr('Page {n}', { n: trimRec.page + 1 })} onCancel={() => setTrimRec(null)}
        onSave={async (start, end) => { await setTrim(story.id, trimRec.pid, start, end, trimRec.reader || 'me'); setTrimRec(null); openRecList(); }} /> : null}
      {voiceBox ? <VoicePick options={boxOptions} value={boxValue} tr={tr} onPick={pickVoice} speed={speedOf(prefs)} onSpeed={(v) => setPrefs((p) => ({ ...p, rate: v, rateFor: narratorOf(p) }))} onClose={() => setVoiceBox(false)} extra={<>{modeRows(() => setVoiceBox(false))}{lookRows}</>} extraTitle={tr('Reading Options')} onEdit={controls.recording ? () => setEditReaders(true) : null}
        anchor={wide ? { right: BL.rightW + 10, bottom: Math.max(16, insets.bottom), width: Math.min(440, winW - BL.rightW - 20), maxHeight: winH - Math.max(16, insets.bottom) - insets.top - 16 } : { right: 12, bottom: barH + 10, width: Math.min(440, winW - 24), maxHeight: winH - barH - 10 - insets.top - 14 }} /* a much bigger box: the voices, then Reading Options under them (Jörg, 27 Oct 2026) */ /> : null}
      {editReaders ? <ReaderPick edit initial={voiceOptions.some((o) => o.id === voice) && voice !== 'narrator' ? voice : null} onCancel={() => { setEditReaders(false); getReaders().then(setReaders); refreshRecPages(); }}
        onDone={() => { setEditReaders(false); getReaders().then(setReaders); refreshRecPages(); }} /> : null}
      {askReader ? <ReaderPick initial={recReader.current} onCancel={() => { setAskReader(false); recordingSoon.current = false; }}
        onStart={(id) => { recReader.current = id; setAskReader(false); getReaders().then(setReaders); startRec(); }} /> : null}
      <Panel open={panel === 'play'} side="right" title={playView === 'voices' ? tr('Voices') : tr('Reading Options')} {...panelPos} onClose={() => { setPanel(null); setPlayView('main'); }}>
        {playView === 'voices' ? (
          <>
            {NARRATORS.map(([k, label]) => (
              // tapping a voice chooses it and plays a short sample of it
              <Option key={k} glyph={<BubbleIcon />} title={label} sub={tr(k === 'lily' ? 'Warm and gentle' : 'Pleasant older man')} selected={narratorOf(prefs) === k}
                onPress={() => { stopReading(); setPrefs((p) => ({ ...p, narrator: k })); { const smp = SAMPLE_LANGS?.[k]?.[appLang] || SAMPLES[k]; if (smp) playVoice(smp); } toast(tr('{name} will read the stories.', { name: label })); }} />
            ))}
            <Text style={styles.help}>{tr('The voice reads the stories aloud and sounds out words in Learn to Read. Pages you recorded in your own voice still play in yours.')}</Text>
            {voiceOptions.length > 1 ? (
              <>
                <Text style={styles.help}>{tr('Who reads this book')}</Text>
                <Seg stacked value={shownVoice} options={voiceOptions.map((o) => [o.id, o.name])} onChange={pickVoice} />
                <Text style={styles.help}>{tr('Pages you haven’t recorded use the narrator.')}</Text>
              </>
            ) : null}
            <Pressable onPress={() => setPlayView('main')} hitSlop={8}><Text style={styles.backlink}>{tr('‹ Back to Reading Options')}</Text></Pressable>
          </>
        ) : (
          <>
        {modeRows(() => setPanel(null))}
        <Option glyph={<BubbleIcon />} title={tr('Voices')} sub={tr('Narrator: {name}', { name: (NARRATORS.find(([k]) => k === narratorOf(prefs)) || NARRATORS[0])[1] })} onPress={() => setPlayView('voices')} />
        {onPlaylists ? <Option glyph={<PlaylistIcon />} title={tr('Book Playlists')} sub={tr('Books read one after another')} onPress={() => { setPanel(null); setPlayView('main'); onPlaylists(); }} /> : null}
        <View style={styles.setting}>
          <Text style={styles.help}>{tr('Playback speed')}</Text>
          <Slider value={speedDraft ?? speedOf(prefs)} min={0.5} max={1.5} step={0.05} leftLabel={tr('Slower')} rightLabel={tr('Faster')}
            format={(v) => `${v.toFixed(2).replace(/0$/, '')}×`}
            onChange={setSpeedDraft}
            onDone={(v) => { setSpeedDraft(null); setPrefs((p) => ({ ...p, rate: Math.round(v * 100) / 100, rateFor: narratorOf(p) })); }} />
        </View>
        {lookRows}
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
          // recorded in the family's voice: the recordings go along as a file (opened in Coro); otherwise the invitation
          shareBookWithVoices(story).then((sent) => { if (!sent) shareInvite(story.title); }).catch(() => shareInvite(story.title));
        }} />
      <ParentGate visible={!!printGate} reason={tr('Printing opens your phone’s print options.')} onPass={() => doPrint(printGate)} onCancel={() => setPrintGate(null)} />

      {/* Recording: a rounded black glass box over the bar, like the voices box (Jörg, 26 Oct 2026), in place of the
          side menu; tap outside it to close */}
      {panel === 'rec' ? (
      <View style={[StyleSheet.absoluteFill, { zIndex: 90 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { setPanel(null); recordingSoon.current = false; }} accessibilityLabel={tr('Close')} />
      <View style={[styles.recPop, wide ? { right: BL.rightW + 10, bottom: Math.max(16, insets.bottom) } : { right: 12, bottom: barH + 10 }]}>
        <Text style={styles.recPopTitle}>{tr('Recording options')}</Text>
        <ScrollView style={{ maxHeight: winH * 0.6 }} contentContainerStyle={{ gap: 8 }} bounces={false}>
        {recView === 'main' ? (
          <>
            <RecRow glyph={<DotIcon />} title={tr('Start recording')} sub={tr('Read this story in your own voice, starting on page {n}', { n: Math.min(idx + 1, n) })} disabled={idx >= n} onPress={askToRecord} />
            <RecRow glyph={<ListIcon />} title={tr('Your recordings')} sub={tr('Listen to or remove the pages you recorded')} onPress={openRecList} />
            <RecRow glyph={<TextIcon text="?" />} title={tr('Help')} sub={tr('How recording works')} onPress={() => setRecView('help')} />
          </>
        ) : null}
        {recView === 'list' ? (
          recList.length ? recList.slice().sort((x, y) => readerIndex(x.reader) - readerIndex(y.reader) || x.page - y.page).map((r, k, arr) => (
            <React.Fragment key={`${r.reader}/${r.pid}`}>
            {/* each reader's pages together, under their name */}
            {k === 0 || arr[k - 1].reader !== r.reader ? <Text style={[styles.help, { marginTop: k ? 10 : 0, fontFamily: fonts.uiBold, color: colors.white }]}>{readerName(r.reader)}</Text> : null}
            {/* the page and its length on their own line, the buttons underneath */}
            <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
              <Text style={styles.rowText}>{(() => {
                const sec = Math.max(1, Math.round((r.end || r.seconds) - (r.start || 0)));
                const len = sec === 1 ? tr('Page {n} · 1 second', { n: r.page + 1 }) : tr('Page {n} · {s} seconds', { n: r.page + 1, s: sec });
                // when it was recorded (recordings from before this was kept have no date)
                let when = '';
                if (r.at) { try { const d = new Date(r.at); when = ' · ' + d.toLocaleDateString(appLang, d.getFullYear() === new Date().getFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) {} }
                return len + when;
              })()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable style={styles.rowBtn} onPress={() => { stopReading(); playVoice(r.uri, { start: r.start || 0, end: r.end || null, onFail: () => toast(tr('This recording can’t be played. Record the page again.')) }); }}><Text style={styles.rowBtnText}>{tr('Play')}</Text></Pressable>
              {/* Trim: the trim editor (a box in the middle of the screen) */}
              <Pressable style={styles.rowBtn} onPress={() => { stopReading(); stopVoice(); setTrimRec(r); }}><Text style={styles.rowBtnText}>{tr('Trim')}</Text></Pressable>
              {/* delete: a small trash can */}
              <Pressable hitSlop={10} onPress={() => { stopVoice(); setRecDel(r); }} accessibilityRole="button" accessibilityLabel={tr('Delete')} style={{ paddingHorizontal: 4 }}>
                <Image source={TRASH} style={{ width: 20, height: 20, tintColor: '#bdbdbd' }} resizeMode="contain" />
              </Pressable>
              </View>
            </View>
            </React.Fragment>
          )) : <Text style={styles.help}>{tr('Nothing recorded yet. Tap Start recording to read this book in your own voice.')}</Text>
        ) : null}
        {recView === 'help' ? (
          <>
            <Text style={styles.help}>{tr('Tap Start recording and read the page out loud. Turn the page and keep reading: each page saves on its own.')}</Text>
            <Text style={styles.help}>{tr('Tap the red button to stop. Your recordings stay on this phone, and the story will read back in your voice.')}</Text>
          </>
        ) : null}
        {/* Back: well below the content, a little arrow in a circle beside the word */}
        {recView !== 'main' ? (
          <Pressable onPress={() => setRecView('main')} hitSlop={10} accessibilityRole="button" style={styles.backRow}>
            <View style={styles.backCircle}><View style={styles.backChevron} /></View>
            <Text style={styles.back}>{tr('Back')}</Text>
          </Pressable>
        ) : null}
        </ScrollView>
      </View>
      </View>
      ) : null}
    </View>
  );
}

// a choice in the recording box: a small round icon, its name and a line under it (like the rows of the voices box)
function RecRow({ glyph, title, sub, onPress, disabled }) {
  return (
    <Pressable onPress={withTap(onPress)} disabled={disabled} accessibilityRole="button" style={[styles.recRow, disabled && { opacity: 0.45 }]}>
      <View style={styles.recRowIc}>{glyph}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.recRowTitle}>{title}</Text>
        <Text style={styles.recRowSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

// The recording timer: a small grey box with the time recorded so far (0:03), beside the pulsing record button.
const DEMO_T0 = Date.now() - 4000; // (web preview #rec-demo only)
function RecTimer({ start, style, onStop, running = true, saved, who }) {
  const tr = useT();
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(t);
  }, [start]);
  // 'Saved' fades in and out in its own place, to the right of the box, so nothing moves while you record
  const fade = useRef(new Animated.Value(saved ? 1 : 0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: saved ? 1 : 0, duration: saved ? 160 : 400, useNativeDriver: true }).start(); }, [saved]);
  const savedPill = (
    <Animated.View style={[styles.recBox, { backgroundColor: colors.green, opacity: fade }]} accessibilityLiveRegion="polite" accessibilityLabel={saved ? tr('Page {n} saved', { n: saved }) : undefined}>
      <Text style={styles.recBoxLabel}>{tr('Saved')}</Text>
    </Animated.View>
  );
  if (!running) {
    // the recording has stopped: only the green 'Saved', where the box was, for a moment
    return <View pointerEvents="none" style={[{ position: 'absolute', zIndex: 30, flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{savedPill}</View>;
  }
  return (
    // the recording box stays put; a green 'Saved' shows to its right for a moment after each page
    <View pointerEvents="box-none" style={[{ position: 'absolute', zIndex: 30, flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
      <Pressable onPress={onStop} hitSlop={14} accessibilityRole="button" accessibilityLabel={tr('Stop recording')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={styles.recDot} />
        <View style={styles.recBox} accessibilityLabel={tr('Recording, {n} seconds', { n: secs })}>
          <View style={styles.recStop} />
          <Text style={styles.recBoxLabel}>{tr('Recording')}{who ? ` · ${who}` : ''}</Text>
          <Text style={[styles.recBoxTime, { minWidth: 38 }]}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</Text>
        </View>
      </Pressable>
      {savedPill}
    </View>
  );
}

const styles = StyleSheet.create({
  alarmTime: { color: '#b0b0b0', fontFamily: fonts.uiRegular, fontSize: 14, letterSpacing: 0.3 },
  screen: { flex: 1, backgroundColor: DESK_BG },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DESK_BG },
  bookShadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  book: { flex: 1, overflow: 'hidden', backgroundColor: colors.paper },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 14, marginTop: 3 },
  bulb: { position: 'absolute', top: 8, left: 12, zIndex: 6 },
  recMark: { position: 'absolute', top: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.highlight, opacity: 0.75, zIndex: 5 },
  mineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.deepRed },
  mineText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 12 },
  recPop: { position: 'absolute', width: 300, maxWidth: '92%', backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 26, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 14, gap: 6, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }, // as the voices box
  recPopTitle: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.uiBold, fontSize: 14, marginLeft: 6, marginBottom: 6 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 18 },
  recRowIc: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  recRowTitle: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17 },
  recRowSub: { color: '#bdbdbd', fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  sideBar: { backgroundColor: colors.bar, alignItems: 'flex-end', zIndex: 30 },
  bottomBar: { backgroundColor: colors.bar, justifyContent: 'flex-end', zIndex: 30 }, // the row of icons sits at the bottom (fixed), any spare height above it
  small: { transform: [{ scale: 0.86 }] },
  slot: { alignItems: 'center', justifyContent: 'center' },
  edge: { position: 'absolute', top: 0, bottom: 0, zIndex: 15 },
  half: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', backfaceVisibility: 'hidden' },
  strip: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', transformOrigin: 'top' },
  recBox: { backgroundColor: '#4a4a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 7 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e0262b' },
  recStop: { width: 9, height: 9, borderRadius: 1.5, backgroundColor: colors.white },
  recBoxLabel: { color: colors.white, fontFamily: fonts.uiSemiBold, fontSize: 14 },
  recBoxTime: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14, fontVariant: ['tabular-nums'], minWidth: 34, textAlign: 'left' },
  back: { color: '#bdbdbd', fontFamily: fonts.uiBold, fontSize: 15 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginTop: 34 },
  backCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#d6d6d6', alignItems: 'center', justifyContent: 'center' },
  backChevron: { width: 8, height: 8, borderLeftWidth: 1.75, borderBottomWidth: 1.75, borderColor: '#d6d6d6', transform: [{ translateX: 1.5 }, { rotate: '45deg' }] },
  setting: { gap: 8, paddingTop: 10, paddingBottom: 8 },
  printBtn: { alignItems: 'center', gap: 6 },
  printIc: { width: 64, height: 64, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  printLabel: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14 },
  backlink: { color: '#d6d6d6', fontFamily: fonts.uiBold, fontSize: 15, paddingVertical: 6 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2a2a2a', padding: 12 },
  rowText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  rowBtn: { backgroundColor: colors.tile, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 }, // pills
  rowBtnText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 10, borderRadius: 22 }, // pills
  segText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14 },
});

// Listen Only's choice: the screen dims, and a dark grey rounded square floats in the middle with the simple sun on
// the left (Daydream), a thin white line down the middle, and the moon on the right (the nightlight)
function ListenChoice({ area, center, onDay, onNight, onCancel, onGone, tr }) {
  const dim = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const [picked, setPicked] = useState(null); // 'day' or 'night': its icon turns solid, a soft click, then off we go
  useEffect(() => {
    // quick: the dark layer and the box dissolve in together
    Animated.parallel([
      Animated.timing(dim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pop, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
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
  const M = side * 0.1; // the title's distance from the top = the names' distance from the bottom
  const ic = side * 0.16;
  const word = { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.uiMedium, fontSize: 12, lineHeight: 18, letterSpacing: 1.2 };
  return (
    <>
      <Animated.View style={{ position: 'absolute', ...area, zIndex: 45, backgroundColor: 'rgba(0,0,0,0.88)', opacity: dim }} onStartShouldSetResponder={() => true}
        onResponderRelease={() => { if (!picked) withTap(onCancel)(); }} />{/* a touch anywhere outside the box cancels */}
      <View pointerEvents="box-none" style={{ position: 'absolute', ...area, ...(center || {}), zIndex: 46, alignItems: 'center', justifyContent: 'center' }}>{/* centred on the book */}
        <Animated.View pointerEvents={picked ? 'none' : 'auto'} style={{ alignItems: 'flex-end', opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
          <View onStartShouldSetResponder={() => true} style={{ width: side, height: side, borderRadius: 30, backgroundColor: '#2b2b2d', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>{/* (a touch on the box itself never cancels) */}
            {/* what this is: Listening Only mode (nothing plays until Daydream or Nightlight is chosen) */}
            <Text style={{ color: 'rgba(255,255,255,0.92)', fontFamily: fonts.uiMedium, fontSize: 15, lineHeight: 18, letterSpacing: 0.3, textAlign: 'center', marginTop: M }}>{tr('Listen Only')}</Text>
            {/* the dividing line and the two icons sit exactly in the middle of the box */}
            <View pointerEvents="none" style={{ position: 'absolute', left: side / 2 - 0.55, top: (side - side * 0.42) / 2, width: 1.1, height: side * 0.42, backgroundColor: ink }} />{/* the same fine stroke as the sun and the moon */}
            {[['day', tr('Daydream')], ['night', tr('Nightlight')]].map(([id, label], k) => (
              <Pressable key={id} onPress={() => pick(id)} style={{ position: 'absolute', top: 0, bottom: 0, left: k ? side / 2 : 0, width: side / 2 }} accessibilityRole="button" accessibilityLabel={label}>
                <View style={{ position: 'absolute', left: 0, right: 0, top: (side - ic) / 2, alignItems: 'center' }}>
                  {id === 'day'
                    ? (picked === 'day' ? <SolidSun size={ic} color={ink} /> : <SunIcon size={ic} color={ink} />)
                    : (picked === 'night'
                      ? <View style={{ width: ic, height: ic, alignItems: 'center', justifyContent: 'center' }}><MoonIcon size={ic * (226 / 246)} color={ink} /></View>
                      : <Image source={MOON_OUTLINE} style={{ width: ic, height: ic, tintColor: ink }} resizeMode="contain" />)}
                </View>
                {/* the name, as far from the bottom as the title is from the top */}
                <Text style={[word, { position: 'absolute', left: 0, right: 0, bottom: M, textAlign: 'center' }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {/* Cancel: small, light grey, under the box's bottom right corner (a touch anywhere outside the box cancels too) */}
          <Pressable onPress={withTap(onCancel)} hitSlop={16} style={{ marginTop: 12, marginRight: 6, alignSelf: 'flex-end' }} accessibilityRole="button" accessibilityLabel={tr('Cancel')}>
            <LineIcon kind="cancel" size={22} color="rgba(255,255,255,0.55)" weight={1.4} />{/* a little circle with an x, not the word (Jörg, 28 Oct 2026) */}
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

// Daydream's mark on the bar (in place of the moon): a small solid sun; tap it to close Daydream
function SolidSun({ size, color }) {
  return <Image source={SUN_SOLID} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />;
}

