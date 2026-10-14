// Opening logo animation (placeholder until Jörg's reference image arrives).
// Two light grey circles side by side, like the oomlaut logo. They orbit around each other once,
// as if turning in 3D (the one in front is a little bigger, lower and brighter) while staying flat
// discs, then settle back exactly where they started and the app fades in.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const DOT = 56; // circle diameter
const GAP = 84; // distance between the two centres
const TILT = 0.32; // how far the orbit seems tipped toward us (0 = edge-on, 1 = seen from above)
const DEPTH = 0.16; // how much bigger the front circle gets
const N = 49; // sample points around the orbit

function tables(phase) {
  const input = [], x = [], y = [], s = [], front = [], back = [];
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1);
    const a = phase + p * Math.PI * 2;
    const z = Math.sin(a); // +1 nearest the viewer
    input.push(p);
    x.push((GAP / 2) * Math.cos(a));
    y.push((GAP / 2) * TILT * z);
    s.push(1 + DEPTH * z);
    front.push(z > 0 ? 1 : 0);
    back.push(z > 0 ? 0 : 0.72 + 0.28 * (1 + z));
  }
  return { input, x, y, s, front, back };
}
const LEFT = tables(Math.PI); // starts on the left
const RIGHT = tables(0); // starts on the right

export default function Intro({ onDone }) {
  const p = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const run = Animated.sequence([
      Animated.delay(250),
      Animated.timing(p, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]);
    run.start(() => onDone && onDone());
    return () => run.stop();
  }, []);

  // Each circle is drawn twice: a copy under everything (shown while it's behind) and a copy on top
  // (shown while it's in front), so whichever is nearer always overlaps the other.
  const dot = (t, layer, key) => {
    const ip = (arr) => p.interpolate({ inputRange: t.input, outputRange: arr });
    return (
      <Animated.View key={key} style={[styles.dot, {
        opacity: ip(layer === 'front' ? t.front : t.back),
        transform: [{ translateX: ip(t.x) }, { translateY: ip(t.y) }, { scale: ip(t.s) }],
      }]} />
    );
  };
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade }]}>
      <View style={styles.stage}>
        {dot(LEFT, 'back', 'lb')}
        {dot(RIGHT, 'back', 'rb')}
        {dot(LEFT, 'front', 'lf')}
        {dot(RIGHT, 'front', 'rf')}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  stage: { width: GAP + DOT * 1.4, height: DOT * 1.6, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#d4d4d4' },
});
