// The tiny floating tape player for the music and ambient sounds. Drag it anywhere; it stays where it's left.
// Its reels turn while it plays. (A stand-in look until Jörg's own tape player picture arrives: then the
// picture becomes the body and the buttons sit on it.)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { TRACKS, getAmbient, nextAmbient, onAmbient, setAmbientPlayer, setPlayerPos, stopAmbient, toggleAmbient } from '../ambient';
import { useT } from '../i18n';

const W = 156, H = 98;

function Reel({ spin, size }) {
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e9e4d8', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: rot }] }}>
      <View style={{ position: 'absolute', width: size * 0.62, height: 3, backgroundColor: '#3a3a3a', borderRadius: 1.5 }} />
      <View style={{ position: 'absolute', width: 3, height: size * 0.62, backgroundColor: '#3a3a3a', borderRadius: 1.5 }} />
      <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size, backgroundColor: '#3a3a3a' }} />
    </Animated.View>
  );
}

export default function TapePlayer({ bottomBar = 0 }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [s, setS] = useState(getAmbient());
  useEffect(() => onAmbient(setS), []);
  // where it sits: where it was left, kept on screen (the first time: bottom right, above the bar)
  const place = (p) => ({
    x: Math.max(8, Math.min(winW - W - 8, p ? p.x : winW - W - 14)),
    y: Math.max(insets.top + 8, Math.min(winH - H - bottomBar - 8, p ? p.y : winH - H - bottomBar - 16)),
  });
  const xy = useRef(new Animated.ValueXY(place(s.pos))).current;
  const start = useRef({ x: 0, y: 0 });
  const drag = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onPanResponderGrant: () => { start.current = { x: xy.x._value, y: xy.y._value }; },
    onPanResponderMove: (_, g) => xy.setValue({ x: start.current.x + g.dx, y: start.current.y + g.dy }),
    onPanResponderRelease: (_, g) => {
      const p = place({ x: start.current.x + g.dx, y: start.current.y + g.dy });
      Animated.spring(xy, { toValue: p, useNativeDriver: false, friction: 7 }).start();
      setPlayerPos(p);
    },
  })).current;
  // the reels turn while it plays
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!s.playing) { spin.stopAnimation(); return undefined; }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }));
    spin.setValue(0); loop.start();
    return () => loop.stop();
  }, [s.playing]);
  if (!s.track || !s.showPlayer) return null;
  const track = TRACKS.find((x) => x.id === s.track);
  return (
    <Animated.View {...drag.panHandlers} style={[styles.body, { transform: xy.getTranslateTransform() }]} accessibilityLabel={t('Music player')}>
      {/* the label strip with what's playing */}
      <View style={styles.label}>
        <Text numberOfLines={1} style={styles.labelText}>{track ? t(track.name) : ''}</Text>
      </View>
      {/* the cassette window with its two reels */}
      <View style={styles.window}>
        <Reel spin={spin} size={22} />
        <View style={styles.tape} />
        <Reel spin={spin} size={22} />
      </View>
      <View style={styles.keys}>
        <Pressable onPress={() => nextAmbient(-1)} hitSlop={6} style={styles.key} accessibilityLabel={t('Previous')}><Text style={styles.keyText}>◀◀</Text></Pressable>
        <Pressable onPress={toggleAmbient} hitSlop={6} style={[styles.key, styles.keyMain]} accessibilityLabel={s.playing ? t('Pause') : t('Play')}><Text style={styles.keyText}>{s.playing ? '❚❚' : '▶'}</Text></Pressable>
        <Pressable onPress={() => nextAmbient(1)} hitSlop={6} style={styles.key} accessibilityLabel={t('Next')}><Text style={styles.keyText}>▶▶</Text></Pressable>
        <Pressable onPress={() => { stopAmbient(); setAmbientPlayer(true); }} hitSlop={6} style={styles.key} accessibilityLabel={t('Stop the music')}><Text style={styles.keyText}>■</Text></Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { position: 'absolute', left: 0, top: 0, width: W, height: H, zIndex: 170, borderRadius: 12, backgroundColor: '#2c2c2c', padding: 8, gap: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8, elevation: 10, borderWidth: 1, borderColor: '#444' },
  label: { backgroundColor: '#e9e4d8', borderRadius: 3, paddingHorizontal: 6, height: 16, justifyContent: 'center' },
  labelText: { fontFamily: 'SpecialElite_400Regular', fontSize: 10, color: '#2b2b2b' },
  window: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 14, height: 30 },
  tape: { flex: 1, height: 10, marginHorizontal: 6, backgroundColor: '#5a4636', borderRadius: 2 },
  keys: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  key: { flex: 1, height: 20, borderRadius: 4, backgroundColor: '#4a4a4a', alignItems: 'center', justifyContent: 'center' },
  keyMain: { backgroundColor: colors.green },
  keyText: { color: colors.white, fontFamily: fonts.ui, fontSize: 9, fontWeight: '700' },
});
