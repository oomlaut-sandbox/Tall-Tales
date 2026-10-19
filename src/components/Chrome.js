// Shared pieces of Jörg's design: black control bar, hamburger, dog-ear corner, slide-in panels.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DeskFelt, Felt, Stitch, useLook } from '../look';
import { useT } from '../i18n';

export function Burger({ onPress, u }) {
  const w = u * 7, t = Math.max(3, u * 1), gap = u * 1.7;
  return (
    <Pressable onPress={onPress} hitSlop={14} accessibilityRole="button" accessibilityLabel="Menu" style={{ width: w, justifyContent: 'center' }}>
      <View style={{ height: t, backgroundColor: colors.white }} />
      <View style={{ height: t, backgroundColor: colors.white, marginTop: gap }} />
      <View style={{ height: t, backgroundColor: colors.white, marginTop: gap }} />
    </Pressable>
  );
}

// The black bar. Upright it runs along the bottom; sideways (vertical) it runs down the right edge.
// Sideways the menu bar sits right at the screen's edge and is a touch wider than upright.
// (The camera housing is in the middle of the edge, where the bar has no buttons.)
export const SIDE_BAR = 1.15;

export function Bar({ u, children, vertical, top }) {
  const insets = useSafeAreaInsets();
  if (vertical) {
    return (
      <View style={[styles.bar, styles.barV, { width: u * 17 * SIDE_BAR, paddingTop: top != null ? top : SIDE_MENU_TOP, paddingBottom: Math.max(14, insets.bottom) }]}><Felt />{children}</View>
    );
  }
  return (
    <View style={[styles.bar, { minHeight: u * 17 + insets.bottom, paddingBottom: insets.bottom, paddingHorizontal: u * 5.4 }]}><Felt />{children}</View>
  );
}

// A screen with its menu bar: at the bottom when upright, down the right side when sideways (iPad).
// bar: a function given `vertical` that returns the bar.
export function WithBar({ bar, children, style, bg }) {
  const { width, height } = useWindowDimensions();
  const side = width > height * 1.1;
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, flexDirection: side ? 'row' : 'column' }, style]}>
      {side ? <View style={{ width: insets.left, backgroundColor: colors.bar }} /> : null}
      <View style={{ flex: 1 }}>
        {/* an optional background picture (the charcoal felt) behind the page's content */}
        {bg ? <DeskFelt spot="withbar" /> : null}
        <Felt />{children}
      </View>
      {bar(side)}
    </View>
  );
}

export function BarMeta({ title, sub, vertical, serif, page }) {
  // The reader's bar: just "Page X of Y", small bold Helvetica.
  if (page) return <View style={{ flexShrink: 1, minWidth: 0, paddingLeft: 14 }}><Text numberOfLines={1} style={styles.metaPage}>{page}</Text></View>;
  if (vertical) {
    // Only room for the page number when the bar runs down the side.
    return sub ? <Text style={[styles.metaPage, { textAlign: 'center' }]}>{sub}</Text> : null;
  }
  return (
    <View style={{ flex: 1, minWidth: 0, paddingLeft: 18 }}>
      <Text numberOfLines={1} style={[styles.metaTitle, serif && styles.metaTitleSerif]}>{title}</Text>
      {sub ? <Text style={[styles.metaSub, serif && styles.metaSubSerif]}>{sub}</Text> : null}
    </View>
  );
}

export function RecordButton({ onPress, active }) {
  const tr = useT();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return pulse.setValue(1);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.75, duration: 550, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active]);
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.ctl} accessibilityLabel={tr('Recording options')}>
      <Animated.View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.highlight, transform: [{ scale: pulse }] }} />
    </Pressable>
  );
}

export function PauseButton({ onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={[styles.ctl, disabled && { opacity: 0.35 }]} accessibilityLabel="Pause">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ width: 9, height: 30, backgroundColor: colors.white }} />
        <View style={{ width: 9, height: 30, backgroundColor: colors.white }} />
      </View>
    </Pressable>
  );
}

