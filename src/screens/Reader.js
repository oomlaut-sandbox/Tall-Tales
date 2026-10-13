// The reader: page curl, read-aloud with highlighting, learn-to-read, interactive pictures.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOOK_FONTS, colors, fonts } from '../theme';
import { tokenize, cleanWord, syllablesFor } from '../story';
import { Fade, PageView, TEXT_SIZES, pageLayout } from '../components/PageView';
import { FLAP_PERSPECTIVE, flapTables } from '../flapStrips';
import ParentGate from '../components/ParentGate';
import { printStory } from '../pdf';
import { Bar, BarMeta, Burger, DogEar, Option, Panel, PauseButton, PlayButton, RecordButton, Slider } from '../components/Chrome';

// Reading speed: 1 = the voice's natural pace. The default is moderately slow.
// Older settings only had Normal/Slow.
export const DEFAULT_SPEED = 0.75;
export const speedOf = (prefs) => prefs.rate || (prefs.speed === 'slow' ? 0.8 : DEFAULT_SPEED);
// Book narrators (ElevenLabs). Lily is the default.
export const NARRATORS = [['lily', 'Lily']]; // add more voices here (and in ci/narrate.js)
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
import { playPaper, setPageSound } from '../sound';
import { pauseSpeech, resumeSpeech, speakQueue, speakTracked, stopSpeech } from '../speech';
import { pauseVoice, playClips, playVoice, resumeVoice, stopVoice } from '../voice';
import { PARTS, WORDS } from '../narration/words';
import { getRecording, listRecordings, pageKey, removeRecording, saveRecording } from '../recordings';
import { AUDIO, TIMINGS } from '../narration';

const MODES = [
  ['»', 'auto', 'Auto Play', 'Reads the full story with audio'],
  ['›', 'page', 'Page by Page Play', 'Reads a page at a time with audio'],
  ['Aa', 'learn', 'Learn to Read', 'Sounds out a word when touched'],
  ['◇', 'self', 'Read Yourself', 'Page by page with no audio'],
  // ['✦', 'interactive', 'Interactive', 'Image interaction with touch'],  (hidden for now; hotspot code kept)
];

