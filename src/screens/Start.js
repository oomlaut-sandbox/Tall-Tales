// The start screen: a book on the dark grey. The inside of the brown cover in the picture square,
// the menu in the words square.
//
// When the app opens, the book is closed: only one square shows, a brown cover with a dog-ear.
// Turning it (tap, or swipe up / sideways) opens the cover over the spine like a real book, and its
// inside (also brown) lands in the picture square.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../theme';
import { Bar, Burger, DogEar } from '../components/Chrome';
import BookFrame, { Spine } from '../components/BookFrame';
import { Fade } from '../components/PageView';
import { playSound } from '../sound';


export const COVER_BROWN = '#6f4b32';
const LEATHER = require('../../assets/leather.jpg'); // Jörg's brown leather, outside and inside the cover

function MenuItem({ u, color, title, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', gap: u * 4.6 }}>
      <View style={{ width: u * 16.5, height: u * 33 }}>
        <View style={{ flex: 1, backgroundColor: color }} />
        <View style={{ flex: 1, backgroundColor: colors.white }} />
      </View>
      {/* the title, centred on the coloured square */}
      <View style={{ height: u * 16.5, justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, lineHeight: 24, color: colors.ink }}>{title}</Text>
      </View>
    </Pressable>
  );
}

export default function Start({ u, go, openMenu, closed, onOpened, onPeek }) {
  const p = useRef(new Animated.Value(0)).current; // 0 = cover shut, 1 = cover fully open
  // Choosing My Library or the Book Store: the book slides off to the left, and the chosen screen
  // (drawn underneath) takes its place on the grey.
  const { width: winW } = useWindowDimensions();
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
  const [opening, setOpening] = useState(false);
  const busy = useRef(false);
  const open = () => {
    if (busy.current) return;
    busy.current = true;
    setOpening(true);
    playSound('coverOpen');
    Animated.timing(p, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => onOpened && onOpened());
  };
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12,
    onPanResponderRelease: (_, g) => { if (g.dy < -30 || g.dx < -30) open(); },
  })).current;

  return (
    <Animated.View style={{ flex: 1, opacity: fade }}>
    <BookFrame bare barMin={u * 17} bar={(L) => <Bar u={u} vertical={L.wide} top={L.wide ? L.bookTop : undefined}><Burger u={u} onPress={openMenu} /></Bar>}>
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
              {!wide ? <Fade edge="top" size={Math.round(side * 0.09)} max={0.13} /> : null}
              <Spine wide={wide} />
              {/* the two items as one block, centred in the page */}
              <View style={{ gap: k * 8 }}>
                <MenuItem u={k} color={colors.green} title="My Library" onPress={() => goTo('library')} />
                <MenuItem u={k} color={colors.blue} title="Book Store" onPress={() => goTo('store')} />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
});