export function PlayButton({ onPress, active, disabled }) {
  const c = colors.white; // always white, playing or not
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={[styles.ctl, disabled && { opacity: 0.35 }]} accessibilityLabel="Play">
      <View style={{ width: 0, height: 0, marginLeft: 6, borderLeftWidth: 26, borderTopWidth: 16, borderBottomWidth: 16, borderLeftColor: c, borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
    </Pressable>
  );
}

// Folded corner at the bottom right. The drawn fold is small; the tap area stays thumb-sized.
// The folded corner: a dark triangle (the page behind) and the white folded flap, which casts a
// soft shadow onto the page (a few faint, slightly larger triangles behind it).
// flap: the colour of the folded-over corner (white paper in books; lighter brown on the leather cover)
export function DogEar({ u, onPress, label = 'Next page', under = colors.earUnder, flap = colors.white }) {
  const tr = useT();
  const e = Math.max(24, u * 7.5);
  const tri = (size, color, off = 0) => (
    <View key={`${size}-${off}`} style={{ position: 'absolute', right: off * 0.4, bottom: off * 0.4, width: 0, height: 0, borderRightWidth: size, borderTopWidth: size, borderRightColor: 'transparent', borderTopColor: color }} />
  );
  return (
    <Pressable onPress={onPress} accessibilityLabel={tr(label)} style={[styles.ear, { width: Math.max(48, e + 16), height: Math.max(48, e + 16) }]}>
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderLeftWidth: e, borderBottomWidth: e, borderLeftColor: 'transparent', borderBottomColor: under }} />
      {/* soft shadow: many faint layers, each a little larger, so it fades smoothly */}
      {Array.from({ length: 10 }, (_, i) => (10 - i) * 0.8).map((d) => tri(e + d, 'rgba(0,0,0,0.018)', d))}
      {tri(e, flap)}
    </Pressable>
  );
}

// The height of the menu stripes from the top when sideways: fixed, a little down from the top
// right corner, clear of the iPad's status icons (battery etc.).
export const SIDE_MENU_TOP = 46;
// Where the middle stripe of the menu icon sits (sideways), so a menu's close arrow can line up with it.
function sideMenuMiddle(winW) {
  const u = Math.min(winW, 460) / 100;
  const t = Math.max(3, u * 1), gap = u * 1.7;
  return SIDE_MENU_TOP + (3 * t + 2 * gap) / 2;
}
const HEAD_ARROW_WIDE = 14 + 22; // sideways head: top padding + half the 44-point close button

