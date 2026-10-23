// The Garden: a secret place below My Library (a grown-up unlocks it in Settings → The Garden). A garden seen from
// above; tap a place in it to play there. Calm nature games, nothing to win:
//   the rocks: throw felt pebbles onto the pebble beach and hear them land
//   the woodpile: arrange driftwood sticks on the felt
//   the flowers: a paper pinwheel to spin with a swipe
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { colors } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { pinwheelWhirr, playGarden, playPebble } from '../sound';

// Jörg's garden, 1116 × 1999 (it fills the screen edge to edge), as the day goes: in daylight, in the golden evening, and at night under the lights
const MAPS = {
  day: [require('../../assets/garden/map-day.jpg'), '#5e693e'],
  evening: [require('../../assets/garden/map-evening.jpg'), '#62482f'],
  night: [require('../../assets/garden/map-night.jpg'), '#0d1e28'],
};
const timeOfDay = (d = new Date()) => { const hash = typeof window !== 'undefined' && window.location ? window.location.hash || '' : ''; if (/night|evening|day/.test(hash)) return hash.match(/night|evening|day/)[0]; /* (web preview screenshots) */ const h = d.getHours(); return h >= 6 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night'; };
const MAP_AR = 1116 / 1999;
// the places to tap, as parts of the map (left, top, right, bottom)
const SPOTS = [
  { game: 'pebbles', box: [0.12, 0.17, 0.33, 0.27], label: 'The rocks' }, // the rock pile at the top
  { game: 'pebbles', box: [0.1, 0.74, 0.37, 0.9], label: 'The rocks' }, // the big rock pile at the bottom
  { game: 'sticks', box: [0.57, 0.1, 0.86, 0.28], label: 'The woodpile' }, // the sticks on the picnic table
  { game: 'sticks', box: [0.14, 0.08, 0.25, 0.13], label: 'The woodpile' }, // the wooden crate by the gate
  { game: 'pinwheel', box: [0.1, 0.3, 0.5, 0.46], label: 'The flowers' }, // the flower meadow along the path
];

export default function Garden({ u, openMenu, toast }) {
  const t = useT();
  const [game, setGame] = useState(null);
  const [area, setArea] = useState(null);
  const open = (g) => {
    setGame(g);
  };
  const [tod, setTod] = useState(timeOfDay());
  useEffect(() => { const id = setInterval(() => setTod(timeOfDay()), 60000); return () => clearInterval(id); }, []);
  const [MAP, MAP_BG] = MAPS[tod];
  let map = null;
  if (area) {
    const w = Math.max(area.w, area.h * MAP_AR), h = w / MAP_AR; // fills the screen (only the dark edge of the picture is cut)
    const l = (area.w - w) / 2, tp = (area.h - h) / 2;
    map = (
      <View style={{ position: 'absolute', left: l, top: tp, width: w, height: h }}>
        <Image source={MAP} style={{ width: w, height: h }} resizeMode="cover" />
        {tod === 'night' ? <Fireflies w={w} h={h} /> : null}
        {SPOTS.map((s, i) => (
          <Pressable key={i} onPress={withTap(() => open(s.game))} accessibilityRole="button" accessibilityLabel={t(s.label)}
            style={{ position: 'absolute', left: s.box[0] * w, top: s.box[1] * h, width: (s.box[2] - s.box[0]) * w, height: (s.box[3] - s.box[1]) * h }} />
        ))}
      </View>
    );
  }
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} vertical={v} /></Bar>}>
      <View style={{ flex: 1, backgroundColor: MAP_BG }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
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
const STONES = [
  [require('../../assets/garden/pebble-1.png'), 154, 191],
  [require('../../assets/garden/pebble-2.png'), 189, 206],
  [require('../../assets/garden/pebble-3.png'), 240, 150],
  [require('../../assets/garden/pebble-4.png'), 221, 240],
  [require('../../assets/garden/pebble-5.png'), 146, 168],
  [require('../../assets/garden/pebble-6.png'), 221, 159],
  [require('../../assets/garden/pebble-7.png'), 240, 214],
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
  const S = useRef({}); S.current = { hand, W, H, base, handX, handY };

  const throwTo = (fromX, fromY, toX, toY, power) => {
    const { hand: k, H: h, base: b } = S.current;
    // further away is smaller (the beach seen at a slant): the size where it lands
    const depth = Math.max(0, Math.min(1, toY / h));
    const s1 = b * (0.6 + 0.45 * depth);
    const p = new Animated.Value(0);
    const settle = new Animated.Value(0);
    const rot = Math.round((Math.random() - 0.5) * 140);
    const id = nextId++;
    const st = { id, k, x: toX, y: toY, size: s1, p, settle, fromX, fromY, s0: b, rot, arc: 70 + 160 * power, fade: new Animated.Value(1) };
    setStones((list) => {
      const out = [...list, st];
      if (out.length > MAX_ON_BEACH) { const old = out[0]; Animated.timing(old.fade, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => setStones((l) => l.filter((x) => x.id !== old.id))); }
      return out;
    });
    const dur = 480 + 320 * power;
    Animated.timing(p, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }).start(() => {
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
    onPanResponderGrant: (e) => { S.current.start = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, onHand: Math.hypot(e.nativeEvent.locationX - S.current.handX, e.nativeEvent.locationY - S.current.handY) < S.current.base }; },
    onPanResponderMove: (e, g) => { if (S.current.start && S.current.start.onHand) drag.setValue({ x: g.dx, y: g.dy }); },
    onPanResponderRelease: (e, g) => {
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
  const hk = base / Math.max(handStone[1], handStone[2]);
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
            <Animated.View key={st.id} pointerEvents="none" style={{ position: 'absolute', left: st.x - w / 2, top: st.y - hh / 2, width: w, height: hh, opacity: st.fade }}>
              {/* its shadow on the beach: far below it while it flies, tucked under it once it lands */}
              <Animated.Image source={img} style={{ position: 'absolute', left: w * 0.06, top: hh * 0.1, width: w, height: hh, tintColor: '#000',
                opacity: st.p.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.6] }), transform: [{ translateX: tx }, { translateY: groundY }, { scale }, { rotate: rot }] }} />
              <Animated.Image source={img} style={{ width: w, height: hh, transform: [{ translateX: tx }, { translateY: ty }, { scale }, { scaleY: squash }, { rotate: rot }] }} />
            </Animated.View>
          );
        })}
        {/* the pebble in the hand, waiting at the bottom */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: handX - (handStone[1] * hk) / 2, top: handY - (handStone[2] * hk) / 2,
          transform: [{ translateX: drag.x }, { translateY: drag.y }, { scale: handIn }] }}>
          <Image source={handStone[0]} style={{ position: 'absolute', left: 6, top: 10, width: handStone[1] * hk, height: handStone[2] * hk, tintColor: '#000', opacity: 0.42 }} />
          <Image source={handStone[0]} style={{ width: handStone[1] * hk, height: handStone[2] * hk }} />
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
function scatter(W, H, len) {
  // every stick somewhere on the felt, at a slant, not too close to the edges
  return STICKS.map((st, k) => {
    const L = (st[1] / LONGEST) * len;
    const a = Math.round(Math.random() * 180 - 90), r = (a * Math.PI) / 180;
    const hx = Math.abs(Math.cos(r)) * L / 2 + 14, hy = Math.abs(Math.sin(r)) * L / 2 + 24; // keep the whole stick on the felt
    return { k, x: hx + Math.random() * Math.max(1, W - 2 * hx), y: hy + Math.random() * Math.max(1, H - 2 * hy), a };
  });
}
function Driftwood({ area, onBack }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const len = Math.min(W, H) * 0.62; // the longest stick, on screen
  const sticks = useRef(null);
  if (!sticks.current) {
    sticks.current = scatter(W, H, len).map((p) => ({ ...p, pos: new Animated.ValueXY({ x: p.x, y: p.y }), rot: new Animated.Value(p.a), lift: new Animated.Value(0) }));
  }
  const [order, setOrder] = useState(() => sticks.current.map((s) => s.k)); // drawn in this order (the last one on top)
  const S = useRef({}); S.current.order = order;
  const sizeOf = (k) => { const [, iw, ih] = STICKS[k]; const L = (iw / LONGEST) * len; return [L, L * ih / iw]; };
  // is the point on this stick? (measured along it and across it, a little generous so thin sticks are easy to grab)
  const hit = (s, x, y) => {
    const [L, T] = sizeOf(s.k);
    const r = (-s.a * Math.PI) / 180, dx = x - s.x, dy = y - s.y;
    const u = dx * Math.cos(r) - dy * Math.sin(r), v = dx * Math.sin(r) + dy * Math.cos(r);
    return Math.abs(u) <= L / 2 + 8 && Math.abs(v) <= Math.max(T / 2, 22);
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
      if (Math.hypot(g.dx, g.dy) < 8) { // a tap: turn it a little
        s.a += 30;
        Animated.spring(s.rot, { toValue: s.a, friction: 7, tension: 80, useNativeDriver: true }).start();
      } else {
        s.x = Math.max(0, Math.min(W, S.current.start.x + g.dx)); s.y = Math.max(0, Math.min(H, S.current.start.y + g.dy));
        s.pos.setValue({ x: s.x, y: s.y });
      }
      Animated.timing(s.lift, { toValue: 0, duration: 140, useNativeDriver: true }).start();
      playGarden('stick');
    },
  })).current;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={FELT} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        {order.map((k) => {
          const s = sticks.current[k];
          const [L, T] = sizeOf(k);
          const rot = s.rot.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] });
          const scale = s.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
          const sh = s.lift.interpolate({ inputRange: [0, 1], outputRange: [2, 7] });
          return (
            <Animated.View key={k} pointerEvents="none" style={{ position: 'absolute', left: -L / 2, top: -T / 2, width: L, height: T,
              transform: [{ translateX: s.pos.x }, { translateY: s.pos.y }, { rotate: rot }, { scale }] }}>
              {/* its shadow on the felt: its own shape, darker, lifting further away while it's held */}
              <Animated.Image source={STICKS[k][0]} style={{ position: 'absolute', left: 0, top: 0, width: L, height: T, tintColor: '#000', opacity: 0.55, transform: [{ translateX: sh }, { translateY: sh }] }} />
              <Image source={STICKS[k][0]} style={{ width: L, height: T }} />
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
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -14, top: -14, width: 28, height: 28, opacity: glow, transform: [{ translateX: x }, { translateY: y }] }}>
      {/* a soft halo and a bright little heart */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(220,255,140,0.13)' }} />
      <View style={{ position: 'absolute', left: 7, top: 7, width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(225,255,150,0.28)' }} />
      <View style={{ position: 'absolute', left: 11.5, top: 11.5, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#f4ffc8', shadowColor: '#e6ff9a', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
    </Animated.View>
  );
}
function Fireflies({ w, h }) {
  return <>{[0, 1, 2, 3, 4, 5].map((i) => <Firefly key={i} w={w} h={h} delay={i * 1300 + Math.random() * 1500} />)}</>;
}
