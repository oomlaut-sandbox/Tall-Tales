// Cover test (reached only from the end of Help): the notebook's cover opened the same way a book's cover
// opens in the reader (BookOpen.js), to try it out on the phone before it goes anywhere else.
// The same recipe as the book cover:
//   - the look of a 3D turn over the spine (perspective 2600), drawn with flat strips (no 3D at all)
//   - front and back faces swapped by opacity at the halfway point
//   - a darkening at mid-turn
//   - it follows the finger (swipe up to open, down to close) or turns by itself from a tap
//   - fully open, a flat still copy takes over (a layer turned exactly 180° can vanish on iPhone)
//   - every animation made once, so a redraw never swaps them mid-turn
//   - no shadow on the turning cover: the shadows sit on still shapes underneath (the page's own, and a
//     felt-coloured shape where the cover lands, growing in as it gets there)
// One change for the notebook: the leather's rounded corners are cut into the picture itself
// (leather-cover-round.png), so the turning cover needs no rounded clipping, and the mid-turn darkening is
// the same picture tinted black, so it keeps the rounded shape too.
import React, { useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, DESK_BG, DeskFelt } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { Fade } from '../components/PageView';
import { playSound } from '../sound';

const LEATHER = require('../../assets/leather-cover-round.png');
const TYPE = 'SpecialElite_400Regular';
const R_SPINE = 0.012, R_EDGE = 0.102; // the rounded corners, as a share of the square (same as the picture)

// The turn, worked out ahead of time: the cover is cut into thin strips across its width, and each strip is
// only moved and stretched (translate and scale, all flat) to where it would be seen if the cover were really
// turning in perspective. Nothing is turned in 3D, which is what made covers strobe and vanish on iPhone.
const STRIPS = 40;
const STEPS = 48; // samples of the turn
const EYE = 2600; // how far the eye is (the same perspective the book cover uses)
const TS = Array.from({ length: STEPS + 1 }, (_, k) => k / STEPS);
function stripTables(side) {
  const h = side / STRIPS;
  const proj = (d, th) => { const z = d * Math.sin(th); const f = EYE / (EYE - z); return { y: d * Math.cos(th) * f, f }; };
  const out = [];
  for (let i = 0; i < STRIPS; i++) {
    const ty = [], sy = [], sx = [];
    for (const t of TS) {
      const th = Math.PI * t;
      const a = proj(i * h, th), b = proj((i + 1) * h, th), m = proj((i + 0.5) * h, th);
      let k = (b.y - a.y) / h;
      if (Math.abs(k) < 0.001) k = k < 0 ? -0.001 : 0.001; // never exactly flat
      ty.push(a.y); sy.push(k * 1.02); sx.push(m.f); // (a hair taller, so neighbours always meet)
    }
    out.push({ ty, sy, sx });
  }
  return out;
}

