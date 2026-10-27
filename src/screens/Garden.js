// The Garden: a secret place below My Library (a grown-up unlocks it in Settings → The Garden). A garden seen from
// above; tap a place in it to play there. Calm nature games, nothing to win:
//   the rocks: throw felt pebbles onto the pebble beach and hear them land
//   the woodpile: arrange driftwood sticks and dominoes on the felt
//   the flowers: a paper pinwheel to spin with a swipe
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { colors } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { pinwheelWhirr, playGarden, playPebble } from '../sound';
import { createAudioPlayer } from 'expo-audio';

// Jörg's garden, 1116 × 1886 (it fills the screen edge to edge), as the day goes: in daylight, in the golden evening, and at night under the lights
const MAPS = {
  day: [require('../../assets/garden/map-day.jpg'), '#5e693e'],
  evening: [require('../../assets/garden/map-evening.jpg'), '#62482f'],
  night: [require('../../assets/garden/map-night.jpg'), '#0d1e28'],
};
const timeOfDay = (d = new Date()) => { const hash = typeof window !== 'undefined' && window.location ? window.location.hash || '' : ''; if (/night|evening|day/.test(hash)) return hash.match(/night|evening|day/)[0]; /* (web preview screenshots) */ const h = d.getHours(); return h >= 6 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night'; };
const MAP_AR = 1116 / 1886; // (the grey patch below the bottom gate is cut off)
const ORDER = ['day', 'evening', 'night'];
// the places to tap, as parts of the map (left, top, right, bottom). For now only the gates: the games aren't ready
const SPOTS = [
  { game: 'home', box: [0.38, 0.0, 0.53, 0.095], label: 'My Library' }, // the gate at the top: back to the books
  { game: 'home', box: [0.48, 0.86, 0.72, 1.0], label: 'My Library' }, // the gate at the bottom
  // (put away until they're ready)
  // { game: 'pebbles', box: [0.12, 0.18, 0.33, 0.29], label: 'The rocks' },
  // { game: 'pebbles', box: [0.1, 0.78, 0.37, 0.95], label: 'The rocks' },
  // { game: 'sticks', box: [0.57, 0.11, 0.86, 0.3], label: 'The woodpile' },
  // { game: 'pinwheel', box: [0.1, 0.32, 0.5, 0.49], label: 'The flowers' },
];
const CRICKETS = require('../../assets/ambient/crickets.mp3'); // at night (the same night meadow as in Music and Sounds)
const BIRDS = require('../../assets/ambient/forest-birds.mp3'); // birdsong, fading in very slowly while you're in the garden

export default function Garden({ u, openMenu, toast, onHome }) {
  const t = useT();
  const [game, setGame] = useState(null);
  const [area, setArea] = useState(null);
  const open = (g) => {
    if (g === 'home') { onHome && onHome(); return; }
    setGame(g);
  };
  // the light: it starts as the time of day, and a tap anywhere else in the garden dissolves to the next
  // (day → sunset → night → day)
  const [tod, setTod] = useState(timeOfDay());
  const [prev, setPrev] = useState(null); // the picture dissolving away
  const fade = useRef(new Animated.Value(0)).current;
  const nextLight = () => {
    const n = ORDER[(ORDER.indexOf(tod) + 1) % ORDER.length];
    setPrev(tod); setTod(n);
    fade.setValue(1);
    Animated.timing(fade, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(({ finished }) => { if (finished) setPrev(null); });
  };
  // a couple of seconds in: a word that the Garden is a beta (the same speech bubble as the library's)
  useEffect(() => {
    const id = setTimeout(() => toast && toast(t('Welcome to the garden, a relaxing space where you can enjoy simple games and puzzles. Check back later for more. And remember, nothing beats going outside in nature. For real, go outside. (If you’re looking for your way back to the library, tap on the gate.)'), 0) // (stays until it's tapped closed: Jörg, 27 Oct 2026), 2200);
    return () => clearTimeout(id);
  }, []);
  // birdsong by day; at night the crickets take over (one fades out as the other comes up). Both start silent and
  // come up very slowly; they go quiet when you leave (Jörg, 26 Oct 2026)
  const todRef = useRef(tod); todRef.current = tod;
  useEffect(() => {
    let birds = null, crickets = null, id = null, vb = 0, vc = 0;
    try {
      birds = createAudioPlayer(BIRDS); birds.loop = true; birds.volume = 0; birds.play();
      crickets = createAudioPlayer(CRICKETS); crickets.loop = true; crickets.volume = 0; crickets.play();
      const step = (v, to) => (v < to ? Math.min(to, v + 0.005) : Math.max(to, v - 0.01)); // up slowly, down a little quicker
      id = setInterval(() => {
        const night = todRef.current === 'night';
        vb = step(vb, night ? 0 : 0.55); vc = step(vc, night ? 0.6 : 0);
        try { birds.volume = vb; crickets.volume = vc; } catch (e) {}
      }, 200); // about 22 seconds to full
    } catch (e) {}
    return () => { clearInterval(id); [birds, crickets].forEach((p) => { try { p && p.pause(); p && p.remove(); } catch (e) {} }); };
  }, []);
  const [MAP, MAP_BG] = MAPS[tod];
  let map = null;
  if (area) {
    // sideways the garden lies on its side (its top gate on the left), so the whole of it still fills the screen
    const side = area.w > area.h;
    const W0 = side ? area.h : area.w, H0 = side ? area.w : area.h; // the room, in the garden's own upright frame
    const w = Math.max(W0, H0 * MAP_AR), h = w / MAP_AR;
    const l = (area.w - w) / 2, tp = (area.h - h) / 2;
    map = (
      <View style={{ position: 'absolute', left: l, top: tp, width: w, height: h, transform: side ? [{ rotate: '-90deg' }] : [] }}>
        <Pressable onPress={nextLight} accessibilityRole="button" accessibilityLabel={t('Change the light')} style={StyleSheet.absoluteFill}>
          <Image source={MAP} style={{ width: w, height: h }} resizeMode="cover" fadeDuration={0} />
          {prev ? <Animated.Image source={MAPS[prev][0]} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: fade }} resizeMode="cover" fadeDuration={0} /> : null}
        </Pressable>
        {tod === 'night' ? <View pointerEvents="none" style={StyleSheet.absoluteFill}><Fireflies w={w} h={h} /></View> : null}
        {SPOTS.map((s, i) => (
          <Pressable key={i} onPress={withTap(() => open(s.game))} accessibilityRole="button" accessibilityLabel={t(s.label)}
            style={{ position: 'absolute', left: s.box[0] * w, top: s.box[1] * h, width: (s.box[2] - s.box[0]) * w, height: (s.box[3] - s.box[1]) * h }} />
        ))}
      </View>
    );
  }
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} vertical={v} /></Bar>}>
      <View style={{ flex: 1, backgroundColor: MAP_BG, overflow: 'hidden' }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {map}
        {game === 'pebbles' && area ? <Pebbles area={area} onBack={() => setGame(null)} /> : null}
        {game === 'sticks' && area ? <Driftwood area={area} onBack={() => setGame(null)} /> : null}
        {game === 'pinwheel' && area ? <Pinwheel area={area} onBack={() => setGame(null)} /> : null}
      </View>
    </WithBar>
  );
}

