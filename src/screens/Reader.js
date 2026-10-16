// The reader: page curl, read-aloud with highlighting, learn-to-read, interactive pictures.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOOK_FONTS, colors, fonts } from '../theme';
import { Felt } from '../look';
import { tokenize, cleanWord, syllablesFor } from '../story';
import { Fade, PageView, TEXT_SIZES, pageLayout } from '../components/PageView';
import { FLAP_PERSPECTIVE, flapTables } from '../flapStrips';
import { FlapPeel, snapshot, supportsCurl } from '../components/Curl';
import { bookLayout } from '../components/BookFrame';
import { artGesture } from '../components/ZoomArt';

// The paper peel needs pictures of the pages (phone only). If drawing it ever fails, or the
// pictures can't be taken, the page turns with the hinged strips instead.
const peelWorks = { ok: true };
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
import { Bar, BarMeta, Burger, ChevronIcon, DiamondIcon, DogEar, DotIcon, GearIcon, ListIcon, MENU_ICON, NoteIcon, Option, Panel, PauseButton, PlayButton, RecordButton, Slider, SIDE_MENU_TOP, TextIcon } from '../components/Chrome';

// Reading speed: 1 = the voice's natural pace. The default is moderately slow.
// Older settings only had Normal/Slow.
export const DEFAULT_SPEED = 0.75;
export const speedOf = (prefs) => prefs.rate || (prefs.speed === 'slow' ? 0.8 : DEFAULT_SPEED);
// Book narrators (ElevenLabs). Anne (voice key 'lily') is the default.
// A tiny printed page: white sheet with the picture and words squares, upright or sideways.
function PageShape({ wide }) {
  const W = wide ? 40 : 30, H = wide ? 30 : 40, q = 15;
  return (
    <View style={{ width: W, height: H, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: wide ? 'row' : 'column' }}>
        <View style={{ width: q, height: q, borderWidth: 1.5, borderColor: '#333', backgroundColor: '#9a9a9a' }} />
        <View style={{ width: q, height: q, borderWidth: 1.5, borderColor: '#333', [wide ? 'borderLeftWidth' : 'borderTopWidth']: 0 }} />
      </View>
    </View>
  );
}

export const NARRATORS = [['lily', 'Anne'], ['gregory', 'Henry']]; // add more voices here (and in ci/narrate.js)
const narratorOf = (prefs) => (NARRATORS.some(([k]) => k === prefs.narrator) ? prefs.narrator : 'lily');
const NARRATOR = 0.92; // the phone voice's normal pace
const VOICE_RECORDING = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 48000,
  numberOfChannels: 1,
  bitRate: 192000,
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, audioQuality: 127, sampleRate: 48000 },
  android: { ...RecordingPresets.HIGH_QUALITY.android, sampleRate: 48000 },
};
import { playSound, setEffects, suspendSounds } from '../sound';
import { pauseSpeech, resumeSpeech, speakQueue, speakTracked, stopSpeech } from '../speech';
import { shareInvite } from '../invite';
import { audioModeChanged, pauseVoice, playClips, playVoice, resumeVoice, stopVoice } from '../voice';
import { WORDS } from '../narration/words';
import { getRecording, listRecordings, pageKey, removeRecording, saveRecording } from '../recordings';
import { AUDIO, TIMINGS } from '../narration';

const MODES = [
  [<DiamondIcon />, 'self', 'Read Yourself', 'Page by page with no audio'],
  [<TextIcon text="Aa" />, 'learn', 'Learn to Read', 'Says a word when you touch it'],
  [<ChevronIcon count={2} />, 'auto', 'Auto Play', 'Reads the full story with audio'],
  [<ChevronIcon />, 'page', 'Page by Page Play', 'Reads a page at a time with audio'],
  // ['✦', 'interactive', 'Interactive', 'Image interaction with touch'],  (hidden for now; hotspot code kept)
];

