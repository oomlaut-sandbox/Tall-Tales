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
// The felt coro. Reader logo (Jörg's felt letters, with the felt Reader from the old logo) on the desk where the cover opens, so the open cover hides it.
// To undo: set SHOW_DESK_LOGO to false (or remove these lines and assets/logo-felt.png).
const SHOW_DESK_LOGO = true;
// the coloured felt coro. (Jörg, 25 Oct 2026), a quarter bigger than the white one it replaces; the white one stays in assets/logo-felt.png
const DESK_LOGO = require('../../assets/logo-felt-colour.png'); // 1233 x 434, the letters centred where the white ones were
const LOGO_K = 1.15; // the white coro. a little bigger now that Reader is gone (Jörg, 25 Oct 2026)
import { Bar, Burger } from '../components/Chrome';
import BookFrame, { Spine, bookLayout, startRoom } from '../components/BookFrame';
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
const TILE_MAKE = require('../../assets/tile-store.png'); // the blue felt tile: Make a book (blue, like the book in My Library)

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

export default function Start({ u, go, openMenu, onHome, closed, onOpened, onClosed, onPeek, ask, onIntro }) {
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
  const [askPick, setAskPick] = useState(null); // the intro's question: the box just ticked
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
    }, target === 'make' ? 720 : String(target).startsWith('intro-') ? 1100 : 470); // (the intro: the notebook shuts, a short pause, then the first page) // three-quarters of the way through the 650ms close: the cover is all but shut
    // (Make a book waits until the notebook has closed completely, then the book maker loads: Jörg, 26 Oct 2026)
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
    <BookFrame bare deskImage={DESK_FELT} barMin={u * 17} reserve={startRoom(winW, winH)} bar={(L) => <Bar u={u} vertical={L.wide}><Burger u={u} onPress={openMenu} onHome={onHome} /></Bar>}>
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
                {(() => {
                  if (!wide) return <Image source={DESK_LOGO} resizeMode="contain" style={{ width: side * 0.86 * LOGO_K, height: side * 0.86 * LOGO_K * 434 / 1233 }} accessibilityLabel="Coro" />;
                  // sideways: the logo keeps its left edge but is a little smaller, so the felt between it and the
                  // notebook is as wide as the felt on its left (the picture's letters run from 26 to 1218 of 1233)
                  const L = bookLayout(winW, winH, insets, u * 17, startRoom(winW, winH));
                  const m = Math.max(0, (winW - L.leftW - L.rightW - 2 * side) / 2); // the felt left of the book
                  const w0 = side * 0.86, a = m + (side - w0) / 2 + w0 * 26 / 1233; // felt left of the letters now
                  const vis = Math.max(side * 0.4, m + side - 2 * a); // the letters' width, equal felt each side
                  const w = vis * 1233 / 1192 * LOGO_K; // the size the old oomlaut logo had here, a little bigger (LOGO_K)
                  const cw = w * 601 / 1233; // coro's letters: 316 to 917 of 1233, centred in that room
                  return <Image source={DESK_LOGO} resizeMode="contain" style={{ position: 'absolute', left: a - m + (vis - cw) / 2 - w * 316 / 1233, width: w, height: w * 434 / 1233 }} accessibilityLabel="Coro" />;
                })()}
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
{ask ? (
                  // the intro's first question (while the intro is on): who's here? Each answer has its own short journey
                  <View style={{ gap: k * 7, width: k * 76 }}>
                    <Text style={{ fontFamily: 'SpecialElite_400Regular', fontSize: Math.min(20, k * 7.4), lineHeight: Math.min(25, k * 9.2), color: colors.ink }}>{t('Are you a kid or a grown-up?')}</Text>
                    {/* two check boxes (Jörg, 26 Oct 2026): tap one, it's ticked, and a moment later its journey starts */}
                    {[['kid', t('Kid')], ['grownup', t('Grown-up')]].map(([w, label]) => (
                      <Pressable key={w} onPress={() => { if (askPick) return; setAskPick(w); setTimeout(() => goTo('intro-' + w), 450); }} accessibilityRole="checkbox" accessibilityState={{ checked: askPick === w }}
                        hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: k * 5 }}>
                        <View style={{ width: k * 9, height: k * 9, borderRadius: k * 1.6, borderWidth: 1.8, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                          {askPick === w ? <View style={{ width: k * 4.6, height: k * 2.6, borderLeftWidth: 2.2, borderBottomWidth: 2.2, borderColor: colors.ink, transform: [{ translateY: -k * 0.6 }, { rotate: '-45deg' }] }} /> : null}
                        </View>
                        <Text style={{ fontFamily: 'SpecialElite_400Regular', fontSize: Math.min(19, k * 7), color: colors.ink }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (<>
                                {/* Make a book first (Coro is a book maker first), then Read a book (My Library) */}
                {controls.create ? <MenuItem u={k} icon={TILE_MAKE} title={t('Make a book')} sub={t('Share your words, your pictures, your voice.')} onPress={() => goTo('make')} /> : null}
                <MenuItem u={k} icon={TILE_LIBRARY} title={t('Read a book')} sub={t('Collect, record and share your favorite stories.')} onPress={() => goTo('library')} />
                </>)}
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
    {/* a very small "Intro" in the bottom right corner, just above the bar: the intro again, as for a first-time user */}
    {onIntro && !ask ? (
      <Pressable onPress={onIntro} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Replay intro')}
        style={{ position: 'absolute', right: 16 + insets.right + (winW > winH * 1.1 ? Math.round(u * 17 * 1.15) : 0), bottom: (winW > winH * 1.1 ? 0 : u * 17 + insets.bottom) + 12, zIndex: 100 }}>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: 'rgba(215,215,215,0.6)' }}>{t('Replay intro')}</Text>
      </Pressable>
    ) : null}
    {/* A thin see-through black strip across the top, above everything (the cover opens underneath it):
        the languages on the left (tap one to switch, unless the parental controls keep the language fixed).
        (Profiles lives in My Library now.) */}
    <View pointerEvents="box-none" style={{ position: 'absolute', left: insets.left, right: winW > winH * 1.1 ? Math.round(u * 17 * 1.15) + insets.right : 0, top: insets.top, height: 32, zIndex: 100,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 2, gap: 10 }}>{/* (the words sit a point above the middle) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 11, flexShrink: 1, flexWrap: 'wrap' }}>
        {LANGS.map(([k, name]) => (
          <Pressable key={k} disabled={!controls.language} onPress={() => setLang(k)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: lang === k }}>
            <Text style={[styles.corner, { color: lang === k ? 'rgba(235,235,235,0.9)' : 'rgba(215,215,215,0.68)' }]}>{name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
    </View>
  );
}

// a small person: a round head over rounded shoulders
function UserIcon({ color, size = 11 }) {
  const glow = null;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[{ position: 'absolute', left: size * 0.29, top: 0, width: size * 0.42, height: size * 0.42, borderRadius: size, backgroundColor: color }, glow]} />
      <View style={[{ position: 'absolute', left: 0, bottom: 0, width: size, height: size * 0.46, borderTopLeftRadius: size * 0.5, borderTopRightRadius: size * 0.5, backgroundColor: color }, glow]} />
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { fontFamily: fonts.ui, fontSize: 12 },
  page: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
});
