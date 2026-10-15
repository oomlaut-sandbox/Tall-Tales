// Skippy, the felt pebble mascot. Drawn from a sprite sheet cut out of Jörg's animation:
// frames 0–40 he walks in, ~48–80 he stops and waves, ~84 on he opens his book and reads.
// mode 'intro': walk in, wave, then keep reading (a gentle loop of the last frames).
// mode 'wave': just wave (from standing), then read. still: show one frame only.
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import META from '../skippyFrames.json';

const SHEET = require('../../assets/skippy-sheet.png');
const { frames: N, cols: COLS, fw: FW, fh: FH, fps: FPS, cx: CX } = META;
const ROWS = Math.ceil(N / COLS);
const WALK_END = 40, WAVE_START = 46, READ_START = 92;

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
        if (n === WAVE_START + 10 && !waved.current) { waved.current = true; onWave && onWave(); }
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

export const SKIPPY_WAVE_FRAME = 62;
