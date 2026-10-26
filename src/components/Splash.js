// The opening film (Jörg, 26 Oct 2026): on the app's dark felt, a circle pops up out of nowhere in the middle of the
// screen (half the screen's width upright, half its height sideways). Once it's full size, Coro's clip plays inside
// it; when the clip ends, the circle closes to a point like the end of an old cartoon, and the felt fades away to
// the start page. A tap skips it. (Jörg's quicker clip, about 3 seconds.)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { DeskFelt } from '../look';

const CLIP = require('../../assets/splash/coro-splash.mp4');
const BG = '#3b3b3b'; // under the felt: the same grey as the phone's own launch screen (the app's dark felt is drawn over it)

export default function Splash({ onDone }) {
  const { width: W, height: H } = useWindowDimensions();
  const D = Math.round(Math.min(W, H) * 0.5); // the circle's full size
  const VH = D / 0.6; // the clip's height inside it (Coro fills the middle 60% of it)
  const grow = useRef(new Animated.Value(0)).current; // 0: nothing, 1: full size
  const fade = useRef(new Animated.Value(1)).current; // the whole thing, felt and all
  const [gone, setGone] = useState(false);
  const stage = useRef('in'); // 'in' → 'play' → 'out'
  const player = useVideoPlayer(CLIP, (p) => {
    p.loop = false;
    if (Platform.OS === 'web') p.muted = true; // (browsers only start a film by itself without sound)
    try { p.audioMixingMode = 'mixWithOthers'; } catch (e) {}
    // (it waits: the clip starts only once the circle is full size)
  });
  const close = () => {
    if (stage.current === 'out') return;
    stage.current = 'out';
    try { player.pause(); } catch (e) {}
    // the circle closes to a point (a little quicker at the end), a short beat, then the felt fades away
    Animated.sequence([
      Animated.timing(grow, { toValue: 0, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.delay(120),
      Animated.timing(fade, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => { setGone(true); onDone && onDone(); });
  };
  useEffect(() => {
    // out of nowhere: the circle springs up to full size, then the clip plays
    const t0 = setTimeout(() => {
      Animated.spring(grow, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start(() => {
        if (stage.current !== 'in') return;
        stage.current = 'play';
        try { player.currentTime = 0; player.play(); } catch (e) { close(); }
      });
    }, 250);
    const subs = [];
    try { subs.push(player.addListener('playToEnd', close)); } catch (e) {}
    try { subs.push(player.addListener('statusChange', ({ status }) => { if (status === 'error') close(); })); } catch (e) {}
    const safety = setTimeout(close, 9000); // never stuck on it
    return () => { clearTimeout(t0); clearTimeout(safety); subs.forEach((x) => { try { x.remove(); } catch (e) {} }); try { player.pause(); } catch (e) {} };
  }, [player]);
  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 500, backgroundColor: BG, opacity: fade, alignItems: 'center', justifyContent: 'center' }]}>
      <DeskFelt spot="splash" overlay />
      <Animated.View style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: '#c9c7c4', transform: [{ scale: grow }],
        shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>
        <View style={{ flex: 1, borderRadius: D / 2, overflow: 'hidden', backgroundColor: '#c8c3be' }}>
          {/* the upright clip, sized so all of Coro fits in the circle (a little of the felt shows at the sides) */}
          <VideoView player={player} style={{ position: 'absolute', width: VH * 720 / 1280, height: VH, left: (D - VH * 720 / 1280) / 2, top: D / 2 - 0.53 * VH }} contentFit="cover" nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />
        </View>
      </Animated.View>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Skip" />
    </Animated.View>
  );
}
