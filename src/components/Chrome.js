// Shared pieces of Jörg's design: black control bar, hamburger, dog-ear corner, slide-in panels.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
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

export function Bar({ u, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { minHeight: u * 17 + insets.bottom, paddingBottom: insets.bottom, paddingHorizontal: u * 5.4 }]}>{children}</View>
  );
}

export function BarMeta({ title, sub }) {
  return (
    <View style={{ flex: 1, minWidth: 0, paddingLeft: 18 }}>
      <Text numberOfLines={1} style={styles.metaTitle}>{title}</Text>
      {sub ? <Text style={styles.metaSub}>{sub}</Text> : null}
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
  const c = active ? colors.highlight : colors.white;
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={[styles.ctl, disabled && { opacity: 0.35 }]} accessibilityLabel="Play">
      <View style={{ width: 0, height: 0, marginLeft: 6, borderLeftWidth: 26, borderTopWidth: 16, borderBottomWidth: 16, borderLeftColor: c, borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
    </Pressable>
  );
}

// Folded corner at the bottom right. The drawn fold is small; the tap area stays thumb-sized.
export function DogEar({ u, onPress, label = 'Next page' }) {
  const e = Math.max(12, u * 3.75);
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={styles.ear}>
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderLeftWidth: e, borderBottomWidth: e, borderLeftColor: 'transparent', borderBottomColor: '#262626' }} />
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderRightWidth: e, borderTopWidth: e, borderRightColor: 'transparent', borderTopColor: colors.white }} />
    </Pressable>
  );
}

// Dark panel that slides in from the left or right and grows upward from the bar.
export function Panel({ open, side = 'right', title, onClose, bottom, children }) {
  const x = useRef(new Animated.Value(open ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: open ? 0 : 1, duration: 300, useNativeDriver: true }).start();
  }, [open]);
  const sign = side === 'right' ? 1 : -1;
  return (
    <>
      {open ? <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" /> : null}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.panel, { bottom, [side]: 0, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, sign * 500] }) }] }]}
      >
        <View style={styles.panelHead}><Text style={styles.panelTitle}>{title}</Text></View>
        <View style={styles.panelList}>{children}</View>
      </Animated.View>
    </>
  );
}

export function Option({ glyph, title, sub, onPress, selected, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.opt, disabled && { opacity: 0.45 }]} accessibilityRole="button">
      <View style={[styles.optIc, selected && { backgroundColor: colors.highlight }]}><Text style={styles.optGlyph}>{glyph}</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.optTitle}>{title}</Text>
        <Text style={styles.optSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.toastWrap}>
      <Text style={styles.toast}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.bar, flexDirection: 'row', alignItems: 'center', gap: 16, zIndex: 30 },
  metaTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  metaSub: { color: colors.muted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 },
  ctl: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ear: { position: 'absolute', right: 0, bottom: 0, width: 48, height: 48, zIndex: 20 },
  panel: { position: 'absolute', width: '82%', maxHeight: '88%', zIndex: 41 },
  panelHead: { backgroundColor: colors.panelHead, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  panelTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 28 },
  panelList: { backgroundColor: colors.panel, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 22, gap: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  optIc: { width: 54, height: 54, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  optGlyph: { color: colors.white, fontSize: 22, fontWeight: '700', fontFamily: fonts.ui },
  optTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, marginBottom: 3 },
  optSub: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 14 },
  toastWrap: { position: 'absolute', left: 0, right: 0, top: 64, alignItems: 'center', zIndex: 60, paddingHorizontal: 24 },
  toast: { backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15, paddingHorizontal: 16, paddingVertical: 12, textAlign: 'center', overflow: 'hidden' },
});
