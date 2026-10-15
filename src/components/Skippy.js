// Skippy, the felt pebble mascot. Drawn from a sprite sheet cut out of Jörg's green-screen animation:
// frames 0–30 he walks in, then turns to face us, 54–86 he waves, 87 on he stands (a gentle loop).
// mode 'intro': walk in, wave, then stand. mode 'wave…': just wave, then stand. still: one frame only.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, View } from 'react-native';
import META from '../skippyFrames.json';

const SHEET = require('../../assets/skippy-sheet.png');
const { frames: N, cols: COLS, fw: FW, fh: FH, fps: FPS, cx: CX } = META;
const ROWS = Math.ceil(N / COLS);
const WALK_END = 30, WAVE_START = 54, READ_START = 87; // READ_START: where the standing loop begins

export default function Skippy({ height = 150, mode = 'intro', still, enterFrom = 0, onPress, onWave, style }) {
  const k = height / FH;
  const w = FW * k;
  const [f, setF] = useState(still != null ? still : String(mode).startsWith('wave') ? WAVE_START : 0);
  const dir = useRef(1);
  const waved = useRef(false);
  useEffect(() => {
    if (still != null) { setF(still); return undefined; }
    dir.current = 1; waved.current = false;
    setF(String(mode).startsWith('wave') ? WAVE_START : 0);
    const t = setInterval(() => {
      setF((cur) => {
        let n;
        if (cur < N - 1 && cur >= READ_START) {
          // reading: drift back and forth over the last frames so it loops smoothly
          n = cur + dir.current;
          if (n >= N - 1) { dir.current = -1; n = N - 1; }
          if (n <= READ_START) { dir.current = 1; n = READ_START; }
          return n;
        }
        if (cur >= N - 1) { dir.current = -1; return N - 2; }
        n = cur + 1;
        if (n === WAVE_START + 6 && !waved.current) { waved.current = true; onWave && onWave(); }
        return n;
      });
    }, 1000 / FPS);
    return () => clearInterval(t);
  }, [mode, still]);
  // walking in: his own steps (from the film) plus an extra glide in from enterFrom points to the left
  const walkX = f <= WALK_END ? CX[f] * k + enterFrom * (1 - f / WALK_END) : CX[Math.min(f, N - 1)] * k;
  const body = (
    <View style={{ width: w, height, overflow: 'hidden', transform: [{ translateX: still != null ? 0 : walkX }] }}>
      <Image source={SHEET} style={{ position: 'absolute', width: FW * COLS * k, height: FH * ROWS * k, left: -(f % COLS) * w, top: -Math.floor(f / COLS) * height }} />
    </View>
  );
  if (!onPress) return <View pointerEvents="none" style={style}>{body}</View>;
  return <Pressable onPress={onPress} style={style} accessibilityRole="button" accessibilityLabel="Skippy">{body}</Pressable>;
}

export const SKIPPY_WAVE_FRAME = 66;

// Still poses (cut out from Jörg's renders), for small appearances such as beside a speech bubble.
export const SKIPPY_POSES = {
  front: require('../../assets/skippy/front.png'),
  wave: require('../../assets/skippy/wave.png'),
  reading: require('../../assets/skippy/reading.png'),
  thinking: require('../../assets/skippy/thinking.png'),
  side: require('../../assets/skippy/side.png'),
  back: require('../../assets/skippy/back.png'),
  walkAway: require('../../assets/skippy/walk-away.png'),
  jump: require('../../assets/skippy/jump.png'),
  peekOver: require('../../assets/skippy/peek-over.png'), // hands rest on the bottom edge of the picture
  peekSide: require('../../assets/skippy/peek-side.png'), // the right edge of the picture is the edge he hides behind
  skip: require('../../assets/skippy/skip.png'),
  sittingReading: require('../../assets/skippy/sitting-reading.png'),
  sleeping: require('../../assets/skippy/sleeping.png'),
};
// width / height of each pose picture, so it can be sized without measuring
export const POSE_RATIO = { peekOver: 600 / 364, peekSide: 335 / 600, jump: 574 / 600, skip: 594 / 600, sittingReading: 460 / 600, sleeping: 600 / 387 };

// Skippy peeking out from behind the edge of a floating box. The parent places this right against the edge:
// side 'top' → just above the box (his hands land on its top edge); side 'left' → just left of the box.
// He slides out from behind the edge after `delay` ms and hides again when `show` turns false.
export function PeekingSkippy({ side = 'top', size = 70, delay = 500, show = true, style }) {
  const over = side === 'top';
  // size: his height when peeking over; his width when peeking from the side
  const H = over ? size : size / POSE_RATIO.peekSide, W = over ? size * POSE_RATIO.peekOver : size;
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = show
      ? Animated.timing(t, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      : Animated.timing(t, { toValue: 0, duration: 160, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [show]);
  const move = over
    ? { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [H + 4, 0] }) }
    : { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [W + 4, 0] }) };
  return (
    <View pointerEvents="none" style={[{ width: W, height: H, overflow: 'hidden' }, style]}>
      <Animated.Image source={over ? SKIPPY_POSES.peekOver : SKIPPY_POSES.peekSide} resizeMode="contain"
        style={{ width: W, height: H, transform: [move] }} />
    </View>
  );
}
