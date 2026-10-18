// The notebook's leather cover turning over its spine: the method from the Cover test page, which works smoothly
// on iPhone. The cover is cut into thin strips, and each strip is only moved and stretched (translate and scale,
// all flat) to where it would be seen if the cover were really turning in perspective. Nothing is turned in 3D
// (a 3D-turned layer strobed, went dark and vanished on iPhone), there's no fading between copies (that went
// see-through), and the strips are the cover the whole time, shut and open too, always solid.
// The leather's rounded corners are cut into the picture itself, so nothing needs clipping as it turns.
//
// <StripCover p={anim} side={n} wide={bool} />, placed exactly where the shut cover lies:
//   p: Animated value, 0 shut (lying on its page) → 1 fully turned over
//   wide: the spine is on the left and it turns to the left (sideways); otherwise the spine is along the top and
//         it turns up
// It catches no touches (the screen puts its own touch areas on top).
import React, { useMemo } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { Fade } from './PageView';

export const LEATHER_ROUND = require('../../assets/leather-cover-round.png');
export const LEATHER_ROUND_WIDE = require('../../assets/leather-cover-wide-round.png');

const STRIPS = 40;
const STEPS = 48; // samples of the turn
const EYE = 7.9; // how far away the eye is, in cover widths (the same perspective the book cover uses)
const TS = Array.from({ length: STEPS + 1 }, (_, k) => k / STEPS);

// for each strip, through the turn: where its near edge is seen (along the turn), how stretched it is along the
// turn (negative once past upright: we see its back), and how much wider it looks (nearer the eye)
function tables(side) {
  const h = side / STRIPS, eye = side * EYE;
  const proj = (d, th) => { const z = d * Math.sin(th); const f = eye / (eye - z); return { a: d * Math.cos(th) * f, f }; };
  const out = [];
  for (let i = 0; i < STRIPS; i++) {
    const at = [], len = [], wid = [];
    for (const t of TS) {
      const th = Math.PI * t;
      const a = proj(i * h, th), b = proj((i + 1) * h, th), m = proj((i + 0.5) * h, th);
      let k = (b.a - a.a) / h;
      if (Math.abs(k) < 0.001) k = k < 0 ? -0.001 : 0.001; // never exactly flat
      at.push(a.a); len.push(k); wid.push(m.f);
    }
    out.push({ at, len, wid });
  }
  return out;
}

export default function StripCover({ p, side, wide, style }) {
  // everything is made once per size (a redraw never swaps the animations mid-turn)
  const A = useMemo(() => ({
    frontOp: p.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] }),
    backOp: p.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] }),
    // darker only while it stands up
    shade: p.interpolate({ inputRange: [0, 0.3, 0.5, 0.7, 1], outputRange: [0, 0, 0.22, 0, 0], extrapolate: 'clamp' }),
  }), [p]);
  const strips = useMemo(() => (side > 0 ? tables(side).map((tb) => (wide
    ? [{ translateX: p.interpolate({ inputRange: TS, outputRange: tb.at }) }, { scaleY: p.interpolate({ inputRange: TS, outputRange: tb.wid }) }, { scaleX: p.interpolate({ inputRange: TS, outputRange: tb.len }) }]
    : [{ translateY: p.interpolate({ inputRange: TS, outputRange: tb.at }) }, { scaleX: p.interpolate({ inputRange: TS, outputRange: tb.wid }) }, { scaleY: p.interpolate({ inputRange: TS, outputRange: tb.len }) }])) : []), [p, side, wide]);
  if (!(side > 0)) return null;
  const h = side / STRIPS;
  const src = wide ? LEATHER_ROUND_WIDE : LEATHER_ROUND;
  const leather = <Image source={src} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="stretch" />;
  return (
    <View pointerEvents="none" style={[{ width: side, height: side }, style]}>
      {/* (each strip runs on under the next one, which is drawn over it, so no seams ever show) */}
      {strips.map((transform, n) => {
        const len = n === STRIPS - 1 ? h : 2 * h;
        return (
          <Animated.View key={n} style={wide
            ? { position: 'absolute', left: 0, top: 0, width: len, height: side, overflow: 'hidden', transformOrigin: 'left', transform }
            : { position: 'absolute', left: 0, top: 0, width: side, height: len, overflow: 'hidden', transformOrigin: 'top', transform }}>
            <View style={{ position: 'absolute', left: wide ? -n * h : 0, top: wide ? 0 : -n * h, width: side, height: side }}>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: A.frontOp }]}>{leather}</Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: A.backOp }]}>
                {leather}
                {/* the deep spine shadow on the inside of the cover, along the edge it turns on */}
                {n * h < side * 0.24 ? <Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.24)} max={0.55} /> : null}
              </Animated.View>
              {/* darker as it stands up: the same picture tinted black, so it keeps the rounded corners */}
              <Animated.Image source={src} resizeMode="stretch" style={{ position: 'absolute', left: 0, top: 0, width: side, height: side, tintColor: '#000', opacity: A.shade }} />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
