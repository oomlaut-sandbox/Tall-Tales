// Opening a book from My Library, like the brown cover on the start screen:
// 1. everything else fades into the dark grey, leaving only the chosen cover,
// 2. the cover glides and grows into the words square of the reader's book,
// 3. it swings open over the spine (a solid flip). Its inside (white for a book with a title page,
//    otherwise the first picture) lands in the picture square, uncovering the first words page.
// Then the reader takes over in exactly the same place, and the pages turn with the peel.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { bookLayout } from './BookFrame';
import { Fade, PageView } from './PageView';
import { Felt } from '../look';
import { playSound } from '../sound';

export default function BookOpen({ u, story, cover, rect, textScale, fontKey, onDone }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const L = bookLayout(winW, winH, insets, u * 13); // the reader's layout (its bar is u * 13)
  const s = L.side;
  // where the reader's words square is on screen
  let bx, by; // top-left of the whole book
  if (L.wide) {
    const deskW = winW - L.leftW - L.rightW;
    bx = L.leftW + (deskW - 2 * s) / 2; by = (winH - s) / 2;
  } else {
    const deskH = winH - L.topH - L.barH;
    bx = (winW - s) / 2; by = L.topH + (deskH - 2 * s) / 2;
  }
  const tx = L.wide ? bx + s : bx, ty = L.wide ? by : by + s; // the words square

  const bg = useRef(new Animated.Value(0)).current;
  const mv = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState(0); // 0 fade + move, 1 flipping, 2 landed (flat)
  useEffect(() => {
    playSound('tap');
    Animated.sequence([
      Animated.timing(bg, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(mv, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      setPhase(1);
      playSound('coverOpen');
      Animated.timing(flip, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
        // land perfectly flat: swap the turned cover for a plain, straight page before the reader takes over
        setPhase(2);
        requestAnimationFrame(() => requestAnimationFrame(() => onDone && onDone()));
      });
    });
  }, []);

  // the cover starts exactly over the tapped tile and ends on the words square
  const r = rect || { x: tx, y: ty, w: s, h: s };
  const dx = r.x + r.w / 2 - (tx + s / 2), dy = r.y + r.h / 2 - (ty + s / 2), k = r.w / s;
  const move = [
    { translateX: mv.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
    { translateY: mv.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
    { scale: mv.interpolate({ inputRange: [0, 1], outputRange: [k, 1] }) },
  ];
  const turn = flip.interpolate({ inputRange: [0, 1], outputRange: L.wide ? ['0deg', '-180deg'] : ['0deg', '180deg'] });
  const leaf = L.wide
    ? { transformOrigin: 'left', transform: [{ perspective: 2600 }, { rotateY: turn }] }
    : { transformOrigin: 'top', transform: [{ perspective: 2600 }, { rotateX: turn }] };
  const frontOp = flip.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOp = flip.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });
  const shade = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.25, 0] });
  const first = story.pages[0];
  const inside = first && first.whiteArt ? null : first && first.image; // what lands in the picture square

  return (
    <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 80 }]}>
      {/* the dark grey with the reader's black bars fades in over the library */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: bg, backgroundColor: colors.desk }]}>
        <Felt />
        {L.wide ? (
          <>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: L.leftW, backgroundColor: colors.bar }} />
            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: L.rightW, backgroundColor: colors.bar }} />
          </>
        ) : (
          <>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: L.topH, backgroundColor: colors.bar }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: L.barH, backgroundColor: colors.bar }} />
          </>
        )}
      </Animated.View>
      {/* the first words page, uncovered as the cover swings open */}
      {phase >= 1 ? (
        <View pointerEvents="none" style={[styles.shadow, { position: 'absolute', left: tx, top: ty, width: s, height: s }]}>
          <View style={{ width: s, height: s, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: L.wide ? -s : 0, top: L.wide ? 0 : -s }}>
              <PageView page={first} width={L.wide ? 2 * s : s} height={L.wide ? s : 2 * s} textScale={textScale} fontKey={fontKey} />
            </View>
          </View>
        </View>
      ) : null}
      {/* landed: the inside of the cover lying flat in the picture square */}
      {phase === 2 ? (
        <View pointerEvents="none" style={[styles.shadow, { position: 'absolute', left: bx, top: by, width: s, height: s, backgroundColor: colors.white, overflow: 'hidden' }]}>
          {inside ? <Image source={inside} style={{ position: 'absolute', left: 0, top: 0, width: s, height: s }} resizeMode="cover" /> : null}
          {!L.wide ? <Fade edge="bottom" size={Math.round(s * 0.1)} max={0.22} /> : null}
        </View>
      ) : null}
      {/* the cover */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: tx, top: ty, width: s, height: s, transform: move, opacity: phase === 2 ? 0 : 1 }}>
        <Animated.View style={[{ width: s, height: s }, styles.shadow, leaf]}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: frontOp, backgroundColor: '#828282', overflow: 'hidden' }]}>
            {cover ? <Image source={cover} style={{ position: 'absolute', left: 0, top: 0, width: s, height: s }} resizeMode="cover" /> : null}
          </Animated.View>
          {/* the inside of the cover, mirrored so it reads right once turned over */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: backOp, backgroundColor: colors.white, overflow: 'hidden', transform: [L.wide ? { scaleX: -1 } : { scaleY: -1 }] }]}>
            {inside ? <Image source={inside} style={{ position: 'absolute', left: 0, top: 0, width: s, height: s }} resizeMode="cover" /> : null}
            {/* the spine shadow is there from the moment the inside shows (same as the reader's) */}
            {!L.wide ? <Fade edge="bottom" size={Math.round(s * 0.1)} max={0.22} /> : null}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: shade }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
});
