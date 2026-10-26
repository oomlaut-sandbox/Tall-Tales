// The opening film (Jörg, 26 Oct 2026): Coro unfolds and winks, at the start of every session. A tap skips it;
// when it ends it fades away to the start page. (Jörg's quicker clip, played 1.5 times as fast: about 3 seconds, 26 Oct 2026)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const CLIP = require('../../assets/splash/coro-splash.mp4');
const BG = '#c9c7c4'; // the light grey felt the clip is filmed on (no dark flash before the first frame)

export default function Splash({ onDone }) {
  const fade = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);
  const leaving = useRef(false);
  const finish = () => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => { setGone(true); onDone && onDone(); });
  };
  const player = useVideoPlayer(CLIP, (p) => {
    p.loop = false;
    try { p.audioMixingMode = 'mixWithOthers'; } catch (e) {}
    p.play();
  });
  useEffect(() => {
    const subs = [];
    try { subs.push(player.addListener('playToEnd', finish)); } catch (e) {}
    try { subs.push(player.addListener('statusChange', ({ status }) => { if (status === 'readyToPlay') { try { player.play(); } catch (e) {} } if (status === 'error') finish(); })); } catch (e) {}
    const safety = setTimeout(finish, 7000); // never stuck on it
    return () => { clearTimeout(safety); subs.forEach((x) => { try { x.remove(); } catch (e) {} }); try { player.pause(); } catch (e) {} };
  }, [player]);
  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 500, backgroundColor: BG, opacity: fade }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel="Skip" />
    </Animated.View>
  );
}
