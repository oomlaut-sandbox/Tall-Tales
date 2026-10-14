// Shared pieces of Jörg's design: black control bar, hamburger, dog-ear corner, slide-in panels.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

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
      <View style={[styles.bar, styles.barV, { width: u * 17 * SIDE_BAR, paddingTop: top != null ? top : SIDE_MENU_TOP, paddingBottom: Math.max(14, insets.bottom) }]}>{children}</View>
    );
  }
  return (
    <View style={[styles.bar, { minHeight: u * 17 + insets.bottom, paddingBottom: insets.bottom, paddingHorizontal: u * 5.4 }]}>{children}</View>
  );
}

// A screen with its menu bar: at the bottom when upright, down the right side when sideways (iPad).
// bar: a function given `vertical` that returns the bar.
export function WithBar({ bar, children, style }) {
  const { width, height } = useWindowDimensions();
  const side = width > height * 1.1;
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, flexDirection: side ? 'row' : 'column' }, style]}>
      {side ? <View style={{ width: insets.left, backgroundColor: colors.bar }} /> : null}
      <View style={{ flex: 1 }}>{children}</View>
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
    <Pressable onPress={onPress} hitSlop={8} style={styles.ctl} accessibilityLabel="Recording options">
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
export function DogEar({ u, onPress, label = 'Next page', under = colors.earUnder }) {
  const e = Math.max(24, u * 7.5);
  const tri = (size, color, off = 0) => (
    <View key={`${size}-${off}`} style={{ position: 'absolute', right: off * 0.4, bottom: off * 0.4, width: 0, height: 0, borderRightWidth: size, borderTopWidth: size, borderRightColor: 'transparent', borderTopColor: color }} />
  );
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[styles.ear, { width: Math.max(48, e + 16), height: Math.max(48, e + 16) }]}>
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderLeftWidth: e, borderBottomWidth: e, borderLeftColor: 'transparent', borderBottomColor: under }} />
      {/* soft shadow: many faint layers, each a little larger, so it fades smoothly */}
      {Array.from({ length: 10 }, (_, i) => (10 - i) * 0.8).map((d) => tri(e + d, 'rgba(0,0,0,0.018)', d))}
      {tri(e, colors.white)}
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
export function Panel({ open, title, onClose, bottom, inset = 0, children }) {
  const x = useRef(new Animated.Value(open ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: open ? 0 : 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [open]);
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
      {open ? <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" /> : null}
      {/* the clip: everything up to the edge of the menu bar */}
      <View pointerEvents="box-none" style={[styles.panelClip, wide ? { right: rightW } : { bottom: bottom || 0 }]}>
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[styles.panel, wide ? { width: panelW, maxWidth: panelW, top: wideTop, right: 0 } : { bottom: 0, left: 0 },
            { maxHeight, transform: [wide ? { translateX: shift } : { translateY: shift }] }]}
        >
          <View style={[styles.panelHead, wide && { paddingTop: 14, paddingBottom: 12 }]}>
            <Text style={[styles.panelTitle, { flex: 1 }, wide && { fontSize: 22 }]}>{title}</Text>
            {/* Close: a small chevron pointing back at the menu bar it goes into (down when upright,
                right when sideways). Tapping outside the menu still closes it too. */}
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close menu" style={styles.closeBtn}>
              <View style={[styles.chev, wide && { transform: [{ rotate: '-90deg' }] }]}>
                <View style={[styles.chevBar, { left: 0, transform: [{ rotate: '40deg' }] }]} />
                <View style={[styles.chevBar, { right: 0, transform: [{ rotate: '-40deg' }] }]} />
              </View>
            </Pressable>
          </View>
          {/* Only scrolls when it can't fit (e.g. sideways on a phone). */}
          <ScrollView style={{ flexGrow: 0, flexShrink: 1, backgroundColor: colors.panel }} contentContainerStyle={[styles.panelList, wide && styles.panelCols]} bounces={false}>
            {wide ? flat(children).map((c, i) => <View key={i} style={{ width: colW }}>{c}</View>) : children}
          </ScrollView>
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
export function LibraryIcon({ size = 14, color = colors.white, weight = 2 }) {
  return (
    <View style={{ width: size, height: size, borderWidth: weight, borderColor: color, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'stretch', paddingVertical: 2 }}>
      {[0, 1].map((k) => <View key={k} style={{ width: weight, backgroundColor: color }} />)}
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
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.opt, disabled && { opacity: 0.45 }]} accessibilityRole="button">
      <View style={[styles.optIc, selected && { backgroundColor: colors.highlight }]}>{typeof glyph === 'string' ? <Text style={styles.optGlyph}>{glyph}</Text> : glyph}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.optTitle}>{title}</Text>
        <Text style={styles.optSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

// A simple slider: drag the knob or tap the track. Values snap to `step`.
export function Slider({ value, min, max, step = 0.05, onChange, onDone, leftLabel, rightLabel, format = (v) => v }) {
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
          <View style={{ width: f * w, height: 6, backgroundColor: colors.highlight }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: f * w - 13, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.optSub}>{leftLabel}</Text>
        <Text style={[styles.optSub, { color: colors.white, fontWeight: '700' }]}>{format(value)}</Text>
        <Text style={styles.optSub}>{rightLabel}</Text>
      </View>
    </View>
  );
}

// The speech bubble, said by the menu stripes: upright it sits just above the bottom bar with its
// tail pointing down at the stripes; sideways it sits beside the right-hand bar, tail pointing at them.
// at: { side: false, bottom, x } (x = the stripes' centre) or { side: true, right, y }. Tap it to close.
export function Toast({ message, at, onDismiss }) {
  if (!message) return null;
  const side = at && at.side;
  const wrap = side
    ? { position: 'absolute', right: at.right + 16, top: Math.max(12, at.y - 34), zIndex: 60, alignItems: 'flex-end', left: 24 }
    : { position: 'absolute', left: 10, right: 24, bottom: (at ? at.bottom : 80) + 18, zIndex: 60, alignItems: 'flex-start' };
  // a simple, even little point, aimed at the menu stripes
  const T = 12;
  const tail = side
    ? { position: 'absolute', right: -T, top: 34 - T, width: 0, height: 0, borderLeftWidth: T, borderLeftColor: colors.white,
        borderTopWidth: T, borderTopColor: 'transparent', borderBottomWidth: T, borderBottomColor: 'transparent' }
    : { position: 'absolute', bottom: -T, left: Math.max(12, (at ? at.x : 40) - 10 - T), width: 0, height: 0, borderTopWidth: T, borderTopColor: colors.white,
        borderLeftWidth: T, borderLeftColor: 'transparent', borderRightWidth: T, borderRightColor: 'transparent' };
  return (
    <View pointerEvents="box-none" style={wrap}>
      {/* a white speech bubble: big rounded corners, roomy padding, a soft shadow and a little tail */}
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityHint="Closes the message" style={styles.bubble}>
        <Text style={styles.toast}>{message}</Text>
        <View style={tail} />
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
  panelHead: { backgroundColor: colors.panelHead, paddingLeft: 24, paddingRight: 12, paddingTop: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chev: { width: 22, height: 12 },
  chevBar: { position: 'absolute', top: 4, width: 14, height: 3, borderRadius: 1.5, backgroundColor: colors.white },
  panelTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 28 },
  panelCols: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 16, paddingTop: 16, paddingBottom: 30 },
  panelList: { backgroundColor: colors.panel, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 22, gap: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  optIc: { width: 54, height: 54, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  optGlyph: { color: colors.white, fontSize: 22, fontWeight: '700', fontFamily: fonts.ui },
  optTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, marginBottom: 3 },
  optSub: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 14 },
  toastWrap: { position: 'absolute', left: 0, right: 0, top: 64, alignItems: 'center', zIndex: 60, paddingHorizontal: 24 },
  bubble: { backgroundColor: colors.white, borderRadius: 26, paddingHorizontal: 30, paddingVertical: 22, maxWidth: 360,
    shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 9 },
  bubbleTail: { position: 'absolute', left: 38, bottom: -13, width: 0, height: 0, borderTopWidth: 16, borderTopColor: colors.white,
    borderLeftWidth: 14, borderLeftColor: 'transparent', borderRightWidth: 4, borderRightColor: 'transparent' },
  toast: { color: colors.ink, fontFamily: fonts.story, fontSize: 19, lineHeight: 25, textAlign: 'center' }, // the book serif
});

