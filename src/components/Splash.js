// The opening film (Jörg, 26 Oct 2026): Coro unfolds and winks, at the start of every session. A tap skips it;
// when it ends it fades away to the start page. (Jörg's quicker clip, played 1.5 times as fast: about 3 seconds, 26 Oct 2026)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Asset } from 'expo-asset';
import { reduceMotion } from '../a11y';

const CLIP = require('../../assets/splash/coro-splash.mp4');
const BG = '#c9c7c4'; // the light grey felt the clip is filmed on (no dark flash before the first frame)

// why the film didn't show, if it didn't (Jörg, 5 Nov 2026: gone on iPad only, again): App shows it once as a note
// on the start page. A check for TestFlight: take it out before App Review.
export let filmTrouble = null;
export default function Splash({ onDone }) {
  const { width: W, height: H } = useWindowDimensions();
  const fade = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);
  const leaving = useRef(false);
  // the end (Jörg, 28 Oct 2026): a black circle snaps shut on the middle of the screen (0.3 s, slow start, quick
  // finish), a beat of black, then the start page fades up slowly from black (1.4 s)
  // the end (Jörg, 28 Oct 2026): a straight cut to black, a moment of black, then the start page fades up slowly
  const [black, setBlack] = useState(false);
  // the film's first picture has really been drawn: only then the light felt colour behind it. Until then it's the dark
  // grey of the launch screen, so a film that can't be shown (seen on iPad, 28 Oct 2026) is never a white screen,
  // and if no picture comes within two seconds the start page simply fades up
  const [seen, setSeen] = useState(false);
  const seenRef = useRef(false);
  // (31 Oct 2026) the film shows only once it's really moving: until then the dark launch grey, never the light felt
  // of a first picture waiting to play; then it fades in quickly
  const show = useRef(new Animated.Value(0)).current;
  const shown = useRef(false);
  const onFrame = () => { seenRef.current = true; setTimeout(() => playing(), 450); /* (in case the time updates never come) */ };
  const playing = () => { if (shown.current) return; shown.current = true; setSeen(true); setTimeout(() => finish(), 6000); /* never stuck: from when it really starts */ Animated.timing(show, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); };
  const done = useRef(false);
  const end = () => { if (done.current) return; done.current = true; setGone(true); onDone && onDone(); };
  const fadeUp = (ms) => { setTimeout(end, ms + 600); /* never stuck over the start page */ Animated.timing(fade, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start(end); };
  const finish = (quiet, why) => {
    if (leaving.current) return;
    if (why && !shown.current) filmTrouble = why;
    leaving.current = true;
    try { player.pause(); } catch (e) {}
    if (quiet === true || reduceMotion()) { fadeUp(450); return; } // (Reduce Motion: a gentle fade)
    setBlack(true);
    setTimeout(() => fadeUp(1600), 500);
  };
  // (Jörg, 5 Nov 2026: on iPad the film stayed 'loading' and never showed.) The clip is now handed over as the file
  // itself, from its place on the device, and loaded off the main thread; if it's still loading after 3 seconds it's
  // handed over once more, and it has until 8 seconds to start.
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    try { p.audioMixingMode = 'mixWithOthers'; } catch (e) {}
  });
  const srcRef = useRef(null);
  const load = async () => {
    try {
      if (!srcRef.current) { const a = Asset.fromModule(CLIP); await a.downloadAsync(); srcRef.current = { uri: a.localUri || a.uri }; }
      if (player.replaceAsync) await player.replaceAsync(srcRef.current); else player.replace(srcRef.current);
      player.play();
    } catch (e) { filmTrouble = `couldn’t load the film (${String((e && e.message) || e).slice(0, 80)})`; }
  };
  useEffect(() => { load(); }, [player]);
  useEffect(() => {
    const subs = [];
    try { subs.push(player.addListener('playToEnd', () => finish())); } catch (e) {}
    try { player.timeUpdateEventInterval = 0.05; subs.push(player.addListener('timeUpdate', ({ currentTime }) => { if (currentTime > 0.04) { seenRef.current = true; playing(); } })); } catch (e) {}
    try { subs.push(player.addListener('playingChange', ({ isPlaying }) => { if (isPlaying) setTimeout(() => { let t = 0; try { t = player.currentTime || 0; } catch (e) {} if (t > 0.01) playing(); }, 60); })); } catch (e) {}
    try { subs.push(player.addListener('statusChange', ({ status }) => { if (status === 'readyToPlay') { try { player.play(); } catch (e) {} } if (status === 'error') { let m = ''; try { m = String((player.status && player.status) || ''); } catch (e) {} finish(true, 'the video reported an error' + (m ? ` (${m})` : '')); } })); } catch (e) {}
    if (reduceMotion()) { const q = setTimeout(() => finish(true, 'Reduce Motion is on in this iPad’s Accessibility settings'), 250); return () => clearTimeout(q); } // Reduce Motion: no film by itself, straight to the start page
    // (Jörg, 5 Nov 2026: gone on iPad, kept on iPhone: with a whole library loading at the start the film can begin
    // later than 2 s, and it was given up on. Now it gets 4 s to start, and the 6 s limit counts from when it does.)
    const safety = setTimeout(() => finish(), 15000); // never stuck on it
    const again = setTimeout(() => { let st = ''; try { st = player.status; } catch (e) {} if (!seenRef.current && st !== 'readyToPlay') load(); }, 3000); // (handed over once more)
    const noFilm = setTimeout(() => { let t = 0; try { t = player.currentTime || 0; } catch (e) {} if (!seenRef.current && t < 0.1) { let st = ''; try { st = player.status; } catch (e) {} const u = srcRef.current ? String(srcRef.current.uri).split(':')[0] : 'none'; finish(true, `no picture within 8 seconds (status: ${st || 'unknown'}, time ${t.toFixed(2)}, source ${u})`); } /* nothing playing at all */ }, 8000);
    return () => { clearTimeout(safety); clearTimeout(noFilm); clearTimeout(again); subs.forEach((x) => { try { x.remove(); } catch (e) {} }); try { player.pause(); } catch (e) {} };
  }, [player]);
  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 500, backgroundColor: seen ? BG : '#3b3b3b', opacity: fade }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: show }]}><VideoView player={player} style={StyleSheet.absoluteFill} contentFit={W > H ? 'contain' : 'cover'} /* sideways: the whole upright clip, on its own grey felt colour */ onFirstFrameRender={onFrame} nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} /></Animated.View>
      {black ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} /> : null}
      <Pressable style={StyleSheet.absoluteFill} pointerEvents={leaving.current ? 'none' : 'auto'} onPress={() => finish()} accessibilityRole="button" accessibilityLabel="Skip" />
    </Animated.View>
  );
}
