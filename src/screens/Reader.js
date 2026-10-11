// The reader: page curl, read-aloud with highlighting, learn-to-read, interactive pictures.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { tokenize, cleanWord, syllablesFor } from '../story';
import { computeFold, ease } from '../fold';
import { CurlCanvas, snapshot, supportsCurl } from '../components/Curl';
import { PageView } from '../components/PageView';
import { Bar, BarMeta, Burger, DogEar, Option, Panel, PauseButton, PlayButton, RecordButton } from '../components/Chrome';
import { playPaper, setPageSound } from '../sound';
import { pauseSpeech, resumeSpeech, speakQueue, speakTracked, stopSpeech } from '../speech';

const MODES = [
  ['»', 'auto', 'Auto Play', 'Reads the full story with audio'],
  ['›', 'page', 'Page by Page Play', 'Reads a page at a time with audio'],
  ['Aa', 'learn', 'Learn to Read', 'Sounds out a word when touched'],
  ['◇', 'self', 'Read Yourself', 'Page by page with no audio'],
  ['✦', 'interactive', 'Interactive', 'Image interaction with touch'],
];

export default function Reader({ u, story, prefs, setPrefs, openMenu, goLibrary, toast, menuRequest }) {
  const insets = useSafeAreaInsets();
  const pages = useMemo(() => [...story.pages, { end: true }], [story]);
  const [idx, setIdx] = useState(0);
  const [size, setSize] = useState(null); // book area {w,h}
  const [hl, setHl] = useState(-1);
  const [bubble, setBubble] = useState(null);
  const [reading, setReading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState(null); // 'play' | 'rec' | null
  const [turn, setTurn] = useState(null); // native curl: {dir, C, fold, under, turning}
  const [webDir, setWebDir] = useState(0);
  const webX = useRef(new Animated.Value(0)).current;

  const refs = { prev: useRef(null), cur: useRef(null), next: useRef(null) };
  const st = useRef({});
  st.current = { idx, size, reading, paused, mode: prefs.mode, turning: !!turn || webDir !== 0, pages };
  const cache = useRef({}); // page index -> snapshot image
  const pendingRead = useRef(false);
  const autoTimer = useRef(null);
  const anim = useRef(null);

  const barH = u * 17 + insets.bottom;
  const n = story.pages.length;
  const tokens = useMemo(() => (pages[idx] && pages[idx].text ? tokenize(pages[idx].text) : []), [pages, idx]);

  useEffect(() => setPageSound(prefs.sound !== false), [prefs.sound]);
  useEffect(() => {
    if (!prefs.mode) setTimeout(() => setPanel('play'), 350);
    return () => { stopSpeech(); clearTimeout(autoTimer.current); cancelAnimationFrame(anim.current); };
  }, []);
  useEffect(() => { if (menuRequest) setPanel('play'); }, [menuRequest]);

  // Keep fresh pictures of the neighbouring pages ready for the curl.
  useEffect(() => {
    if (!supportsCurl || !size) return;
    cache.current = {};
    const t = setTimeout(async () => {
      if (refs.next.current) cache.current[idx + 1] = await snapshot(refs.next);
      if (refs.prev.current) cache.current[idx - 1] = await snapshot(refs.prev);
    }, 450);
    return () => clearTimeout(t);
  }, [idx, size]);

  /* ---------- reading ---------- */
  const stopReading = useCallback(() => {
    stopSpeech();
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
    speakTracked(p.text, {
      rate: prefs.speed === 'slow' ? 0.72 : 0.92,
      onWord: (ch) => {
        for (let i = 0; i < toks.length; i++) if (toks[i].start <= ch && ch < toks[i].end + 1) { setHl(i); break; }
      },
      onDone: () => {
        setHl(-1); setReading(false);
        if (st.current.mode === 'auto' && pageIndex < st.current.pages.length - 1) {
          autoTimer.current = setTimeout(() => { pendingRead.current = true; flip(1); }, 800);
        }
      },
    });
  }, [prefs.speed]);

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
    if (paused) { resumeSpeech(); setPaused(false); return; }
    if (!reading) readPage(idx);
  };
  const onPause = () => {
    if (!reading) return;
    if (Platform.OS === 'android') return stopReading(); // Android voices can't pause mid-sentence
    pauseSpeech(); setPaused(true);
  };

  const onWord = (i, raw) => {
    const mode = st.current.mode;
    if (mode === 'self' || st.current.turning) return;
    const w = cleanWord(raw);
    if (!w) return;
    stopReading();
    setHl(i);
    const done = () => setTimeout(() => setHl(-1), 400);
    if (mode === 'learn') {
      const parts = syllablesFor(story, w);
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
  const canTurn = (dir) => (dir > 0 ? st.current.idx < st.current.pages.length - 1 : st.current.idx > 0);

  const finishTurn = (dir, done) => {
    if (done) {
      setIdx((i) => i + dir);
      setHl(-1); setBubble(null);
    }
    // let the new page render under the curl before removing it
    setTimeout(() => { setTurn(null); }, done ? 60 : 0);
  };

  const animateFold = (dir, C, from, to, ms, lift, done) => {
    const { w: W, h: H } = st.current.size;
    const sg = C[1] === 0 ? 1 : -1;
    const t0 = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - t0) / ms), e = ease(t);
      const x = from[0] + (to[0] - from[0]) * e;
      const y = from[1] + (to[1] - from[1]) * e + (lift ? sg * H * 0.1 * Math.sin(Math.PI * e) : 0);
      setTurn((tr) => (tr ? { ...tr, fold: computeFold([x, y], C, W, H) } : tr));
      if (t < 1) anim.current = requestAnimationFrame(step);
      else finishTurn(dir, done);
    };
    anim.current = requestAnimationFrame(step);
  };

  const beginNativeTurn = async (dir, C) => {
    const { idx: i } = st.current;
    const { w: W, h: H } = st.current.size;
    const current = await snapshot(refs.cur);
    const other = cache.current[i + dir] || (await snapshot(dir > 0 ? refs.next : refs.prev));
    const tr = dir > 0
      ? { dir, C, under: other, turning: current, fold: computeFold(C, C, W, H) }
      : { dir, C, under: current, turning: other, fold: computeFold([-W, C[1]], C, W, H) };
    setTurn(tr);
    return tr;
  };

  const flip = async (dir) => {
    if (st.current.turning || !canTurn(dir) || !st.current.size) return false;
    if (!pendingRead.current) stopReading();
    const { w: W, h: H } = st.current.size;
    playPaper('turn', 1);
    if (supportsCurl) {
      const C = [W, H];
      const tr = await beginNativeTurn(dir, C);
      if (!tr.turning) { finishTurn(dir, true); return true; }
      if (dir > 0) animateFold(dir, C, C, [-W, H], 720, true, true);
      else animateFold(dir, C, [-W, H], C, 720, true, true);
    } else {
      setWebDir(dir);
      webX.setValue(dir > 0 ? 0 : -W);
      Animated.timing(webX, { toValue: dir > 0 ? -W : 0, duration: 520, useNativeDriver: Platform.OS !== 'web' }).start(() => {
        setIdx((x) => x + dir); setHl(-1); setBubble(null); setWebDir(0); webX.setValue(0);
      });
    }
    return true;
  };

  const drag = useRef({});
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => !st.current.turning && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2 && canTurn(g.dx < 0 ? 1 : -1),
    onPanResponderGrant: (e, g) => {
      const dir = g.dx < 0 ? 1 : -1;
      const { w: W, h: H } = st.current.size;
      const y0 = e.nativeEvent.locationY;
      drag.current = { dir, C: [W, y0 < H / 2 ? 0 : H], ready: false, P: null, vx: 0 };
      stopReading();
      playPaper('lift', 0.5);
      if (supportsCurl) beginNativeTurn(dir, drag.current.C).then(() => { drag.current.ready = true; });
      else { setWebDir(dir); webX.setValue(dir > 0 ? 0 : -W); drag.current.ready = true; }
    },
    onPanResponderMove: (_, g) => {
      const d = drag.current;
      if (!d.ready) return;
      const { w: W, h: H } = st.current.size;
      d.vx = g.vx;
      if (supportsCurl) {
        const sg = d.C[1] === 0 ? 1 : -1;
        const lift = sg * Math.min(Math.abs(g.dx) * 0.12, H * 0.1);
        const x = d.dir > 0 ? W + g.dx * 1.7 : -W + g.dx * 1.7;
        d.P = [x, d.C[1] + g.dy * 0.5 + lift];
        setTurn((tr) => (tr ? { ...tr, fold: computeFold(d.P, d.C, W, H) } : tr));
      } else {
        webX.setValue(d.dir > 0 ? Math.min(0, g.dx) : Math.min(0, -W + g.dx));
      }
    },
    onPanResponderRelease: (_, g) => endDrag(g),
    onPanResponderTerminate: (_, g) => endDrag(g),
  }), []);

  const endDrag = (g) => {
    const d = drag.current;
    if (!d.dir) return;
    const { w: W } = st.current.size;
    const commit = d.dir > 0 ? g.dx * 1.7 < -W * 0.65 || g.vx < -0.35 : g.dx * 1.7 > W * 0.75 || g.vx > 0.35;
    playPaper(commit ? 'drop' : 'lift', commit ? 0.9 : 0.35);
    if (supportsCurl) {
      const from = d.P || (d.dir > 0 ? d.C : [-W, d.C[1]]);
      const target = d.dir > 0 ? (commit ? [-W, d.C[1]] : d.C) : (commit ? d.C : [-W, d.C[1]]);
      if (!d.ready) { setTurn(null); drag.current = {}; return; }
      animateFold(d.dir, d.C, from, target, commit ? 420 : 300, false, commit);
    } else {
      const to = d.dir > 0 ? (commit ? -W : 0) : (commit ? 0 : -W);
      Animated.timing(webX, { toValue: to, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start(() => {
        if (commit) { setIdx((x) => x + d.dir); setHl(-1); setBubble(null); }
        setWebDir(0); webX.setValue(0);
      });
    }
    drag.current = {};
  };

  /* ---------- render ---------- */
  const W = size?.w || 0, H = size?.h || 0;
  const pageProps = (i) => ({
    page: pages[i], end: !!pages[i]?.end, width: W, height: H,
    onReadAgain: () => { stopReading(); setIdx(0); }, onLibrary: goLibrary,
  });
  const showHot = prefs.mode === 'interactive';
  const layers = [];
  const prevEl = idx > 0 ? <PageView key={`p${idx - 1}`} ref={refs.prev} {...pageProps(idx - 1)} /> : null;
  const nextEl = idx < pages.length - 1 ? <PageView key={`p${idx + 1}`} ref={refs.next} {...pageProps(idx + 1)} /> : null;
  const curEl = (
    <PageView key={`p${idx}`} ref={refs.cur} {...pageProps(idx)} highlight={hl} onWord={onWord}
      showHotspots={showHot} onHotspot={onHotspot} bubble={bubble} />
  );
  const abs = (el, k, style) => (el ? <Animated.View key={k} style={[StyleSheet.absoluteFill, style]}>{el}</Animated.View> : null);
  if (webDir < 0) layers.push(abs(nextEl, 'n'), abs(curEl, 'c'), abs(prevEl, 'p', { transform: [{ translateX: webX }] }));
  else if (webDir > 0) layers.push(abs(prevEl, 'p'), abs(nextEl, 'n'), abs(curEl, 'c', { transform: [{ translateX: webX }] }));
  else layers.push(abs(prevEl, 'p'), abs(nextEl, 'n'), abs(curEl, 'c'));

  return (
    <View style={styles.screen}>
      <View style={styles.book} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
        {size ? layers : null}
        {turn && turn.fold ? <CurlCanvas width={W} height={H} under={turn.under} turning={turn.turning} fold={turn.fold} /> : null}
        {idx < pages.length - 1 ? <DogEar u={u} onPress={() => flip(1)} /> : null}
      </View>
      <Bar u={u}>
        <Burger u={u} onPress={openMenu} />
        <BarMeta title={story.title} sub={idx < n ? `Page ${idx + 1} of ${n}` : 'The End'} />
        <RecordButton onPress={() => setPanel('rec')} />
        <PauseButton onPress={onPause} />
        <PlayButton onPress={onPlay} active={reading && !paused} />
      </Bar>

      <Panel open={panel === 'play'} side="right" title="Playback Options" bottom={barH} onClose={() => setPanel(null)}>
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
        <Option glyph="♪" title={`Page turn sound: ${prefs.sound === false ? 'Off' : 'On'}`} sub="Tap to switch"
          onPress={() => { const on = prefs.sound === false; setPrefs((p) => ({ ...p, sound: on })); setPageSound(on); if (on) playPaper('turn', 0.8); }} />
      </Panel>

      <Panel open={panel === 'rec'} side="right" title="Recording Options" bottom={barH} onClose={() => setPanel(null)}>
        <Option glyph="●" title="Start Recording" sub="Read this story in your own voice" onPress={() => { setPanel(null); toast('Recording your voice comes in the next build.'); }} />
        <Option glyph="≡" title="Your Recordings" sub="Listen to or remove the pages you recorded" onPress={() => toast('No recordings yet.')} />
        <Option glyph="⚙" title="Recording Settings" sub="Choose whose voice reads the story" onPress={() => toast('Coming with recording in the next build.')} />
        <Option glyph="?" title="Help" sub="How recording works" onPress={() => toast('Record each page in your own voice; it plays back when your child reads.')} />
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  book: { flex: 1, overflow: 'hidden', backgroundColor: colors.paper },
});