// Dark menu panel that comes out of the black menu bar.
// Upright: it slides UP out of the bottom bar, at the bottom left.
// Sideways: it slides out to the LEFT from the right-hand bar, its top level with the menu stripes.
// It is clipped at the bar's edge, so it looks as if it comes out of (and goes back into) the bar.
// bottom: the bottom bar's height (upright). inset: the right bar's width (sideways).
// Only one menu is ever out at a time: opening one sends any other open menu back into the bar first,
// then this one slides out. (Pop-up boxes are separate and can float over anything.)
const openPanels = new Map(); // id -> close function
let panelSeq = 0;
export function Panel({ open, title, onClose, bottom, inset = 0, children, portraitWidth }) {
  const tr = useT();
  const x = useRef(new Animated.Value(open ? 0 : 1)).current;
  const id = useRef(++panelSeq).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    let t;
    if (open) {
      const others = [...openPanels.entries()].filter(([k]) => k !== id);
      others.forEach(([, close]) => close && close());
      openPanels.set(id, () => closeRef.current && closeRef.current());
      const go = () => Animated.timing(x, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      if (others.length) t = setTimeout(go, 300); else go(); // wait for the other menu to slide away
    } else {
      openPanels.delete(id);
      Animated.timing(x, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => () => { openPanels.delete(id); }, []);
  const { height: winH, width: winW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Sideways (wider than tall) the menu is wide and short: its items sit in two columns.
  const wide = winW > winH * 1.1;
  const rightW = inset || Math.round((Math.min(winW, 460) / 100) * 17 * 1.15);
  const wideTop = Math.round(sideMenuMiddle(winW) - HEAD_ARROW_WIDE); // the close arrow level with the icon's middle stripe
  const maxHeight = wide ? winH - wideTop - 34 : Math.max(240, Math.min(winH * 0.8 - (bottom || 0), winH - (bottom || 0) - insets.top - 24));
  const room = winW - insets.left - rightW;
  const panelW = wide ? Math.min(760, room - 24) : null;
  const colW = wide ? (panelW - 44 - 22) / 2 : null;
  const flat = (kids) => React.Children.toArray(kids).flatMap((c) => (c && c.type === React.Fragment ? flat(c.props.children) : [c]));
  const shift = x.interpolate({ inputRange: [0, 1], outputRange: [0, wide ? winW : winH] });
  return (
    <>
      {/* tapping outside closes the menu, but the bar stays live, so its other buttons (record, Pages…) still work */}
      {open ? <Pressable style={[StyleSheet.absoluteFill, wide ? { right: rightW } : { bottom: bottom || 0 }]} onPress={onClose} accessibilityLabel={tr('Close menu')} /> : null}
      {/* the clip: everything up to the edge of the menu bar */}
      <View pointerEvents="box-none" style={[styles.panelClip, wide ? { right: rightW } : { bottom: bottom || 0 }]}>
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[styles.panel, wide ? { width: panelW, maxWidth: panelW, top: wideTop, right: 0 } : { bottom: 0, left: 0 }, !wide && portraitWidth ? { width: portraitWidth, maxWidth: 520 } : null,
            { maxHeight, transform: [wide ? { translateX: shift } : { translateY: shift }] }]}
        >
          <Felt />
          <View style={[styles.panelHead, wide && { paddingTop: 14, paddingBottom: 12 }]}>
            <Text style={[styles.panelTitle, { flex: 1 }, wide && { fontSize: 20 }]}>{title}</Text>
            {/* Close: a small chevron pointing back at the menu bar it goes into (down when upright,
                right when sideways). Tapping outside the menu still closes it too. */}
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('Close menu')} style={styles.closeBtn}>
              {/* one bordered corner turned 45°: both strokes meet in a single clean point (no overlapping bars) */}
              <View style={[styles.chev, wide && { transform: [{ rotate: '-90deg' }] }]}>
                <View style={styles.chevCorner} />
              </View>
            </Pressable>
          </View>
          {/* Only scrolls when it can't fit (e.g. sideways on a phone). */}
          <ScrollView style={{ flexGrow: 0, flexShrink: 1, backgroundColor: colors.panel }} contentContainerStyle={[styles.panelList, wide && styles.panelCols]} bounces={false}>
            {wide ? flat(children).map((c, i) => <View key={i} style={{ width: colW }}>{c}</View>) : children}
          </ScrollView>
          <Stitch inset={6} />
        </Animated.View>
      </View>
    </>
  );
}

// Small flat icons drawn with shapes (so they look the same on every phone).
// Read again: a thick little circle with a small opening on the left (no arrow).
// bg: the colour behind the icon (the opening is cut with it).
export function AgainIcon({ size = 14, color = colors.white, weight = 3.5, bg = colors.tile }) {
  const gap = Math.max(3, size * 0.26);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: weight, borderColor: color }} />
      <View style={{ position: 'absolute', left: -1, top: (size - gap) / 2, width: weight + 2, height: gap, backgroundColor: bg }} />
    </View>
  );
}
// My Library: books standing on a shelf (an outlined square with upright lines).
// A musical note, in the same plain white strokes as the other icons: an oval head, a stem and one flag.
const MUSIC_NOTE = require('../../assets/icon-music.png');
// Music and Sounds: two beamed notes in white
export function MusicIcon({ size = 20, color }) {
  return <Image source={MUSIC_NOTE} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />;
}
// the restricted kid mode lock: a rounded body with a shackle on top
export function LockIcon({ size = 20, color = colors.white, weight = 2 }) {
  const bw = size * 0.72, bh = size * 0.5, sw = size * 0.46;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ position: 'absolute', top: size * 0.04, width: sw, height: size * 0.58, borderWidth: weight, borderColor: color, borderTopLeftRadius: sw / 2, borderTopRightRadius: sw / 2, borderBottomWidth: 0 }} />
      <View style={{ width: bw, height: bh, borderRadius: size * 0.1, backgroundColor: color }} />
    </View>
  );
}
// Playlists: three lines of a list, the last one shorter, with a small play triangle beside it
export function PlaylistIcon({ size = 20, color = colors.white, weight = 2.4 }) {
  const tri = size * 0.34;
  // three lines: the top one full width, the middle and bottom ones halved, with the play arrow beside those two
  const gap = size * 0.17, top = (size - (3 * weight + 2 * gap)) / 2;
  const mid = top + 2 * weight + 1.5 * gap; // halfway between the middle and bottom lines
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', gap }}>
      <View style={{ width: size, height: weight, backgroundColor: color }} />
      <View style={{ width: size * 0.5, height: weight, backgroundColor: color }} />
      <View style={{ width: size * 0.5, height: weight, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: 0, top: mid - tri / 2, width: 0, height: 0, borderTopWidth: tri / 2, borderBottomWidth: tri / 2, borderLeftWidth: tri * 0.9, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color }} />
    </View>
  );
}
export function LibraryIcon({ size = 14, color = colors.white, weight = 2 }) {
  return (
    <View style={{ width: size, height: size, borderWidth: weight, borderColor: color, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'stretch' }}>{/* the two lines run the whole height of the box */}
      {[0, 1].map((k) => <View key={k} style={{ width: weight, backgroundColor: color }} />)}
    </View>
  );
}
// Menu icons: one family, all drawn at the same size (20) with the same 2-point stroke.
export const MENU_ICON = 20;
export function StoreIcon({ size = MENU_ICON, color = colors.white, weight = 2 }) {
  return (
    <View style={{ width: size, height: size, borderWidth: weight, borderColor: color, alignItems: 'center' }}>
      <View style={{ width: weight, flex: 1, backgroundColor: color }} />
    </View>
  );
}
export function PlayGlyph({ size = MENU_ICON, color = colors.white, count = 1 }) {
  // solid play triangle(s), like the play button in the reader's bar; count 2 = Auto Play
  const h = size * (count > 1 ? 0.62 : 0.8), w = size * (count > 1 ? 0.48 : 0.7);
  const tri = (k) => <View key={k} style={{ width: 0, height: 0, marginLeft: k ? size * 0.04 : 0, borderTopWidth: h / 2, borderBottomWidth: h / 2, borderLeftWidth: w, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color }} />;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: count > 1 ? 0 : size * 0.12 }}>
      {Array.from({ length: count }, (_, k) => tri(k))}
    </View>
  );
}
// A little page for the print choices: portrait (picture above words) or landscape (side by side).
export function PageShape({ wide }) {
  const W = wide ? 40 : 30, H = wide ? 30 : 40, q = 15;
  return (
    <View style={{ width: W, height: H, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: wide ? 'row' : 'column' }}>
        <View style={{ width: q, height: q, borderWidth: 1.5, borderColor: '#333', backgroundColor: '#9a9a9a' }} />
        <View style={{ width: q, height: q, borderWidth: 1.5, borderColor: '#333', [wide ? 'borderLeftWidth' : 'borderTopWidth']: 0 }} />
      </View>
    </View>
  );
}
// Simple round glasses: two perfect circles side by side, joined by an arched bridge over the nose.
// Listen Only: a crescent moon (a ring drawn thick on one side only)
// Listen Only: headphones (a band over the top, a cup on each side)
export function HeadphonesIcon({ size = MENU_ICON, color = colors.white, weight = 2.4 }) {
  const cupW = size * 0.24, cupH = size * 0.42;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: size * 0.08, top: size * 0.08, width: size * 0.84, height: size * 0.84, borderRadius: size, borderWidth: weight, borderColor: color, borderBottomColor: 'transparent', borderLeftColor: color, borderRightColor: color, transform: [{ rotate: '0deg' }] }} />
      <View style={{ position: 'absolute', left: size * 0.04, top: size * 0.5, width: cupW, height: cupH, borderRadius: cupW * 0.45, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: size * 0.04, top: size * 0.5, width: cupW, height: cupH, borderRadius: cupW * 0.45, backgroundColor: color }} />
    </View>
  );
}
// a person (head and shoulders): Profiles
export function PersonIcon({ size = MENU_ICON, color = colors.white }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ marginTop: size * 0.06, width: size * 0.42, height: size * 0.42, borderRadius: size, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: size * 0.04, width: size * 0.84, height: size * 0.38, borderTopLeftRadius: size * 0.42, borderTopRightRadius: size * 0.42, backgroundColor: color }} />
    </View>
  );
}
// a crescent moon (☽): two smooth curves, drawn once as a picture and tinted
const MOON_ART = require('../../assets/icon-moon.png');
export function MoonIcon({ size = MENU_ICON, color = colors.white }) {
  return <Image source={MOON_ART} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />;
}
export function GlassesIcon({ size = MENU_ICON, color = colors.white, weight = 2 }) {
  // smaller than it was, so it sits in its tile like the other icons
  const d = Math.round(size * 0.5); // each lens
  const b = Math.round(size * 0.32); // the bridge's width
  return (
    <View style={{ width: size * 1.4, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, borderWidth: weight, borderColor: color }} />
      {/* the bridge: the top half of a small ring, so it arches up between the lenses */}
      <View style={{ width: b, height: b / 2, overflow: 'hidden', marginHorizontal: -weight, marginBottom: d * 0.3 }}>{/* just the arch, nothing under it */}
        <View style={{ width: b, height: b, borderRadius: b / 2, borderWidth: weight, borderColor: color }} />
      </View>
      <View style={{ width: d, height: d, borderRadius: d / 2, borderWidth: weight, borderColor: color }} />
    </View>
  );
}
// A small solid speech bubble (rounded box with a little point at the bottom left), for Voices.
export function BubbleIcon({ size = MENU_ICON, color = colors.white }) {
  const w = size * 0.95, h = size * 0.62, t = size * 0.22;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: w, height: h + t * 0.8, marginTop: -t * 0.4 }}>
        <View style={{ width: w, height: h, borderRadius: h * 0.32, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: w * 0.18, top: h - 1, width: 0, height: 0, borderTopWidth: t, borderRightWidth: t, borderTopColor: color, borderRightColor: 'transparent' }} />
      </View>
    </View>
  );
}
export function PlusIcon({ size = MENU_ICON, color = colors.white, weight = 2 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: weight, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: weight, height: size, backgroundColor: color }} />
    </View>
  );
}
export function CircleIcon({ size = MENU_ICON, color = colors.white, weight = 2 }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: weight, borderColor: color }} />;
}
export function InfoIcon({ size = MENU_ICON, color = colors.white, weight = 2 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 1 }}>
      <View style={{ width: weight + 1, height: weight + 1, borderRadius: weight, backgroundColor: color }} />
      <View style={{ width: weight, height: size * 0.62, backgroundColor: color }} />
    </View>
  );
}