export default function CoverTest({ u, openMenu }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState(null); // the space for the book
  const flip = useRef(new Animated.Value(0)).current; // 0 shut, 1 open
  const A = useRef({
    turn: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
    frontOp: flip.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] }),
    backOp: flip.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] }),
    // darker only while it stands up; none at all near either end (it showed as a dark moment just before shutting)
    shade: flip.interpolate({ inputRange: [0, 0.3, 0.5, 0.7, 1], outputRange: [0, 0, 0.22, 0, 0], extrapolate: 'clamp' }),
    landShadow: flip.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    // fully open, a turned layer can vanish on iPhone (at exactly 180° it isn't drawn), so the last sliver of the
    // turn hands over to a flat, still copy of the open cover (the same trick the book cover uses when it lands)
    // the same at the shut end: the last sliver of closing hands over to a flat, still shut cover
    leafOp: flip.interpolate({ inputRange: [0, 0.015, 0.985, 1], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' }),
    shutOp: flip.interpolate({ inputRange: [0, 0.015], outputRange: [1, 0], extrapolate: 'clamp' }),
    flatOp: flip.interpolate({ inputRange: [0, 0.985, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
  }).current;
  const openNow = useRef(false);
  const busy = useRef(false);
  const [runs, setRuns] = useState(0);
  // turn the rest of the way, from wherever it is now, to open (1) or shut (0)
  const settle = (to, from) => {
    busy.current = true;
    if (to && !openNow.current) playSound('coverOpen');
    if (!to && openNow.current) playSound('coverClose');
    const left = Math.abs(to - from);
    Animated.timing(flip, { toValue: to, duration: Math.max(180, (to ? 1100 : 1000) * left), easing: left > 0.9 ? Easing.inOut(Easing.cubic) : Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      openNow.current = !!to; busy.current = false; setRuns((n) => n + 1);
    });
  };
  // a tap anywhere on it (a corner too) opens or closes it
  const toggle = () => { if (!busy.current) settle(openNow.current ? 0 : 1, openNow.current ? 1 : 0); };
  // or the finger: the cover follows it the whole way (up opens, down closes); let go past halfway and it
  // falls open, otherwise it settles back (a quick flick counts too)
  const sideRef = useRef(1);
  const stripMemo = useRef({ side: 0, list: [] });
  const drag = useRef({ start: 0, v: 0 });
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !busy.current && Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { drag.current.start = openNow.current ? 1 : 0; drag.current.v = drag.current.start; },
    onPanResponderMove: (_, g) => {
      const v = Math.max(0, Math.min(1, drag.current.start + -g.dy / (sideRef.current * 1.3)));
      drag.current.v = v; flip.setValue(v);
    },
    onPanResponderRelease: (_, g) => {
      const v = drag.current.v;
      const to = g.vy < -0.5 ? 1 : g.vy > 0.5 ? 0 : v > 0.5 ? 1 : 0;
      settle(to, v);
    },
    onPanResponderTerminate: () => settle(drag.current.start, drag.current.v),
  })).current;

  // the book: two squares stacked (the open cover above, the page below), as big as fits
  const side = box ? Math.floor(Math.min(box.w - 40, (box.h - 70) / 2)) : 0;
  sideRef.current = side || 1;
  const left = box ? (box.w - side) / 2 : 0, top = box ? (box.h - 2 * side) / 2 + 10 : 0;
  const pageRound = { borderTopLeftRadius: side * R_SPINE, borderTopRightRadius: side * R_SPINE, borderBottomLeftRadius: side * R_EDGE, borderBottomRightRadius: side * R_EDGE };
  const landRound = { borderBottomLeftRadius: side * R_SPINE, borderBottomRightRadius: side * R_SPINE, borderTopLeftRadius: side * R_EDGE, borderTopRightRadius: side * R_EDGE };
  const shadow = { shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 };
  if (side && stripMemo.current.side !== side) {
    stripMemo.current = { side, list: stripTables(side).map((tb) => ({
      transform: [
        { translateY: flip.interpolate({ inputRange: TS, outputRange: tb.ty }) },
        { scaleX: flip.interpolate({ inputRange: TS, outputRange: tb.sx }) },
        { scaleY: flip.interpolate({ inputRange: TS, outputRange: tb.sy }) },
      ],
    })) };
  }
  const strips = stripMemo.current.list;
  const h = side / STRIPS;
  const leather = <Image source={LEATHER} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="stretch" />;

  return (
    <WithBar style={{ flex: 1, backgroundColor: 'transparent' }} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={{ flex: 1, paddingTop: insets.top }} onLayout={(e) => { const { width: w, height: h } = e.nativeEvent.layout; setBox({ w, h: h - insets.top }); }}>
        <Text style={styles.note}>Cover test: the book-cover method. Tap the notebook (or a corner) or swipe it up and down to open and close it.</Text>
        {box && side > 0 ? (
          <View style={{ position: 'absolute', left, top: insets.top + top, width: side, height: 2 * side }}>
            {/* where the open cover lands: a still felt-coloured shape with the shadow, growing in as it arrives */}
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: side, height: side, backgroundColor: DESK_FELT ? '#262626' : DESK_BG, opacity: A.landShadow }, shadow, landRound]}>
              <View style={[StyleSheet.absoluteFill, landRound, { overflow: 'hidden' }]}><DeskFelt spot="covertestPlate" /></View>
            </Animated.View>
            {/* the page (still, with its own shadow and a soft spine shadow along the fold) */}
            <View style={[{ position: 'absolute', left: 0, top: side, width: side, height: side, backgroundColor: '#f4f2ed', alignItems: 'center', justifyContent: 'center' }, shadow, pageRound]}>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, pageRound, { overflow: 'hidden' }]}><Fade edge="top" size={Math.round(side * 0.17)} max={0.32} /></View>
              <Text style={{ fontFamily: TYPE, fontSize: side * 0.068, color: '#2b2b2b' }}>My Notes</Text>
            </View>
            {/* the cover: hinged on the page's top edge, turning up over it */}
            {/* (the finger is followed by the box; a tap on it, a corner too, is the Pressable inside) */}
            <View {...swipe.panHandlers} style={{ position: 'absolute', left: 0, top: 0, width: side, height: 2 * side, zIndex: 5 }}>
              <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Open or close the notebook" style={StyleSheet.absoluteFill} />
            </View>
            {/* the shut cover lying flat on the page (shown only while it's all the way shut) */}
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: side, width: side, height: side, zIndex: 4, opacity: A.shutOp }}>{leather}</Animated.View>
            {/* the open cover lying flat (shown only once it's all the way open) */}
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: side, height: side, zIndex: 4, opacity: A.flatOp, transform: [{ scaleY: -1 }] }}>
              {leather}
              <Fade edge="top" size={Math.round(side * 0.24)} max={0.55} />
            </Animated.View>
            {/* the turning cover: strips, each only moved and stretched (see stripTables) */}
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: side, width: side, height: side, zIndex: 4, opacity: A.leafOp }}>
              {strips.map((st, n) => (
                <Animated.View key={n} style={{ position: 'absolute', left: 0, top: 0, width: side, height: h, overflow: 'hidden', transformOrigin: 'top', transform: st.transform }}>
                  <View style={{ position: 'absolute', left: 0, top: -n * h, width: side, height: side }}>
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: A.frontOp }]}>{leather}</Animated.View>
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: A.backOp }]}>
                      {leather}
                      {n * h < side * 0.24 ? <Fade edge="top" size={Math.round(side * 0.24)} max={0.55} /> : null}
                    </Animated.View>
                    <Animated.Image source={LEATHER} resizeMode="stretch" style={{ position: 'absolute', left: 0, top: 0, width: side, height: side, tintColor: '#000', opacity: A.shade }} />
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          </View>
        ) : null}
        <Text style={[styles.note, { position: 'absolute', left: 0, right: 0, bottom: 8 }]}>{runs ? `${runs} turn${runs > 1 ? 's' : ''}` : ' '}</Text>
      </View>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  note: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.ui, fontSize: 13, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
});
