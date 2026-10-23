// The Garden: a secret place below My Library (a grown-up unlocks it in Settings → The Garden). A garden seen from
// above; tap a place in it to play there. Calm nature games, nothing to win:
//   the rocks: throw felt pebbles onto the pebble beach and hear them land
//   the woodpile: arrange driftwood sticks (coming)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { colors } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { playPebble } from '../sound';

const MAP = require('../../assets/garden/map.jpg'); // Jörg's placeholder garden, 1116 × 2000
const MAP_AR = 1116 / 2000;
// the places to tap, as parts of the map (left, top, right, bottom)
const SPOTS = [
  { game: 'pebbles', box: [0.16, 0.235, 0.35, 0.31], label: 'The rocks' }, // the rock pile at the top
  { game: 'pebbles', box: [0.13, 0.76, 0.38, 0.885], label: 'The rocks' }, // the big rock pile at the bottom
  { game: 'sticks', box: [0.33, 0.72, 0.43, 0.77], label: 'The woodpile' },
];

export default function Garden({ u, openMenu, toast }) {
  const t = useT();
  const [game, setGame] = useState(null);
  const [area, setArea] = useState(null);
  const open = (g) => {
    if (g === 'sticks') { toast && toast(t('The driftwood is still drying in the sun. Come back soon.'), 3500); return; }
    setGame(g);
  };
  let map = null;
  if (area) {
    const w = Math.min(area.w, area.h * MAP_AR), h = w / MAP_AR;
    const l = (area.w - w) / 2, tp = (area.h - h) / 2;
    map = (
      <View style={{ position: 'absolute', left: l, top: tp, width: w, height: h }}>
        <Image source={MAP} style={{ width: w, height: h }} resizeMode="cover" />
        {SPOTS.map((s, i) => (
          <Pressable key={i} onPress={withTap(() => open(s.game))} accessibilityRole="button" accessibilityLabel={t(s.label)}
            style={{ position: 'absolute', left: s.box[0] * w, top: s.box[1] * h, width: (s.box[2] - s.box[0]) * w, height: (s.box[3] - s.box[1]) * h }} />
        ))}
      </View>
    );
  }
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} vertical={v} /></Bar>}>
      <View style={{ flex: 1, backgroundColor: '#5d6b3a' }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {map}
        {game === 'pebbles' && area ? <Pebbles area={area} onBack={() => setGame(null)} /> : null}
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
  const base = Math.min(W, H) * 0.2; // a pebble in the hand, across its longest side
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
    const s1 = b * (0.48 + 0.42 * depth);
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
      <Image source={BEACH} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
              <Animated.View style={{ position: 'absolute', left: w * 0.08, top: hh * 0.16, width: w * 0.92, height: hh * 0.92, borderRadius: Math.max(w, hh), backgroundColor: 'rgba(0,0,0,0.38)',
                opacity: st.p.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }), transform: [{ translateX: tx }, { translateY: groundY }, { scale }] }} />
              <Animated.Image source={img} style={{ width: w, height: hh, transform: [{ translateX: tx }, { translateY: ty }, { scale }, { scaleY: squash }, { rotate: rot }] }} />
            </Animated.View>
          );
        })}
        {/* the pebble in the hand, waiting at the bottom */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: handX - (handStone[1] * hk) / 2, top: handY - (handStone[2] * hk) / 2,
          transform: [{ translateX: drag.x }, { translateY: drag.y }, { scale: handIn }] }}>
          <View style={{ position: 'absolute', left: 6, top: 10, width: handStone[1] * hk, height: handStone[2] * hk, borderRadius: base, backgroundColor: 'rgba(0,0,0,0.4)' }} />
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