export function DiamondIcon({ size = MENU_ICON, color = colors.white, weight = 2 }) {
  const d = size * 0.68;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderWidth: weight, borderColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}
export function ChevronIcon({ size = MENU_ICON, color = colors.white, weight = 2, count = 1 }) {
  // a corner (top and right edges of a small square) turned to point right
  const w = size * 0.5;
  const one = (k) => <View key={k} style={{ width: w, height: w, borderTopWidth: weight, borderRightWidth: weight, borderColor: color, transform: [{ rotate: '45deg' }], marginLeft: k ? -w * 0.15 : 0 }} />;
  return <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingRight: w * 0.3 }}>{Array.from({ length: count }, (_, k) => one(k))}</View>;
}
export function TextIcon({ size = MENU_ICON, color = colors.white, text }) {
  return (
    <View style={{ width: size + 8, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontFamily: fonts.ui, fontWeight: '700', fontSize: size * 0.9, lineHeight: size * 1.05 }}>{text}</Text>
    </View>
  );
}
export function NoteIcon({ size = MENU_ICON, color = colors.white, weight = 2 }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: size * 0.12, top: size * 0.6, width: size * 0.42, height: size * 0.34, borderRadius: size, backgroundColor: color, transform: [{ rotate: '-20deg' }] }} />
      <View style={{ position: 'absolute', left: size * 0.5, top: size * 0.05, width: weight, height: size * 0.72, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: size * 0.5, top: size * 0.05, width: size * 0.36, height: weight, backgroundColor: color, transform: [{ rotate: '30deg' }, { translateX: size * 0.03 }, { translateY: size * 0.08 }] }} />
    </View>
  );
}
export function DotIcon({ size = MENU_ICON, color = colors.white }) {
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: size * 0.62, height: size * 0.62, borderRadius: size, backgroundColor: color }} /></View>;
}
export function ListIcon({ size = MENU_ICON, color = colors.white, weight = 2 }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-evenly', paddingVertical: 2 }}>
      {[0, 1, 2].map((k) => <View key={k} style={{ height: weight, backgroundColor: color }} />)}
    </View>
  );
}

