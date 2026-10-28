// The opening film (Jörg, 26 Oct 2026): Coro unfolds and winks, at the start of every session. A tap skips it;
// when it ends it fades away to the start page. (Jörg's quicker clip, played 1.5 times as fast: about 3 seconds, 26 Oct 2026)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { reduceMotion } from '../a11y';
// Skia on the phone only (the web preview just fades)
const SK = Platform.OS === 'web' ? null : require('@shopify/react-native-skia');

// the screen in black with a round hole of radius r in the middle
const irisPath = (W, H, r) => {
  const { Skia } = SK;
  const p = Skia.Path.Make();
  p.addRect(Skia.XYWHRect(0, 0, W, H));
  if (r > 0.5) p.addCircle(W / 2, H / 2, r);
  return p;
};

const CLIP = require('../../assets/splash/coro-splash.mp4');
const BG = '#c9c7c4'; // the light grey felt the clip is filmed on (no dark flash before the first frame)

export default function Splash({ onDone }) {
  const { width: W, height: H } = useWindowDimensions();
  const fade = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);
  const leaving = useRef(false);
  // the end (Jörg, 28 Oct 2026): a black circle snaps shut on the middle of the screen (0.3 s, slow start, quick
  // finish), a beat of black, then the start page fades up slowly from black (1.4 s)
  // (drawn with Skia, a black screen with a round hole: a huge bordered view broke on the iPad Pro, 28 Oct 2026)
  const R0 = Math.ceil(Math.hypot(W, H) / 2) + 10;
  const [hole, setHole] = useState(null); // the circle's radius while it closes (null: not closing)
  const done = useRef(false);
  const end = () => { if (done.current) return; done.current = true; setGone(true); onDone && onDone(); };
  const fadeUp = (ms) => { setTimeout(end, ms + 600); /* never stuck over the start page */ Animated.timing(fade, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start(end); };
  const finish = (quiet) => {
    if (leaving.current) return;
    leaving.current = true;
    try { player.pause(); } catch (e) {}
    if (quiet === true || reduceMotion() || !SK) { fadeUp(450); return; } // (Reduce Motion: no circle, a gentle fade)
    const t0 = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / 300);
      setHole(R0 * (1 - Math.pow(k, 2.2)));
      if (k < 1) requestAnimationFrame(step); else setTimeout(() => fadeUp(1400), 270);
    };
    setHole(R0); requestAnimationFrame(step);
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
      {hole != null && SK ? (
        <SK.Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          <SK.Path path={irisPath(W, H, hole)} color="#000000" fillType="evenOdd" />
        </SK.Canvas>
      ) : null}
      <Pressable style={StyleSheet.absoluteFill} pointerEvents={leaving.current ? 'none' : 'auto'} onPress={() => finish()} accessibilityRole="button" accessibilityLabel="Skip" />
    </Animated.View>
  );
}
