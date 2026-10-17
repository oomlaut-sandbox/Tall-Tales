// My Notebook: always first in My Library. A book editor of its own (built like Create a Story),
// shaped like the leather notebook on the start page:
//   - spread 1: the inside of the hard leather cover (top) and a white title page, "My Notes" (bottom)
//   - spread 2: the badge board, over two white pages
//   - then the child's pages: notes pages (a photo or a drawing, and typed notes) and sketch pages (two square pages to draw on)
// Opened from My Library, the little notebook grows into place and its cover swings open like the one on
// the start page. After that the white pages turn with the paper peel, like the books.
// Everything saves on its own. Turn pages with the dog-ear or by swiping; "Pages" lists them all.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, fonts } from '../theme';
import { Bar, Burger, DogEar, Panel } from '../components/Chrome';
import { Fade } from '../components/PageView';
import { Spine, bookLayout } from '../components/BookFrame';
import { DESK_FELT, Felt } from '../look';
import ParentGate from '../components/ParentGate';
import { StrokesView } from '../components/Strokes';
import { FlapPeel, snapshot, supportsCurl } from '../components/Curl';
import { PENS, SIZES, near } from '../strokes';
import { blankNote, blankSketch, dropNotebookPicture, keepNotebookPicture, loadNotebook, saveNotebook } from '../notebook';
import { allBadges, currentStreak, loadLog, markFirst, onNewBadge } from '../badges';
import { STORIES } from '../story';
import { playKey, playSound } from '../sound';

const GAP = 30;
const MAX_PX = 1600;
const MAX_PAGES = 60;
const TYPE = 'SpecialElite_400Regular'; // the notebook is written in the typewriter font
// The leather cover from the start page, and its corners (tiny along the spine, rounder at the far edge)
export const NOTEBOOK_COVER = require('../../assets/leather-cover.jpg');
export const R_SPINE = 0.012, R_EDGE = 0.102;
const COVER_SPREAD = 0, BADGES = 1, FIRST_PAGE = 2; // spread numbers
const WHITE = '#f4f2ed'; // the notebook's white pages
// the title on the first white page (a placeholder until Jörg's handwritten title arrives)
const TITLE_FONT = 'DancingScript_700Bold';

// The paper peel needs pictures of the pages (phone only). If drawing it ever fails, pages just switch.
const peelWorks = { ok: true };
class PeelGuard extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { peelWorks.ok = false; return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
const peelSubs = new Set();
function PeelLayer({ start, ...props }) {
  const [t, setT] = useState(start);
  useEffect(() => { peelSubs.add(setT); return () => { peelSubs.delete(setT); }; }, []);
  return <FlapPeel {...props} t={t} />;
}

export default function Notebook({ u, openMenu, toast, onDone, from }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [nb, setNb] = useState(null);
  const [i, setI] = useState(COVER_SPREAD);
  const [log, setLog] = useState(null);
  const [saved, setSaved] = useState(true);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [newAsk, setNewAsk] = useState(false); // 'What kind of page?'
  const [picAsk, setPicAsk] = useState(false); // the picture square's choices
  const [camGate, setCamGate] = useState(false);
  const [writing, setWriting] = useState(false); // the notes editor
  const [drawing, setDrawing] = useState(false); // the drawing editor
  const latest = useRef(null);
  latest.current = nb;
  const timer = useRef(null);
  const first = useRef(true);

  useEffect(() => { loadNotebook().then(setNb); loadLog().then(setLog); return onNewBadge(() => loadLog().then(setLog)); }, []);
  // autosave shortly after every change
  useEffect(() => {
    if (!nb) return;
    if (first.current) { first.current = false; return; }
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => { await saveNotebook(latest.current); setSaved(true); }, 600);
  }, [nb]);
  useEffect(() => () => { clearTimeout(timer.current); if (latest.current) saveNotebook(latest.current); }, []);

  const pages = nb ? nb.pages : [];
  const total = pages.length + FIRST_PAGE;
  const pageAt = (k) => (k >= FIRST_PAGE ? pages[k - FIRST_PAGE] : null);
  const page = pageAt(i);
  const update = (patch) => setNb((n) => ({ ...n, pages: n.pages.map((p, k) => (k === i - FIRST_PAGE ? { ...p, ...patch } : p)) }));

  // ---- the book's size, as in Create a Story ----
  const BL = bookLayout(winW, winH, insets, u * 17);
  const wide = BL.wide, spare = BL.spare;
  const [desk, setDesk] = useState(null);
  const side = Math.floor(desk
    ? Math.max(80, Math.min(BL.side, wide ? Math.min((desk.w - 2 * GAP) / 2, desk.h - 2 * GAP) : Math.min(desk.w - 2 * GAP, (desk.h - 2 * GAP) / 2)))
    : BL.side);
  const bookW = wide ? side * 2 : side, bookH = wide ? side : side * 2;
  // the open notebook's outline: rounded at the far edges, like the start page notebook
  const R = side * R_EDGE, r = side * R_SPINE;
  const shape = wide
    ? { borderTopLeftRadius: R, borderBottomLeftRadius: R, borderTopRightRadius: R, borderBottomRightRadius: R }
    : { borderTopLeftRadius: R, borderTopRightRadius: R, borderBottomLeftRadius: R, borderBottomRightRadius: R };