// Share: a small solid heart, made of two rounded halves leaning together.
export function HeartIcon({ size = 15, color = colors.white }) {
  const w = size * 0.52, h = size * 0.8;
  const half = { position: 'absolute', top: 0, width: w, height: h, backgroundColor: color, borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2 };
  return (
    <View style={{ width: size, height: size * 0.9 }}>
      <View style={[half, { left: size / 2, transformOrigin: 'left bottom', transform: [{ rotate: '-45deg' }] }]} />
      <View style={[half, { left: size / 2 - w, transformOrigin: 'right bottom', transform: [{ rotate: '45deg' }] }]} />
    </View>
  );
}

// A small, flat gear (for settings): three crossed bars make six teeth, a disc and a hole on top.
export function GearIcon({ size = 18, color = colors.white, hole = colors.tile }) {
  const bar = { position: 'absolute', left: (size - size * 0.24) / 2, top: 0, width: size * 0.24, height: size, backgroundColor: color, borderRadius: size * 0.04 };
  return (
    <View style={{ width: size, height: size }}>
      {[0, 60, 120].map((r) => <View key={r} style={[bar, { transform: [{ rotate: `${r}deg` }] }]} />)}
      <View style={{ position: 'absolute', left: size * 0.14, top: size * 0.14, width: size * 0.72, height: size * 0.72, borderRadius: size, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: size * 0.34, top: size * 0.34, width: size * 0.32, height: size * 0.32, borderRadius: size, backgroundColor: hole }} />
    </View>
  );
}

