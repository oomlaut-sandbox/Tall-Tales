// The start screen: a book on the dark grey. The inside of the brown cover in the picture square,
// the menu in the words square.
//
// When the app opens, the book is closed: only one square shows, a brown cover with a dog-ear.
// Turning it (tap, or swipe up / sideways) opens the cover over the spine like a real book, and its
// inside (also brown) lands in the picture square. The cover can also be dragged with a finger and
// follows it the whole way. Tapping or dragging the open cover closes it again;
// only My Library or the Book Store take you to another screen.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../theme';
import { DESK_FELT, Felt } from '../look';
import { Bar, Burger } from '../components/Chrome';
import BookFrame, { Spine, startRoom } from '../components/BookFrame';
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

export default function Start({ u, go, openMenu, closed, onOpened, onClosed, onPeek }) {
  const p = useRef(new Animated.Value(closed ? 0 : 1)).current; // 0 = cover shut, 1 = cover fully open
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
    // a short pause first, so the felt background is on screen before the book slides in from the right
    const t = setTimeout(() => playSound('slide', 0.8), 450);
    Animated.timing(enter, { toValue: 0, duration: 700, delay: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => playSound('setDown', 0.7));
    return () => clearTimeout(t);
  }, []);
  const slideX = Animated.add(
    slide.interpolate({ inputRange: [0, 1], outputRange: [0, -winW] }),
    enter.interpolate({ inputRange: [0, 1], outputRange: [0, winW] }),
  );
  const [opening, setOpening] = useState(false); // the cover is moving or open (hides the dog-ear)
  const [isOpen, setIsOpen] = useState(!closed);
  const openNow = useRef(!closed);
  const busy = useRef(false);
  const geo = useRef({ side: 300, wide: false }); // the square size and direction, kept for dragging
  // Turn the cover the rest of the way: to 1 (open) or 0 (shut), from wherever it is now.
  const settle = (target, from) => {
    busy.current = true;
    const wasOpen = openNow.current;
    if (target === 1 && !wasOpen) playSound('coverOpen');
    if (target === 0 && wasOpen) playSound('coverClose');
    if (target === 0) { openNow.current = false; setIsOpen(false); }
    const left = Math.abs(target - from);
    Animated.timing(p, { toValue: target, duration: Math.max(180, (target ? 1200 : 1000) * left), easing: left > 0.9 ? Easing.inOut(Easing.cubic) : Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      busy.current = false;
      if (target === 1) { openNow.current = true; setIsOpen(true); if (!wasOpen) onOpened && onOpened(); }
      else { setOpening(false); if (wasOpen) onClosed && onClosed(); }
    });
  };
  const open = () => { if (busy.current || openNow.current) return; setOpening(true); settle(1, 0); };
  // the open cover can be turned back again (tap it, or drag it down / to the right), like a page
  const close = () => { if (busy.current || !openNow.current) return; settle(0, 1); };
  // Dragging: the cover follows the finger the whole way (up / to the left opens it, down / to the
  // right closes it); let go past halfway and it falls open, otherwise it settles back shut.
  const drag = useRef({ start: 0, v: 0 });
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !busy.current && (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8),
    onPanResponderGrant: () => { drag.current.start = openNow.current ? 1 : 0; drag.current.v = drag.current.start; setOpening(true); },
    onPanResponderMove: (_, g) => {
      const { side, wide } = geo.current;
      const d = wide ? -g.dx : -g.dy; // towards open
      const v = Math.max(0, Math.min(1, drag.current.start + d / (side * 1.6)));
      drag.current.v = v; p.setValue(v);
    },
    onPanResponderRelease: (_, g) => {
      const { wide } = geo.current;
      const fling = wide ? -g.vx : -g.vy; // a quick flick decides too
      const v = drag.current.v;
      const target = v + fling * 0.25 > 0.5 ? 1 : 0;
      if (target === 0 && !openNow.current && v === 0) { setOpening(false); return; }
      settle(target, v);
    },
    onPanResponderTerminate: () => settle(drag.current.v > 0.5 ? 1 : 0, drag.current.v),
  })).current;

  return (
    <Animated.View style={{ flex: 1, opacity: fade }}>
    <BookFrame bare deskImage={DESK_FELT} barMin={u * 17} reserve={startRoom(winW, winH)} bar={(L) => <Bar u={u} vertical={L.wide}><Burger u={u} onPress={openMenu} /></Bar>}>
      {({ side, wide }) => {
        const k = side / 100; // sizes inside the book scale with the squares
        geo.current = { side, wide };
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
            {/* the words square: the menu */}
            <View style={[at2, styles.page, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper }]}>
              <Felt opacity={0.7} />
              {!wide ? <Fade edge="top" size={Math.round(side * 0.09)} max={0.13} /> : null}
              <Spine wide={wide} />
              {/* the two items as one block, centred in the page */}
              <View style={{ gap: k * 8 }}>
                <MenuItem u={k} icon={TILE_LIBRARY} title="My Library" sub={"Find and read your\nfavorite books"} onPress={() => goTo('library')} />
                <MenuItem u={k} icon={TILE_STORE} title="Book Store" sub="Discover and buy new books" onPress={() => goTo('store')} />
              </View>
            </View>
            {/* the cover */}
            {(
              <Animated.View {...swipe.panHandlers} pointerEvents={isOpen ? 'none' : 'auto'} style={[at2, styles.page, { zIndex: 8 }, leaf]}>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: frontOp, backgroundColor: COVER_BROWN }]}>
                  <Image source={LEATHER} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="cover" />
                  <Pressable style={StyleSheet.absoluteFill} onPress={open} accessibilityRole="button" accessibilityLabel="Open the book" />
                </Animated.View>
                {/* inside of the cover: the pebbles, mirrored so they read right once turned over */}
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: backOp, transform: [wide ? { scaleX: -1 } : { scaleY: -1 }] }]}>{pebbles}</Animated.View>
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: shade }]} />
              </Animated.View>
            )}
            {/* the open cover (picture square): tap or swipe it to close the book again */}
            {isOpen ? <View {...swipe.panHandlers} style={[at1, { zIndex: 9 }]}><Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close the book" /></View> : null}
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
