// The little floating felt tape player (Jörg's picture) for the music and ambient sounds. Drag it anywhere;
// it stays where it's left. Shown with the note in the reading bar (or from Music and Sounds).
//   Record / Play / Pause: the three felt buttons (Record records your voice in the open book, like the red
//     button in the reading bar; the little red light comes on only while recording)
//   Sounds (top window) and Music (bottom window): tap a knob to click through the choices; the choice shows
//     in the window in white, and the knob turns a notch each click
//   Volume (the slider top left, a grey felt dot on a stitched line): drag the dot, or tap the line
//   the three lines at the top: open the Music and Sounds page; the down arrow: close the player
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme';
import { MUSIC, SOUNDS, TRACKS, getAmbient, onAmbient, pauseAmbient, playAmbient, requestRecord, setAmbientPlayer, setAmbientVolume, setPlayerPos, stepAmbient } from '../ambient';
import { useT } from '../i18n';

const BODY = require('../../assets/tape-player.jpg');
const KNOB1 = require('../../assets/tape-knob1.png');
const DOT = require('../../assets/tape-volume.png');
const KNOB2 = require('../../assets/tape-knob2.png');
// the player's size: almost as tall as an iPhone is wide (a little less on a very small screen)
const sizeFor = (winW, winH) => {
  const PH = Math.min(360, Math.round(Math.min(winW, winH) * 0.92));
  const PW = Math.round(PH * 600 / 1196);
  return { PW, PH, f: PW / 900 }; // f: the picture's own units (900 wide) to the screen
};
// the volume slider, in the picture's units: the line runs from TX0 to TX1 at height TY
const VMIN = 0.05;
const TX0 = 100, TX1 = 480, TY = 112, DOTD = 74;