export function Option({ glyph, title, sub, onPress, selected, disabled }) {
  const felt = useLook() === 'felt';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.opt, disabled && { opacity: 0.45 }]} accessibilityRole="button">
      <View style={[styles.optIc, selected && { backgroundColor: colors.green }, felt && { borderRadius: 12, overflow: 'hidden' }]}>
        <Felt />
        <Stitch inset={4} radius={12} />
        {typeof glyph === 'string' ? <Text style={styles.optGlyph}>{glyph}</Text> : glyph}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.optTitle}>{title}</Text>
        <Text style={styles.optSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

// A simple slider: drag the knob or tap the track. Values snap to `step`.
export function Slider({ value, min, max, step = 0.05, onChange, onDone, leftLabel, rightLabel, format = (v) => v, showValue = true }) {
  const [w, setW] = React.useState(0);
  const geo = useRef({ w: 0, x0: 0 });
  const cb = useRef({});
  cb.current = { onChange, onDone, min, max, step };
  const toValue = (x) => {
    const { min: lo, max: hi, step: st } = cb.current;
    const f = Math.max(0, Math.min(1, x / Math.max(1, geo.current.w)));
    return Math.round((lo + f * (hi - lo)) / st) * st;
  };
  const last = useRef(value);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { geo.current.x0 = e.nativeEvent.locationX; last.current = toValue(geo.current.x0); cb.current.onChange(last.current); },
    onPanResponderMove: (_, g) => { last.current = toValue(geo.current.x0 + g.dx); cb.current.onChange(last.current); },
    onPanResponderRelease: () => cb.current.onDone && cb.current.onDone(last.current),
    onPanResponderTerminate: () => cb.current.onDone && cb.current.onDone(last.current),
  })).current;
  const f = (value - min) / (max - min);
  return (
    <View>
      <View style={{ height: 44, justifyContent: 'center' }} onLayout={(e) => { geo.current.w = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); }} {...pan.panHandlers}
        accessibilityRole="adjustable" accessibilityValue={{ text: String(format(value)) }}>
        <View pointerEvents="none" style={{ height: 6, backgroundColor: '#444' }}>
          <View style={{ width: f * w, height: 6, backgroundColor: colors.green }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: f * w - 13, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.optSub}>{leftLabel}</Text>
        {showValue ? <Text style={[styles.optSub, { color: colors.white, fontWeight: '700' }]}>{format(value)}</Text> : null}
        <Text style={styles.optSub}>{rightLabel}</Text>
      </View>
    </View>
  );
}