// ---- Pebbles: throw felt pebbles onto the pebble beach. Flick one up from the bottom (harder flies further), or tap
// a spot to toss it there. Each lands with the sound of stone on stone and stays where it fell. ----
const BEACH = require('../../assets/daydream/pebbles.jpg'); // Jörg's felt pebbles
// Jörg's felt pebbles: [picture, width, height, how big it is next to the biggest]
const STONES = [
  [require('../../assets/garden/pebble-1.png'), 195, 199, 0.42],
  [require('../../assets/garden/pebble-2.png'), 260, 253, 0.78],
  [require('../../assets/garden/pebble-3.png'), 260, 246, 0.68],
  [require('../../assets/garden/pebble-4.png'), 260, 229, 0.81],
  [require('../../assets/garden/pebble-5.png'), 216, 260, 0.81],
  [require('../../assets/garden/pebble-6.png'), 258, 195, 1.0],
  [require('../../assets/garden/pebble-7.png'), 260, 258, 0.79],
  [require('../../assets/garden/pebble-8.png'), 218, 260, 0.7],
  [require('../../assets/garden/pebble-9.png'), 216, 224, 0.47],
  [require('../../assets/garden/pebble-10.png'), 206, 205, 0.48],
];
const MAX_ON_BEACH = 30;
let nextId = 1;
const pickStone = (not) => { let k; do { k = Math.floor(Math.random() * STONES.length); } while (k === not && STONES.length > 1); return k; };

