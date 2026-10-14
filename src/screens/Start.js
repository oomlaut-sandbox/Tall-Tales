// The start screen: a book on the dark grey. Jörg's felt pebbles in the picture square, the menu
// in the words square.
//
// When the app opens, the book is closed: only one square shows, a brown cover with a dog-ear.
// Turning it (tap, or swipe up / sideways) opens the cover over the spine like a real book, and its
// inside, the pebbles, lands in the picture square.
import React, { useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Bar, Burger, DogEar } from '../components/Chrome';
import BookFrame, { Spine } from '../components/BookFrame';
import { Fade } from '../components/PageView';
import { playPaper } from '../sound';

const PEBBLES = require('../../assets/home-pebbles.jpg');
export const COVER_BROWN = '#6f4b32';

function MenuItem({ u, color, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', gap: u * 4.6 }}>
      <View style={{ width: u * 16.5, height: u * 33 }}>
        <View style={{ flex: 1, backgroundColor: color }} />
        <View style={{ flex: 1, backgroundColor: colors.white }} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Same sizes as the menu titles (20) and their descriptions (14). */}
        <Text style={{ fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, lineHeight: 24, color: colors.ink, marginBottom: u * 2 }}>{title}</Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 14, lineHeight: 18, color: colors.ink }}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export default function Start({ u, go, openMenu, closed, onOpened, onPeek }) {
  const p = useRef(new Animated.Value(0)).current; // 0 = cover shut, 1 = cover fully open
  // The menu page's dog-ear: the page turns over and My Library shows through.
  const q = useRef(new Animated.Value(0)).current;
  const peeling = useRef(false);
  const peel = () => {
    if (peeling.current) return;
    peeling.current = true;
    onPeek && onPeek(); // My Library is drawn underneath while the page turns
    playPaper('turn', 1);
    Animated.timing(q, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => go('library'));
  };
  const fadeAway = q.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1, 0] });
  const [opening, setOpening] = useState(false);
  const busy = useRef(false);
  const open = () => {
    if (busy.current) return;
    busy.current = true;
    setOpening(true);
    playPaper('turn', 1);
    Animated.timing(p, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => onOpened && onOpened());
  };
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12,
    onPanResponderRelease: (_, g) => { if (g.dy < -30 || g.dx < -30) open(); },
  })).current;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAway }}>
    <BookFrame bare barMin={u * 17} bar={(L) => <Bar u={u} vertical={L.wide}><Burger u={u} onPress={openMenu} /></Bar>}>
      {({ side, wide }) => {
        const k = side / 100; // sizes inside the book scale with the squares
        // where the two squares sit: picture first (top, or left when sideways), then the words
        const at1 = { position: 'absolute', left: 0, top: 0, width: side, height: side };
        const at2 = wide ? { position: 'absolute', left: side, top: 0, width: side, height: side } : { position: 'absolute', left: 0, top: side, width: side, height: side };
        const pebbles = (
          <View style={{ width: side, height: side, backgroundColor: '#7d7d7d', overflow: 'hidden' }}>
            <Image source={PEBBLES} accessibilityLabel="oomlaut Reader" style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="cover" />
            {!wide ? <Fade edge="bottom" size={Math.round(side * 0.05)} max={0.2} /> : null}
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
        const qTurn = q.interpolate({ inputRange: [0, 1], outputRange: wide ? ['0deg', '-180deg'] : ['0deg', '180deg'] });
        const qBack = q.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] });
        const qShade = q.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.25, 0.1] });
        const pageTurn = wide
          ? { zIndex: 6, transformOrigin: 'left', transform: [{ perspective: 1600 }, { rotateY: qTurn }] }
          : { zIndex: 6, transformOrigin: 'top', transform: [{ perspective: 1600 }, { rotateX: qTurn }] };
        return (
          <>
            {/* the picture square: only once the book is open */}
            {!closed ? <View style={[at1, styles.page]}>{pebbles}</View> : null}
            {/* the words square: the menu */}
            <Animated.View style={[at2, styles.page, { justifyContent: 'center', gap: k * 8, paddingLeft: k * 11.8, paddingRight: k * 8, backgroundColor: colors.paper }, pageTurn]}>
              {!wide ? <Fade edge="top" size={Math.round(side * 0.09)} max={0.13} /> : null}
              <Spine wide={wide} />
              <MenuItem u={k} color={colors.green} title="My Library" sub="Find and read purchased stories" onPress={() => go('library')} />
              <MenuItem u={k} color={colors.blue} title="Book Store" sub="Find and buy new stories" onPress={() => go('store')} />
              {!closed ? <DogEar u={u} onPress={peel} label="Open my library" /> : null}
              {/* back of the menu page, seen once it has turned past upright */}
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper, opacity: qBack }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: qShade }]} />
            </Animated.View>
            {/* the cover */}
            {closed ? (
              <Animated.View {...swipe.panHandlers} style={[at2, styles.page, { zIndex: 5 }, leaf]}>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: frontOp, backgroundColor: COVER_BROWN }]}>
                  <Pressable style={StyleSheet.absoluteFill} onPress={open} accessibilityRole="button" accessibilityLabel="Open the book" />
                  {!opening ? <DogEar u={u} onPress={open} label="Open the book" /> : null}
                </Animated.View>
                {/* inside of the cover: the pebbles, mirrored so they read right once turned over */}
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: backOp, transform: [wide ? { scaleX: -1 } : { scaleY: -1 }] }]}>{pebbles}</Animated.View>
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: shade }]} />
              </Animated.View>
            ) : null}
          </>
        );
      }}
    </BookFrame>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
});