// The speech bubble: a white rounded box in the middle of the screen (between the bars). Tap it to close.
export function Toast({ message, area, onDismiss, center }) {
  const tr = useT();
  if (!message) return null;
  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 60, alignItems: 'center', justifyContent: center ? 'center' : 'flex-end', paddingBottom: center ? 0 : 14 }, area]}>
      {/* Every speech bubble pops up in the same place: just above the bottom bar, most of the screen wide,
          shaped like Jörg's bubble (rounded box, a small straight point at the bottom left), with a soft shadow.
          (center: in the middle of the given area instead, e.g. the picture page while recording.)
          Tap it to close it sooner. */}
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityHint={tr('Closes the message')} style={styles.bubbleWrap}>
        <View style={styles.bubble}>
          {/* a ● in the message is drawn in the record button's red */}
          <Text style={styles.toast}>{String(message).split('●').map((part, i) => (i ? [<Text key={i} style={{ color: colors.highlight }}>●</Text>, part] : part))}</Text>
        </View>
        <View style={styles.bubbleTail} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.bar, flexDirection: 'row', alignItems: 'center', gap: 16, zIndex: 30 },
  barV: { flexDirection: 'column', justifyContent: 'space-between', gap: 10 },
  metaTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  // In the reader, the book's title and page number use the book serif.
  metaTitleSerif: { fontFamily: fonts.story, fontWeight: '400', fontSize: 19 },
  metaSubSerif: { fontFamily: fonts.story, fontSize: 14 },
  metaPage: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 13, letterSpacing: 0.2 },
  metaSub: { color: colors.muted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 },
  ctl: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ear: { position: 'absolute', right: 0, bottom: 0, width: 48, height: 48, zIndex: 20 },
  panel: { position: 'absolute', width: '82%', maxWidth: 440 },
  panelClip: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', zIndex: 41 },
  panelHead: { backgroundColor: '#141414', paddingLeft: 24, paddingRight: 12, paddingTop: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chev: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chevCorner: { width: 13, height: 13, borderRightWidth: 3, borderBottomWidth: 3, borderColor: colors.white, transform: [{ translateY: -3 }, { rotate: '45deg' }] }, // points down
  panelTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 24, transform: [{ translateY: -3 }] }, // a nudge up, so it sits in the middle of the heading
  panelCols: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 16, paddingTop: 16, paddingBottom: 30 },
  panelList: { backgroundColor: colors.panel, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 22, gap: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  optIc: { width: 54, height: 54, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  optGlyph: { color: colors.white, fontSize: 22, fontWeight: '700', fontFamily: fonts.ui },
  optTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, marginBottom: 3 },
  optSub: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 14 },
  toastWrap: { position: 'absolute', left: 0, right: 0, top: 64, alignItems: 'center', zIndex: 60, paddingHorizontal: 24 },
  bubbleWrap: { width: '90%', maxWidth: 560, paddingBottom: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  bubble: { backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 24 }, // the serif sits low, so a little more room below centres it
  bubbleTail: { position: 'absolute', left: '14%', bottom: 0, width: 0, height: 0, borderTopWidth: 23, borderRightWidth: 22, borderTopColor: colors.white, borderRightColor: 'transparent' },
  toast: { color: colors.ink, fontFamily: 'EBGaramond_500Medium', fontSize: 21, lineHeight: 28, textAlign: 'center' }, // the book serif
});