function Pebbles({ area, onBack }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const base = Math.min(W, H) * 0.24; // a pebble in the hand, across its longest side
  const handX = W / 2, handY = H - base * 0.95;
  const [hand, setHand] = useState(() => pickStone(-1));
  const handIn = useRef(new Animated.Value(1)).current;
  const drag = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [stones, setStones] = useState([]);
  const S = useRef({}); S.current = { ...S.current, hand, W, H, base, handX, handY, stones };

  const throwTo = (fromX, fromY, toX, toY, power) => {
    const { hand: k, H: h, base: b } = S.current;
    // further away is smaller (the beach seen at a slant): the size where it lands
    const depth = Math.max(0, Math.min(1, toY / h));
    const s1 = b * (0.6 + 0.45 * depth) * (0.55 + 0.45 * STONES[k][3]); // (small pebbles stay small)
    const p = new Animated.Value(0);
    const settle = new Animated.Value(0);
    const rot = Math.round((Math.random() - 0.5) * 140);
    const id = nextId++;
    const st = { id, k, x: toX, y: toY, size: s1, p, settle, fromX, fromY, s0: b, rot, arc: 70 + 160 * power, fade: new Animated.Value(1), mv: new Animated.ValueXY({ x: 0, y: 0 }), lift: new Animated.Value(0), ox: 0, oy: 0, landed: false };
    setStones((list) => {
      const out = [...list, st];
      if (out.length > MAX_ON_BEACH) { const old = out[0]; Animated.timing(old.fade, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => setStones((l) => l.filter((x) => x.id !== old.id))); }
      return out;
    });
    const dur = 480 + 320 * power;
    Animated.timing(p, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }).start(() => {
      st.landed = true;
      playPebble(0.55 + 0.45 * power);
      Animated.sequence([
        Animated.timing(settle, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(settle, { toValue: 0, duration: 160, easing: Easing.bounce, useNativeDriver: true }),
      ]).start();
    });
    // a new pebble in the hand
    const next = pickStone(k);
    handIn.setValue(0); drag.setValue({ x: 0, y: 0 });
    setHand(next);
    Animated.spring(handIn, { toValue: 1, friction: 6, tension: 60, delay: 180, useNativeDriver: true }).start();
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX, y = e.nativeEvent.locationY;
      const onHand = Math.hypot(x - S.current.handX, y - S.current.handY) < S.current.base;
      // a pebble already on the beach: pick it up to move it (the top one under the finger)
      let held = null;
      if (!onHand) {
        const list = S.current.stones || [];
        for (let n = list.length - 1; n >= 0; n--) {
          const q = list[n];
          if (q.landed && Math.hypot(x - (q.x + q.ox), y - (q.y + q.oy)) < q.size * 0.55) { held = q; break; }
        }
      }
      S.current.start = { x, y, onHand, held };
      if (held) {
        setStones((l) => [...l.filter((q) => q.id !== held.id), held]); // on top of the others
        Animated.timing(held.lift, { toValue: 1, duration: 120, useNativeDriver: true }).start();
        playPebble(0.25); // a little clack as it's lifted off the others
      }
    },
    onPanResponderMove: (e, g) => {
      const st = S.current.start;
      if (!st) return;
      if (st.held) { st.held.mv.setValue({ x: st.held.ox + g.dx, y: st.held.oy + g.dy }); return; }
      if (st.onHand) drag.setValue({ x: g.dx, y: g.dy });
    },
    onPanResponderRelease: (e, g) => {
      const held = S.current.start && S.current.start.held;
      if (held) { // set it down where it is now
        held.ox += g.dx; held.oy += g.dy;
        held.mv.setValue({ x: held.ox, y: held.oy });
        Animated.timing(held.lift, { toValue: 0, duration: 140, useNativeDriver: true }).start();
        if (Math.hypot(g.dx, g.dy) > 6) playPebble(0.35);
        return;
      }
      const { W: w, H: h, handX: hx, handY: hy } = S.current;
      const st = S.current.start || {};
      const fromX = st.onHand ? hx + g.dx : hx, fromY = st.onHand ? hy + g.dy : hy;
      const speed = Math.hypot(g.vx, g.vy);
      if (Math.hypot(g.dx, g.dy) < 10 && !st.onHand) { // a tap: toss it gently to that spot
        const tx = st.x, ty = Math.min(st.y, h * 0.86);
        throwTo(hx, hy, tx, ty, Math.min(1, (hy - ty) / h + 0.2));
        return;
      }
      if (g.vy < -0.2 && speed > 0.25) { // a flick upwards: the faster, the further
        const power = Math.max(0.2, Math.min(1, speed / 2.6));
        const dist = (0.25 + 0.6 * power) * h;
        const nx = g.vx / speed, ny = g.vy / speed;
        const tx = Math.max(w * 0.06, Math.min(w * 0.94, fromX + nx * dist)), ty = Math.max(h * 0.05, Math.min(h * 0.85, fromY + ny * dist));
        throwTo(fromX, fromY, tx, ty, power);
        return;
      }
      Animated.spring(drag, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start(); // let go without a throw: back to the hand
    },
  })).current;

  const handStone = STONES[hand];
  const hk = (base * (0.62 + 0.38 * handStone[3])) / Math.max(handStone[1], handStone[2]);
  const hw = handStone[1] * hk, hh2 = handStone[2] * hk;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={BEACH} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      {/* the beach a shade darker, so the thrown pebbles stand out on it */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        {stones.map((st) => {
          const [img, iw, ih] = STONES[st.k];
          const k1 = st.size / Math.max(iw, ih);
          const w = iw * k1, hh = ih * k1;
          const dx = st.fromX - st.x, dy = st.fromY - st.y;
          const ins = [0, 0.25, 0.5, 0.75, 1];
          const arc = (q) => -st.arc * 4 * q * (1 - q);
          const ty = st.p.interpolate({ inputRange: ins, outputRange: ins.map((q) => (1 - q) * dy + arc(q)) });
          const groundY = st.p.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] });
          const tx = st.p.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] });
          const k0 = st.s0 / st.size;
          const scale = st.p.interpolate({ inputRange: ins, outputRange: ins.map((q) => (k0 + (1 - k0) * q) * (1 + 0.18 * 4 * q * (1 - q))) });
          const squash = st.settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
          const rot = st.p.interpolate({ inputRange: [0, 1], outputRange: [`${st.rot * 3}deg`, `${st.rot}deg`] });
          return (
            <Animated.View key={st.id} pointerEvents="none" style={{ position: 'absolute', left: st.x - w / 2, top: st.y - hh / 2, width: w, height: hh, opacity: st.fade,
              transform: [{ translateX: st.mv.x }, { translateY: st.mv.y }, { scale: st.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
              {/* its shadow on the beach: far below it while it flies, tucked under it once it lands; further away while it's held */}
              <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: hh,
                transform: [{ translateX: st.lift.interpolate({ inputRange: [0, 1], outputRange: [w * 0.07, w * 0.14] }) }, { translateY: st.lift.interpolate({ inputRange: [0, 1], outputRange: [hh * 0.11, hh * 0.22] }) }] }}>
                <Animated.Image source={img} blurRadius={5} style={{ width: w, height: hh, tintColor: '#000',
                  opacity: st.p.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.75] }), transform: [{ translateX: tx }, { translateY: groundY }, { scale }, { rotate: rot }] }} />
              </Animated.View>
              <Animated.Image source={img} style={{ width: w, height: hh, transform: [{ translateX: tx }, { translateY: ty }, { scale }, { scaleY: squash }, { rotate: rot }] }} />
            </Animated.View>
          );
        })}
        {/* the pebble in the hand, waiting at the bottom */}
        {/* the pebble in your hand, ready to throw: a big dark glow round it and a thin white outline, so it stands
            out on the beach (once thrown it lands with an ordinary drop shadow) */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: handX - hw / 2, top: handY - hh2 / 2, width: hw, height: hh2,
          transform: [{ translateX: drag.x }, { translateY: drag.y }, { scale: handIn }] }}>
          <Image source={handStone[0]} blurRadius={18} style={{ position: 'absolute', left: -hw * 0.25, top: -hh2 * 0.25, width: hw * 1.5, height: hh2 * 1.5, tintColor: '#000', opacity: 0.9 }} />
          <Image source={handStone[0]} blurRadius={8} style={{ position: 'absolute', left: hw * 0.04, top: hh2 * 0.08, width: hw, height: hh2, tintColor: '#000', opacity: 0.8 }} />
          <Image source={handStone[0]} style={{ position: 'absolute', left: -2.5, top: -2.5, width: hw + 5, height: hh2 + 5, tintColor: '#fff', opacity: 0.95 }} />
          <Image source={handStone[0]} style={{ width: hw, height: hh2 }} />
        </Animated.View>
      </View>
      {/* back to the garden */}
      <Pressable onPress={withTap(onBack)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Back to the Garden')}
        style={[styles.back, { top: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.backChevron} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  backChevron: { width: 12, height: 12, borderLeftWidth: 2.6, borderBottomWidth: 2.6, borderColor: colors.white, transform: [{ translateX: 2 }, { rotate: '45deg' }] },
});

// ---- Driftwood: sticks of driftwood lying on felt. Drag one to move it, tap it to turn it. Lay them into a fence, a
// house, a star, a letter, whatever you like. A soft wooden knock as each one is set down. ----
const FELT = require('../../assets/desk-felt.jpg');
const STICKS = [
  [require('../../assets/garden/sticks/stick-1.png'), 462, 44], [require('../../assets/garden/sticks/stick-2.png'), 558, 48],
  [require('../../assets/garden/sticks/stick-3.png'), 466, 44], [require('../../assets/garden/sticks/stick-4.png'), 614, 52],
  [require('../../assets/garden/sticks/stick-5.png'), 332, 48], [require('../../assets/garden/sticks/stick-6.png'), 420, 44],
  [require('../../assets/garden/sticks/stick-7.png'), 382, 52], [require('../../assets/garden/sticks/stick-8.png'), 374, 40],
  [require('../../assets/garden/sticks/stick-9.png'), 378, 38], [require('../../assets/garden/sticks/stick-10.png'), 512, 50],
  [require('../../assets/garden/sticks/stick-11.png'), 470, 48], [require('../../assets/garden/sticks/stick-12.png'), 418, 46],
  [require('../../assets/garden/sticks/stick-13.png'), 472, 64], [require('../../assets/garden/sticks/stick-14.png'), 362, 152],
  [require('../../assets/garden/sticks/stick-15.png'), 468, 64], [require('../../assets/garden/sticks/stick-16.png'), 414, 46],
];
const LONGEST = 614;
// Jörg's dominoes (his own cut-outs): [picture, width, height]. They lie on the felt with the sticks.
const DOMINOES = [
  [require('../../assets/garden/dominoes/5-6.png'), 300, 169], [require('../../assets/garden/dominoes/1-4.png'), 300, 160],
  [require('../../assets/garden/dominoes/2-6.png'), 300, 154], [require('../../assets/garden/dominoes/3-3.png'), 300, 156],
  [require('../../assets/garden/dominoes/1-1.png'), 300, 166],
];
const NS = STICKS.length;
const PIECES = [...STICKS, ...DOMINOES]; // a piece's number: the sticks first, then the dominoes
const isDom = (k) => k >= NS;
function scatter(W, H, len, dom) {
  // every piece somewhere on the felt, not too close to the edges: the sticks at a slant, the dominoes square
  return PIECES.map((st, k) => {
    const d = isDom(k);
    const L = d ? dom : (st[1] / LONGEST) * len, T = L * st[2] / st[1];
    const a = d ? 90 * Math.floor(Math.random() * 2) : Math.round(Math.random() * 180 - 90), r = (a * Math.PI) / 180;
    const hx = Math.abs(Math.cos(r)) * L / 2 + Math.abs(Math.sin(r)) * T / 2 + 14, hy = Math.abs(Math.sin(r)) * L / 2 + Math.abs(Math.cos(r)) * T / 2 + 24; // keep it all on the felt
    return { k, x: hx + Math.random() * Math.max(1, W - 2 * hx), y: hy + Math.random() * Math.max(1, H - 2 * hy), a };
  });
}
function Driftwood({ area, onBack }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const len = Math.min(W, H) * 0.62; // the longest stick, on screen
  const dom = Math.min(W, H) * 0.26; // a domino's long side, on screen
  const sticks = useRef(null);
  if (!sticks.current) {
    sticks.current = scatter(W, H, len, dom).map((p) => ({ ...p, pos: new Animated.ValueXY({ x: p.x, y: p.y }), rot: new Animated.Value(p.a), lift: new Animated.Value(0) }));
  }
  const [order, setOrder] = useState(() => sticks.current.map((s) => s.k)); // drawn in this order (the last one on top)
  const S = useRef({}); S.current.order = order;
  const sizeOf = (k) => { const [, iw, ih] = PIECES[k]; const L = isDom(k) ? dom : (iw / LONGEST) * len; return [L, L * ih / iw]; };
  // is the point on this piece? (measured along it and across it, a little generous so thin sticks are easy to grab)
  const hit = (s, x, y) => {
    const [L, T] = sizeOf(s.k);
    const r = (-s.a * Math.PI) / 180, dx = x - s.x, dy = y - s.y;
    const u = dx * Math.cos(r) - dy * Math.sin(r), v = dx * Math.sin(r) + dy * Math.cos(r);
    return Math.abs(u) <= L / 2 + 8 && Math.abs(v) <= Math.max(T / 2, 22);
  };
  // a domino's half width and half height as it lies (it is always straight or on its side)
  const half = (s) => { const [L, T] = sizeOf(s.k); return (Math.round(s.a / 90) % 2) ? [T / 2, L / 2] : [L / 2, T / 2]; };
  // a domino let go close to another one slides gently against it, edge to edge and lined up (like laying a row)
  const snap = (s) => {
    const SN = dom * 0.14;
    const [hx, hy] = half(s);
    let best = null;
    for (const o of sticks.current) {
      if (o === s || !isDom(o.k)) continue;
      const [ox, oy] = half(o);
      // side by side (left or right of it), close enough up and down
      for (const side of [-1, 1]) {
        const gx = o.x + side * (ox + hx), dx = gx - s.x;
        if (Math.abs(dx) < SN && Math.abs(s.y - o.y) < oy + hy - 4) {
          const ny = Math.abs(s.y - o.y) < SN ? o.y : Math.abs(s.y - hy - (o.y - oy)) < SN ? o.y - oy + hy : Math.abs(s.y + hy - (o.y + oy)) < SN ? o.y + oy - hy : s.y; // lined up: middles, or top or bottom edges
          const d = Math.abs(dx) + Math.abs(ny - s.y);
          if (!best || d < best.d) best = { x: gx, y: ny, d };
        }
      }
      // above or below it
      for (const side of [-1, 1]) {
        const gy = o.y + side * (oy + hy), dy = gy - s.y;
        if (Math.abs(dy) < SN && Math.abs(s.x - o.x) < ox + hx - 4) {
          const nx = Math.abs(s.x - o.x) < SN ? o.x : Math.abs(s.x - hx - (o.x - ox)) < SN ? o.x - ox + hx : Math.abs(s.x + hx - (o.x + ox)) < SN ? o.x + ox - hx : s.x;
          const d = Math.abs(dy) + Math.abs(nx - s.x);
          if (!best || d < best.d) best = { x: nx, y: gy, d };
        }
      }
    }
    if (!best) return false;
    s.x = best.x; s.y = best.y;
    return true;
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX, y = e.nativeEvent.locationY;
      const ord = S.current.order;
      let picked = null;
      for (let n = ord.length - 1; n >= 0; n--) { const s = sticks.current[ord[n]]; if (hit(s, x, y)) { picked = s; break; } }
      S.current.picked = picked;
      if (!picked) return;
      S.current.start = { x: picked.x, y: picked.y };
      setOrder((o) => [...o.filter((k) => k !== picked.k), picked.k]); // to the top
      Animated.timing(picked.lift, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    },
    onPanResponderMove: (e, g) => {
      const s = S.current.picked; if (!s) return;
      s.pos.setValue({ x: S.current.start.x + g.dx, y: S.current.start.y + g.dy });
    },
    onPanResponderRelease: (e, g) => {
      const s = S.current.picked; if (!s) return;
      S.current.picked = null;
      const d = isDom(s.k);
      let touched = false;
      if (Math.hypot(g.dx, g.dy) < 8) { // a tap: a stick turns a little, a domino a quarter turn
        s.a += d ? 90 : 30;
        Animated.spring(s.rot, { toValue: s.a, friction: 7, tension: 80, useNativeDriver: true }).start();
        if (d) { touched = snap(s); if (touched) Animated.spring(s.pos, { toValue: { x: s.x, y: s.y }, friction: 8, tension: 90, useNativeDriver: true }).start(); }
      } else {
        s.x = Math.max(0, Math.min(W, S.current.start.x + g.dx)); s.y = Math.max(0, Math.min(H, S.current.start.y + g.dy));
        s.pos.setValue({ x: s.x, y: s.y });
        if (d) { touched = snap(s); if (touched) Animated.spring(s.pos, { toValue: { x: s.x, y: s.y }, friction: 8, tension: 90, useNativeDriver: true }).start(); }
      }
      Animated.timing(s.lift, { toValue: 0, duration: 140, useNativeDriver: true }).start();
      playGarden(d ? (touched ? 'domclick' : 'domdown') : 'stick');
    },
  })).current;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={FELT} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        {order.map((k) => {
          const s = sticks.current[k];
          const [L, T] = sizeOf(k);
          const d = isDom(k);
          const rot = s.rot.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] });
          const scale = s.lift.interpolate({ inputRange: [0, 1], outputRange: [1, d ? 1.05 : 1.06] });
          const sh = s.lift.interpolate({ inputRange: [0, 1], outputRange: d ? [1.5, 8] : [2, 7] });
          return (
            <Animated.View key={k} pointerEvents="none" style={{ position: 'absolute', left: -L / 2, top: -T / 2, width: L, height: T,
              transform: [{ translateX: s.pos.x }, { translateY: s.pos.y }, { rotate: rot }, { scale }] }}>
              {/* its shadow on the felt: its own shape, darker, lifting further away while it's held */}
              <Animated.Image source={PIECES[k][0]} style={{ position: 'absolute', left: 0, top: 0, width: L, height: T, tintColor: '#000', opacity: d ? 0.45 : 0.55, transform: [{ translateX: sh }, { translateY: sh }] }} />
              <Image source={PIECES[k][0]} style={{ width: L, height: T }} />
            </Animated.View>
          );
        })}
      </View>
      <Pressable onPress={withTap(onBack)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Back to the Garden')}
        style={[styles.back, { top: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.backChevron} />
      </Pressable>
    </View>
  );
}

// ---- The pinwheel: a paper pinwheel on a stick. Swipe across it to spin it (the faster the swipe, the faster it
// spins), tap it for a little push; it slows down by itself, whirring softly while it turns. ----
const HEAD = require('../../assets/garden/pinwheel-head.png'); // 560 × 560, the hub in the middle
const HEAD_BLUR = require('../../assets/garden/pinwheel-blur.png'); // the same, blurred round (for fast spins)
const POLE = require('../../assets/garden/pinwheel-stick.png'); // 20 × 456
function Pinwheel({ area, onBack }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const D = Math.min(W * 0.95, H * 0.6); // the pinwheel across
  const cx = W / 2, cy = Math.max(D / 2 + 30, H * 0.38);
  const angle = useRef(new Animated.Value(0)).current;
  const blur = useRef(new Animated.Value(0)).current;
  const st = useRef({ a: 0, w: 0, last: 0, raf: 0 }).current; // a: degrees, w: degrees a second
  useEffect(() => {
    const tick = (now) => {
      const dt = st.last ? Math.min(0.05, (now - st.last) / 1000) : 0;
      st.last = now;
      st.w *= Math.exp(-0.55 * dt); // the air slows it down
      if (Math.abs(st.w) < 4) st.w = 0;
      st.a = (st.a + st.w * dt) % 360;
      angle.setValue(st.a);
      const sp = Math.min(1, Math.abs(st.w) / 900);
      blur.setValue(Math.max(0, (sp - 0.25) / 0.75));
      pinwheelWhirr(sp);
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(st.raf); pinwheelWhirr(0); };
  }, []);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { st.g = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }; },
    onPanResponderMove: (e, g) => {
      // the swipe turns it like wind on the blades: its push around the hub (cross product), not straight at it
      const x = e.nativeEvent.locationX, y = e.nativeEvent.locationY;
      const rx = x - cx, ry = y - cy, r2 = Math.max(rx * rx + ry * ry, (D * 0.15) ** 2);
      const torque = (rx * g.vy - ry * g.vx) / Math.sqrt(r2); // px/ms around the hub
      st.w = Math.max(-1800, Math.min(1800, st.w * 0.9 + torque * 180));
    },
    onPanResponderRelease: (e, g) => {
      if (Math.hypot(g.dx, g.dy) < 8) st.w = Math.max(-1800, Math.min(1800, (st.w || 0) + (st.w < 0 ? -260 : 260))); // a tap: a little push
    },
  })).current;
  const rot = angle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const poleH = H - cy + 10, poleW = Math.max(7, D * 0.028);
  return (
    <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
      <Image source={FELT} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      {/* the stick, from the hub down into the felt, with a soft shadow */}
      <Image source={POLE} style={{ position: 'absolute', left: cx - poleW / 2 + 5, top: cy + 6, width: poleW, height: poleH, tintColor: '#000', opacity: 0.35 }} resizeMode="stretch" />
      <Image source={POLE} style={{ position: 'absolute', left: cx - poleW / 2, top: cy, width: poleW, height: poleH }} resizeMode="stretch" />
      {/* the blades: sharp when slow, blurred round when fast */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: cx - D / 2, top: cy - D / 2, width: D, height: D, transform: [{ rotate: rot }] }}>
        <Image source={HEAD} style={{ position: 'absolute', left: 8, top: 12, width: D, height: D, tintColor: '#000', opacity: 0.28 }} />
        <Animated.Image source={HEAD} style={{ position: 'absolute', left: 0, top: 0, width: D, height: D, opacity: blur.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }} />
        <Animated.Image source={HEAD_BLUR} style={{ position: 'absolute', left: 0, top: 0, width: D, height: D, opacity: blur }} />
      </Animated.View>
      <Pressable onPress={withTap(onBack)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Back to the Garden')}
        style={[styles.back, { top: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.backChevron} />
      </Pressable>
    </View>
  );
}

// ---- Fireflies over the night garden: a few small glowing points that drift slowly and at random, each glowing up
// and fading away again, then turning up somewhere else ----
function Firefly({ w, h, delay }) {
  const x = useRef(new Animated.Value(Math.random() * w)).current;
  const y = useRef(new Animated.Value(h * (0.1 + Math.random() * 0.8))).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    const flight = () => {
      if (!alive) return;
      // a new spot somewhere in the garden, then a slow wandering path through two or three points
      const sx = w * (0.08 + Math.random() * 0.84), sy = h * (0.1 + Math.random() * 0.8);
      x.setValue(sx); y.setValue(sy);
      const legs = [];
      let px = sx, py = sy;
      for (let k = 0; k < 3; k++) {
        px = Math.max(10, Math.min(w - 10, px + (Math.random() - 0.5) * w * 0.25));
        py = Math.max(10, Math.min(h - 10, py + (Math.random() - 0.5) * h * 0.12));
        const d = 1800 + Math.random() * 2200;
        legs.push(Animated.parallel([
          Animated.timing(x, { toValue: px, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(y, { toValue: py, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]));
      }
      const total = 6000 + Math.random() * 4000;
      Animated.parallel([
        Animated.sequence(legs),
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.55, duration: total * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 1, duration: total * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]).start(() => { if (alive) setTimeout(flight, 600 + Math.random() * 3500); });
    };
    const t0 = setTimeout(flight, delay);
    return () => { alive = false; clearTimeout(t0); };
  }, [w, h]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -G / 2, top: -G / 2, width: G, height: G, opacity: glow, transform: [{ translateX: x }, { translateY: y }] }}>
      {/* a soft, blurred glow: many faint rings, brighter towards the middle (like light in the dark), and a small warm heart (Jörg, 26 Oct 2026) */}
      {GLOW_RINGS.map(([d, a], k) => (
        <View key={k} style={{ position: 'absolute', left: (G - d) / 2, top: (G - d) / 2, width: d, height: d, borderRadius: d / 2, backgroundColor: `rgba(222,255,150,${a})` }} />
      ))}
      <View style={{ position: 'absolute', left: (G - 4) / 2, top: (G - 4) / 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#fbffe0', shadowColor: '#e6ff9a', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }} />
    </Animated.View>
  );
}
const G = 56; // the glow's full size
const GLOW_RINGS = [[56, 0.03], [46, 0.04], [38, 0.05], [30, 0.07], [23, 0.09], [17, 0.12], [12, 0.16], [8, 0.22]];
function Fireflies({ w, h }) {
  return <>{[0, 1, 2, 3, 4, 5].map((i) => <Firefly key={i} w={w} h={h} delay={i * 1300 + Math.random() * 1500} />)}</>;
}