function Seg({ value, options, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map(([v, l, family]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[styles.seg, value === v && { backgroundColor: colors.green }]}>
          <Text style={[styles.segText, family && { fontFamily: family, fontWeight: '400', fontSize: 17 }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Reader({ u, story, prefs, setPrefs, openMenu, goLibrary, toast, menuRequest, landscape }) {
  const insets = useSafeAreaInsets();
  const pages = useMemo(() => [...story.pages, { end: true }], [story]);
  const [idx, setIdx] = useState(0);
  const [size, setSize] = useState(null); // book area {w,h}
  const [hl, setHl] = useState(-1);
  const [bubble, setBubble] = useState(null);
  const [reading, setReading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState(null); // 'play' | 'rec' | null
  const [flipPair, setFlipPair] = useState(null); // {a, b, dir} while a page turn is on screen
  const [recording, setRecording] = useState(false);
  const [recView, setRecView] = useState('main'); // main | list | settings | help
  const [recList, setRecList] = useState([]);
  const [playView, setPlayView] = useState('main'); // 'main' | 'voices' inside Playback Options
  const [speedDraft, setSpeedDraft] = useState(null); // speed while the slider is being dragged
  const [printChoice, setPrintChoice] = useState(false);
  const [printGate, setPrintGate] = useState(null); // layout waiting for the grown-up check
  const [printing, setPrinting] = useState(false);
  const doPrint = async (layout) => {
    setPrintGate(null);
    setPrinting(true);
    toast('Getting the book ready to print…');
    try {
      await printStory({ title: story.title, author: story.author, pages: story.pages.map((p) => ({ text: p.text, image: p.image })) }, layout, prefs.font);
    } catch (e) {
      toast(e && e.message ? e.message : 'Couldn’t print. Try again.');
    }
    setPrinting(false);
  };
  // Voice recording: mono (one voice), 48 kHz, high-bitrate AAC — fuller than the stereo preset.
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const recStart = useRef(0);
  const pendingRec = useRef(false);
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
  st.current = { idx, size, reading, paused, mode: prefs.mode, turning: !!flipPair, pages, recording };
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
  const showControls = prefs.mode !== 'self' || recording;
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
  useEffect(() => { if (menuRequest) setPanel('play'); }, [menuRequest]);

  /* ---------- reading ---------- */
  const stopReading = useCallback(() => {
    stopSpeech();
    stopVoice();
    usingVoice.current = false;
    clearTimeout(autoTimer.current);
    setReading(false); setPaused(false); setHl(-1);
  }, []);

  const wordAt = (ch) => {
    for (let i = 0; i < tokens.length; i++) if (tokens[i].start <= ch && ch < tokens[i].end + 1) return i;
    return -1;
  };

  const readPage = useCallback((pageIndex) => {
    const p = st.current.pages[pageIndex];
    if (!p || p.end) { setReading(false); return; }
    const toks = tokenize(p.text);
    setReading(true); setPaused(false);
    const hlChar = (ch) => {
      for (let i = 0; i < toks.length; i++) if (toks[i].start <= ch && ch < toks[i].end + 1) { setHl(i); break; }
    };
    const afterPage = () => {
      usingVoice.current = false;
      setHl(-1); setReading(false);
      if (st.current.mode === 'auto' && pageIndex < st.current.pages.length - 1) {
        autoTimer.current = setTimeout(() => { pendingRead.current = true; flip(1); }, 800);
      }
    };
    // The book's narrator: ElevenLabs audio when the book has it (exact word timings),
    // otherwise the phone's own voice.
    const narrate = () => {
      const voiceKey = narratorOf(prefs);
      const audio = AUDIO[voiceKey]?.[story.id]?.[p.pid] || AUDIO.lily?.[story.id]?.[p.pid];
      const times = (TIMINGS[AUDIO[voiceKey]?.[story.id]?.[p.pid] ? voiceKey : 'lily']?.[story.id]?.[p.pid] || {}).words;
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
          if (st.current.idx === pageIndex) speakTracked(p.text, { rate: NARRATOR * speedOf(prefs), onWord: hlChar, onDone: afterPage });
        },
      })) {
        usingVoice.current = true;
        return;
      }
      speakTracked(p.text, { rate: NARRATOR * speedOf(prefs), onWord: hlChar, onDone: afterPage });
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

  useEffect(() => {
    if (pendingRec.current) { pendingRec.current = false; setTimeout(startRec, 350); }
  }, [idx]);

  /* ---------- recording ---------- */
  const startRec = async () => {
    if (st.current.idx >= story.pages.length) return;
    stopReading();
    setPanel(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return toast('oomlaut Reader needs the microphone to record. You can allow it in Settings.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      audioModeChanged();
      await recorder.prepareToRecordAsync();
      recorder.record();
      recStart.current = Date.now();
      suspendSounds(true);
      setRecording(true);
    } catch (e) {
      toast('Recording couldn’t start. Try again.');
    }
  };

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
        toast(`Saved your voice for page ${page + 1}.`);
        refreshRecPages();
      }
    } catch (e) {
      toast('That recording couldn’t be saved.');
    }
    suspendSounds(false);
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
    if (mode === 'self') return toast('Read Yourself is on, so there’s no audio. Pick another mode to listen.');
    if (st.current.recording) return;
    if (paused) { usingVoice.current ? resumeVoice() : resumeSpeech(); setPaused(false); return; }
    // Play always (re)reads the page, so it can never get stuck thinking it's still reading.
    stopReading();
    setTimeout(() => readPage(st.current.idx), 60);
  };
  const onPause = () => {
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
      const wordClip = WORDS[narratorOf(prefsRef.current)]?.[w.toLowerCase()];
      if (wordClip) { playClips([wordClip], { onDone: done }); return; }
      speakQueue([{ text: w, rate: 0.7 }], done);
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
    playSound('flick');
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
    if (commit) playSound('peel');
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
    onReadAgain: () => { stopReading(); setIdx(0); }, onLibrary: goLibrary, onShare: () => setShareGate(true),
  });
  const showHot = false; // Interactive mode is switched off for now
  const layers = [];
  const prevEl = idx > 0 ? <PageView key={`p${idx - 1}`} ref={refs.prev} {...pageProps(idx - 1)} /> : null;
  const nextEl = idx < pages.length - 1 ? <PageView key={`p${idx + 1}`} ref={refs.next} {...pageProps(idx + 1)} /> : null;
  const curEl = (
    <PageView key={`p${idx}`} ref={refs.cur} {...pageProps(idx)} zoomable highlight={hl} onWord={onWord}
      showHotspots={showHot} onHotspot={onHotspot} bubble={bubble} />
  );
  const abs = (el, k, style) => (el ? <Animated.View key={k} style={[StyleSheet.absoluteFill, style]}>{el}</Animated.View> : null);
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
      <Felt />
      <View style={[styles.bookShadow, { width: BL.bookW, height: BL.bookH }]}>
      <View style={styles.book} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
        {size ? layers : null}
        {/* Tap anywhere along the left or right edge to turn back or forward (swipes work anywhere). */}
        {size && idx > 0 ? <Pressable onPress={() => flip(-1)} accessibilityLabel="Previous page" style={[styles.edge, { left: 0, width: edgeW }]} /> : null}
        {size && idx < pages.length - 1 ? <Pressable onPress={() => flip(1)} accessibilityLabel="Next page" style={[styles.edge, { right: 0, width: edgeW }]} /> : null}
        {idx < pages.length - 1 ? <View style={{ position: 'absolute', right: 0, bottom: 0, zIndex: 20 }}><DogEar u={u} under={colors.earUnder} onPress={() => flip(1)} /></View> : null}
        {recording ? (
          <View style={styles.recBanner} pointerEvents="none">
            <View style={styles.recDot} />
            <Text style={styles.recText}>Recording page {idx + 1}. Turn the page to keep going, or tap ● to stop.</Text>
          </View>
        ) : null}
      </View>
      </View>
      </View>
      {wide ? (
        // sideways: the menu bar runs down the right side; same icons, page tag shortened to "2/16"
        <View style={[styles.sideBar, { width: BL.rightW, paddingTop: SIDE_MENU_TOP /* fixed a little down from the top corner */, paddingBottom: Math.max(16, insets.bottom) }]}>
          <Felt />
          <View style={{ width: BL.rightW, alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center' }}>
              <View style={styles.small}><Burger u={u} onPress={openMenu} /></View>
            </View>
            <View style={{ alignItems: 'center' }}>
            {/* the page count sits above the record button, with a good gap between them */}
            <View style={{ alignItems: 'center', gap: 8, marginBottom: showControls ? 30 : 0 }}>
              <BarMeta vertical sub={idx < n ? `${idx + 1}/${n}` : 'End'} />
              {mineHere ? <View style={styles.mineDot} accessibilityLabel="This page plays your own recording" /> : null}
            </View>
            {showControls ? (
              <View style={[styles.small, { alignItems: 'center', gap: 14 }]}>
                <RecordButton active={recording} onPress={() => (recording ? stopRec(true) : (setRecView('main'), setPanel('rec')))} />
                <PauseButton onPress={onPause} disabled={recording} />
                <PlayButton onPress={onPlay} active={reading && !paused} disabled={recording} />
              </View>
            ) : null}
            </View>
          </View>
        </View>
      ) : (
      <View style={[styles.bottomBar, { height: barH, paddingBottom: insets.bottom }]}>
        <Felt />
        <View style={styles.small}><Burger u={u} onPress={openMenu} /></View>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' }}>
          <BarMeta page={idx < n ? `Page ${idx + 1} of ${n}` : 'The End'} />
          {mineHere ? <View style={styles.mine} accessibilityLabel="This page plays your own recording"><View style={styles.mineDot} /><Text style={styles.mineText}>Your voice</Text></View> : null}
        </View>
        {showControls ? (
          <View style={[styles.small, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <RecordButton active={recording} onPress={() => (recording ? stopRec(true) : (setRecView('main'), setPanel('rec')))} />
            <PauseButton onPress={onPause} disabled={recording} />
            <PlayButton onPress={onPlay} active={reading && !paused} disabled={recording} />
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
      <Panel open={panel === 'play'} side="right" title={playView === 'voices' ? 'Voices' : 'Playback Options'} {...panelPos} onClose={() => { setPanel(null); setPlayView('main'); }}>
        {playView === 'voices' ? (
          <>
            {NARRATORS.map(([k, label]) => (
              <Option key={k} glyph={<NoteIcon />} title={label} sub={k === 'lily' ? 'Warm and gentle' : 'A lovable old bedtime bear'} selected={narratorOf(prefs) === k}
                onPress={() => { stopReading(); setPrefs((p) => ({ ...p, narrator: k })); toast(`${label} will read the stories.`); }} />
            ))}
            <Text style={styles.help}>The voice reads the stories aloud and sounds out words in Learn to Read. Pages you recorded in your own voice still play in yours.</Text>
            <Pressable onPress={() => setPlayView('main')} hitSlop={8}><Text style={styles.backlink}>‹ Back to Playback Options</Text></Pressable>
          </>
        ) : (
          <>
        {MODES.map(([g, id, t, s]) => (
          <React.Fragment key={id}>
          <Option glyph={g} title={t} sub={s} selected={prefs.mode === id} onPress={() => {
            stopReading();
            setPrefs((p) => ({ ...p, mode: id }));
            st.current.mode = id;
            setPanel(null);
            if (id === 'auto' || id === 'page') setTimeout(() => readPage(st.current.idx), 300);
            else if (id === 'learn') toast('Tap any word to hear it.');
            else if (id === 'self') toast('Reading on your own. Turn the page when you’re ready.');
            else toast('Tap the glowing circles in the picture.');
          }} />
          </React.Fragment>
        ))}
        <Option glyph={<NoteIcon />} title="Voices" sub={`Narrator: ${(NARRATORS.find(([k]) => k === narratorOf(prefs)) || NARRATORS[0])[1]}`} onPress={() => setPlayView('voices')} />
        <View style={styles.setting}>
          <Text style={styles.help}>Playback speed</Text>
          <Slider value={speedDraft ?? speedOf(prefs)} min={0.5} max={1.5} step={0.05} leftLabel="Slower" rightLabel="Faster"
            format={(v) => `${v.toFixed(2).replace(/0$/, '')}×`}
            onChange={setSpeedDraft}
            onDone={(v) => { setSpeedDraft(null); setPrefs((p) => ({ ...p, rate: Math.round(v * 100) / 100 })); }} />
        </View>
        <View style={styles.setting}>
          <Text style={styles.help}>Text size</Text>
          <Seg value={prefs.textScale || 1} options={TEXT_SIZES.map(([label, v]) => [v, label])} onChange={(v) => setPrefs((p) => ({ ...p, textScale: v }))} />
        </View>
        <View style={styles.setting}>
          <Text style={styles.help}>Book font</Text>
          <Seg value={prefs.font || 'serif'} options={Object.entries(BOOK_FONTS).map(([k, f]) => [k, f.label, f.family])} onChange={(v) => setPrefs((p) => ({ ...p, font: v }))} />
        </View>
        <View style={styles.setting}>
          <Text style={styles.help}>Sound effects</Text>
          <Seg value={prefs.sound ? 'on' : 'off'} options={[['off', 'Off'], ['on', 'On']]}
            onChange={(v) => { const on = v === 'on'; setPrefs((p) => ({ ...p, sound: on })); setEffects(on); if (on) playSound('flick'); }} />
        </View>
        {/* Print: two choices, each a little picture of the page */}
        <View style={styles.setting}>
          <Text style={styles.help}>{printing ? 'Getting ready to print…' : 'Print this book'}</Text>
          <View style={{ flexDirection: 'row', gap: 14, opacity: printing ? 0.4 : 1 }}>
            {[['stacked', 'Portrait'], ['landscape', 'Landscape']].map(([lay, label]) => (
              <Pressable key={lay} disabled={printing} onPress={() => { setPanel(null); setPrintGate(lay); }} accessibilityRole="button" accessibilityLabel={`Print, ${label.toLowerCase()} pages`} style={styles.printBtn}>
                <View style={styles.printIc}><PageShape wide={lay === 'landscape'} /></View>
                <Text style={styles.printLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
          </>
        )}
      </Panel>
      <ParentGate visible={shareGate} reason="Sharing opens your phone’s messages and email." onCancel={() => setShareGate(false)}
        onPass={() => {
          setShareGate(false);
          shareInvite(story.title);
        }} />
      <ParentGate visible={!!printGate} reason="Printing opens your phone’s print options." onPass={() => doPrint(printGate)} onCancel={() => setPrintGate(null)} />

      <Panel open={panel === 'rec'} side="right" title="Recording Options" {...panelPos} onClose={() => setPanel(null)}>
        {recView === 'main' ? (
          <>
            <Option glyph={<DotIcon />} title="Start Recording" sub={`Read this story in your own voice, starting on page ${Math.min(idx + 1, n)}`} disabled={idx >= n} onPress={startRec} />
            <Option glyph={<ListIcon />} title="Your Recordings" sub="Listen to or remove the pages you recorded" onPress={openRecList} />
            <Option glyph={<GearIcon size={MENU_ICON} />} title="Recording Settings" sub="Choose whose voice reads the story" onPress={() => setRecView('settings')} />
            <Option glyph={<TextIcon text="?" />} title="Help" sub="How recording works" onPress={() => setRecView('help')} />
          </>
        ) : (
          <Pressable onPress={() => setRecView('main')} hitSlop={8}><Text style={styles.back}>‹ Back</Text></Pressable>
        )}
        {recView === 'list' ? (
          recList.length ? recList.map((r) => (
            <View key={r.pid} style={styles.row}>
              <Text style={styles.rowText}>Page {r.page + 1} · {Math.round(r.seconds)}s</Text>
              <Pressable style={styles.rowBtn} onPress={() => { stopReading(); playVoice(r.uri); }}><Text style={styles.rowBtnText}>Play</Text></Pressable>
              <Pressable style={styles.rowBtn} onPress={async () => { stopVoice(); await removeRecording(story.id, r.pid); openRecList(); toast(`Removed your recording of page ${r.page + 1}.`); }}><Text style={styles.rowBtnText}>Remove</Text></Pressable>
            </View>
          )) : <Text style={styles.help}>Nothing recorded yet. Tap Start Recording to read this story in your own voice.</Text>
        ) : null}
        {recView === 'settings' ? (
          <>
            <Text style={styles.help}>Who reads the story aloud</Text>
            <Seg value={prefs.voice || 'narrator'} options={[['narrator', 'Narrator'], ['mine', 'Your voice']]} onChange={(v) => { stopReading(); setPrefs((p) => ({ ...p, voice: v })); }} />
            <Text style={styles.help}>Pages you haven’t recorded use the narrator.</Text>
          </>
        ) : null}
        {recView === 'help' ? (
          <>
            <Text style={styles.help}>Tap Start Recording and read the page out loud. Turn the page and keep reading: each page saves on its own.</Text>
            <Text style={styles.help}>Tap the red button to stop. Your recordings stay on this phone, and the story will read back in your voice.</Text>
          </>
        ) : null}
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.desk },
  bookShadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  book: { flex: 1, overflow: 'hidden', backgroundColor: colors.paper },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 10 },
  mineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.highlight },
  mineText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 12 },
  sideBar: { backgroundColor: colors.bar, alignItems: 'flex-end', zIndex: 30 },
  bottomBar: { backgroundColor: colors.bar, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10, zIndex: 30 },
  small: { transform: [{ scale: 0.86 }] },
  edge: { position: 'absolute', top: 0, bottom: 0, zIndex: 15 },
  half: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', backfaceVisibility: 'hidden' },
  strip: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', transformOrigin: 'top' },
  recBanner: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 25, backgroundColor: colors.highlight, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
  recText: { flex: 1, color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  back: { color: colors.muted, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  setting: { gap: 8, paddingTop: 10, paddingBottom: 8 },
  printBtn: { alignItems: 'center', gap: 6 },
  printIc: { width: 64, height: 64, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  printLabel: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  backlink: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, fontWeight: '700', paddingVertical: 6 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2a2a2a', padding: 12 },
  rowText: { flex: 1, color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  rowBtn: { backgroundColor: colors.tile, paddingHorizontal: 12, paddingVertical: 8 },
  rowBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  seg: { flex: 1, alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 10 },
  segText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
});
