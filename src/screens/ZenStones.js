// Zen stones in the Garden (Jörg, 7 Nov 2026): Jörg's eight felt stones lying on the felt. Slide them anywhere with a
// finger; one you hold lifts, with its shadow further away, and settles back down with a soft stone sound. A stone
// pushed into another nudges it gently out of the way. Tap one to turn it a little. Nothing to win.
import React, { useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { playPebble } from '../sound';

const FELT = require('../../assets/desk-felt.jpg');
// [picture, how big it is next to the biggest]
const STONES = [
  [require('../../assets/garden/stones/cream.png'), 0.92], [require('../../assets/garden/stones/grey.png'), 0.95],
  [require('../../assets/garden/stones/charcoal.png'), 1.0], [require('../../assets/garden/stones/sand.png'), 0.85],
  [require('../../assets/garden/stones/taupe.png'), 0.98], [require('../../assets/garden/stones/moss.png'), 0.9],
  [require('../../assets/garden/stones/rust.png'), 0.8], [require('../../assets/garden/stones/speckle.png'), 0.88],
];

export default function ZenStones({ area, onBack }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const big = Math.min(W, H) * 0.3; // the biggest stone across
  const stones = useRef(null);
  if (!stones.current) {
    // scattered loosely over the felt, never quite on top of each other
    const placed = [];
    stones.current = STONES.map(([, sc], k) => {
      const r = (big * sc) / 2;
      let x = W / 2, y = H / 2;
      for (let n = 0; n < 80; n += 1) {
        x = r + 12 + Math.random() * (W - 2 * r - 24); y = r + 90 + Math.random() * (H - 2 * r - 160);
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + r + 10)) break;
      }
      const s = { k, r, x, y, a: Math.round(Math.random() * 360), pos: new Animated.ValueXY({ x, y }), rot: new Animated.Value(0), lift: new Animated.Value(0) };
      s.rot.setValue(s.a);
      placed.push(s);
      return s;
    });
  }
  const [order, setOrder] = useState(() => stones.current.map((s) => s.k)); // the last one is on top
  const S = useRef({}); S.current.order = order;
  // a stone let go overlapping others nudges them just clear of it (and they nudge theirs, a little)
  const nudge = (s) => {
    let moved = false;
    for (let pass = 0; pass < 3; pass += 1) {
      for (const o of stones.current) {
        if (o === s) continue;
        const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy) || 1, need = (o.r + s.r) * 0.86;
        if (d < need) {
          const push = need - d;
          o.x = Math.max(o.r, Math.min(W - o.r, o.x + (dx / d) * push)); o.y = Math.max(o.r + 70, Math.min(H - o.r, o.y + (dy / d) * push));
          Animated.spring(o.pos, { toValue: { x: o.x, y: o.y }, friction: 9, tension: 60, useNativeDriver: true }).start();
          moved = true;
        }
      }
    }
    return moved;
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX, y = e.nativeEvent.locationY;
      const ord = S.current.order;
      let picked = null;
      for (let n = ord.length - 1; n >= 0; n -= 1) { const s = stones.current[ord[n]]; if (Math.hypot(s.x - x, s.y - y) < s.r * 0.9) { picked = s; break; } }
      S.current.picked = picked;
      if (!picked) return;
      S.current.start = { x: picked.x, y: picked.y };
      setOrder((o) => [...o.filter((k) => k !== picked.k), picked.k]);
      Animated.timing(picked.lift, { toValue: 1, duration: 140, useNativeDriver: true }).start();
    },
    onPanResponderMove: (e, g) => {
      const s = S.current.picked; if (!s) return;
      s.pos.setValue({ x: S.current.start.x + g.dx, y: S.current.start.y + g.dy });
    },
    onPanResponderRelease: (e, g) => {
      const s = S.current.picked; if (!s) return;
      S.current.picked = null;
      if (Math.hypot(g.dx, g.dy) < 8) { // a tap: it turns a little
        s.a += 25;
        Animated.spring(s.rot, { toValue: s.a, friction: 7, tension: 70, useNativeDriver: true }).start();
      } else {
        s.x = Math.max(s.r * 0.5, Math.min(W - s.r * 0.5, S.current.start.x + g.dx)); s.y = Math.max(s.r * 0.5 + 60, Math.min(H - s.r * 0.5, S.current.start.y + g.dy));
        Animated.spring(s.pos, { toValue: { x: s.x, y: s.y }, friction: 8, tension: 80, useNativeDriver: true }).start();
      }
      Animated.timing(s.lift, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      const bumped = nudge(s);
      playPebble(bumped ? 0.55 : 0.35);
    },
    onPanResponderTerminate: () => { const s = S.current.picked; S.current.picked = null; if (s) Animated.timing(s.lift, { toValue: 0, duration: 160, useNativeDriver: true }).start(); },
  })).current;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={FELT} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        {order.map((k) => {
          const s = stones.current[k];
          const D = s.r * 2;
          const rot = s.rot.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] });
          const scale = s.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
          const sh = s.lift.interpolate({ inputRange: [0, 1], outputRange: [5, 18] });
          const shOp = s.lift.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.35] });
          return (
            <Animated.View key={k} pointerEvents="none" style={{ position: 'absolute', left: -D / 2, top: -D / 2, width: D, height: D, transform: [{ translateX: s.pos.x }, { translateY: s.pos.y }, { scale }] }}>
              {/* its shadow on the felt: further away while it's held */}
              <Animated.Image source={STONES[k][0]} resizeMode="contain" style={{ position: 'absolute', left: 0, top: 0, width: D, height: D, tintColor: '#000', opacity: shOp, transform: [{ translateX: sh }, { translateY: sh }, { rotate: rot }] }} />
              <Animated.Image source={STONES[k][0]} resizeMode="contain" style={{ width: D, height: D, transform: [{ rotate: rot }] }} />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  backChevron: { width: 12, height: 12, borderLeftWidth: 2.6, borderBottomWidth: 2.6, borderColor: colors.white, transform: [{ translateX: 2 }, { rotate: '45deg' }] },
});
