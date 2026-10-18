// The felt Audio Player (Jörg's picture) for the music and nature sounds. It opens in the middle of the
// screen over a half-dark layer that keeps everything underneath from being touched, and stays until it's
// closed with its down arrow. Opened with the sound icon in the reading bar (or from Music and Sounds).
//   Play / Pause: the green and grey felt buttons
//   Sounds (top window) and Music (bottom window): tap a knob to click through the choices; the choice shows
//     in the window in white, and the line on the knob turns a notch each click (the knob itself stays still)
//   Volume: the felt slider (drag its knob up and down, or tap the slot)
//   the three lines at the top: open the Music and Sounds page; 'Close Audio Player' underneath closes it
// (recording your voice is on the reading bar's red button)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme';
import { MUSIC, SOUNDS, TRACKS, getAmbient, onAmbient, pauseAmbient, playAmbient, setAmbientPlayer, setAmbientVolume, stepAmbient } from '../ambient';
import { useT } from '../i18n';

const BODY = require('../../assets/audio-player.jpg');
const THUMB = require('../../assets/audio-thumb.png');
const IW = 2576, IH = 1314; // the picture's own units (Jörg's photo, in pixels)
const R = 42; // the corners: rounded to follow the stitching (it runs about 28 in from the edge, with a small curve)
// the player's size: nearly as wide as an iPhone held upright (a little less on a very small screen)
const sizeFor = (winW, winH) => {
  const PW = Math.min(380, Math.round(Math.min(winW, winH) * 0.94));
  return { PW, PH: Math.round(PW * IH / IW), f: PW / IW };
};
// the volume slider's slot, in the picture's units: the knob's middle runs from Y_TOP (loudest) to Y_BOT (quietest)
const VMIN = 0.05;
const SX = 1387, Y_TOP = 262, Y_BOT = 996, THUMB_D = 159;
const SLOT = { x: 1287, y: 150, w: 200, h: 960 }; // where a finger can take the slider

