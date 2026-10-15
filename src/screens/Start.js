// The start screen: a book on the dark grey. The inside of the brown cover in the picture square,
// the menu in the words square.
//
// When the app opens, the book is closed: only one square shows, a brown cover with a dog-ear.
// Turning it (tap, or swipe up / sideways) opens the cover over the spine like a real book, and its
// inside (also brown) lands in the picture square.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../theme';
import { Felt } from '../look';
import { Bar, Burger, DogEar } from '../components/Chrome';
import BookFrame, { Spine, bookLayout, skippyRoom } from '../components/BookFrame';
import Skippy from '../components/Skippy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fade } from '../components/PageView';
import { playSound } from '../sound';


export const COVER_BROWN = '#6f4b32';
const LEATHER = require('../../assets/leather.jpg'); // Jörg's brown leather, outside and inside the cover

const TILE_LIBRARY = require('../../assets/tile-library.png');
const TILE_STORE = require('../../assets/tile-store.png');

function MenuItem({ u, icon, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', gap: u * 7 }}>
      {/* the icon: a stitched felt tile (Jörg's), with a slight drop shadow */}
      <View style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 4 }}>
        <Image source={icon} resizeMode="contain" style={{ width: u * 19, height: u * 33 }} />
      </View>
      <View style={{ maxWidth: u * 48 }}>
        {/* Same sizes as the menu titles (20) and their descriptions (14). */}
        <Text style={{ fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, lineHeight: 24, color: colors.ink, marginBottom: u * 2 }}>{title}</Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 14, lineHeight: 18, color: colors.ink }}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export default function Start({ u, go, openMenu, closed, onOpened, onPeek }) {
  const p = useRef(new Animated.Value(0)).current; // 0 = cover shut, 1 = cover fully open
  // Choosing My Library or the Book Store: the book slides off to the left, and the chosen screen
  // (drawn underneath) takes its place on the grey.
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current; // 0 = in place, 1 = gone off the left
  const fade = useRef(new Animated.Value(1)).current;
  const leaving = useRef(false);
  const goTo = (target) => {
    if (leaving.current) return;
    leaving.current = true;
    onPeek && onPeek(target);
    playSound('slide');
    Animated.sequence([
      Animated.timing(slide, { toValue: 1, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => go(target));
  };
  // when the app opens, the closed book slides in from the right onto the grey
  const enter = useRef(new Animated.Value(closed ? 1 : 0)).current;
  useEffect(() => {
    if (!closed) return;
    const t = setTimeout(() => playSound('slide', 0.8), 150);
    Animated.timing(enter, { toValue: 0, duration: 650, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => playSound('setDown', 0.7));
    return () => clearTimeout(t);
  }, []);
  const slideX = Animated.add(
    slide.interpolate({ inputRange: [0, 1], outputRange: [0, -winW] }),
    enter.interpolate({ inputRange: [0, 1], outputRange: [0, winW] }),
  );
  // Skippy: when the app opens he walks in along the bottom, waves hello, then sits reading.
  // Tap him and he waves again. He leaves once the book is opened.
  const [skippy, setSkippy] = useState(closed);
  const [skippyMode, setSkippyMode] = useState('intro');
  const [hello, setHello] = useState(false);
  const skippyFade = useRef(new Animated.Value(1)).current;
  const helloTimer = useRef(null);
  const sayHello = () => { setHello(true); clearTimeout(helloTimer.current); helloTimer.current = setTimeout(() => setHello(false), 5000); };
  useEffect(() => () => clearTimeout(helloTimer.current), []);
  const skippyLeaves = () => {
    setHello(false);
    Animated.timing(skippyFade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => setSkippy(false));
  };
  const [opening, setOpening] = useState(false);
  const busy = useRef(false);
  const open = () => {
    if (busy.current) return;
    busy.current = true;
    setOpening(true);
    if (skippy) skippyLeaves();
    playSound('coverOpen');
    Animated.timing(p, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => onOpened && onOpened());
  };
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12,
    onPanResponderRelease: (_, g) => { if (g.dy < -30 || g.dx < -30) open(); },
  })).current;

  return (
    <Animated.View style={{ flex: 1, opacity: fade }}>
    <BookFrame bare barMin={u * 17} reserve={skippyRoom(winW, winH)} bar={(L) => <Bar u={u} vertical={L.wide}><Burger u={u} onPress={openMenu} /></Bar>}>
      {({ side, wide }) => {
        const k = side / 100; // sizes inside the book scale with the squares
        // where the two squares sit: picture first (top, or left when sideways), then the words
        const at1 = { position: 'absolute', left: 0, top: 0, width: side, height: side };
        const at2 = wide ? { position: 'absolute', left: side, top: 0, width: side, height: side } : { position: 'absolute', left: 0, top: side, width: side, height: side };
        // the inside of the cover: the same brown as the outside (Jörg may add texture later)
        const pebbles = (
          <View style={{ width: side, height: side, backgroundColor: COVER_BROWN, overflow: 'hidden' }} accessibilityLabel="oomlaut Reader">
            <Image source={LEATHER} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="cover" />
            {!wide ? <Fade edge="bottom" size={Math.round(side * 0.1)} max={0.22} /> : null}
          </View>
        );
        // the cover turns over the spine: up when upright, to the left when sideways
        const turn = p.interpolate({ inputRange: [0, 1], outputRange: wide ? ['0deg', '-180deg'] : ['0deg', '180deg'] });
        const frontOp = p.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] });
        const backOp = p.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });
        const shade = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.25, 0] });
        const leaf = wide
          ? { transformOrigin: 'left', transform: [{ perspective: 1600 }, { rotateY: turn }] }
          : { transformOrigin: 'top', transform: [{ perspective: 1600 }, { rotateX: turn }] };
        return (
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: wide ? side * 2 : side, height: wide ? side : side * 2, transform: [{ translateX: slideX }] }}>
            {/* the picture square: only once the book is open */}
            {!closed ? <View style={[at1, styles.page]}>{pebbles}</View> : null}
            {/* the words square: the menu */}
            <View style={[at2, styles.page, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper }]}>
              <Felt opacity={0.7} />
              {!wide ? <Fade edge="top" size={Math.round(side * 0.09)} max={0.13} /> : null}
              <Spine wide={wide} />
              {/* the two items as one block, centred in the page */}
              <View style={{ gap: k * 8 }}>
                <MenuItem u={k} icon={TILE_LIBRARY} title="My Library" sub="Find and read your books" onPress={() => goTo('library')} />
                <MenuItem u={k} icon={TILE_STORE} title="Book Store" sub="Discover and buy new books" onPress={() => goTo('store')} />
              </View>
            </View>
            {/* the cover */}
            {closed ? (
              <Animated.View {...swipe.panHandlers} style={[at2, styles.page, { zIndex: 8 }, leaf]}>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: frontOp, backgroundColor: COVER_BROWN }]}>
                  <Image source={LEATHER} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="cover" />
                  <Pressable style={StyleSheet.absoluteFill} onPress={open} accessibilityRole="button" accessibilityLabel="Open the book" />
                  {!opening ? <DogEar u={u} onPress={open} label="Open the book" /> : null}
                </Animated.View>
                {/* inside of the cover: the pebbles, mirrored so they read right once turned over */}
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: backOp, transform: [wide ? { scaleX: -1 } : { scaleY: -1 }] }]}>{pebbles}</Animated.View>
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: shade }]} />
              </Animated.View>
            ) : null}
          </Animated.View>
        );
      }}
    </BookFrame>
      {skippy ? (() => {
        const R = skippyRoom(winW, winH);
        const L = bookLayout(winW, winH, insets, u * 17, R);
        // upright: he stands in the strip kept free under the book, his bubble beside him
        const h = L.wide ? Math.round(Math.min(190, L.side * 0.42)) : Math.round(R * 0.92);
        const bottom = L.wide ? Math.round(h * 0.06) + 8 : L.barH - Math.round(h * 0.05);
        const left = L.wide ? L.leftW + 6 : Math.max(10, Math.round((winW - L.side) / 2 - h * 0.12));
        return (
          <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left, bottom, opacity: skippyFade, zIndex: 20 }}>
            {hello ? (
              <View pointerEvents="none" style={[styles.hello, L.wide ? { bottom: h * 0.92, left: h * 0.35 } : { bottom: h * 0.4, left: h * 0.95, width: Math.min(230, winW - left - h * 0.95 - 12) }]}>
                <Text style={styles.helloText}>Hi, I’m Skippy! Tap the corner to open the book.</Text>
              </View>
            ) : null}
            <Skippy height={h} mode={skippyMode} enterFrom={-(left + h)} onWave={sayHello}
              onPress={() => { setSkippyMode((m) => (m === 'wave' ? 'wave2' : 'wave')); }} />
          </Animated.View>
        );
      })() : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hello: { position: 'absolute', width: 230, backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 9 },
  helloText: { color: colors.ink, fontFamily: 'EBGaramond_500Medium', fontSize: 19, lineHeight: 24, textAlign: 'center' },
  page: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
});