export default function TapePlayer({ bottomBar = 0, sideBar = 0, onMenu, toast }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { PW, PH, f } = sizeFor(winW, winH);
  // a spot on the picture, in its own units
  const at = (x, y, w, h) => ({ position: 'absolute', left: x * f, top: y * f, width: w * f, height: h * f });
  const [s, setS] = useState(getAmbient());
  useEffect(() => onAmbient(setS), []);
  // where it sits: where it was left, kept on screen (the first time: the right side, above the bar)
  const place = (p) => ({
    x: Math.max(6 + insets.left, Math.min(winW - PW - sideBar - 6, p ? p.x : winW - PW - sideBar - 12)),
    y: Math.max(insets.top + 6, Math.min(winH - PH - bottomBar - 6, p ? p.y : winH - PH - bottomBar - 14)),
  });
  const xy = useRef(new Animated.ValueXY(place(s.pos))).current;
  const placeRef = useRef(place);
  placeRef.current = place;
  // when it shows, and when the phone turns: where it was left, kept on the screen
  useEffect(() => { xy.setValue(place(getAmbient().pos)); }, [winW, winH, s.showPlayer, sideBar, bottomBar]);
  const start = useRef({ x: 0, y: 0 });
  const drag = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 10,
    onPanResponderGrant: () => { start.current = { x: xy.x._value, y: xy.y._value }; },
    onPanResponderMove: (_, g) => xy.setValue({ x: start.current.x + g.dx, y: start.current.y + g.dy }),
    onPanResponderRelease: (_, g) => {
      const p = placeRef.current({ x: start.current.x + g.dx, y: start.current.y + g.dy });
      Animated.spring(xy, { toValue: p, useNativeDriver: false, friction: 7 }).start();
      setPlayerPos(p);
    },
  })).current;
  // the knobs turn a notch for every click (all the way round over the choices and "off")
  const notch = (list, id) => (list.findIndex((x) => x.id === id) + 1) * (300 / list.length);
  const k1 = useRef(new Animated.Value(notch(SOUNDS, s.sound))).current;
  const k2 = useRef(new Animated.Value(notch(MUSIC, s.music))).current;
  useEffect(() => { Animated.spring(k1, { toValue: notch(SOUNDS, s.sound), useNativeDriver: true, friction: 6 }).start(); }, [s.sound]);
  useEffect(() => { Animated.spring(k2, { toValue: notch(MUSIC, s.music), useNativeDriver: true, friction: 6 }).start(); }, [s.music]);
  // the volume slider: tap the line to jump there, drag the dot to slide
  const fRef = useRef(f);
  fRef.current = f;
  const vx0 = useRef(0);
  const volAt = (x) => {
    const k = fRef.current; // x: from the slider area's left edge (at 40 in the picture's units)
    return VMIN + (1 - VMIN) * Math.max(0, Math.min(1, (x / k + 40 - TX0) / (TX1 - TX0)));
  };
  const volSlide = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { vx0.current = e.nativeEvent.locationX; setAmbientVolume(volAt(vx0.current)); },
    onPanResponderMove: (_, g) => setAmbientVolume(volAt(vx0.current + g.dx)),
  })).current;
  const vol = Math.max(VMIN, Math.min(1, s.volume));
  const dotX = TX0 + (TX1 - TX0) * (vol - VMIN) / (1 - VMIN);
  const turn = (v) => ({ transform: [{ rotate: v.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] });
  if (!s.showPlayer) return null;
  const name = (id) => { const x = TRACKS.find((tr) => tr.id === id); return x ? t(x.name) : t('Off'); };
  const record = () => { if (!requestRecord() && toast) toast(t('Open a book to record your voice.')); };
  return (
    <Animated.View {...drag.panHandlers} style={[styles.body, { width: PW, height: PH, transform: xy.getTranslateTransform() }]} accessibilityLabel={t('Music player')}>
      <View style={[styles.inner, { width: PW, height: PH }]}>
      <Image source={BODY} style={{ width: PW, height: PH }} resizeMode="stretch" />
      {/* the three lines: the Music and Sounds page; the down arrow: close the player */}
      <Pressable onPress={onMenu} hitSlop={4} style={at(545, 30, 165, 170)} accessibilityRole="button" accessibilityLabel={t('Music and Sounds')} />
      <Pressable onPress={() => setAmbientPlayer(false)} hitSlop={4} style={at(712, 20, 175, 180)} accessibilityRole="button" accessibilityLabel={t('Close the player')} />
      {/* the volume knob, top left, with its name underneath */}
      <View {...volSlide.panHandlers} style={at(40, 50, 510, 124)} accessibilityRole="adjustable" accessibilityLabel={t('Volume')}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(vol * 100) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => setAmbientVolume(vol + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))}>
        <View pointerEvents="none" style={[at(TX0 - 40, TY - 50 - 6, TX1 - TX0, 12), styles.track]} />
        <View pointerEvents="none" style={[at(TX0 - 40, TY - 50 - 6, dotX - TX0, 12), styles.track, styles.trackOn]} />
        <Image pointerEvents="none" source={DOT} style={[at(dotX - 40 - DOTD / 2, TY - 50 - DOTD / 2, DOTD, DOTD)]} />
      </View>
      <Text numberOfLines={1} style={[styles.label, { fontSize: 54 * f, position: 'absolute', left: TX0 * f, top: 168 * f }]}>{t('Volume')}</Text>
      {/* the little red light: only while recording */}
      {s.recording ? <View pointerEvents="none" style={[at(660, 611, 54, 54), styles.light]} /> : null}
      {/* Record, Play, Pause, with their names underneath */}
      <Pressable onPress={record} style={at(115, 780, 150, 150)} accessibilityRole="button" accessibilityLabel={t('Record')} />
      <Pressable onPress={playAmbient} style={at(370, 780, 150, 150)} accessibilityRole="button" accessibilityLabel={t('Play')} />
      <Pressable onPress={pauseAmbient} style={at(620, 780, 150, 150)} accessibilityRole="button" accessibilityLabel={t('Pause')} />
      {[[t('Record'), 190], [t('Play'), 445], [t('Pause'), 695]].map(([label, cx]) => (
        <Text key={cx} numberOfLines={1} style={[styles.label, { fontSize: 54 * f, position: 'absolute', left: (cx - 120) * f, width: 240 * f, top: 945 * f, textAlign: 'center' }]}>{label}</Text>
      ))}
      {/* the two windows, named above them, with the choice in white */}
      <Text style={[styles.label, { fontSize: 54 * f, position: 'absolute', left: 105 * f, top: 1100 * f }]}>{t('Sounds')}</Text>
      <View pointerEvents="none" style={[at(118, 1205, 480, 96), styles.window]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.choice, { fontSize: 52 * f }, !s.sound && { opacity: 0.6 }]}>{name(s.sound)}</Text>
      </View>
      <Text style={[styles.label, { fontSize: 54 * f, position: 'absolute', left: 105 * f, top: 1404 * f }]}>{t('Music')}</Text>
      <View pointerEvents="none" style={[at(118, 1507, 480, 96), styles.window]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.choice, { fontSize: 52 * f }, !s.music && { opacity: 0.6 }]}>{name(s.music)}</Text>
      </View>
      {/* the knobs: tap to click to the next choice */}
      <Pressable onPress={() => stepAmbient('sound')} style={at(663, 1166, 168, 168)} accessibilityRole="button" accessibilityLabel={`${t('Sounds')}: ${name(s.sound)}`}>
        <Animated.Image source={KNOB1} style={[{ width: 168 * f, height: 168 * f }, turn(k1)]} />
      </Pressable>
      <Pressable onPress={() => stepAmbient('music')} style={at(663, 1471, 168, 168)} accessibilityRole="button" accessibilityLabel={`${t('Music')}: ${name(s.music)}`}>
        <Animated.Image source={KNOB2} style={[{ width: 168 * f, height: 168 * f }, turn(k2)]} />
      </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { position: 'absolute', left: 0, top: 0, zIndex: 170, borderRadius: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 9, elevation: 12 },
  inner: { borderRadius: 10, overflow: 'hidden' },
  light: { borderRadius: 30, backgroundColor: '#a5121d', shadowColor: '#ff3b30', shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  label: { fontFamily: fonts.ui, fontWeight: '600', color: '#4a4a4a' },
  track: { borderRadius: 6, backgroundColor: '#7c7b7a' },
  trackOn: { backgroundColor: '#3f3f44' },
  window: { justifyContent: 'center', paddingHorizontal: 3 },
  choice: { fontFamily: fonts.ui, fontWeight: '600', color: '#ffffff' },
});