function Seg({ value, options, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map(([v, l, family]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[styles.seg, value === v && { backgroundColor: colors.highlight }]}>
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


  const refs = { prev: useRef(null), cur: useRef(null), next: useRef(null) };
  const st = useRef({});
  st.current = { idx, size, reading, paused, mode: prefs.mode, turning: !!flipPair, pages, recording };
  if (idx > pages.length - 1) setIdx(pages.length - 1);
  const pendingRead = useRef(false);
  const autoTimer = useRef(null);
  const anim = useRef(null);

  const barH = u * 17 + insets.bottom;
  // Sideways: the bar runs down the right edge and the menus open beside it.
  const barW = u * 17 + insets.right;
  const panelPos = landscape ? { bottom: 0, inset: barW } : { bottom: barH };
  const n = story.pages.length;
  const tokens = useMemo(() => (pages[idx] && pages[idx].text ? tokenize(pages[idx].text) : []), [pages, idx]);

  useEffect(() => setPageSound(prefs.sound === true), [prefs.sound]);
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
           onProgress: (f) => hlChar(Math.floor(f * p.text.length)), onDone: afterPage })) {
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
      await recorder.prepareToRecordAsync();
      recorder.record();
      recStart.current = Date.now();
      setPageSound(false);
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
      if (save && recorder.uri && seconds > 0.7) {
        await saveRecording(story.id, pageKey(story.pages[page], page), recorder.uri, seconds);
        if (prefsRef.current.voice !== 'mine') setPrefs((p) => ({ ...p, voice: 'mine' }));
        toast(`Saved your voice for page ${page + 1}.`);
      }
    } catch (e) {
      toast('That recording couldn’t be saved.');
    }
    setPageSound(prefsRef.current.sound === true);
  };

  const openRecList = async () => {
    setRecList(await listRecordings(story));
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
    if (!reading) readPage(idx);
  };
  const onPause = () => {
    if (!reading) return;
    if (usingVoice.current) { pauseVoice(); setPaused(true); return; }
    if (Platform.OS === 'android') return stopReading(); // Android voices can't pause mid-sentence
    pauseSpeech(); setPaused(true);
  };

  const onWord = (i, raw) => {
    const mode = st.current.mode;
    if (mode === 'self' || st.current.turning || st.current.recording) return;
    const w = cleanWord(raw);
    if (!w) return;
    stopReading();
    setHl(i);
    const done = () => setTimeout(() => setHl(-1), 400);
    if (mode === 'learn') {
      const parts = syllablesFor(story, w);
      // Lily's voice when we have her clips for this word (and its parts); otherwise the phone's voice.
      const voice = narratorOf(prefsRef.current);
      const wordClip = WORDS[voice]?.[w.toLowerCase()];
      const partClips = parts.length > 1 ? parts.map((s) => PARTS[voice]?.[s.toLowerCase()]) : [];
      if (wordClip && partClips.every(Boolean)) {
        playClips([...partClips, wordClip], { gap: 260, onDone: done });
        return;
      }
      const items = parts.length > 1 ? parts.map((s) => ({ text: s, rate: 0.5, pause: 220 })) : [];
      speakQueue([...items, { text: w, rate: 0.7 }], done);
    } else {
      speakQueue([{ text: w, rate: 0.8 }], done);
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
  };
  const startFlip = (dir) => {
    const a = dir > 0 ? st.current.idx : st.current.idx - 1;
    setProgress(dir > 0 ? 0 : 1);
    setFlipPair({ a, b: a + 1, dir });
  };
  const endFlip = (dir, commit) => {
    if (commit) { stepPage(dir); setHl(-1); setBubble(null); }
    // let the new page draw underneath before taking the turning layers away
    setTimeout(() => { setFlipPair(null); busy.current = false; }, 40);
  };
  const runFlip = (to, ms, then) => {
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
    playPaper('turn', 1);
    startFlip(dir);
    runFlip(dir > 0 ? 1 : 0, 820, () => endFlip(dir, true));
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
  const beginDrag = (sd) => {
    busy.current = true;
    drag.current = { ...sd, p: sd.dir > 0 ? 0 : 1, ready: true };
    stopReading();
    playPaper('lift', 0.5);
    startFlip(sd.dir);
  };
  const pan = useMemo(() => PanResponder.create({
    // Touches that start on empty paper come here straight away; touches that start on a word or
    // button are only taken over once they turn into a swipe.
    onStartShouldSetPanResponder: () => !busy.current && !st.current.turning,
    onMoveShouldSetPanResponderCapture: (_, g) => {
      if (busy.current || st.current.turning) return false;
      const sd = swipeDir(g);
      return !!sd && canTurn(sd.dir);
    },
    onPanResponderGrant: (_, g) => {
      drag.current = {};
      const sd = swipeDir(g);
      if (sd && canTurn(sd.dir)) beginDrag(sd);
    },
    onPanResponderMove: (_, g) => {
      let d = drag.current;
      if (!d.dir) {
        // decide on the first real movement whether this is a page-turning swipe
        if (busy.current || st.current.turning) return;
        const sd = swipeDir(g);
        if (!sd || !canTurn(sd.dir)) return;
        beginDrag(sd);
        d = drag.current;
      }
      const { w: W, h: H } = st.current.size;
      const amount = d.horiz ? -g.dx / (W * 0.8) : -g.dy / (H * 0.55);
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
    finishDrag(d, end);
  };
  const finishDrag = (d, g) => {
    const vel = d.horiz ? g.vx : g.vy;
    const commit = d.dir > 0 ? d.p > 0.4 || vel < -0.35 : d.p < 0.6 || vel > 0.35;
    if (commit && st.current.recording) {
      const keepGoing = st.current.idx + 1 < story.pages.length;
      stopRec(true).then(() => { pendingRec.current = keepGoing; });
    }
    playPaper(commit ? 'drop' : 'lift', commit ? 0.9 : 0.35);
    const target = commit ? (d.dir > 0 ? 1 : 0) : (d.dir > 0 ? 0 : 1);
    runFlip(target, 240 + 420 * Math.abs(target - prog.current), () => endFlip(d.dir, commit));
  };

  /* ---------- render ---------- */
  const W = size?.w || 0, H = size?.h || 0;
  const edgeW = Math.max(44, W * 0.12); // width of the tap-to-turn strips along each edge
  const flipT = useMemo(() => {
    if (!W || !H) return null;
    const artH = pageLayout(W, H).artH, textH = H - artH;
    return { artH, textH, tables: flapTables({ textH, artH }) };
  }, [W, H]);
  const pageProps = (i) => ({
    page: pages[i], end: !!pages[i]?.end, width: W, height: H, textScale: prefs.textScale || 1, fontKey: prefs.font || 'serif',
    onReadAgain: () => { stopReading(); setIdx(0); }, onLibrary: goLibrary,
  });
  const showHot = false; // Interactive mode is switched off for now
  const layers = [];
  const prevEl = idx > 0 ? <PageView key={`p${idx - 1}`} ref={refs.prev} {...pageProps(idx - 1)} /> : null;
  const nextEl = idx < pages.length - 1 ? <PageView key={`p${idx + 1}`} ref={refs.next} {...pageProps(idx + 1)} /> : null;
  const curEl = (
    <PageView key={`p${idx}`} ref={refs.cur} {...pageProps(idx)} highlight={hl} onWord={onWord}
      showHotspots={showHot} onHotspot={onHotspot} bubble={bubble} />
  );
  const abs = (el, k, style) => (el ? <Animated.View key={k} style={[StyleSheet.absoluteFill, style]}>{el}</Animated.View> : null);
  if (flipPair && size && flipT) {
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
    <View style={[styles.screen, landscape && { flexDirection: 'row', paddingLeft: insets.left }]}>
      <View style={styles.book} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
        {size ? layers : null}
        {/* Tap anywhere along the left or right edge to turn back or forward (swipes work anywhere). */}
        {size && idx > 0 ? <Pressable onPress={() => flip(-1)} accessibilityLabel="Previous page" style={[styles.edge, { left: 0, width: edgeW }]} /> : null}
        {size && idx < pages.length - 1 ? <Pressable onPress={() => flip(1)} accessibilityLabel="Next page" style={[styles.edge, { right: 0, width: edgeW }]} /> : null}
        {idx < pages.length - 1 ? <DogEar u={u} onPress={() => flip(1)} /> : null}
        {recording ? (
          <View style={styles.recBanner} pointerEvents="none">
            <View style={styles.recDot} />
            <Text style={styles.recText}>Recording page {idx + 1}. Turn the page to keep going, or tap ● to stop.</Text>
          </View>
        ) : null}
      </View>
      <Bar u={u} vertical={landscape}>
        <Burger u={u} onPress={openMenu} />
        <BarMeta vertical={landscape} title={story.title} sub={idx < n ? (landscape ? `${idx + 1} / ${n}` : `Page ${idx + 1} of ${n}`) : 'The End'} />
        <RecordButton active={recording} onPress={() => (recording ? stopRec(true) : (setRecView('main'), setPanel('rec')))} />
        <PauseButton onPress={onPause} disabled={recording} />
        <PlayButton onPress={onPlay} active={reading && !paused} disabled={recording} />
      </Bar>

      <Panel open={panel === 'play'} side="right" title="Playback Options" {...panelPos} onClose={() => setPanel(null)}>
        {MODES.map(([g, id, t, s]) => (
          <Option key={id} glyph={g} title={t} sub={s} selected={prefs.mode === id} onPress={() => {
            stopReading();
            setPrefs((p) => ({ ...p, mode: id }));
            st.current.mode = id;
            setPanel(null);
            if (id === 'auto' || id === 'page') setTimeout(() => readPage(st.current.idx), 300);
            else if (id === 'learn') toast('Tap any word to hear it sounded out.');
            else if (id === 'self') toast('Reading on your own. Turn the page when you’re ready.');
            else toast('Tap the glowing circles in the picture.');
          }} />
        ))}
        <Option glyph="♪" title={`Page turn sound: ${prefs.sound ? 'On' : 'Off'}`} sub="Tap to switch"
          onPress={() => { const on = !prefs.sound; setPrefs((p) => ({ ...p, sound: on })); setPageSound(on); if (on) playPaper('turn', 0.8); }} />
        <View style={{ gap: 8, paddingVertical: 6 }}>
          <Text style={styles.help}>Text size</Text>
          <Seg value={prefs.textScale || 1} options={TEXT_SIZES.map(([label, v]) => [v, label])} onChange={(v) => setPrefs((p) => ({ ...p, textScale: v }))} />
          <Text style={styles.help}>Playback speed</Text>
          <Slider value={speedDraft ?? speedOf(prefs)} min={0.5} max={1.5} step={0.05} leftLabel="Slower" rightLabel="Faster"
            format={(v) => `${v.toFixed(2).replace(/0$/, '')}×`}
            onChange={setSpeedDraft}
            onDone={(v) => { setSpeedDraft(null); setPrefs((p) => ({ ...p, rate: Math.round(v * 100) / 100 })); }} />
          {NARRATORS.length > 1 ? (
            <>
              <Text style={styles.help}>Narrator</Text>
              <Seg value={narratorOf(prefs)} options={NARRATORS} onChange={(v) => { stopReading(); setPrefs((p) => ({ ...p, narrator: v })); }} />
            </>
          ) : null}
          <Text style={styles.help}>Book font</Text>
          <Seg value={prefs.font || 'serif'} options={Object.entries(BOOK_FONTS).map(([k, f]) => [k, f.label, f.family])} onChange={(v) => setPrefs((p) => ({ ...p, font: v }))} />
        </View>
        {printChoice ? (
          <>
            <Option glyph="⎙" title="Print: picture above the words" sub="One page each, like the app" onPress={() => { setPrintChoice(false); setPanel(null); setPrintGate('stacked'); }} />
            <Option glyph="⎙" title="Print: book spreads" sub="Picture page, then a words page" onPress={() => { setPrintChoice(false); setPanel(null); setPrintGate('spreads'); }} />
          </>
        ) : (
          <Option glyph="⎙" title={printing ? 'Getting ready to print…' : 'Print this book'} sub="Print on paper with AirPrint" disabled={printing} onPress={() => setPrintChoice(true)} />
        )}
      </Panel>
      <ParentGate visible={!!printGate} reason="Printing opens your phone’s print options." onPass={() => doPrint(printGate)} onCancel={() => setPrintGate(null)} />

      <Panel open={panel === 'rec'} side="right" title="Recording Options" {...panelPos} onClose={() => setPanel(null)}>
        {recView === 'main' ? (
          <>
            <Option glyph="●" title="Start Recording" sub={`Read this story in your own voice, starting on page ${Math.min(idx + 1, n)}`} disabled={idx >= n} onPress={startRec} />
            <Option glyph="≡" title="Your Recordings" sub="Listen to or remove the pages you recorded" onPress={openRecList} />
            <Option glyph="⚙" title="Recording Settings" sub="Choose whose voice reads the story" onPress={() => setRecView('settings')} />
            <Option glyph="?" title="Help" sub="How recording works" onPress={() => setRecView('help')} />
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
  screen: { flex: 1, backgroundColor: colors.paper },
  book: { flex: 1, overflow: 'hidden', backgroundColor: colors.paper },
  edge: { position: 'absolute', top: 0, bottom: 0, zIndex: 15 },
  half: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', backfaceVisibility: 'hidden' },
  strip: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', transformOrigin: 'top' },
  recBanner: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 25, backgroundColor: colors.highlight, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
  recText: { flex: 1, color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  back: { color: colors.muted, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2a2a2a', padding: 12 },
  rowText: { flex: 1, color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  rowBtn: { backgroundColor: colors.tile, paddingHorizontal: 12, paddingVertical: 8 },
  rowBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  seg: { flex: 1, alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 10 },
  segText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
});
