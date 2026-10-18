// The start screen: a book on the dark grey. The inside of the brown cover in the picture square,
// the menu in the words square.
//
// When the app opens, the book is already sitting there closed: only one square shows, a brown cover with a dog-ear.
// Turning it (tap, or swipe up / sideways) opens the cover over the spine like a real book, and its
// inside (also brown) lands in the picture square. The cover can also be dragged with a finger and
// follows it the whole way. Tapping or dragging the open cover closes it again;
// only My Library or the Book Store take you to another screen.
import StripCover from '../components/StripCover';
import { LANGS, LangContext, useT } from '../i18n';
import { activeProfile } from '../profiles';
import { useControls } from '../controls';
import React, { useContext, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../theme';
import { DESK_FELT, DeskFelt, Felt } from '../look';
// The felt Oomlaut Reader logo on the desk where the cover opens, so the open cover hides it.
// To undo: set SHOW_DESK_LOGO to false (or remove these lines and assets/logo-felt.png).
const SHOW_DESK_LOGO = true;
const DESK_LOGO = require('../../assets/logo-felt.png'); // 1233 x 434
import { Bar, Burger } from '../components/Chrome';
import BookFrame, { Spine, startRoom } from '../components/BookFrame';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fade } from '../components/PageView';
import { playSound } from '../sound';


export const COVER_BROWN = '#7c5438'; // a touch lighter
const LEATHER = require('../../assets/leather.jpg'); // Jörg's brown leather (no longer on the start book; kept)
// Jörg's stitched leather cover: straight along the spine, slightly rounded corners on the opening side.
// The sideways version is the same picture turned so the spine runs down its left side.
const COVER = require('../../assets/leather-cover.jpg');
const COVER_WIDE = require('../../assets/leather-cover-wide.jpg');
// The rounded corners, as a share of the square: tiny along the spine, larger at the far edge (from the picture).
const R_SPINE = 0.012, R_EDGE = 0.102;
const corners = (side, wide, flipped) => (flipped ? (wide
  ? { borderTopRightRadius: side * R_SPINE, borderBottomRightRadius: side * R_SPINE, borderTopLeftRadius: side * R_EDGE, borderBottomLeftRadius: side * R_EDGE }
  : { borderBottomLeftRadius: side * R_SPINE, borderBottomRightRadius: side * R_SPINE, borderTopLeftRadius: side * R_EDGE, borderTopRightRadius: side * R_EDGE }) : wide
  ? { borderTopLeftRadius: side * R_SPINE, borderBottomLeftRadius: side * R_SPINE, borderTopRightRadius: side * R_EDGE, borderBottomRightRadius: side * R_EDGE }
  : { borderTopLeftRadius: side * R_SPINE, borderTopRightRadius: side * R_SPINE, borderBottomLeftRadius: side * R_EDGE, borderBottomRightRadius: side * R_EDGE });

const TILE_LIBRARY = require('../../assets/tile-library.png');
const TILE_STORE = require('../../assets/tile-store.png');