  // where the book is on screen (for the opening and the paper peel)
  const bookRef = useRef(null);
  const [bookAt, setBookAt] = useState(null);
  const measureBook = () => setTimeout(() => {
    if (bookRef.current && bookRef.current.measureInWindow) bookRef.current.measureInWindow((x, y, w, h) => { if (w) setBookAt({ x, y, w, h }); });
  }, 30);

  // ---- opening from My Library: the little notebook grows into place, then its cover swings open ----
  const [intro, setIntro] = useState(from ? 'fly' : null); // 'fly' → 'flip' → null
  const fly = useRef(new Animated.Value(0)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const introStarted = useRef(false);
  useEffect(() => {
    if (!intro || introStarted.current || !bookAt || !nb) return;
    introStarted.current = true;
    Animated.timing(fly, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => {
      setIntro('flip');
      playSound('coverOpen');
      Animated.timing(swing, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => setIntro(null));
    });
  }, [intro, bookAt, nb]);

  // ---- turning pages: the paper peel on the phone (upright), a plain switch otherwise ----
  const refs = { cur: useRef(null), prev: useRef(null), next: useRef(null) };
  const [flipPair, setFlipPair] = useState(null); // { a, b, dir } while a page turns
  const [peel, setPeel] = useState(null); // { front, back } pictures
  const prog = useRef(0);
  const busy = useRef(false);
  const st = useRef({});
  st.current = { i, total };
  const usePeel = supportsCurl && !wide;
  const setProgress = (p) => { prog.current = p; peelSubs.forEach((f) => f(p)); };
  const turn = async (dir) => {
    const { i: at, total: n } = st.current;
    const to = at + dir;
    if (busy.current || intro || to < 0 || to >= n) return;
    busy.current = true;
    playSound('swish');
    if (!usePeel || !peelWorks.ok || !bookAt) { setI(to); busy.current = false; return; }
    const a = dir > 0 ? at : at - 1;
    const fa = await snapshot(dir > 0 ? refs.cur : refs.prev);
    const fb = await snapshot(dir > 0 ? refs.next : refs.cur);
    if (!fa || !fb) { setI(to); busy.current = false; return; }
    setPeel({ front: fa, back: fb });
    setProgress(dir > 0 ? 0 : 1);
    setFlipPair({ a, b: a + 1, dir });
    const target = dir > 0 ? 1 : 0, startP = prog.current, t0 = Date.now(), ms = 900;
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = () => {
      const x = Math.min(1, (Date.now() - t0) / ms);
      setProgress(startP + (target - startP) * ease(x));
      if (x < 1) requestAnimationFrame(step);
      else {
        setI(to);
        setTimeout(() => { setFlipPair(null); setPeel(null); busy.current = false; }, 40);
      }
    };
    requestAnimationFrame(step);
  };
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const next = () => { if (i >= total - 1) setNewAsk(true); else turn(1); };

  const addPage = (kind) => {
    setNewAsk(false); setPagesOpen(false);
    if (pages.length >= MAX_PAGES) return toast(`Your notebook is full (${MAX_PAGES} pages). Delete a page to make room.`);
    const p = kind === 'sketch' ? blankSketch() : blankNote();
    const at = Math.max(0, i - FIRST_PAGE + 1); // right after the page you're on
    setNb((n) => ({ ...n, pages: [...n.pages.slice(0, at), p, ...n.pages.slice(at)] }));
    // turn to it once it's drawn
    if (i === at + FIRST_PAGE - 1) setTimeout(() => turnRef.current(1), 160); else setI(at + FIRST_PAGE);
  };
  const move = (k, dir) => {
    const j = k + dir;
    if (j < 0 || j >= pages.length) return;
    setNb((n) => { const ps = [...n.pages]; [ps[k], ps[j]] = [ps[j], ps[k]]; return { ...n, pages: ps }; });
    if (i === k + FIRST_PAGE) setI(j + FIRST_PAGE); else if (i === j + FIRST_PAGE) setI(k + FIRST_PAGE);
  };
  const removePage = (k) => {
    const p = pages[k];
    if (p.uri) dropNotebookPicture(p.uri);
    setNb((n) => { const ps = n.pages.filter((_, m) => m !== k); return { ...n, pages: ps.length ? ps : [blankNote()] }; });
    setI((x) => (x > k + FIRST_PAGE ? x - 1 : Math.min(x, Math.max(FIRST_PAGE, pages.length - 1 + FIRST_PAGE - 1))));
    toast('Page deleted.');
  };

  // a photo for the picture square (from the phone, or the camera after the grown-up check)
  const choosePhoto = async (source) => {
    try {
      const opts = { mediaTypes: 'images', quality: 0.9, allowsEditing: true, aspect: [1, 1] };
      let r;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return toast('Oomlaut Reader isn’t allowed to use the camera. You can turn it on in Settings.');
        r = await ImagePicker.launchCameraAsync(opts);
      } else r = await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      let src = a.uri, w = a.width || 1, h = a.height || 1;
      if (Math.max(w, h) > MAX_PX) {
        try { const r2 = await ImageManipulator.manipulateAsync(a.uri, [{ resize: w >= h ? { width: MAX_PX } : { height: MAX_PX } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }); src = r2.uri; w = r2.width; h = r2.height; } catch (e) {}
      }
      const uri = await keepNotebookPicture(src);
      if (page && page.uri) dropNotebookPicture(page.uri);
      update({ uri, w, h });
    } catch (e) {
      toast(source === 'camera' ? 'Couldn’t open the camera.' : 'Couldn’t open your photos. Check that Oomlaut Reader is allowed to use Photos in Settings.');
    }
  };

  // swipe the book to turn pages: up (or to the left) for the next one; taps still go to the squares
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 20,
    onPanResponderRelease: (_, g) => {
      const d = Math.abs(g.dy) > Math.abs(g.dx) ? -g.dy : -g.dx;
      if (d > 40) turnRef.current(1); else if (d < -40) turnRef.current(-1);
    },
  })).current;

  // ---- one spread of the notebook (k: its number). live: the one you're looking at (it takes taps) ----
  const spread = (k, live) => {
    if (k === COVER_SPREAD) {
      return (
        <View style={[StyleSheet.absoluteFill, { flexDirection: wide ? 'row' : 'column' }]}>
          {/* the inside of the hard cover: the leather, turned over, with the deep spine shadow */}
          <View style={{ width: side, height: side, overflow: 'hidden', opacity: live && intro ? 0 : 1 }}>
            <Image source={NOTEBOOK_COVER} resizeMode="cover" style={{ width: side, height: side, transform: wide ? [{ scaleX: -1 }] : [{ scaleY: -1 }] }} />
            <Fade edge={wide ? 'right' : 'bottom'} size={Math.round(side * 0.24)} max={0.55} />
          </View>
          {/* the first white page, with the notebook's title */}
          <View style={{ width: side, height: side, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' }}>
            <Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.17)} max={0.32} />
            <Spine wide={wide} />
            <Text style={{ fontFamily: TITLE_FONT, fontSize: side * 0.15, color: '#2b2b2b' }}>My Notes</Text>
          </View>
        </View>
      );
    }
    if (k === BADGES) return <BadgeSpread log={log} side={side} wide={wide} toast={toast} />;
    const pg = pageAt(k);
    if (!pg) return null;
    if (pg.kind === 'sketch') {
      // a sketch spread: two square pages to draw on
      const sq = (which, strokes, edge, spine) => (
        <Pressable disabled={!live} onPress={() => setDrawing(which)} style={{ width: side, height: side, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          accessibilityRole="button" accessibilityLabel={which === 'top' ? 'Draw on the top page' : 'Draw on the bottom page'}>
          <StrokesView strokes={strokes} width={side} height={side} />
          <Fade edge={edge} size={Math.round(side * 0.09)} max={0.15} />
          {spine ? <Spine wide={wide} /> : null}
          {!strokes.length ? <Text style={styles.hint}>Tap to draw</Text> : null}
        </Pressable>
      );
      return (
        <View style={[StyleSheet.absoluteFill, { flexDirection: wide ? 'row' : 'column' }]}>
          {sq('top', pg.strokes, wide ? 'right' : 'bottom', false)}
          {sq('bottom', pg.strokes2 || [], wide ? 'left' : 'top', true)}
        </View>
      );
    }
    return (
      <View style={[StyleSheet.absoluteFill, { flexDirection: wide ? 'row' : 'column' }]}>
        <Pressable disabled={!live} onPress={() => setPicAsk(true)} style={[styles.art, { width: side, height: side }]} accessibilityRole="button" accessibilityLabel={pg.uri || pg.strokes.length ? 'Change the picture' : 'Add a picture or a drawing'}>
          {pg.uri ? <Image source={{ uri: pg.uri }} style={styles.fill} resizeMode="cover" /> : <View style={[styles.fill, { backgroundColor: WHITE }]} />}
          <StrokesView strokes={pg.strokes} width={side} height={side} />
          {!pg.uri && !pg.strokes.length ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.plus, { fontSize: u * 24, lineHeight: u * 24 }]}>+</Text>
              <Text style={styles.addImage}>Add a picture</Text>
              <Text style={styles.addSub}>or a drawing</Text>
            </View>
          ) : null}
          <Fade edge={wide ? 'right' : 'bottom'} size={Math.round(side * 0.1)} max={0.22} />
        </Pressable>
        <Pressable disabled={!live} onPress={() => setWriting(true)} style={[styles.textBox, { width: side, height: side, paddingHorizontal: side * 0.09, paddingVertical: side * 0.07, backgroundColor: WHITE }]} accessibilityRole="button" accessibilityLabel="Notes for this page">
          <Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.09)} max={0.13} />
          <Spine wide={wide} />
          <Lines side={side} />
          <Text style={[styles.notes, !pg.text && { color: '#777', textAlign: 'center' }]} numberOfLines={9}>
            {pg.text || 'Tap here to write your notes.'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const header = i === COVER_SPREAD ? 'My Notes' : i === BADGES ? 'Badges' : page && page.kind === 'sketch' ? 'Sketch' : 'Notes';
  const barTitle = (
    <View style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
      <Text numberOfLines={1} style={styles.title}>My Notebook</Text>
      <Text numberOfLines={1} style={styles.sub}>{header} · {i + 1} of {total} · {saved ? 'Saved' : 'Saving…'}</Text>
    </View>
  );
  const barBtns = (vertical) => (
    <View style={vertical ? { alignItems: 'center', gap: 18 } : { flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Pressable onPress={() => setPagesOpen(true)} hitSlop={8} accessibilityRole="button"><Text style={styles.btn}>Pages</Text></Pressable>
      <Pressable onPress={async () => { clearTimeout(timer.current); if (latest.current) await saveNotebook(latest.current); onDone(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close the notebook">
        <View style={styles.finish}><Text style={styles.btn}>Done</Text></View>
      </Pressable>
    </View>
  );

  // the closed cover, flying in from the shelf and then swinging open (drawn over everything)
  let introEl = null;
  if (intro && bookAt && from) {
    const to = wide ? { x: bookAt.x + side, y: bookAt.y } : { x: bookAt.x, y: bookAt.y + side };
    const lerp = (a, b) => fly.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
    const size = lerp(from.w, side);
    const corner = (f) => fly.interpolate({ inputRange: [0, 1], outputRange: [from.w * f, side * f] });
    const round = wide
      ? { borderTopLeftRadius: corner(R_SPINE), borderBottomLeftRadius: corner(R_SPINE), borderTopRightRadius: corner(R_EDGE), borderBottomRightRadius: corner(R_EDGE) }
      : { borderTopLeftRadius: corner(R_SPINE), borderTopRightRadius: corner(R_SPINE), borderBottomLeftRadius: corner(R_EDGE), borderBottomRightRadius: corner(R_EDGE) };
    const turnDeg = swing.interpolate({ inputRange: [0, 1], outputRange: wide ? ['0deg', '-180deg'] : ['0deg', '180deg'] });
    const frontOp = swing.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] });
    const backOp = swing.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });
    const shade = swing.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.25, 0] });
    const leaf = wide
      ? { transformOrigin: 'left', transform: [{ perspective: 1600 }, { rotateY: turnDeg }] }
      : { transformOrigin: 'top', transform: [{ perspective: 1600 }, { rotateX: turnDeg }] };
    introEl = (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 45 }]}>
        <Animated.View style={[{ position: 'absolute', left: lerp(from.x, to.x), top: lerp(from.y, to.y), width: size, height: size }, styles.coverShadow, round, intro === 'flip' ? leaf : null]}>
          <Animated.View style={[StyleSheet.absoluteFill, round, { overflow: 'hidden', opacity: frontOp }]}>
            <Image source={NOTEBOOK_COVER} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, round, { overflow: 'hidden', opacity: backOp }]}>
            <Image source={NOTEBOOK_COVER} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            <Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.24)} max={0.55} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, round, { backgroundColor: '#000', opacity: shade }]} />
        </Animated.View>
      </View>
    );
  }

  // the book's layers: normally the spread you're on (with the ones either side ready underneath for the
  // peel); while a page turns, the next spread with the top of the turning one over it
  const layers = [];
  const abs = (k, key, ref, live) => (
    <View key={key} ref={ref} collapsable={false} pointerEvents={live ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, shape, { overflow: 'hidden', backgroundColor: live && intro ? 'transparent' : colors.paper }]}>{spread(k, live)}</View>
  );
  if (flipPair && peel) {
    const { a, b } = flipPair;
    layers.push(abs(b, `f${b}`, null, false));
    layers.push(
      <View key={`t${a}`} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: side, height: side, overflow: 'hidden', ...(wide ? {} : { borderTopLeftRadius: R, borderTopRightRadius: R }) }}>
        <View style={{ width: bookW, height: bookH }}>{spread(a, false)}</View>
      </View>,
    );
  } else {
    if (usePeel && i > 0) layers.push(abs(i - 1, `p${i - 1}`, refs.prev, false));
    if (usePeel && i < total - 1) layers.push(abs(i + 1, `p${i + 1}`, refs.next, false));
    layers.push(abs(i, `p${i}`, refs.cur, true));
  }

  return (
    <View style={[styles.screen, wide && { flexDirection: 'row' }]}>
      <View style={wide ? { width: BL.leftW, backgroundColor: colors.bar } : { height: insets.top + spare / 2, backgroundColor: colors.bar }} />
      <View style={styles.desk} onLayout={(e) => { setDesk({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }); measureBook(); }}>
        {DESK_FELT ? <Image source={DESK_FELT} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} /> : null}
        {nb ? (
          <View ref={bookRef} collapsable={false} onLayout={measureBook} {...swipe.panHandlers}
            style={[styles.bookShadow, shape, { width: bookW, height: bookH, opacity: intro === 'fly' ? 0 : 1 }, intro ? { backgroundColor: 'transparent', shadowOpacity: 0 } : null]}>
            {layers}
            {!flipPair && !intro ? (
              <>
                <DogEar u={u} under={colors.earUnder} onPress={next} label={i >= total - 1 ? 'Add a page' : 'Next page'} />
                {i > 0 ? (
                  <Pressable onPress={() => turn(-1)} hitSlop={10} style={[styles.back, { left: R * 0.6, bottom: R * 0.4 }]} accessibilityRole="button" accessibilityLabel="Previous page"><Text style={styles.backText}>‹</Text></Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </View>
      {wide ? (
        <View style={{ width: BL.rightW, backgroundColor: colors.bar, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Bar u={u} vertical>
            <Burger u={u} onPress={openMenu} />
            <View style={{ alignItems: 'center', gap: 18 }}>
              <Text style={[styles.sub, { textAlign: 'center', marginBottom: 22 }]}>{i + 1}/{total}</Text>
              {barBtns(true)}
            </View>
          </Bar>
        </View>
      ) : (
        <View style={{ backgroundColor: colors.bar, paddingTop: spare / 2 }}>
          <Bar u={u}>
            <Burger u={u} onPress={openMenu} />
            {barTitle}
            {barBtns(false)}
          </Bar>
        </View>
      )}

      {/* the turning page, drawn over the whole screen so it can lift past the book's edges */}
      {flipPair && peel && bookAt ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
          <PeelGuard><PeelLayer start={prog.current} width={bookW} height={bookH} artH={side} corner="right" front={peel.front} back={peel.back}
            ox={bookAt.x} oy={bookAt.y} canvasW={winW} canvasH={winH} /></PeelGuard>
        </View>
      ) : null}
      {introEl}
      <Panel open={pagesOpen} side="right" title="Pages" portraitWidth="94%" bottom={wide ? 0 : u * 17 + insets.bottom} inset={wide ? BL.rightW : 0} onClose={() => setPagesOpen(false)}>
        <ScrollView style={{ maxHeight: Math.max(340, winH * 0.5) }} contentContainerStyle={{ gap: 14, paddingBottom: 6 }}>
          <Pressable onPress={() => { setI(BADGES); setPagesOpen(false); }} style={[styles.prow, i === BADGES && { borderColor: colors.green }]}>
            <View style={[styles.thumb, { backgroundColor: '#c9a227' }]}><Text style={styles.thumbNum}>★</Text></View>
            <View style={{ flex: 1, justifyContent: 'center', height: 64 }}><Text style={styles.prowTitle}>Badges<Text style={styles.prowSub}>{'  ·  '}Page 2</Text></Text></View>
          </Pressable>
          {pages.map((p, k) => (
            <View key={p.pid} style={[styles.prow, i === k + FIRST_PAGE && { borderColor: colors.green }]}>
              <Pressable onPress={() => { setI(k + FIRST_PAGE); setPagesOpen(false); }} style={[styles.thumb, { backgroundColor: WHITE }]} accessibilityLabel={`Go to page ${k + 3}`}>
                {p.uri ? <Image source={{ uri: p.uri }} style={styles.fill} resizeMode="cover" /> : null}
                <StrokesView strokes={p.strokes} width={64} height={64} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0, height: 64, justifyContent: 'space-between' }}>
                <Pressable onPress={() => { setI(k + FIRST_PAGE); setPagesOpen(false); }}>
                  <Text numberOfLines={1} style={styles.prowTitle}>{p.kind === 'sketch' ? 'Sketch' : 'Notes'}<Text style={styles.prowSub}>{'  ·  '}Page {k + 3}{p.text.trim() ? `  ·  ${p.text.trim()}` : ''}</Text></Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => move(k, -1)} disabled={k === 0} hitSlop={6} style={[styles.pbtn, k === 0 && { opacity: 0.3 }]} accessibilityLabel="Move up"><Text style={styles.pbtnText}>↑</Text></Pressable>
                  <Pressable onPress={() => move(k, 1)} disabled={k === pages.length - 1} hitSlop={6} style={[styles.pbtn, k === pages.length - 1 && { opacity: 0.3 }]} accessibilityLabel="Move down"><Text style={styles.pbtnText}>↓</Text></Pressable>
                  <Pressable onPress={() => removePage(k)} hitSlop={6} style={styles.pbtn} accessibilityLabel="Delete page"><Text style={styles.pbtnText}>✕</Text></Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={{ alignItems: 'flex-end', gap: 12, marginTop: 26, marginBottom: 10 }}>
          <Pressable onPress={() => addPage('note')} style={[styles.stackPill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>New notes page</Text></Pressable>
          <Pressable onPress={() => addPage('sketch')} style={[styles.stackPill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>New sketch page</Text></Pressable>
        </View>
      </Panel>

      {newAsk ? (
        <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>Add a new page</Text>
            <Pressable onPress={() => addPage('note')} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Notes page</Text></Pressable>
            <Text style={styles.choiceHint}>A picture or a drawing, with your notes under it.</Text>
            <Pressable onPress={() => addPage('sketch')} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Sketch page</Text></Pressable>
            <Text style={styles.choiceHint}>Two square pages to draw on.</Text>
            <Pressable onPress={() => setNewAsk(false)} style={[styles.choiceBtn, { marginTop: 8 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>Cancel</Text></Pressable>
          </View>
        </View>
      ) : null}

      {picAsk && page ? (
        <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>{page.uri || page.strokes.length ? 'Change the picture' : 'Add a picture'}</Text>
            <Pressable onPress={() => { setPicAsk(false); setDrawing('top'); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{page.uri ? 'Draw on the photo' : page.strokes.length ? 'Keep drawing' : 'Make a drawing'}</Text></Pressable>
            <Pressable onPress={() => { setPicAsk(false); choosePhoto('library'); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Choose a photo</Text></Pressable>
            <Pressable onPress={() => { setPicAsk(false); setCamGate(true); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Take a photo</Text></Pressable>
            {page.uri ? <Pressable onPress={() => { setPicAsk(false); dropNotebookPicture(page.uri); update({ uri: null, w: 1, h: 1 }); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Remove the photo</Text></Pressable> : null}
            <Pressable onPress={() => setPicAsk(false)} style={[styles.choiceBtn, { marginTop: 8 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>Cancel</Text></Pressable>
          </View>
        </View>
      ) : null}
      <ParentGate visible={camGate} reason="Taking a photo opens the camera." onPass={() => { setCamGate(false); setTimeout(() => choosePhoto('camera'), 250); }} onCancel={() => setCamGate(false)} />

      {writing && page ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.desk }]}>
            {DESK_FELT ? <Image source={DESK_FELT} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} /> : null}
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 34 }}>
            <View style={styles.editorHead}><Text style={styles.editorTitle}>My notes · Page {i + 1}</Text></View>
            <View style={[styles.editorPage, { width: winW - 2 * GAP, maxHeight: winW - 2 * GAP }]}>
              <TextInput value={page.text} onChangeText={(text) => { if (text.length > (page.text || '').length) playKey(); update({ text }); }}
                placeholder="Write anything: what you read, what you saw today, a story idea…" placeholderTextColor="#666"
                multiline autoFocus style={[styles.editorInput, { outlineWidth: 0 }]} accessibilityLabel="Notes" />
            </View>
            <View style={{ width: winW - 2 * GAP, alignItems: 'flex-end' }}>
              <Pressable onPress={() => setWriting(false)} hitSlop={8} accessibilityRole="button" style={styles.donePill}><Text style={styles.pillText}>Done</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {drawing && page ? (
        <DrawEditor insets={insets} photo={page.kind === 'sketch' ? null : page.uri} strokes={drawing === 'bottom' ? page.strokes2 || [] : page.strokes}
          title={page.kind === 'sketch' ? `Sketch · Page ${i + 1}` : `Drawing · Page ${i + 1}`}
          onDone={(strokes) => { update(drawing === 'bottom' ? { strokes2: strokes } : { strokes }); setDrawing(false); if (strokes.length) markFirst('firstDrawing'); }} />
      ) : null}
    </View>
  );
}


// faint ruled lines on the notes square, like a notebook
function Lines({ side }) {
  const n = 9, top = side * 0.13, gap = (side * 0.8) / n;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: n }, (_, k) => (
        <View key={k} style={{ position: 'absolute', left: side * 0.07, right: side * 0.07, top: top + gap * (k + 1), height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(60,90,140,0.22)' }} />
      ))}
    </View>
  );
}

// ---- The badge spread: the second spread of the notebook, over two white pages ----
// Top page: the title, how much has been read, the milestones and the streaks.
// Bottom page: the firsts, then a patch for every book finished (it scrolls if there are many).
// Jörg's felt badges, cut out with drop shadows (300 px badge inside a 368 px picture). Locked: the grey ones.
const BADGE_ART = {
  read1: [require('../../assets/badges/read1.png'), require('../../assets/badges/read1-locked.png')],
  read5: [require('../../assets/badges/read5.png'), require('../../assets/badges/read5-locked.png')],
  read10: [require('../../assets/badges/read10.png'), require('../../assets/badges/read10-locked.png')],
  read25: [require('../../assets/badges/read25.png'), require('../../assets/badges/read25-locked.png')],
  read50: [require('../../assets/badges/read50.png'), require('../../assets/badges/read50-locked.png')],
  streak3: [require('../../assets/badges/streak3.png'), require('../../assets/badges/streak3-locked.png')],
  streak7: [require('../../assets/badges/streak7.png'), require('../../assets/badges/streak7-locked.png')],
  streak30: [require('../../assets/badges/streak30.png'), require('../../assets/badges/streak30-locked.png')],
  firstRecording: [require('../../assets/badges/firstRecording.png'), require('../../assets/badges/firstRecording-locked.png')],
  firstBook: [require('../../assets/badges/firstBook.png'), require('../../assets/badges/firstBook-locked.png')],
  firstDrawing: [require('../../assets/badges/firstDrawing.png'), require('../../assets/badges/firstDrawing-locked.png')],
  bedtime: [require('../../assets/badges/bedtime.png'), require('../../assets/badges/bedtime-locked.png')],
};
const ART_PAD = 368 / 300;

function Badge({ b, disc, cell, toast }) {
  const cover = b.kind === 'book' ? ((STORIES.find((s) => s.id === b.bookId) || {}).pages || [])[0]?.image || b.cover : null;
  const book = b.kind === 'book';
  const art = BADGE_ART[b.id];
  if (art) {
    // the felt badge has its name stitched on, so no label under it
    const pic = cell * 0.92;
    return (
      <Pressable onPress={() => toast(b.earned ? `${b.title}! ${b.how}` : `${b.title}: ${b.how}`)} style={{ width: cell, alignItems: 'center', marginBottom: disc * 0.06 }}
        accessibilityRole="button" accessibilityLabel={`${b.title}${b.earned ? ', earned' : ', not earned yet'}`}>
        <Image source={art[b.earned ? 0 : 1]} style={{ width: pic * ART_PAD, height: pic * ART_PAD, margin: -pic * (ART_PAD - 1) / 2, opacity: b.earned ? 1 : 0.55 }} resizeMode="contain" />
      </Pressable>
    );
  }
  return (
    <Pressable onPress={() => toast(b.earned ? `${b.title}! ${b.how}` : `${b.title}: ${b.how}`)} style={{ width: cell, alignItems: 'center', marginBottom: disc * 0.18 }}
      accessibilityRole="button" accessibilityLabel={`${b.title}${b.earned ? ', earned' : ', not earned yet'}`}>
      {/* reading badges are round; a finished book is a little square patch with its whole cover */}
      <View style={[styles.disc, { width: disc, height: disc, borderRadius: book ? disc * 0.08 : disc / 2, backgroundColor: b.earned ? b.color || '#6b6b6b' : '#c4c1bb', opacity: b.earned ? 1 : 0.6 }]}>
        {book && cover ? <Image source={cover} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        {!book ? <Text style={[styles.discMark, { fontSize: disc * (String(b.mark).length > 1 ? 0.34 : 0.42) }]}>{b.earned ? b.mark : '?'}</Text> : null}
        <View style={[styles.stitch, { borderRadius: book ? disc * 0.05 : disc / 2, margin: disc * 0.06 }]} />
      </View>
      <Text numberOfLines={2} style={[styles.badgeLabel, { width: cell - 2, fontSize: Math.max(9, Math.min(11.5, disc * 0.19)), lineHeight: Math.max(11, Math.min(14, disc * 0.23)) }, !b.earned && { color: '#777' }]}>{b.title}</Text>
    </Pressable>
  );
}

function BadgeSpread({ log, side, wide, toast }) {
  const badges = useMemo(() => (log ? allBadges(log) : []), [log]);
  const pad = side * 0.07;
  const cols = 4;
  const cell = (side - pad * 2) / cols;
  const disc = cell * 0.66;
  const count = log ? Object.keys(log.finished).length : 0;
  const streak = log ? currentStreak(log.days) : 0;
  const pick = (kind) => badges.filter((b) => b.kind === kind);
  const row = (list) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {list.map((b) => <Badge key={b.id} b={b} disc={disc} cell={cell} toast={toast} />)}
    </View>
  );
  const books = pick('book');
  return (
    <View style={[StyleSheet.absoluteFill, { flexDirection: wide ? 'row' : 'column' }]}>
      <View style={{ width: side, height: side, backgroundColor: WHITE, paddingHorizontal: pad, paddingTop: pad * 1.2, overflow: 'hidden' }}>
        <Fade edge={wide ? 'right' : 'bottom'} size={Math.round(side * 0.1)} max={0.2} />
        <Text style={[styles.boardTitle, { fontSize: Math.min(26, side * 0.075) }]}>My Badges</Text>
        <Text style={styles.boardStats}>{count === 1 ? '1 book finished' : `${count} books finished`} · {streak === 1 ? '1 day of reading' : `${streak} days in a row`}</Text>
        <View style={{ height: side * 0.05 }} />
        {row([...pick('milestone'), ...pick('streak')])}
      </View>
      <View style={{ width: side, height: side, backgroundColor: WHITE, overflow: 'hidden' }}>
        <Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.09)} max={0.13} />
        <Spine wide={wide} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: pad, paddingTop: pad * 1.1, paddingBottom: pad * 2 }}>
          {row(pick('first'))}
          <Text style={[styles.boardStats, { marginTop: side * 0.02, marginBottom: side * 0.03 }]}>{books.length ? 'Books I finished' : 'Read a book all the way to The End to earn a patch for it here.'}</Text>
          {books.length ? row(books) : null}
        </ScrollView>
      </View>
    </View>
  );
}
// ---- The drawing editor: a page to draw on with your finger, with pens, an eraser, undo and clear ----
function DrawEditor({ insets, tall, photo, strokes: start, title, onDone }) {
  const { width: winW } = useWindowDimensions();
  const [strokes, setStrokes] = useState(start || []);
  const [live, setLive] = useState(null);
  const [pen, setPen] = useState(PENS[0][0]);
  const [size, setSize] = useState(SIZES[1][1]);
  const [erase, setErase] = useState(false);
  const [area, setArea] = useState(null);
  const S = useRef({});
  S.current = { strokes, pen, size, erase };
  const toolsH = 150;
  const W = area ? Math.max(120, Math.floor(Math.min(winW - 2 * GAP, tall ? (area.h - toolsH) / 2 : area.h - toolsH))) : 0;
  const Wref = useRef(W);
  Wref.current = W;
  const cur = useRef(null);
  const at = (e) => [e.nativeEvent.locationX / Wref.current, e.nativeEvent.locationY / Wref.current];
  const rub = (x, y) => {
    const keep = S.current.strokes.filter((st) => !near(st, x, y, 0.035));
    if (keep.length !== S.current.strokes.length) setStrokes(keep);
  };
  const pad = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const [x, y] = at(e);
      if (S.current.erase) { rub(x, y); return; }
      cur.current = { c: S.current.pen, s: S.current.size, p: [+x.toFixed(4), +y.toFixed(4)] };
      setLive({ ...cur.current });
    },
    onPanResponderMove: (e) => {
      const [x, y] = at(e);
      if (S.current.erase) { rub(x, y); return; }
      const c = cur.current;
      if (!c) return;
      const n = c.p.length;
      if ((c.p[n - 2] - x) ** 2 + (c.p[n - 1] - y) ** 2 < 0.004 ** 2) return;
      c.p.push(+x.toFixed(4), +y.toFixed(4));
      setLive({ ...c, p: [...c.p] });
    },
    onPanResponderRelease: () => {
      const c = cur.current;
      cur.current = null; setLive(null);
      if (c) setStrokes((s) => [...s, c]);
    },
  })).current;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 55, backgroundColor: colors.desk }]}>
      {DESK_FELT ? <Image source={DESK_FELT} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} /> : null}
      <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 10 }}>
        <View style={styles.editorHead}><Text style={styles.editorTitle}>{title}</Text></View>
        <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {W ? (
            <>
              <View {...pad.panHandlers} style={[styles.drawPaper, { width: W, height: tall ? W * 2 : W }]}>
                {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" pointerEvents="none" /> : null}
                <StrokesView strokes={strokes} live={live} width={W} height={tall ? W * 2 : W} />
              </View>
              <View style={{ width: Math.max(W, Math.min(winW - 2 * GAP, 360)), marginTop: 14, gap: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {PENS.map(([hex, name]) => (
                    <Pressable key={hex} onPress={() => { setPen(hex); setErase(false); }} accessibilityLabel={`${name} pen`}
                      style={[styles.swatch, { backgroundColor: hex }, !erase && pen === hex && styles.swatchOn]} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {SIZES.map(([name, s]) => (
                      <Pressable key={name} onPress={() => { setSize(s); setErase(false); }} style={[styles.tool, !erase && size === s && styles.toolOn]} accessibilityLabel={`${name} pen`}>
                        <View style={{ width: 5 + s * 280, height: 5 + s * 280, borderRadius: 20, backgroundColor: colors.white }} />
                      </Pressable>
                    ))}
                    <Pressable onPress={() => setErase((x) => !x)} style={[styles.toolWide, erase && styles.toolOn]} accessibilityLabel="Eraser">
                      <Text style={styles.toolText}>Eraser</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Pressable onPress={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length} style={[styles.tool, !strokes.length && { opacity: 0.35 }]} accessibilityLabel="Undo">
                      <Text style={styles.toolText}>↶</Text>
                    </Pressable>
                    <Pressable onPress={() => setStrokes([])} disabled={!strokes.length} style={[styles.toolWide, !strokes.length && { opacity: 0.35 }]} accessibilityLabel="Clear the drawing">
                      <Text style={styles.toolText}>Clear</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </View>
        <View style={{ width: winW - 2 * GAP, alignItems: 'flex-end' }}>
          <Pressable onPress={() => onDone(strokes)} hitSlop={8} accessibilityRole="button" style={[styles.donePill, { marginBottom: 0 }]}><Text style={styles.pillText}>Done</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.desk },
  coverShadow: { backgroundColor: '#7c5438', shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
  bookShadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  page: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  art: { backgroundColor: '#808080', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  plus: { color: '#6b6b6b', fontWeight: '200', fontFamily: fonts.ui },
  addImage: { color: '#4a4a4a', fontWeight: '700', fontSize: 20, fontFamily: fonts.ui, marginTop: 2 },
  addSub: { color: '#6b6b6b', fontSize: 15, fontFamily: fonts.ui, marginTop: 2 },
  hint: { position: 'absolute', color: '#7a7a7a', fontFamily: TYPE, fontSize: 20 },
  textBox: { justifyContent: 'center' },
  notes: { fontFamily: TYPE, fontSize: 17, lineHeight: 27, color: colors.ink },
  back: { position: 'absolute', left: 6, bottom: 6, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center', zIndex: 6 },
  backText: { color: '#3a3a3a', fontSize: 28, lineHeight: 30, fontWeight: '300', marginTop: -3 },
  title: { color: colors.white, fontFamily: 'EBGaramond_700Bold', fontSize: 17 },
  sub: { color: colors.muted, fontFamily: fonts.ui, fontSize: 12, marginTop: 2 },
  btn: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15, paddingHorizontal: 3 },
  finish: { backgroundColor: colors.green, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, overflow: 'hidden' },
  boardTitle: { fontFamily: TYPE, fontSize: 26, color: colors.ink, textAlign: 'center' },
  boardStats: { fontFamily: TYPE, fontSize: 13, color: '#4a4a4a', textAlign: 'center', marginTop: 6 },
  boardHint: { fontFamily: TYPE, fontSize: 14, color: '#555', textAlign: 'center', marginTop: 4, lineHeight: 20 },
  disc: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 1, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  discMark: { color: colors.white, fontFamily: TYPE, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  stitch: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.75)' },
  badgeLabel: { fontFamily: TYPE, fontSize: 11.5, lineHeight: 14, color: colors.ink, textAlign: 'center', marginTop: 6 },
  prow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#2a2a2a', padding: 12, borderWidth: 2, borderColor: 'transparent' },
  thumb: { width: 64, height: 64, backgroundColor: '#666', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbNum: { color: colors.white, fontWeight: '700', fontFamily: fonts.ui, fontSize: 22 },
  prowTitle: { color: colors.white, fontWeight: '700', fontSize: 17, fontFamily: fonts.ui },
  prowSub: { color: '#bbb', fontSize: 14, fontWeight: '400', fontFamily: fonts.ui },
  pbtn: { width: 36, height: 36, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  pbtnText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  stackPill: { width: 200, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  choiceBack: { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 30 },
  choice: { width: '100%', maxWidth: 380, backgroundColor: colors.panel, paddingHorizontal: 26, paddingTop: 30, paddingBottom: 32, gap: 14 },
  choiceTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, marginBottom: 8 },
  choiceHint: { color: '#a8a8a8', fontFamily: fonts.ui, fontSize: 13, marginTop: -6, marginLeft: 6 },
  choiceBtn: { backgroundColor: colors.tile, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  choiceBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  editorHead: { width: '100%', paddingHorizontal: 30, paddingBottom: 12 },
  editorTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 18 },
  editorPage: { flex: 1, marginBottom: 14, backgroundColor: colors.paper, padding: 24, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
  editorInput: { flex: 1, fontFamily: TYPE, fontSize: 20, lineHeight: 32, color: colors.ink, textAlignVertical: 'top', padding: 0 },
  donePill: { backgroundColor: colors.green, height: 40, borderRadius: 20, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  drawPaper: { backgroundColor: WHITE, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  swatchOn: { borderColor: colors.white, borderWidth: 3, transform: [{ scale: 1.15 }] },
  tool: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#5f5f5f', alignItems: 'center', justifyContent: 'center' },
  toolWide: { height: 38, borderRadius: 19, paddingHorizontal: 11, backgroundColor: '#5f5f5f', alignItems: 'center', justifyContent: 'center' },
  toolOn: { backgroundColor: colors.green },
  toolText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
});
