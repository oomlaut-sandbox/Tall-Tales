// The opening film on iPad (Jörg, 5 Nov 2026: there the video never got past 'loading', even from its own file): the
// same film as pictures (an animated WebP, drawn with Skia, one picture after another at the film's own pace) with
// its sound played on its own, so no video player is needed. The iPhone keeps the video (see Splash.js).
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Image as SkImage, useAnimatedImage } from '@shopify/react-native-skia';
import { createAudioPlayer } from 'expo-audio';

const FRAMES = require('../../assets/splash/coro-splash.webp');
const SOUND = require('../../assets/splash/coro-splash.mp3');

export default function PadFilm({ W, H, onStart, onEnd, onError }) {
  const anim = useAnimatedImage(FRAMES, (e) => onError && onError(`the pictures couldn’t be read (${String((e && e.message) || e).slice(0, 80)})`));
  const [frame, setFrame] = useState(null);
  useEffect(() => {
    if (!anim) return undefined;
    let on = true, n = 0, tm = null, snd = null;
    let total = 75;
    try { total = anim.getFrameCount() || 75; } catch (e) {}
    try { snd = createAudioPlayer(SOUND); snd.volume = 1; } catch (e) { snd = null; }
    const step = () => {
      if (!on) return;
      let ms = 40;
      try { ms = anim.decodeNextFrame(); setFrame(anim.getCurrentFrame()); } catch (e) {}
      n += 1;
      if (n === 1) { onStart && onStart(); try { if (snd) snd.play(); } catch (e) {} }
      if (n >= total) { onEnd && onEnd(); return; }
      tm = setTimeout(step, ms > 0 ? ms : 40);
    };
    step();
    return () => { on = false; clearTimeout(tm); try { if (snd) { snd.pause(); snd.remove(); } } catch (e) {} };
  }, [anim]);
  // filling the screen upright (cut at the sides), the whole film when sideways: like the video
  return <Canvas style={StyleSheet.absoluteFill}>{frame ? <SkImage image={frame} x={0} y={0} width={W} height={H} fit={W > H ? 'contain' : 'cover'} /> : null}</Canvas>;
}
