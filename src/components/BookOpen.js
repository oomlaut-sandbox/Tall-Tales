// Opening a book from My Library, like the brown cover on the start screen:
// 1. everything else fades into the dark grey, leaving only the chosen cover,
// 2. the cover glides and grows into the words square of the reader's book,
// 3. it swings open over the spine (a solid flip). Its inside (white for a book with a title page,
//    otherwise the first picture) lands in the picture square, uncovering the first words page.
// Then the reader takes over in exactly the same place, and the pages turn with the peel.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { bookLayout } from './BookFrame';
import { Fade, PageView } from './PageView';
import { Felt, DESK_FELT, DeskFelt } from '../look';
import { playSound } from '../sound';

// closing: the same, backwards. From the first spread the cover swings shut over the words square and stays there;
// swipe up and it glides back to its place in My Library (onGone); tap it (or swipe the other way) and it opens again
// (onDone, back to the reader).
export default function BookOpen({ u, story, cover, rect, textScale, fontKey, onDone, closing = false, onLeave, onGone }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const L = bookLayout(winW, winH, insets, u * 17); // the reader's layout (its bar is u * 17, like every bar)
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

  const bg = useRef(new Animated.Value(closing ? 1 : 0)).current;
  const mv = useRef(new Animated.Value(closing ? 1 : 0)).current;
  const flip = useRef(new Animated.Value(closing ? 1 : 0)).current;
  const A = useRef({
    plateIn: flip.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    plateOut: flip.interpolate({ inputRange: [0, 0.12], outputRange: [1, 0], extrapolate: 'clamp' }),
    // (all made once: the redraws when the turn starts and lands would otherwise swap them and blink)
    turnUp: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
    turnSide: flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] }),
    frontOp: flip.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] }),
    backOp: flip.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] }),
    shade: flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.25, 0] }),
  }).current;
  const [phase, setPhase] = useState(closing ? 1 : 0); // 0 fade + move, 1 flipping, 2 landed (flat); closing: 3 shut
  const swingOpen = () => {
    setPhase(1);
    playSound('coverOpen');
    Animated.timing(flip, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
      setPhase(2);
      requestAnimationFrame(() => requestAnimationFrame(() => onDone && onDone()));
    });
  };
  const left = useRef(false);
  const leave = () => { // the closed book glides back to its place on the shelf as the library comes back
    if (left.current) return;
    left.current = true;
    setPhase(4);
    if (onLeave) onLeave();
    Animated.parallel([
      Animated.timing(mv, { toValue: 0, duration: 560, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bg, { toValue: 0, duration: 420, delay: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => onGone && onGone());
  };
  const acts = useRef({}); acts.current = { ...acts.current, swingOpen, leave, phase };
  const shutPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => acts.current.phase === 3,
    onStartShouldSetPanResponderCapture: () => acts.current.phase === 3,
    onMoveShouldSetPanResponderCapture: () => acts.current.phase === 3,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { acts.current.moved = false; },
    // a clear swipe up: off to the library straight away (no need to wait for the finger to lift)
    onPanResponderMove: (_, g) => {
      if (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8) acts.current.moved = true;
      if (acts.current.phase === 3 && g.dy < -24 && Math.abs(g.dy) > Math.abs(g.dx)) acts.current.leave();
    },
    onMoveShouldSetPanResponder: () => acts.current.phase === 3,
    onPanResponderRelease: (_, g) => {
      if (acts.current.phase !== 3) return;
      if (g.dy < -24 && Math.abs(g.dy) > Math.abs(g.dx)) acts.current.leave(); // swipe up: back to the library
      else acts.current.swingOpen(); // a tap or another swipe: open it again
    },
  })).current;
  useEffect(() => {
    if (closing) { // swing shut over the words square
      playSound('coverClose');
      Animated.timing(flip, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => setPhase(3));
      return;
    }
    playSound('tap');
    Animated.sequence([
      Animated.timing(bg, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }), // a quick dissolve to the felt
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
  const moveRef = useRef(null); // made once too
  if (!moveRef.current) moveRef.current = [
    { translateX: mv.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
    { translateY: mv.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
    { scale: mv.interpolate({ inputRange: [0, 1], outputRange: [k, 1] }) },
  ];
  const move = moveRef.current;
  const turn = L.wide ? A.turnSide : A.turnUp;
  const leaf = L.wide
    ? { transformOrigin: 'left', transform: [{ perspective: 2600 }, { rotateY: turn }] }
    : { transformOrigin: 'top', transform: [{ perspective: 2600 }, { rotateX: turn }] };
  const frontOp = A.frontOp;
  const backOp = A.backOp;
  const shade = A.shade;
  const first = story.pages[0];
  const inside = first && first.whiteArt ? null : first && first.image; // what lands in the picture square

  return (
    <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 80 }, closing ? (L.wide ? { right: L.rightW } : { bottom: L.barH }) : null]} {...(closing ? shutPan.panHandlers : {})}>
      {/* (closing: the reader's black bar stays uncovered and usable below, so the menu never goes away) */}
      {/* the dark grey with the reader's black bars fades in over the library */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: bg, backgroundColor: colors.desk }]}>
        {/* the same charcoal felt as the library and the reader (phones), so it never drops to plain grey */}
        <DeskFelt spot="bookopen1" overlay />
        <Felt />
        {closing ? (
          // closing: only the camera-side strip; the reader's own bar shows (uncovered) beside or below
          L.wide ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: L.leftW, backgroundColor: colors.bar }} />
            : <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: L.topH, backgroundColor: colors.bar }} />
        ) : L.wide ? (
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
      {/* The book casts one shadow, like the reader's: under the picture square a still felt-coloured shape
          (drawn below the words page, so its shadow never falls across the spine) grows in as the cover lands.
          The turning cover and the landed page cast none of their own: those used to darken the spine while
          it opened, and it went lighter the moment the reader took over. */}
      {phase >= 1 && phase <= 2 ? (
        <Animated.View pointerEvents="none" style={[styles.shadow, { position: 'absolute', left: bx, top: by, width: s, height: s, backgroundColor: DESK_FELT ? '#262626' : colors.desk, opacity: A.plateIn }]}>
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}><DeskFelt spot="bookopenPlate" /></View>
        </Animated.View>
      ) : null}
      {/* the first words page, uncovered as the cover swings open */}
      {phase >= 1 && phase <= 2 ? (
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
        <View pointerEvents="none" style={{ position: 'absolute', left: bx, top: by, width: s, height: s, backgroundColor: colors.white, overflow: 'hidden' }}>
          {inside ? <Image source={inside} style={{ position: 'absolute', left: 0, top: 0, width: s, height: s }} resizeMode="cover" /> : null}
          <Fade edge={L.wide ? 'right' : 'bottom'} size={Math.round(s * 0.1)} max={0.22} />
        </View>
      ) : null}
      {/* the cover */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: tx, top: ty, width: s, height: s, transform: move, opacity: phase === 2 ? 0 : 1 }}>
        {/* its shadow while it glides in, on a still shape (never on the turning cover), gone as the turn begins */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.shadow, { backgroundColor: '#828282', opacity: A.plateOut }]} />
        <Animated.View style={[{ width: s, height: s, backgroundColor: '#828282' }, leaf]}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: frontOp, backgroundColor: '#828282', overflow: 'hidden' }]}>
            {cover ? <Image source={cover} style={{ position: 'absolute', left: 0, top: 0, width: s, height: s }} resizeMode="cover" /> : null}
          </Animated.View>
          {/* the inside of the cover, mirrored so it reads right once turned over */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: backOp, backgroundColor: colors.white, overflow: 'hidden', transform: [L.wide ? { scaleX: -1 } : { scaleY: -1 }] }]}>
            {inside ? <Image source={inside} style={{ position: 'absolute', left: 0, top: 0, width: s, height: s }} resizeMode="cover" /> : null}
            {/* the spine shadow is there from the moment the inside shows (same as the reader's) */}
            <Fade edge={L.wide ? 'right' : 'bottom'} size={Math.round(s * 0.1)} max={0.22} />
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
