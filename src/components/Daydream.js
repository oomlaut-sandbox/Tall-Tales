// Daydream: the daytime sister of the nightlight (Listen Only). A calm video loops full screen, softly dimmed,
// like a zen screensaver for the listener. Swipe left or right for the next video.
// Each one is silent (the story and the music are what you hear): a seamlessly looping video, or a still picture.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, PanResponder, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// the videos, in order (more to come: add them here)
export const DAY_VIDEOS = [
  { id: 'trees', src: require('../../assets/daydream/trees.mp4') }, // sunlight through the leaves of a summer tree
  { id: 'pebbles', image: require('../../assets/daydream/pebbles.jpg') }, // Jörg's felt pebbles (a still picture, drifting very slowly)
];

// a still picture: it drifts very slowly closer and back, so it feels alive
function Still({ src }) {
  const z = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(z, { toValue: 1, duration: 30000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(z, { toValue: 0, duration: 30000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = z.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.1] });
  return <Animated.Image source={src} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', transform: [{ scale }] }]} />;
}

function Clip({ src }) {
  const player = useVideoPlayer(src, (p) => {
    p.loop = true;
    p.muted = true;
    try { p.audioMixingMode = 'mixWithOthers'; } catch (e) {} // never interrupt the story or the music
    p.play();
  });
  useEffect(() => () => { try { player.pause(); } catch (e) {} }, [player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />;
}

// index: which video; onIndex(i): a swipe chose another; dim: 0..1, how dark the layer over it is
export default function DaydreamVideo({ index = 0, onIndex, dim }) {
  const i = ((index % DAY_VIDEOS.length) + DAY_VIDEOS.length) % DAY_VIDEOS.length;
  const fade = useRef(new Animated.Value(1)).current;
  const idx = useRef(i); idx.current = i;
  const cb = useRef(onIndex); cb.current = onIndex;
  const go = (d) => {
    if (DAY_VIDEOS.length < 2) return;
    Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
      cb.current && cb.current((idx.current + d + DAY_VIDEOS.length) % DAY_VIDEOS.length);
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    });
  };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (e, g) => { if (g.dx < -40) go(1); else if (g.dx > 40) go(-1); },
  })).current;
  return (
    <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, backgroundColor: '#000' }]}>
        {DAY_VIDEOS[i].image ? <Still key={DAY_VIDEOS[i].id} src={DAY_VIDEOS[i].image} /> : <Clip key={DAY_VIDEOS[i].id} src={DAY_VIDEOS[i].src} />}
      </Animated.View>
      {/* the screen dims a little, like the nightlight (and fully, when the sleep timer runs out) */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: dim }]} />
    </View>
  );
}