export default function TapePlayer({ onMenu }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { PW, PH, f } = sizeFor(winW, winH);
  // a spot on the picture, in its own units
  const at = (x, y, w, h) => ({ position: 'absolute', left: x * f, top: y * f, width: w * f, height: h * f });
  const [s, setS] = useState(getAmbient());
  useEffect(() => onAmbient(setS), []);
  // it fades in with its dark layer
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (s.showPlayer) { fade.setValue(0); Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start(); } }, [s.showPlayer]);
  // the knobs' lines turn a notch for every click (all the way round over the choices and "off")
  const notch = (list, id) => (list.findIndex((x) => x.id === id) + 1) * (300 / list.length);
  const k1 = useRef(new Animated.Value(notch(SOUNDS, s.sound))).current;
  const k2 = useRef(new Animated.Value(notch(MUSIC, s.music))).current;
  useEffect(() => { Animated.spring(k1, { toValue: notch(SOUNDS, s.sound), useNativeDriver: true, friction: 6 }).start(); }, [s.sound]);
  useEffect(() => { Animated.spring(k2, { toValue: notch(MUSIC, s.music), useNativeDriver: true, friction: 6 }).start(); }, [s.music]);
  // the volume slider: tap the slot to jump there, drag the knob to slide (up is louder)
  const fRef = useRef(f);
  fRef.current = f;
  const vy0 = useRef(0);
  const volAt = (y) => { // y: from the top of the slider's touch area
    const k = fRef.current;
    return VMIN + (1 - VMIN) * Math.max(0, Math.min(1, (Y_BOT - (y / k + SLOT.y)) / (Y_BOT - Y_TOP)));
  };
  const volSlide = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { vy0.current = e.nativeEvent.locationY; setAmbientVolume(volAt(vy0.current)); },
    onPanResponderMove: (_, g) => setAmbientVolume(volAt(vy0.current + g.dy)),
  })).current;
  const vol = Math.max(VMIN, Math.min(1, s.volume));
  const thumbY = Y_BOT - (Y_BOT - Y_TOP) * (vol - VMIN) / (1 - VMIN);
  const turn = (v) => ({ transform: [{ rotate: v.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] });
  if (!s.showPlayer) return null;
  const name = (id) => { const x = TRACKS.find((tr) => tr.id === id); return x ? t(x.name) : t('Off'); };
  const label = { fontSize: 56 * f, lineHeight: 64 * f };
  // the line on a knob's face: it turns around the face's middle (cx, cy)
  const mark = (cx, cy, v) => (
    <Animated.View pointerEvents="none" style={[at(cx - 60, cy - 60, 120, 120), turn(v)]}>
      <View style={[styles.mark, { left: 54 * f, top: 12 * f, width: 12 * f, height: 38 * f }]} />
    </Animated.View>
  );
  return (
    // the half-dark layer takes every touch, so nothing underneath can be used until the player is closed
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: fade }]} onStartShouldSetResponder={() => true} accessibilityViewIsModal>
    <View style={{ alignItems: 'flex-start' }}>
    <View style={[styles.body, { width: PW, height: PH, borderRadius: R * f }]} accessibilityLabel={t('Audio Player')}>
      <View style={[styles.inner, { width: PW, height: PH, borderRadius: R * f }]}>
        <Image source={BODY} style={{ width: PW, height: PH }} resizeMode="stretch" />
        {/* the three lines: the Music and Sounds page; the down arrow: close the player */}
        <Pressable onPress={onMenu} hitSlop={4} style={at(2250, 110, 240, 180)} accessibilityRole="button" accessibilityLabel={t('Music and Sounds')} />
        {/* Play and Pause, with their names underneath */}
        <Pressable onPress={playAmbient} style={at(161, 142, 264, 270)} accessibilityRole="button" accessibilityLabel={t('Play')} />
        <Pressable onPress={pauseAmbient} style={at(490, 187, 161, 161)} accessibilityRole="button" accessibilityLabel={t('Pause')} />
        {[[t('Play'), 293, 446], [t('Pause'), 570, 446]].map(([l, cx, top]) => (
          <Text key={cx} numberOfLines={1} style={[styles.label, label, { position: 'absolute', left: (cx - 150) * f, width: 300 * f, top: top * f, textAlign: 'center' }]}>{l}</Text>
        ))}
        {/* the two windows, named above them, with the choice in white */}
        <Text style={[styles.label, label, { position: 'absolute', left: 172 * f, top: 742 * f }]}>{t('Sounds')}</Text>
        <View pointerEvents="none" style={[at(172, 586, 728, 124), styles.window, { paddingHorizontal: 34 * f }]}>{/* the dark felt inside the stitching */}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.choice, { fontSize: 66 * f }, !s.sound && { opacity: 0.6 }]}>{name(s.sound)}</Text>
        </View>
        <Text style={[styles.label, label, { position: 'absolute', left: 166 * f, top: 1042 * f }]}>{t('Music')}</Text>
        <View pointerEvents="none" style={[at(166, 888, 734, 122), styles.window, { paddingHorizontal: 34 * f }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.choice, { fontSize: 66 * f }, !s.music && { opacity: 0.6 }]}>{name(s.music)}</Text>
        </View>
        {/* the knobs stay put; tap one to click to the next choice (only the line on its face goes round) */}
        <Pressable onPress={() => stepAmbient('sound')} style={at(920, 540, 220, 220)} accessibilityRole="button" accessibilityLabel={`${t('Sounds')}: ${name(s.sound)}`} />
        <Pressable onPress={() => stepAmbient('music')} style={at(914, 838, 220, 220)} accessibilityRole="button" accessibilityLabel={`${t('Music')}: ${name(s.music)}`} />
        {mark(1030, 631, k1)}
        {mark(1024, 929, k2)}
        {/* the volume slider: its felt knob slides up (louder) and down (quieter) in the stitched slot */}
        <View {...volSlide.panHandlers} style={at(SLOT.x, SLOT.y, SLOT.w, SLOT.h)} accessibilityRole="adjustable" accessibilityLabel={t('Volume')}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(vol * 100) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => setAmbientVolume(vol + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))}>
          <Image pointerEvents="none" source={THUMB} style={at(SX - SLOT.x - THUMB_D / 2, thumbY - SLOT.y - THUMB_D / 2, THUMB_D, THUMB_D)} />
        </View>
      </View>
    </View>
    {/* the way out, under the player on the left */}
    <Pressable onPress={() => setAmbientPlayer(false)} hitSlop={16} style={{ marginTop: 10 }} accessibilityRole="button">
      <Text style={styles.close}>{t('Close Audio Player')}</Text>
    </Pressable>
    </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // a soft drop shadow all round, a little deeper below
  scrim: { zIndex: 170, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  body: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 14 },
  inner: { overflow: 'hidden' },
  label: { fontFamily: fonts.ui, fontWeight: '600', color: '#4a4a4a' },
  mark: { position: 'absolute', borderRadius: 3, backgroundColor: '#2a2a2d' },
  close: { fontFamily: fonts.ui, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  window: { justifyContent: 'center' },
  choice: { fontFamily: fonts.ui, fontWeight: '600', color: '#ffffff' },
});
