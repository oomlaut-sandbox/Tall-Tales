// My Notebook: always first in My Library. A book editor of its own (built like Create a Story),
// shaped like the leather notebook on the start page:
//   - spread 1: the inside of the hard leather cover (top) and a white title page, "My Notes" (bottom)
//   - spread 2: the badge board, over two white pages
//   - then the child's pages: notes pages (a photo or a drawing, and typed notes) and sketch pages (two square pages to draw on)
// Opened from My Library, the little notebook grows into place and its cover swings open like the one on
// the start page. After that the white pages turn with the paper peel, like the books.
// Everything saves on its own. Turn pages with the dog-ear or by swiping; "Pages" lists them all.
import { useT } from '../i18n';
import StripCover from '../components/StripCover';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, fonts } from '../theme';
import { Bar, Burger, DogEar, Panel } from '../components/Chrome';
import { Fade } from '../components/PageView';
import { Spine, bookLayout } from '../components/BookFrame';
import { DESK_FELT, DeskFelt, Felt, DESK_BG } from '../look';
import ParentGate from '../components/ParentGate';
import { StrokesView } from '../components/Strokes';
import { EarArt } from '../components/Ear';
import { FlapPeel, snapshot, supportsCurl } from '../components/Curl';
import { BRUSHES, PENS, SHAPES, SIZES, makeFill, near, shapePts } from '../strokes';
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
const NOTEBOOK_COVER_WIDE = require('../../assets/leather-cover-wide.jpg'); // the same leather, turned so the plain edge is on the left
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
  const t = useT();
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
  const geoRef = useRef({ side, wide });
  geoRef.current = { side, wide };
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
  // (made once, so redraws never swap them for new ones and nothing blinks)
  const fade = useRef({
    out: fly.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }),
    in: fly.interpolate({ inputRange: [0.2, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
  }).current;
  // waits until the book has settled into its final size and place, then runs both steps on the native
  // driver (moves and scales only, so it stays smooth); the closed cover is only taken away a moment
  // after the real page is showing underneath it, so nothing blinks
  useEffect(() => {
    if (!intro || introStarted.current || !bookAt || !nb) return undefined;
    // right away and quick: the notebook grows into place, then its cover opens
    const t = setTimeout(() => {
      introStarted.current = true;
      // the cover reaches its full size first, and only then starts to open: the page underneath only shows
      // once the cover is exactly its size (opening early let the page stick out past a still-growing cover)
      Animated.timing(fly, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
        setIntro('flip');
        playSound('coverOpen');
        Animated.timing(swing, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
          setIntro('land');
          setTimeout(() => setIntro(null), 90);
        });
      });
    }, 0);
    return () => clearTimeout(t);
  }, [intro, bookAt, nb]);
  const opening = intro === 'fly' || intro === 'flip';
  const introRef = useRef(intro);
  introRef.current = intro; // the real notebook stays hidden under the flying cover

  // ---- turning pages: the paper peel on the phone (upright), a plain switch otherwise ----
  const refs = { cur: useRef(null), prev: useRef(null), next: useRef(null) };
  const [flipPair, setFlipPair] = useState(null); // { a, b, dir } while a page turns
  const [peel, setPeel] = useState(null); // { front, back } pictures
  const [peelLive, setPeelLive] = useState(false);
  const [landed, setLanded] = useState(false); // the turned page has landed (the peel is about to be taken away) // the peel has drawn: the page underneath can switch
  const prog = useRef(0);
  const busy = useRef(false);
  const st = useRef({});
  st.current = { i, total };
  const usePeel = supportsCurl; // upright and sideways, like the books
  const setProgress = (p) => { prog.current = p; peelSubs.forEach((f) => f(p)); };
  // Turning a page has three parts: get the peel ready (pictures of the pages), move it (by itself, or
  // following a finger), and finish (keep the new page, or let it fall back).
  const ease3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const prepare = async (dir) => {
    const { i: at, total: n } = st.current;
    const to = at + dir;
    if (busy.current || intro || to < 0 || to >= n) return null;
    busy.current = true;
    if (!usePeel || !peelWorks.ok || !bookAt) return { dir, to, plain: true };
    const a = dir > 0 ? at : at - 1;
    const fa = await snapshot(dir > 0 ? refs.cur : refs.prev);
    const fb = await snapshot(dir > 0 ? refs.next : refs.cur);
    if (!fa || !fb) return { dir, to, plain: true };
    setPeel({ front: fa, back: fb });
    setProgress(dir > 0 ? 0 : 1);
    setPeelLive(false);
    setFlipPair({ a, b: a + 1, dir });
    // the page as it is stays on top for a few frames, until the paper peel has drawn itself (no flash)
    await new Promise((r) => setTimeout(r, 90));
    setPeelLive(true);
    await new Promise((r) => requestAnimationFrame(() => r()));
    return { dir, to, plain: false };
  };
  const finish = (t, commit) => {
    if (t.plain) { if (commit) setI(t.to); busy.current = false; return; }
    const target = commit === (t.dir > 0) ? 1 : 0;
    const startP = prog.current, t0 = Date.now(), ms = Math.max(200, 900 * Math.abs(target - startP));
    const step = () => {
      const x = Math.min(1, (Date.now() - t0) / ms);
      setProgress(startP + (target - startP) * ease3(x));
      if (x < 1) requestAnimationFrame(step);
      else {
        if (commit) setI(t.to);
        setLanded(true);
        setTimeout(() => { setFlipPair(null); setPeel(null); setLanded(false); busy.current = false; }, 40);
      }
    };
    requestAnimationFrame(step);
  };
  const turn = async (dir) => {
    const t = await prepare(dir);
    if (!t) return;
    playSound('swish');
    finish(t, true);
  };
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const next = () => { if (i >= total - 1) setNewAsk(true); else turn(1); };

  const addPage = (kind) => {
    setNewAsk(false); setPagesOpen(false);
    if (pages.length >= MAX_PAGES) return toast(t('Your notebook is full ({n} pages). Delete a page to make room.', { n: MAX_PAGES }));
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
    toast(t('Page deleted.'));
  };

  // a photo for the picture square (from the phone, or the camera after the grown-up check)
  const choosePhoto = async (source) => {
    try {
      const opts = { mediaTypes: 'images', quality: 0.9, allowsEditing: true, aspect: [1, 1] };
      let r;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return toast(t('Oomlaut Reader isn’t allowed to use the camera. You can turn it on in Settings.'));
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
      toast(source === 'camera' ? t('Couldn’t open the camera.') : t('Couldn’t open your photos. Check that Oomlaut Reader is allowed to use Photos in Settings.'));
    }
  };

  // Swiping turns the page, and the paper follows the finger (like the books): up (or to the left when
  // sideways) for the next page, down (or to the right) to go back. Let go past halfway, or with a flick,
  // and the page turns; otherwise it falls back. Taps still go to the squares.
  const drag = useRef({});
  // A flick turns the page the same way a corner tap does (the page doesn't follow the finger): a quick swipe
  // left or up for the next page, right or down to go back. Taps still go to the squares and the corners.
  const flickTo = useRef(null);
  flickTo.current = (dir) => { if (dir > 0) next(); else if (i > 0) turn(-1); };
  const flick = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => !busy.current && !introRef.current && (Math.abs(g.dx) > 14 || Math.abs(g.dy) > 14),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => {
      const vert = Math.abs(g.dy) >= Math.abs(g.dx);
      const d = vert ? g.dy : g.dx, v = vert ? g.vy : g.vx;
      if (Math.abs(d) > 40 || Math.abs(v) > 0.4) flickTo.current(d < 0 ? 1 : -1);
    },
  })).current;
  const swipe = useRef(PanResponder.create({
    // takes the touch from the squares as soon as it turns into a swipe (a tap still goes to them)
    onMoveShouldSetPanResponderCapture: (_, g) => !busy.current && !introRef.current && (Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10),
    onMoveShouldSetPanResponder: (_, g) => !busy.current && Math.abs(g.dx) + Math.abs(g.dy) > 12,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (_, g) => {
      const vert = Math.abs(g.dy) >= Math.abs(g.dx);
      const dir = (vert ? g.dy : g.dx) < 0 ? 1 : -1;
      const d = { vert, dir, p: dir > 0 ? 0 : 1, t: null, ended: null };
      drag.current = d;
      prepareRef.current(dir).then((t) => {
        if (!t) { drag.current = {}; return; }
        d.t = t;
        if (d.ended) endSwipeRef.current(d, d.ended); else if (!t.plain) setProgress(d.p);
      });
    },
    onPanResponderMove: (_, g) => {
      const d = drag.current;
      if (!d.dir) return;
      const { side: sd, wide: w } = geoRef.current;
      const amount = d.vert ? -g.dy / (sd * 1.1) : -g.dx / (sd * (w ? 0.85 : 0.8));
      d.p = d.dir > 0 ? Math.max(0, Math.min(1, amount)) : 1 - Math.max(0, Math.min(1, -amount));
      if (d.t && !d.t.plain) setProgress(d.p);
    },
    onPanResponderRelease: (_, g) => { const d = drag.current; drag.current = {}; if (d.dir) endSwipeRef.current(d, g); },
    onPanResponderTerminate: (_, g) => { const d = drag.current; drag.current = {}; if (d.dir) endSwipeRef.current(d, g); },
  })).current;
  const endSwipe = (d, g) => {
    if (!d.t) { d.ended = { vx: g.vx, vy: g.vy, dx: g.dx, dy: g.dy }; return; }
    const v = d.vert ? g.vy : g.vx;
    const moved = d.t.plain ? Math.abs(d.vert ? g.dy : g.dx) > 40 : null;
    const commit = d.t.plain ? moved : d.dir > 0 ? d.p > 0.4 || v < -0.35 : d.p < 0.6 || v > 0.35;
    if (commit) playSound('swish');
    finish(d.t, commit);
  };
  // the swipe handler is made once, so it always calls the latest versions of these
  const prepareRef = useRef(prepare); prepareRef.current = prepare;
  const endSwipeRef = useRef(endSwipe); endSwipeRef.current = endSwipe;

  // ---- one spread of the notebook (k: its number). live: the one you're looking at (it takes taps) ----
  const spread = (k, live) => {
    if (k === COVER_SPREAD) {
      return (
        <View style={[StyleSheet.absoluteFill, { flexDirection: wide ? 'row' : 'column' }]}>
          {/* the inside of the hard cover: the leather, turned over, with the deep spine shadow */}
          <View style={{ width: side, height: side, overflow: 'hidden', opacity: live && opening ? 0 : 1 }}>
            {/* sideways the plain (unstitched) edge of the leather runs along the spine, on the right */}
            <Image source={wide ? NOTEBOOK_COVER_WIDE : NOTEBOOK_COVER} resizeMode="cover" style={{ width: side, height: side, transform: wide ? [{ scaleX: -1 }] : [{ scaleY: -1 }] }} />
            <Fade edge={wide ? 'right' : 'bottom'} size={Math.round(side * 0.24)} max={0.55} />
          </View>
          {/* the first white page, with the notebook's title */}
          <View style={{ width: side, height: side, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' }}>
            <Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.17)} max={0.32} />
            <Spine wide={wide} />
            <Text style={{ fontFamily: TYPE, fontSize: side * 0.068, color: '#2b2b2b' }}>{t('My Notes')}</Text>
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
          accessibilityRole="button" accessibilityLabel={which === 'top' ? t('Draw on the top page') : t('Draw on the bottom page')}>
          <StrokesView strokes={strokes} width={side} height={side} />
          <Fade edge={edge} size={Math.round(side * 0.09)} max={0.15} />
          {spine ? <Spine wide={wide} /> : null}
          {!strokes.length ? <Text style={styles.hint}>{t('Tap to draw')}</Text> : null}
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
        <Pressable disabled={!live} onPress={() => setPicAsk(true)} style={[styles.art, { width: side, height: side }]} accessibilityRole="button" accessibilityLabel={pg.uri || pg.strokes.length ? t('Change the picture') : t('Add a picture or a drawing')}>
          {pg.uri ? <Image source={{ uri: pg.uri }} style={styles.fill} resizeMode="cover" /> : <View style={[styles.fill, { backgroundColor: WHITE }]} />}
          <StrokesView strokes={pg.strokes} width={side} height={side} />
          {!pg.uri && !pg.strokes.length ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.plus, { fontSize: u * 24, lineHeight: u * 24 }]}>+</Text>
              <Text style={styles.addImage}>{t('Add a picture')}</Text>
              <Text style={styles.addSub}>{t('or a drawing')}</Text>
            </View>
          ) : null}
          <Fade edge={wide ? 'right' : 'bottom'} size={Math.round(side * 0.1)} max={0.22} />
        </Pressable>
        <Pressable disabled={!live} onPress={() => setWriting(true)} style={[styles.textBox, { width: side, height: side, paddingHorizontal: side * 0.09, paddingVertical: side * 0.07, backgroundColor: WHITE }]} accessibilityRole="button" accessibilityLabel={t('Notes for this page')}>
          <Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.09)} max={0.13} />
          <Spine wide={wide} />
          <Lines side={side} />
          <Text style={[styles.notes, !pg.text && { color: '#777', textAlign: 'center' }]} numberOfLines={9}>
            {pg.text || t('Add new note')}
          </Text>
        </Pressable>
      </View>
    );
  };

  const header = i === COVER_SPREAD ? t('My Notes') : i === BADGES ? t('Badges') : page && page.kind === 'sketch' ? t('Sketch') : t('Notes');
  const barTitle = (
    <View style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
      <Text numberOfLines={1} style={styles.title}>{t('My Notebook')}</Text>
      <Text numberOfLines={1} style={styles.sub}>{header} · {t('{a} of {b}', { a: i + 1, b: total })} · {saved ? t('Saved') : t('Saving…')}</Text>
    </View>
  );
  const barBtns = (vertical) => (
    <View style={vertical ? { alignItems: 'center', gap: 18, marginBottom: 26 } : { flexDirection: 'row', alignItems: 'center', gap: 14 }}>{/* sideways: lifted up from the corner */}
      <Pressable onPress={() => setPagesOpen(true)} hitSlop={8} accessibilityRole="button"><Text style={styles.btn}>{t('Pages')}</Text></Pressable>
      <Pressable onPress={async () => { clearTimeout(timer.current); if (latest.current) await saveNotebook(latest.current); onDone(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Close the notebook')}>
        <View style={styles.finish}><Text style={styles.btn}>{t('Done')}</Text></View>
      </Pressable>
    </View>
  );

  // the closed cover, flying in from the shelf and then swinging open (drawn over everything)
  let introEl = null;
  if (intro && from) {
    // One view, placed exactly over the little notebook on the shelf from the very first frame. It only
    // moves and grows (translate and scale) towards the spot where the cover opens; until that spot is
    // known it doesn't move at all, so nothing jumps or blinks.
    const S0 = from.w;
    const to = bookAt ? (wide ? { x: bookAt.x + side, y: bookAt.y } : { x: bookAt.x, y: bookAt.y + side }) : null;
    const k = to ? side / S0 : 1;
    const dx = to ? to.x + side / 2 - (from.x + S0 / 2) : 0, dy = to ? to.y + side / 2 - (from.y + S0 / 2) : 0;
    const round = wide
      ? { borderTopLeftRadius: S0 * R_SPINE, borderBottomLeftRadius: S0 * R_SPINE, borderTopRightRadius: S0 * R_EDGE, borderBottomRightRadius: S0 * R_EDGE }
      : { borderTopLeftRadius: S0 * R_SPINE, borderTopRightRadius: S0 * R_SPINE, borderBottomLeftRadius: S0 * R_EDGE, borderBottomRightRadius: S0 * R_EDGE };
    introEl = (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 45 }]}>
        <Animated.View style={{ position: 'absolute', left: from.x, top: from.y, width: S0, height: S0,
          transform: [{ translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }, { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [1, k] }) }] }}>
          {/* the shelf notebook's own shadow, still (never on the turning cover: that flickers), fading as it grows */}
          <Animated.View style={[StyleSheet.absoluteFill, round, { backgroundColor: '#7c5438', shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.45, shadowRadius: 8, opacity: fade.out }]} />
          {/* the cover: the strip method from the Cover test (flat strips, no 3D, always solid) */}
          <StripCover p={swing} side={S0} wide={wide} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
    );
  }

  // the book's layers: normally the spread you're on (with the ones either side ready underneath for the
  // peel); while a page turns, the next spread with the top of the turning one over it
  const layers = [];
  const abs = (k, key, ref, live) => (
    <View key={key} ref={ref} collapsable={false} pointerEvents={live ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, shape, { overflow: 'hidden', backgroundColor: live && opening ? 'transparent' : colors.paper }]}>{spread(k, live)}</View>
  );
  if (flipPair && peel) {
    const { a, b } = flipPair;
    // the same keys as before the turn, so nothing is redrawn from scratch (no flash)
    layers.push(abs(b, `p${b}`, null, false));
    if (peelLive) {
      layers.push(
        <View key={`t${a}`} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: side, height: side, overflow: 'hidden', ...(wide ? { borderTopLeftRadius: R, borderBottomLeftRadius: R } : { borderTopLeftRadius: R, borderTopRightRadius: R }) }}>
          <View style={{ width: bookW, height: bookH }}>{spread(a, false)}</View>
        </View>,
      );
    } else if (b !== i) {
      layers.push(abs(i, `p${i}`, null, false)); // the page as it was stays on top until the peel has drawn
    }
  } else {
    // (not while the cover is opening: the felt shows through where the cover will land)
    if (usePeel && !opening && i > 0) layers.push(abs(i - 1, `p${i - 1}`, refs.prev, false));
    if (usePeel && !opening && i < total - 1) layers.push(abs(i + 1, `p${i + 1}`, refs.next, false));
    layers.push(abs(i, `p${i}`, refs.cur, true));
  }

  const corner = Math.max(70, Math.round(side * 0.24)); // the invisible corner spots that turn the page: big and easy to hit
  return (
    <View style={[styles.screen, wide && { flexDirection: 'row' }]}>
      <View style={wide ? { width: BL.leftW, backgroundColor: colors.bar } : { height: insets.top + spare / 2, backgroundColor: colors.bar }} />
      <View style={styles.desk} onLayout={(e) => { setDesk({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }); measureBook(); }}>
        <DeskFelt spot="notebook1" />
        {nb ? (
          <View ref={bookRef} collapsable={false} onLayout={measureBook} {...flick.panHandlers}
            style={[styles.bookShadow, shape, { width: bookW, height: bookH }, opening ? { backgroundColor: 'transparent', shadowOpacity: 0 } : null]}>
            {/* While it opens, the book's shadow is a still felt-coloured shape underneath that grows in with the
                flying cover; in the same frame it goes, the book's own shadow comes on, so it never flares. */}
            {opening ? (
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shape, { backgroundColor: DESK_FELT ? '#262626' : DESK_BG, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, opacity: fade.in }]}>
                <View style={[StyleSheet.absoluteFill, shape, { overflow: 'hidden' }]}><DeskFelt spot="notebookPlate" /></View>
              </Animated.View>
            ) : null}
            <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { opacity: intro === 'fly' ? 0 : 1 }]}>{layers}</View>
            {/* the corner spots: there until the paper starts to lift, back as soon as the page lands */}
            {!(flipPair && peelLive && !landed) && !intro ? (
              <>
                {/* no folded corner: the bottom-right corner is an invisible spot that turns to the next page */}
                <Pressable onPress={next} accessibilityRole="button" accessibilityLabel={i >= total - 1 ? t('Add a page') : t('Next page')}
                  style={{ position: 'absolute', right: 0, bottom: 0, width: corner, height: corner, zIndex: 20 }} />
                {/* the bottom-left corner turns back a page (an invisible spot, like the folded corner on the right) */}
                {i > 0 ? <Pressable onPress={() => turn(-1)} accessibilityRole="button" accessibilityLabel={t('Previous page')}
                  style={{ position: 'absolute', left: 0, bottom: 0, width: corner, height: corner, zIndex: 20 }} /> : null}
                {/* (no back button: swipe down or to the right to go back a page) */}
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
          {wide ? (
            // sideways: the right page peels from its bottom-right corner over the spine (as in the books)
            <PeelGuard><PeelLayer start={prog.current} matte round={R} sideways width={bookH} height={bookW} artH={bookH} corner="left" front={peel.front} back={peel.back}
              ox={bookAt.x} oy={bookAt.y} canvasW={winW} canvasH={winH} /></PeelGuard>
          ) : (
            <PeelGuard><PeelLayer start={prog.current} matte round={R} width={bookW} height={bookH} artH={side} corner="right" front={peel.front} back={peel.back}
              ox={bookAt.x} oy={bookAt.y} canvasW={winW} canvasH={winH} /></PeelGuard>
          )}
        </View>
      ) : null}
      {introEl}
      <Panel open={pagesOpen} side="right" title={t('Pages')} portraitWidth="94%" bottom={wide ? 0 : u * 17 + insets.bottom} inset={wide ? BL.rightW : 0} onClose={() => setPagesOpen(false)}>
        {/* new pages first, side by side, above the list */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
          <Pressable onPress={() => addPage('note')} style={[styles.halfPill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('New notes page')}</Text></Pressable>
          <Pressable onPress={() => addPage('sketch')} style={[styles.halfPill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('New sketch page')}</Text></Pressable>
        </View>
        <ScrollView style={{ maxHeight: Math.max(340, winH * 0.5) }} contentContainerStyle={{ gap: 14, paddingBottom: 6 }}>
          <Pressable onPress={() => { setI(BADGES); setPagesOpen(false); }} style={[styles.prow, i === BADGES && { borderColor: colors.green }]}>
            <View style={[styles.thumb, { backgroundColor: '#c9a227' }]}><Text style={styles.thumbNum}>★</Text></View>
            <View style={{ flex: 1, justifyContent: 'center', height: 64 }}><Text style={styles.prowTitle}>{t('Badges')}<Text style={styles.prowSub}>{'  ·  '}{t('Page {n}', { n: 2 })}</Text></Text></View>
          </Pressable>
          {pages.map((p, k) => (
            <View key={p.pid} style={[styles.prow, i === k + FIRST_PAGE && { borderColor: colors.green }]}>
              <Pressable onPress={() => { setI(k + FIRST_PAGE); setPagesOpen(false); }} style={[styles.thumb, { backgroundColor: WHITE }]} accessibilityLabel={t('Go to page {n}', { n: k + 3 })}>
                {p.uri ? <Image source={{ uri: p.uri }} style={styles.fill} resizeMode="cover" /> : null}
                <StrokesView strokes={p.strokes} width={64} height={64} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0, height: 64, justifyContent: 'space-between' }}>
                <Pressable onPress={() => { setI(k + FIRST_PAGE); setPagesOpen(false); }}>
                  <Text numberOfLines={1} style={styles.prowTitle}>{p.kind === 'sketch' ? t('Sketch') : t('Notes')}<Text style={styles.prowSub}>{'  ·  '}{t('Page {n}', { n: k + 3 })}{p.text.trim() ? `  ·  ${p.text.trim()}` : ''}</Text></Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => move(k, -1)} disabled={k === 0} hitSlop={6} style={[styles.pbtn, k === 0 && { opacity: 0.3 }]} accessibilityLabel={t('Move up')}><Text style={styles.pbtnText}>↑</Text></Pressable>
                  <Pressable onPress={() => move(k, 1)} disabled={k === pages.length - 1} hitSlop={6} style={[styles.pbtn, k === pages.length - 1 && { opacity: 0.3 }]} accessibilityLabel={t('Move down')}><Text style={styles.pbtnText}>↓</Text></Pressable>
                  <Pressable onPress={() => removePage(k)} hitSlop={6} style={styles.pbtn} accessibilityLabel={t('Delete page')}><Text style={styles.pbtnText}>✕</Text></Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </Panel>

      {newAsk ? (
        <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>{t('Add a new page')}</Text>
            <Pressable onPress={() => addPage('note')} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{t('Notes page')}</Text></Pressable>
            <Pressable onPress={() => addPage('sketch')} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{t('Sketch page')}</Text></Pressable>
            <Pressable onPress={() => setNewAsk(false)} style={[styles.choiceBtn, { marginTop: 8 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>{t('Cancel')}</Text></Pressable>
          </View>
        </View>
      ) : null}

      {picAsk && page ? (
        <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>{page.uri || page.strokes.length ? t('Change the picture') : t('Add a picture')}</Text>
            <Pressable onPress={() => { setPicAsk(false); setDrawing('top'); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{page.uri ? t('Draw on the photo') : page.strokes.length ? t('Keep drawing') : t('Make a drawing')}</Text></Pressable>
            <Pressable onPress={() => { setPicAsk(false); choosePhoto('library'); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{t('Choose a photo')}</Text></Pressable>
            <Pressable onPress={() => { setPicAsk(false); setCamGate(true); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{t('Take a photo')}</Text></Pressable>
            {page.uri ? <Pressable onPress={() => { setPicAsk(false); dropNotebookPicture(page.uri); update({ uri: null, w: 1, h: 1 }); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{t('Remove the photo')}</Text></Pressable> : null}
            <Pressable onPress={() => setPicAsk(false)} style={[styles.choiceBtn, { marginTop: 8 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>{t('Cancel')}</Text></Pressable>
          </View>
        </View>
      ) : null}
      <ParentGate visible={camGate} reason={t('Taking a photo opens the camera.')} onPass={() => { setCamGate(false); setTimeout(() => choosePhoto('camera'), 250); }} onCancel={() => setCamGate(false)} />

      {writing && page ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.desk }]}>
            <DeskFelt spot="notebook2" overlay />
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 34 }}>
            <View style={styles.editorHead}><Text style={styles.editorTitle}>{t('My notes · Page {n}', { n: i + 1 })}</Text></View>
            <View style={[styles.editorPage, { width: winW - 2 * GAP, maxHeight: winW - 2 * GAP }]}>
              <TextInput value={page.text} onChangeText={(text) => { if (text.length > (page.text || '').length) playKey(); update({ text }); }}
                placeholder={t('Write anything: what you read, what you saw today, a story idea…')} placeholderTextColor="#666"
                multiline autoFocus style={[styles.editorInput, { outlineWidth: 0 }]} accessibilityLabel={t('Notes')} />
            </View>
            <View style={{ width: winW - 2 * GAP, alignItems: 'flex-end' }}>
              <Pressable onPress={() => setWriting(false)} hitSlop={8} accessibilityRole="button" style={styles.donePill}><Text style={styles.pillText}>{t('Done')}</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {drawing && page ? (
        <DrawEditor insets={insets} photo={page.kind === 'sketch' ? null : page.uri} strokes={drawing === 'bottom' ? page.strokes2 || [] : page.strokes}
          title={page.kind === 'sketch' ? t('Sketch · Page {n}', { n: i + 1 }) : t('Drawing · Page {n}', { n: i + 1 })}
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

// A badge, pinned on the page at a slight angle. d: its size.
function Badge({ b, d, toast }) {
  const t = useT();
  const art = BADGE_ART[b.id];
  const title = t(b.title), how = t(b.how);
  // its name and how it's earned, written under the badges (no speech bubble)
  const say = () => toast(b.earned ? `${title}! ${how}` : `${title}: ${how}`);
  const label = `${title}${b.earned ? t(', earned') : t(', not earned yet')}`;
  if (art) {
    // the felt badge has its name stitched on (and its shadow drawn in)
    return (
      <Pressable onPress={say} accessibilityRole="button" accessibilityLabel={label} style={{ width: d, height: d }}>
        <Image source={art[b.earned ? 0 : 1]} style={{ width: d * ART_PAD, height: d * ART_PAD, margin: -d * (ART_PAD - 1) / 2, opacity: b.earned ? 1 : 0.55 }} resizeMode="contain" />
      </Pressable>
    );
  }
  // a finished book: a little square patch with its whole cover
  const cover = ((STORIES.find((s) => s.id === b.bookId) || {}).pages || [])[0]?.image || b.cover;
  const p = d * 0.8;
  return (
    <Pressable onPress={say} accessibilityRole="button" accessibilityLabel={label} style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.disc, { width: p, height: p, borderRadius: p * 0.08, backgroundColor: '#8a8a8a' }]}>
        {cover ? <Image source={cover} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={[styles.stitch, { borderRadius: p * 0.05, margin: p * 0.06 }]} />
      </View>
    </Pressable>
  );
}

// a little random number generator that always gives the same numbers for the same seed (so the
// badges stay where they are each time the notebook opens)
function seeded(str) {
  let h = 2166136261;
  for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

// Lay the badges out in neat, evenly spaced rows inside the free part of a square page (3 across).
function scatter(items, side, region, seed, maxD) {
  const n = Math.max(1, items.length);
  const { x: rx, y: ry, w: rw, h: rh } = region;
  const cols = Math.min(3, n), rows = Math.ceil(n / cols);
  const cw = rw / cols, ch = rh / rows;
  const d = Math.min(maxD || side * 0.26, side * 0.26, Math.min(cw, ch) * 0.8);
  const placed = items.map((it, k) => {
    const r = Math.floor(k / cols), c = k % cols;
    const inRow = Math.min(cols, n - r * cols); // a shorter last row is centred
    const off = (cols - inRow) * cw / 2;
    return { x: rx + off + c * cw + (cw - d) / 2, y: ry + r * ch + (ch - d) / 2, it, turn: 0 };
  });
  return { d, placed };
}

// ---- The badge spread: the second spread of the notebook, over two white pages ----
// Top page: the title and how much has been read, with the milestones and the streaks scattered around it.
// Bottom page: the firsts and a patch for every book finished, scattered too.
function BadgeSpread({ log, side, wide, toast }) {
  const t = useT();
  const [note, setNote] = useState(null); // the tapped badge's words, shown under the second set of badges
  const badges = useMemo(() => (log ? allBadges(log) : []), [log]);
  const count = log ? Object.keys(log.finished).length : 0;
  const streak = log ? currentStreak(log.days) : 0;
  const books = badges.filter((b) => b.kind === 'book');
  // six on each page: the reading milestones and the first streak on top; two streaks and the firsts below
  const ordered = badges.filter((b) => b.kind === 'milestone' || b.kind === 'streak');
  const topItems = ordered.slice(0, ordered.length - 2);
  const bottomItems = [...ordered.slice(ordered.length - 2), ...badges.filter((b) => b.kind === 'first')];
  // the words get room of their own
  const titleBox = { x: side * 0.12, y: side * 0.05, w: side * 0.76, h: side * 0.2 };
  const hintBox = { x: side * 0.18, y: side * 0.78, w: side * 0.64, h: side * 0.16 };
  const m = side * 0.04;
  const top = useMemo(() => scatter(topItems, side, { x: m, y: side * 0.3, w: side - 2 * m, h: side * 0.58 }, 'top'), [side, topItems.map((b) => b.id + b.earned).join()]);
  const bottom = useMemo(() => scatter(bottomItems, side, { x: m, y: side * 0.14, w: side - 2 * m, h: side * 0.58 }, 'bottom', top.d) /* clear of the spine, the same rows as on top */ /* the same size as the top page's */, [side, bottomItems.map((b) => b.id + b.earned).join()]);
  const pinned = ({ d, placed }) => placed.map(({ x, y, turn, it }) => (
    <View key={it.id} style={{ position: 'absolute', left: x, top: y, transform: [{ rotate: `${turn.toFixed(1)}deg` }] }}>
      <Badge b={it} d={d} toast={setNote} />
    </View>
  ));
  return (
    <View style={[StyleSheet.absoluteFill, { flexDirection: wide ? 'row' : 'column' }]}>
      <View style={{ width: side, height: side, backgroundColor: WHITE, overflow: 'hidden' }}>
        <Fade edge={wide ? 'right' : 'bottom'} size={Math.round(side * 0.1)} max={0.2} />
        <View style={{ position: 'absolute', left: titleBox.x, top: titleBox.y, width: titleBox.w, height: titleBox.h, justifyContent: 'center' }}>
          <Text style={[styles.boardTitle, { fontSize: Math.min(22, side * 0.064) }]}>{t('My Badges')}</Text>
          <Text style={[styles.boardStats, { marginTop: 10 }]}>{count === 1 ? t('1 book finished') : t('{n} books finished', { n: count })} · {streak === 1 ? t('1 day of reading') : t('{n} days in a row', { n: streak })}</Text>
        </View>
        {pinned(top)}
      </View>
      <View style={{ width: side, height: side, backgroundColor: WHITE, overflow: 'hidden' }}>
        <Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.09)} max={0.13} />
        <Spine wide={wide} />
        {pinned(bottom)}
        {/* the tapped badge: its name and how to earn it, in the small typewriter writing */}
        {note ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: hintBox.x, top: hintBox.y, width: hintBox.w, height: hintBox.h, justifyContent: 'center' }}>
            <Text style={[styles.boardStats, { marginTop: 0, lineHeight: 18 }]}>{note}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
// The notebook's own dog-ear: its pages have rounded corners, so the folded corner is rounded too.
// The flap (the page folded back) keeps the page's rounded corner, pointing up into the page; under it, the
// next page shows, also with a rounded corner (the felt shows outside it).
function RoundEar({ size: e, radius: R, onPress, label }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={10}
      style={{ position: 'absolute', right: 0, bottom: 0, width: e + 16, height: e + 16, zIndex: 20, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
      <EarArt e={e} r={R} under={colors.earUnder} flap="#fbfaf7" />
    </Pressable>
  );
}

// Undo: a simple arrow that loops back, drawn in the same thick white line as the app's other icons
// a simple paint roller: the roller on top, its frame bending down to the handle
function BucketIcon() {
  const w = colors.white;
  return (
    <View style={{ width: 24, height: 24 }}>
      <View style={{ position: 'absolute', left: 1, top: 2, width: 17, height: 7, borderRadius: 2.5, backgroundColor: w }} />
      <View style={{ position: 'absolute', left: 18, top: 4.5, width: 4, height: 2, backgroundColor: w }} />
      <View style={{ position: 'absolute', left: 20, top: 4.5, width: 2, height: 8, backgroundColor: w }} />
      <View style={{ position: 'absolute', left: 10, top: 11, width: 12, height: 2, backgroundColor: w }} />
      <View style={{ position: 'absolute', left: 9, top: 12, width: 4, height: 11, borderRadius: 2, backgroundColor: w }} />
    </View>
  );
}

function UndoIcon() {
  return (
    <View style={{ width: 22, height: 18 }}>
      <View style={{ position: 'absolute', left: 6, top: 2, width: 14, height: 14, borderTopWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: colors.white, borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />
      <View style={{ position: 'absolute', left: 0, top: -2.5, width: 0, height: 0, borderTopWidth: 6.5, borderBottomWidth: 6.5, borderRightWidth: 8, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.white }} />
    </View>
  );
}

// ---- The drawing editor: a page to draw on with your finger, with brushes (ink, watercolour, pencil), colours,
// sizes, a fill, an eraser, undo and clear. (The book maker uses it too, for Make a drawing.) ----
export function DrawEditor({ insets, tall, photo, strokes: start, title, onDone }) {
  const t = useT();
  const { width: winW, height: winH } = useWindowDimensions();
  const wideScreen = winW > winH * 1.1; // sideways: the page on the left, the tools on the right
  const TOOLS_W = 270;
  const [strokes, setStrokes] = useState(start || []);
  const [live, setLive] = useState(null);
  const [pen, setPen] = useState('#1e2324'); // charcoal to start
  const [brush, setBrush] = useState('ink');
  const [shape, setShape] = useState(null); // Shapes: drag on the page to draw a circle, square, triangle, star or heart
  const [shapesOpen, setShapesOpen] = useState(false);
  const [size, setSize] = useState(SIZES[1][1]);
  const [erase, setErase] = useState(false);
  const [bucket, setBucket] = useState(false); // the paint bucket: a tap fills the shape with the colour
  const [area, setArea] = useState(null);
  const S = useRef({});
  S.current = { strokes, pen, size, erase, bucket, tall, brush, shape };
  const toolsH = 340; // (two rows of colours; the brushes and the shapes take a row each)
  const W = !area ? 0 : wideScreen ? Math.max(120, Math.floor(Math.min(area.h, area.w - TOOLS_W - 28)))
    : Math.max(120, Math.floor(Math.min(winW - 2 * GAP, tall ? (area.h - toolsH) / 2 : area.h - toolsH)));
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
      if (S.current.bucket) {
        const f = makeFill(S.current.strokes, x, y, S.current.tall ? 2 : 1, S.current.pen);
        if (f) setStrokes((s) => [...s, f]);
        return;
      }
      if (S.current.shape) {
        cur.current = { c: S.current.pen, s: S.current.size, b: S.current.brush, z: 1, k: S.current.shape, o: [x, y], p: shapePts(S.current.shape, x, y, x, y) };
        setLive({ ...cur.current });
        return;
      }
      cur.current = { c: S.current.pen, s: S.current.size, b: S.current.brush, p: [+x.toFixed(4), +y.toFixed(4)] };
      setLive({ ...cur.current });
    },
    onPanResponderMove: (e) => {
      const [x, y] = at(e);
      if (S.current.erase) { rub(x, y); return; }
      if (S.current.bucket) return;
      const c = cur.current;
      if (!c) return;
      if (c.z) { c.p = shapePts(c.k, c.o[0], c.o[1], x, y); setLive({ ...c }); return; } // a shape grows with the drag
      const n = c.p.length;
      if ((c.p[n - 2] - x) ** 2 + (c.p[n - 1] - y) ** 2 < 0.004 ** 2) return;
      c.p.push(+x.toFixed(4), +y.toFixed(4));
      setLive({ ...c, p: [...c.p] });
    },
    onPanResponderRelease: () => {
      const c = cur.current;
      cur.current = null; setLive(null);
      if (c && c.z) { // a shape: kept only if it was dragged out to a size (the start point isn't needed any more)
        const { o, k, ...keep } = c;
        const p = keep.p; let w = 0;
        for (let i = 2; i < p.length; i += 2) w = Math.max(w, Math.abs(p[i] - p[0]), Math.abs(p[i + 1] - p[1]));
        if (w > 0.02) setStrokes((s) => [...s, keep]);
        return;
      }
      if (c) setStrokes((s) => [...s, c]);
    },
  })).current;
  const paper = (
    <View {...pad.panHandlers} style={[styles.drawPaper, { width: W, height: tall ? W * 2 : W }]}>
      {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" pointerEvents="none" /> : null}
      <StrokesView strokes={strokes} live={live} width={W} height={tall ? W * 2 : W} />
    </View>
  );
  const swatches = (w, perRow) => (
    <View style={{ width: w, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: perRow ? 0 : 7, rowGap: 14 }}>{/* the colours close together */}
      {PENS.map(([hex, name]) => (
        <View key={hex} style={{ width: perRow ? w / perRow : undefined, alignItems: perRow ? 'center' : undefined }}>
          <Pressable onPress={() => { setPen(hex); setErase(false); }} accessibilityLabel={t('{name} pen', { name: t(name) })}
            style={[styles.swatch, { backgroundColor: hex }, !erase && pen === hex && styles.swatchOn]} />
        </View>
      ))}
    </View>
  );
  const sizesEl = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {SIZES.map(([name, s]) => (
        <Pressable key={name} onPress={() => { setSize(s); setErase(false); setBucket(false); }} style={[styles.tool, !erase && !bucket && size === s && styles.toolOn]} accessibilityLabel={t('{name} pen', { name: t(name) })}>
          <View style={{ width: 5 + s * 280, height: 5 + s * 280, borderRadius: 20, backgroundColor: colors.white }} />
        </Pressable>
      ))}
      <Pressable onPress={() => { setErase((x) => !x); setBucket(false); setShape(null); }} style={[styles.toolWide, erase && styles.toolOn]} accessibilityLabel={t('Eraser')}>
        <Text style={styles.toolText}>{t('Eraser')}</Text>
      </Pressable>
      {/* Fill: tap inside a shape to fill it with the colour */}
      <Pressable onPress={() => { setBucket((x) => !x); setErase(false); setShape(null); }} style={[styles.toolWide, bucket && styles.toolOn]} accessibilityLabel={t('Fill')}>
        <Text style={styles.toolText}>{t('Fill')}</Text>
      </Pressable>
    </View>
  );
  // Shapes: the button opens the five shapes beside it; pick one, then drag on the page (tap it again to draw freely)
  const shapesEl = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Pressable onPress={() => { setShapesOpen((x) => !x); if (shapesOpen) setShape(null); }} style={[styles.toolWide, (shapesOpen || shape) && styles.toolOn]} accessibilityRole="button" accessibilityLabel={t('Shapes')}>
        <Text style={styles.toolText}>{t('Shapes')}</Text>
      </Pressable>
      {shapesOpen ? SHAPES.map(([k, glyph, name]) => (
        <Pressable key={k} onPress={() => { setShape((x) => (x === k ? null : k)); setErase(false); setBucket(false); }} style={[styles.tool, shape === k && styles.toolOn]} accessibilityRole="button" accessibilityLabel={t(name)}>
          <Text style={[styles.toolText, { fontSize: 20, lineHeight: 24 }]}>{glyph}</Text>
        </Pressable>
      )) : null}
    </View>
  );
  // the brushes: a brush pen (ink), soft watercolour, a fine pencil
  const brushesEl = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {BRUSHES.map(([k, name]) => (
        <Pressable key={k} onPress={() => { setBrush(k); setErase(false); setBucket(false); }} style={[styles.toolWide, !erase && !bucket && brush === k && styles.toolOn]} accessibilityRole="button" accessibilityLabel={t(name)}>
          <Text style={styles.toolText}>{t(name)}</Text>
        </Pressable>
      ))}
    </View>
  );
  const undoEl = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Pressable onPress={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length} style={[styles.tool, !strokes.length && { opacity: 0.35 }]} accessibilityLabel={t('Undo')}>
        <UndoIcon />
      </Pressable>
      <Pressable onPress={() => setStrokes([])} disabled={!strokes.length} style={[styles.toolWide, !strokes.length && { opacity: 0.35 }]} accessibilityLabel={t('Clear the drawing')}>
        <Text style={styles.toolText}>{t('Clear')}</Text>
      </Pressable>
    </View>
  );
  const doneEl = <Pressable onPress={() => onDone(strokes)} hitSlop={8} accessibilityRole="button" style={[styles.donePill, { marginBottom: 0 }]}><Text style={styles.pillText}>{t('Done')}</Text></Pressable>;
  if (wideScreen) {
    // sideways: a big page on the left (as tall as there's room for), the title and tools in a column on the right
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 55, backgroundColor: colors.desk }]}>
        <DeskFelt spot="notebook3" overlay />
        <View style={{ flex: 1, flexDirection: 'row', paddingLeft: insets.left + 24, paddingRight: insets.right + 24, paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: Math.max(insets.bottom, 12) + 8, gap: 28 }}
          onLayout={(e) => setArea({ w: e.nativeEvent.layout.width - insets.left - insets.right - 48, h: e.nativeEvent.layout.height - Math.max(insets.top, 16) - Math.max(insets.bottom, 12) - 16 })}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{W ? paper : null}</View>
          <View style={{ width: TOOLS_W, justifyContent: 'space-between' }}>
            <Text style={styles.editorTitle}>{title}</Text>
            <View style={{ gap: 22 }}>
              {/* the colours in two rows of eight, starting at the same left edge as the buttons below */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 3, rowGap: 8, width: 8 * 26 }}>
                {PENS.map(([hex, name]) => (
                  <Pressable key={hex} onPress={() => { setPen(hex); setErase(false); }} accessibilityLabel={t('{name} pen', { name: t(name) })} hitSlop={3}
                    style={[styles.swatch, { width: 23, height: 23, borderRadius: 11.5, backgroundColor: hex }, !erase && pen === hex && styles.swatchOn]} />
                ))}
              </View>
              {brushesEl}
              {sizesEl}
              {shapesEl}
            </View>
            {/* Undo and Clear, down at the bottom away from the drawing tools, with Done */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>{undoEl}{doneEl}</View>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 55, backgroundColor: colors.desk }]}>
      <DeskFelt spot="notebook4" overlay />
      <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 10 }}>
        <View style={styles.editorHead}><Text style={styles.editorTitle}>{title}</Text></View>
        <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {W ? (
            <>
              {paper}
              <View style={{ width: W, marginTop: 30, gap: 24 }}>{/* the tools line up with the page's left and right edges */}
                {swatches(W, 8)}
                {brushesEl}
                {sizesEl}
                {shapesEl}
              </View>
            </>
          ) : null}
        </View>
        {/* Undo and Clear, down at the bottom away from the drawing tools, with Done */}
        <View style={{ width: W || winW - 2 * GAP, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {undoEl}
          {doneEl}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DESK_BG },
  coverShadow: { backgroundColor: '#7c5438', shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
  bookShadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  page: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  art: { backgroundColor: '#808080', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  plus: { color: '#6b6b6b', fontWeight: '200', fontFamily: fonts.ui },
  addImage: { color: '#4a4a4a', fontWeight: '700', fontSize: 20, fontFamily: fonts.ui, marginTop: 2 },
  addSub: { color: '#6b6b6b', fontSize: 15, fontFamily: fonts.ui, marginTop: 8 },
  hint: { position: 'absolute', color: '#7a7a7a', fontFamily: TYPE, fontSize: 20 },
  textBox: { justifyContent: 'center' },
  notes: { fontFamily: TYPE, fontSize: 17, lineHeight: 27, color: colors.ink },
  back: { position: 'absolute', left: 6, bottom: 6, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center', zIndex: 6 },
  backText: { color: '#3a3a3a', fontSize: 28, lineHeight: 30, fontWeight: '300', marginTop: -3 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 17 },
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
  halfPill: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
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
