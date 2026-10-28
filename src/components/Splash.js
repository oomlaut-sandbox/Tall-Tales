// The opening film (Jörg, 26 Oct 2026): Coro unfolds and winks, at the start of every session. A tap skips it;
// when it ends it fades away to the start page. (Jörg's quicker clip, played 1.5 times as fast: about 3 seconds, 26 Oct 2026)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { reduceMotion } from '../a11y';

const CLIP = require('../../assets/splash/coro-splash.mp4');
const BG = '#c9c7c4'; // the light grey felt the clip is filmed on (no dark flash before the first frame)

export default function Splash({ onDone }) {
  const { width: W, height: H } = useWindowDimensions();
  const fade = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);
  const leaving = useRef(false);
  // the end (Jörg, 28 Oct 2026): a black circle snaps shut on the middle of the screen (0.3 s, slow start, quick
  // finish), a beat of black, then the start page fades up slowly from black (1.4 s)
  // the end (Jörg, 28 Oct 2026): a straight cut to black, a moment of black, then the start page fades up slowly
  const [black, setBlack] = useState(false);
  const done = useRef(false);
  const end = () => { if (done.current) return; done.current = true; setGone(true); onDone && onDone(); };
  const fadeUp = (ms) => { setTimeout(end, ms + 600); /* never stuck over the start page */ Animated.timing(fade, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start(end); };
  const finish = (quiet) => {
    if (leaving.current) return;
    leaving.current = true;
    try { player.pause(); } catch (e) {}
    if (quiet === true || reduceMotion()) { fadeUp(450); return; } // (Reduce Motion: a gentle fade)
    setBlack(true);
    setTimeout(() => fadeUp(1600), 500);
  };
  const player = useVideoPlayer(CLIP, (p) => {
    p.loop = false;
    try { p.audioMixingMode = 'mixWithOthers'; } catch (e) {}
    p.play();
  });
  useEffect(() => {
    const subs = [];
    try { subs.push(player.addListener('playToEnd', () => finish())); } catch (e) {}
    try { subs.push(player.addListener('statusChange', ({ status }) => { if (status === 'readyToPlay') { try { player.play(); } catch (e) {} } if (status === 'error') finish(true); })); } catch (e) {}
    if (reduceMotion()) { const q = setTimeout(() => finish(true), 250); return () => clearTimeout(q); } // Reduce Motion: no film by itself, straight to the start page
    const safety = setTimeout(() => finish(), 7000); // never stuck on it
    return () => { clearTimeout(safety); subs.forEach((x) => { try { x.remove(); } catch (e) {} }); try { player.pause(); } catch (e) {} };
  }, [player]);
  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 500, backgroundColor: BG, opacity: fade }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit={W > H ? 'contain' : 'cover'} /* sideways: the whole upright clip, on its own grey felt colour */ nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />
      {black ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : null}
      <Pressable style={StyleSheet.absoluteFill} pointerEvents={leaving.current ? 'none' : 'auto'} onPress={() => finish()} accessibilityRole="button" accessibilityLabel="Skip" />
    </Animated.View>
  );
}
