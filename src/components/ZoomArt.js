// A book page's picture, with two ways to look closer (the words are not affected):
// - pinch with two fingers to zoom in; let go and it springs back,
// - touch and hold one finger on the picture for a round magnifying glass that follows the finger.
// While either is happening, the reader doesn't treat the movement as a page-turning swipe.
import React, { useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

export const artGesture = { active: false }; // read by the reader's swipe handling

const HOLD_MS = 220; // how long to hold before the magnifying glass appears
const LOUPE = 128; // magnifying glass size (points)
const LOUPE_ZOOM = 2.4;
const MAX_ZOOM = 4;

const dist = (a, b) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
const mid = (a, b) => ({ x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 });

export default function ZoomArt({ source, width, height, enabled = true, children }) {
  const box = useRef(null);
  const origin = useRef({ x: 0, y: 0 }); // the picture's position on screen
  const s = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const g = useRef({ mode: null, d0: 0, f0: null, start: null, timer: null });
  const [loupe, setLoupe] = useState(null); // {x, y} inside the picture

  const measure = () => box.current && box.current.measureInWindow((x, y) => { origin.current = { x, y }; });
  const local = (t) => ({ x: t.pageX - origin.current.x, y: t.pageY - origin.current.y });

  const startPinch = (a, b) => {
    clearTimeout(g.current.timer);
    setLoupe(null);
    const m = mid(a, b);
    g.current.mode = 'pinch';
    g.current.d0 = Math.max(10, dist(a, b));
    // the pinch point, measured from the picture's centre
    g.current.f0 = { x: m.x - origin.current.x - width / 2, y: m.y - origin.current.y - height / 2 };
    artGesture.active = true;
  };
  const reset = () => {
    clearTimeout(g.current.timer);
    g.current.mode = null;
    artGesture.active = false;
    setLoupe(null);
    Animated.parallel([
      Animated.spring(s, { toValue: 1, useNativeDriver: false, friction: 7 }),
      Animated.spring(tx, { toValue: 0, useNativeDriver: false, friction: 7 }),
      Animated.spring(ty, { toValue: 0, useNativeDriver: false, friction: 7 }),
    ]).start();
  };

  const handlers = enabled ? {
    onStartShouldSetResponder: () => true,
    onResponderTerminationRequest: () => !g.current.mode, // keep the touch while zooming or magnifying
    onResponderGrant: (e) => {
      measure();
      const ts = e.nativeEvent.touches;
      if (ts.length >= 2) return startPinch(ts[0], ts[1]);
      const t = ts[0] || e.nativeEvent;
      g.current.start = { pageX: t.pageX, pageY: t.pageY };
      clearTimeout(g.current.timer);
      g.current.timer = setTimeout(() => {
        g.current.mode = 'loupe';
        artGesture.active = true;
        setLoupe(local(g.current.start));
      }, HOLD_MS);
    },
    onResponderMove: (e) => {
      const ts = e.nativeEvent.touches;
      if (ts.length >= 2) {
        if (g.current.mode !== 'pinch') startPinch(ts[0], ts[1]);
        const k = Math.max(1, Math.min(MAX_ZOOM, dist(ts[0], ts[1]) / g.current.d0));
        const m = mid(ts[0], ts[1]);
        const f = { x: m.x - origin.current.x - width / 2, y: m.y - origin.current.y - height / 2 };
        // keep the spot under the fingers under the fingers
        s.setValue(k); tx.setValue(f.x - k * g.current.f0.x); ty.setValue(f.y - k * g.current.f0.y);
        return;
      }
      const t = ts[0] || e.nativeEvent;
      if (g.current.mode === 'loupe') return setLoupe(local(t));
      if (!g.current.mode && g.current.start && dist(t, g.current.start) > 10) clearTimeout(g.current.timer); // a swipe, not a hold
    },
    onResponderRelease: reset,
    onResponderTerminate: reset,
  } : {};

  // The magnifying glass sits above the finger (or below it near the top of the picture).
  let glass = null;
  if (loupe) {
    const above = loupe.y - LOUPE * 0.9 > 0;
    const cx = Math.max(LOUPE / 2, Math.min(width - LOUPE / 2, loupe.x));
    const cy = above ? loupe.y - LOUPE * 0.75 : loupe.y + LOUPE * 0.75;
    glass = (
      <View pointerEvents="none" style={[styles.loupe, { left: cx - LOUPE / 2, top: cy - LOUPE / 2 }]}>
        <Image source={source} resizeMode="cover"
          style={{ position: 'absolute', width: width * LOUPE_ZOOM, height: height * LOUPE_ZOOM, left: LOUPE / 2 - loupe.x * LOUPE_ZOOM, top: LOUPE / 2 - loupe.y * LOUPE_ZOOM }} />
      </View>
    );
  }

  return (
    <View ref={box} collapsable={false} style={{ position: 'absolute', left: 0, top: 0, width, height }} {...handlers}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width, height, transform: [{ translateX: tx }, { translateY: ty }, { scale: s }] }}>
        <Image source={source} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="cover" />
      </Animated.View>
      {children}
      {glass}
    </View>
  );
}

const styles = StyleSheet.create({
  loupe: {
    position: 'absolute', width: LOUPE, height: LOUPE, borderRadius: LOUPE / 2, overflow: 'hidden',
    borderWidth: 3, borderColor: '#ffffff', backgroundColor: '#7d7d7d',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
});