function MenuItem({ u, icon, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: u * 9 }}>
      {/* the icon: a stitched felt tile (Jörg's), with a slight drop shadow */}
      <View style={{ shadowColor: '#000', shadowOffset: { width: 1, height: 4 }, shadowOpacity: 0.55, shadowRadius: 5, elevation: 5 }}>{/* a darker shadow: the felt tile sits on the page */}
        <Image source={icon} resizeMode="contain" style={{ width: u * 19, height: u * 33 }} />
      </View>
      <View style={{ width: u * 54 }}>
        {/* the typewriter font, sized with the notebook so it always fits on its page (small phones too) */}
        <Text style={{ fontFamily: 'SpecialElite_400Regular', fontSize: Math.min(17, u * 6.4), lineHeight: Math.min(21, u * 7.9), color: colors.ink, marginBottom: u * 2 }}>{title}</Text>
        <Text style={{ fontFamily: 'SpecialElite_400Regular', fontSize: Math.min(14, u * 5.1), lineHeight: Math.min(18, u * 6.6), color: colors.ink }}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export default function Start({ u, go, openMenu, closed, onOpened, onClosed, onPeek }) {
  const t = useT();
  const { lang, setLang } = useContext(LangContext);
  const controls = useControls(); // parental controls: the Book Store and changing the language may be off
  const p = useRef(new Animated.Value(closed ? 0 : 1)).current; // 0 = cover shut, 1 = cover fully open
  // The animations driven by p are made once (not on every redraw): a redraw at the end of the opening
  // (when the app hears the book is open) used to swap them for new ones, and the shadows blinked.
  const A = useRef(null);
  if (!A.current) A.current = {
    landShadow: p.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    frontOp: p.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] }),
    backOp: p.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] }),
    shade: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.25, 0] }),
  };
  // Choosing My Library or the Book Store: the cover turns shut, then the chosen page simply appears (no sliding).
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const leaving = useRef(false);
  const pageRef = useRef(null); // the page under the cover (not turning), measured for the flight to the shelf
  const coverRef = useRef(null); // the cover, measured when it's about to fly to the shelf
  // When the app opens the book is simply there on the felt, closed: no slide-in (Jörg's choice).
  const [opening, setOpening] = useState(false); // the cover is moving or open (hides the dog-ear)
  const [isOpen, setIsOpen] = useState(!closed);
  const openNow = useRef(!closed);
  const busy = useRef(false);
  const geo = useRef({ side: 300, wide: false }); // the square size and direction, kept for dragging
  // Turn the cover the rest of the way: to 1 (open) or 0 (shut), from wherever it is now.
  const settle = (target, from, after) => {
    busy.current = true;
    const wasOpen = openNow.current;
    if (target === 1 && !wasOpen) playSound('coverOpen');
    if (target === 0 && wasOpen) playSound('coverClose');
    if (target === 0) { openNow.current = false; setIsOpen(false); }
    const left = Math.abs(target - from);
    Animated.timing(p, { toValue: target, duration: Math.max(180, (target ? 1200 : leaving.current ? 650 : 1000) * left), easing: left > 0.9 ? Easing.inOut(Easing.cubic) : Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      busy.current = false;
      if (target === 1) { openNow.current = true; setIsOpen(true); if (!wasOpen) onOpened && onOpened(); }
      else { setOpening(false); if (wasOpen) onClosed && onClosed(); }
      after && after();
    });
  };
  const open = () => { if (busy.current || openNow.current) return; setOpening(true); settle(1, 0); };
  // the open cover can be turned back again (tap it, or drag it down / to the right), like a page
  const close = () => { if (busy.current || !openNow.current) return; settle(0, 1); };
  const goTo = (target) => {
    if (leaving.current || busy.current) return;
    leaving.current = true;
    // The cover starts to shut and, just before it lands, the page takes over (no waiting for it to settle).
    // My Library: a closed notebook is laid exactly over the page and shrinks and slides onto the shelf (the
    // app does that, so it's told where the page is); the Book Store just appears.
    settle(0, 1);
    setTimeout(() => {
      if (target === 'library' && pageRef.current && pageRef.current.measureInWindow) pageRef.current.measureInWindow((x, y, w, h) => go(target, w ? { x, y, w, h } : null));
      else go(target);
    }, 470); // three-quarters of the way through the 650ms close: the cover is all but shut
  };
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
    <View style={{ flex: 1 }}>
    <BookFrame bare deskImage={DESK_FELT} barMin={u * 17} reserve={startRoom(winW, winH)} bar={(L) => <Bar u={u} vertical={L.wide}><Burger u={u} onPress={openMenu} /></Bar>}>
      {({ side, wide }) => {
        const k = side / 100; // sizes inside the book scale with the squares
        geo.current = { side, wide };
        // where the two squares sit: picture first (top, or left when sideways), then the words
        const at1 = { position: 'absolute', left: 0, top: 0, width: side, height: side };
        const at2 = wide ? { position: 'absolute', left: side, top: 0, width: side, height: side } : { position: 'absolute', left: 0, top: side, width: side, height: side };
        const round = corners(side, wide);
        const coverImg = <Image source={wide ? COVER_WIDE : COVER} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="cover" />;
        // the cover turns over the spine: up when upright, to the left when sideways
        const frontOp = A.current.frontOp;
        const backOp = A.current.backOp;
        const shade = A.current.shade;
        return (
          // Upright, the whole notebook sits a little higher than centred, so the closed cover rests just above the
          // speech bubble. It never moves; when it's open the space above it is a bit smaller than below.
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: wide ? side * 2 : side, height: wide ? side : side * 2,
            transform: wide ? [] : [{ translateY: -Math.round(side * 0.14) }] }}>
            {/* the felt logo, lying on the desk in the square the cover opens onto */}
            {SHOW_DESK_LOGO ? (
              <View pointerEvents="none" style={[at1, { justifyContent: 'center', alignItems: 'center' }]}>
                <Image source={DESK_LOGO} resizeMode="contain" style={{ width: side * 0.86, height: side * 0.86 * 434 / 1233 }} accessibilityLabel="Oomlaut Reader" />
              </View>
            ) : null}
            {/* the words square: the menu */}
            {/* the menu page has the same rounded corners as the cover that lies on it */}
            <View ref={pageRef} collapsable={false} style={[at2, styles.page, round, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper }]}>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, round, { overflow: 'hidden' }]}><Felt opacity={0.7} /></View>
              {/* spine shadow on the page: a soft one along the fold (the leather side gets the deeper one) */}
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, round, { overflow: 'hidden' }]}><Fade edge={wide ? 'left' : 'top'} size={Math.round(side * 0.17)} max={0.32} /></View>
              <Spine wide={wide} />
              {/* the two items as one block, centred in the page */}
              <View style={{ gap: k * 8, transform: [{ translateX: k * 5 }] }}>{/* nudged a little to the right */}
                <MenuItem u={k} icon={TILE_LIBRARY} title={t('My Library')} sub={t('Find and read your\nfavorite books')} onPress={() => goTo('library')} />
                {controls.store ? <MenuItem u={k} icon={TILE_STORE} title={t('Book Store')} sub={t('Discover and buy new books')} onPress={() => goTo('store')} /> : null}
              </View>
            </View>
            {/* where the open cover lands: a still felt-coloured shape with the cover's shadow, growing in as it
                arrives (the turning cover itself casts none) */}
            <Animated.View pointerEvents="none" style={[at1, corners(side, wide, true), { backgroundColor: DESK_FELT ? '#262626' : colors.desk, opacity: A.current.landShadow,
              shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 }]}>
              <View style={[StyleSheet.absoluteFill, corners(side, wide, true), { overflow: 'hidden' }]}><DeskFelt spot="startPlate" /></View>
            </Animated.View>
            {/* the cover: the strip method from the Cover test (flat strips, no 3D, always solid) */}
            <StripCover p={p} side={side} wide={wide} style={[at2, { zIndex: 8 }]} />
            {/* the shut cover's touch area: tap to open, or swipe it */}
            <View ref={coverRef} collapsable={false} {...swipe.panHandlers} pointerEvents={isOpen ? 'none' : 'auto'} style={[at2, { zIndex: 9 }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={open} accessibilityRole="button" accessibilityLabel="Open the book" />
            </View>
            {/* the open cover (picture square): tap or swipe it to close the book again */}
            {isOpen ? <View {...swipe.panHandlers} style={[at1, { zIndex: 9 }]}><Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close the book" /></View> : null}
          </Animated.View>
        );
      }}
    </BookFrame>
    {/* the languages, small and light grey in the top left corner, above everything (the cover opens
        underneath them). Tap one to switch (unless the parental controls keep the language fixed).
        A soft black glow under the letters keeps them readable on the felt. */}
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, top: insets.top + 22, maxWidth: winW - 32 - 70, zIndex: 100, flexDirection: 'row', flexWrap: 'wrap', columnGap: 11, rowGap: 6 }}>
      {LANGS.map(([k, name]) => (
        <Pressable key={k} disabled={!controls.language} onPress={() => setLang(k)} hitSlop={6} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: lang === k }}>
          <Text style={[styles.corner, { color: lang === k ? 'rgba(235,235,235,0.9)' : 'rgba(200,200,200,0.5)' }]}>{name}</Text>
        </Pressable>
      ))}
    </View>
    {/* Profiles, the same way in the top right corner: one for each child (the child reading now, once there are profiles) */}
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 16, top: insets.top + 22, zIndex: 100 }}>
      <Pressable onPress={() => go('profiles')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessibilityRole="button" accessibilityLabel={t('Profiles')}>
        <UserIcon color="rgba(235,235,235,0.9)" />
        <Text numberOfLines={1} style={[styles.corner, { color: 'rgba(235,235,235,0.9)', maxWidth: 90 }]}>{(activeProfile() || {}).name || t('Profiles')}</Text>
      </Pressable>
    </View>
    </View>
  );
}

// a small person: a round head over rounded shoulders, with the same soft glow as the letters
function UserIcon({ color, size = 11 }) {
  const glow = { shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } };
  return (
    <View style={{ width: size, height: size }}>
      <View style={[{ position: 'absolute', left: size * 0.29, top: 0, width: size * 0.42, height: size * 0.42, borderRadius: size, backgroundColor: color }, glow]} />
      <View style={[{ position: 'absolute', left: 0, bottom: 0, width: size, height: size * 0.46, borderTopLeftRadius: size * 0.5, borderTopRightRadius: size * 0.5, backgroundColor: color }, glow]} />
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { fontFamily: fonts.ui, fontSize: 12, textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  page: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
});
