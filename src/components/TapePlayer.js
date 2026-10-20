// The felt Audio Player (Jörg's upright picture) for the music and nature sounds. It opens in the middle of
// the screen over a dark see-through layer that keeps everything underneath from being touched, and stays
// until the felt line at its top right, or anywhere outside it, is tapped. Opened with the sound icon in the reading bar.
//   Play / Pause: the felt buttons (Play is grey, and turns green while something is playing)
//   the two windows: the sound (top) and the music (bottom); tap a knob to click through the choices, which
//     show in white in the window ("Select sound" / "Select music" until one is chosen). The knobs stay still;
//     only the line on each face turns a notch per click.
//   the slider at the bottom: the volume (drag its felt knob, or tap the slot)
//   the felt line at the top right: closes the player (its only way out)
// (recording your voice is on the reading bar's red button)
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { fonts } from '../theme';
import { MUSIC, SOUNDS, TRACKS, getAmbient, onAmbient, pauseAmbient, playAmbient, setAmbientPlayer, setAmbientVolume, stepAmbient } from '../ambient';
import { useT } from '../i18n';
import { thunk, tick, withTap } from '../haptics';

const BODY = require('../../assets/audio-player2.jpg'); // the whole player, in grey
const PLAY_ON = require('../../assets/audio-play-on.png'); // the green Play button, laid over while playing
const PLAY_ON_NIGHT = require('../../assets/audio-play-on-night.png'); // the green button from Jörg's night photo, cut out
const THUMB = require('../../assets/audio-thumb2.png'); // the slider's felt knob (with its shadow drawn in)
// at night (the nightlight is on): Jörg's dark brown felt version (with the brown felt Play and Pause cut from his newer night photo), with its loose threads around the edges (the black around them see-through),
// and its own slider knob. The day player stays as it is.
const BODY_NIGHT = require('../../assets/audio-player-night.png');
const THUMB_NIGHT = require('../../assets/audio-thumb-night.png');
const NIGHT_MX = 0.063, NIGHT_MY = 0.0428; // how far the night picture reaches past the felt (for the threads), as parts of its width / height
const IW = 1792, IH = 2400; // the picture's own units (Jörg's photo, in pixels)
const R = 112; // its corners: the felt's own rounded corners (the photo's background there is filled with felt, then clipped)
const PLAY = { x: 1052, y: 552, w: 260, h: 270 };
const PLAY_NIGHT = { x: 1051, y: 540, w: 290, h: 302 }; // where the green button cut from Jörg's night photo sits on the brown felt
// the size: about as wide as a phone allows, and never taller than the screen has room for
const sizeFor = (winW, winH) => {
  const PW = Math.round(Math.min(340, winW - 48, (winH - 96) * IW / IH));
  return { PW, PH: Math.round(PW * IH / IW), f: PW / IW };
};
// the volume slot, in the picture's units: the knob's middle runs from X0 (quietest) to X1 (loudest) at height Y
const VMIN = 0.05;
const X0 = 330, X1 = 1464, Y = 2003, THUMB_D = 194; // (the knob picture is 194 wide with its shadow, the knob itself 134)
const SLOT = { x: 230, y: 1925, w: 1340, h: 160 }; // where a finger can take the slider

export default function TapePlayer({ onMenu }) {
  const t = useT();
  const { width: winW, height: winH } = useWindowDimensions();
  const { PW, PH, f } = sizeFor(winW, winH);
  // a spot on the picture, in its own units
  const at = (x, y, w, h) => ({ position: 'absolute', left: x * f, top: y * f, width: w * f, height: h * f });
  const [s, setS] = useState(getAmbient());
  useEffect(() => onAmbient(setS), []);
  // it fades in with its dark layer
  const fade = useRef(new Animated.Value(0)).current;
  // the volume knob clicks softly every 5%
  const volQ = useRef(null);
  const setVolTick = (v) => { const q = Math.round(v * 20); if (volQ.current !== null && q !== volQ.current) tick(); volQ.current = q; setAmbientVolume(v); };
  useEffect(() => { if (s.showPlayer) { fade.setValue(0); Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start(); } }, [s.showPlayer]);
  // the knobs' lines turn a notch for every click (all the way round over the choices and "off")
  const notch = (list, id) => (list.findIndex((x) => x.id === id) + 1) * (300 / list.length);
  const k1 = useRef(new Animated.Value(notch(SOUNDS, s.sound))).current;
  const k2 = useRef(new Animated.Value(notch(MUSIC, s.music))).current;
  useEffect(() => { Animated.spring(k1, { toValue: notch(SOUNDS, s.sound), useNativeDriver: true, friction: 6 }).start(); }, [s.sound]);
  useEffect(() => { Animated.spring(k2, { toValue: notch(MUSIC, s.music), useNativeDriver: true, friction: 6 }).start(); }, [s.music]);
  // the volume slider: tap the slot to jump there, drag the knob to slide (right is louder)
  const fRef = useRef(f);
  fRef.current = f;
  const vx0 = useRef(0);
  const volAt = (x) => { // x: from the left of the slider's touch area
    const k = fRef.current;
    return VMIN + (1 - VMIN) * Math.max(0, Math.min(1, (x / k + SLOT.x - X0) / (X1 - X0)));
  };
  const volSlide = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { vx0.current = e.nativeEvent.locationX; setVolTick(volAt(vx0.current)); },
    onPanResponderMove: (_, g) => setVolTick(volAt(vx0.current + g.dx)),
  })).current;
  const vol = Math.max(VMIN, Math.min(1, s.volume));
  const thumbX = X0 + (X1 - X0) * (vol - VMIN) / (1 - VMIN);
  const turn = (v) => ({ transform: [{ rotate: v.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] });
  if (!s.showPlayer) return null;
  const name = (id) => { const x = TRACKS.find((tr) => tr.id === id); return x ? (x.mine ? x.name : t(x.name)) : null; };
  const playing = s.playing && !!(s.sound || s.music);
  // the line on a knob's face: it turns around the face's middle (cx, cy)
  const mark = (cx, cy, v) => (
    <Animated.View pointerEvents="none" style={[at(cx - 70, cy - 70, 140, 140), turn(v)]}>
      <View style={[styles.mark, { left: 64 * f, top: 4 * f, width: 12 * f, height: 40 * f }, s.night && { backgroundColor: '#e8dccb' }]} />
    </Animated.View>
  );
  // a window: the choice (or "Select …") in white, left-aligned and in the middle of the dark felt from top to bottom
  const windowText = (box, text, empty) => (
    <View pointerEvents="none" style={[at(...box), styles.window, { paddingHorizontal: 44 * f }]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.choice, { fontSize: 64 * f, lineHeight: 76 * f }, s.night && { color: '#c9c3bb' }, empty && { opacity: 0.85 }]}>{text}</Text>
    </View>
  );
  return (
    // the dark see-through layer takes every touch, so nothing underneath can be used until the player is closed
    // tapping anywhere on it (outside the player) closes the player too
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: fade }]} onStartShouldSetResponder={() => true} onResponderRelease={() => setAmbientPlayer(false)} accessibilityViewIsModal>
    <View style={{ alignItems: 'flex-end' }}>
    <View style={[styles.body, { width: PW, height: PH, borderRadius: R * f }]} accessibilityLabel={t('Audio Player')} onStartShouldSetResponder={() => true}>{/* taps on the player itself don't close it */}
      {s.night ? <Image pointerEvents="none" source={BODY_NIGHT} resizeMode="stretch"
        style={{ position: 'absolute', left: -NIGHT_MX * PW, top: -NIGHT_MY * PH, width: PW * (1 + 2 * NIGHT_MX), height: PH * (1 + 2 * NIGHT_MY) }} /> : null}
      <View style={[styles.inner, { width: PW, height: PH, borderRadius: R * f }]}>
        {s.night ? null : <Image source={BODY} style={{ width: PW, height: PH }} resizeMode="stretch" />}
        {/* Play turns green while something plays */}
        {/* the green felt Play button while playing, day and night alike */}
        {playing ? <Image pointerEvents="none" source={s.night ? PLAY_ON_NIGHT : PLAY_ON} style={s.night ? at(PLAY_NIGHT.x, PLAY_NIGHT.y, PLAY_NIGHT.w, PLAY_NIGHT.h) : at(PLAY.x, PLAY.y, PLAY.w, PLAY.h)} resizeMode="stretch" /> : null}
        {/* at night (the nightlight is on) the felt is turned down to a dark grey */}

        {/* the felt line at the top right closes the player */}
        <Pressable onPress={withTap(() => setAmbientPlayer(false))} hitSlop={10} style={at(1400, 100, 300, 220)} accessibilityRole="button" accessibilityLabel={t('Close Audio Player')} />
        <Pressable onPress={withTap(playAmbient)} style={at(PLAY.x, PLAY.y, PLAY.w, PLAY.h)} accessibilityRole="button" accessibilityLabel={t('Play')} />
        <Pressable onPress={withTap(pauseAmbient)} style={at(1360, 562, 230, 250)} accessibilityRole="button" accessibilityLabel={t('Pause')} />
        {/* (the night felt's windows sit a little lower; its names start a little further in) */}
        {windowText(s.night ? [282, 1070, 1082, 172] : [268, 1067, 1082, 150], name(s.sound) || t('Select sound'), !s.sound)}
        {windowText(s.night ? [276, 1441, 1082, 174] : [268, 1437, 1076, 150], name(s.music) || t('Select music'), !s.music)}
        {/* the knobs stay put; tap one to click to the next choice */}
        <Pressable onPress={withTap(() => stepAmbient('sound'), thunk)} style={at(1386, 1010, 250, 260)} accessibilityRole="button" accessibilityLabel={name(s.sound) || t('Select sound')} />
        <Pressable onPress={withTap(() => stepAmbient('music'), thunk)} style={at(1386, 1380, 250, 260)} accessibilityRole="button" accessibilityLabel={name(s.music) || t('Select music')} />
        {/* the knobs' lines turn with each click (at night: on the brown felt's knobs, in cream) */}
        {s.night ? mark(1512, 1145, k1) : mark(1506, 1127, k1)}
        {s.night ? mark(1512, 1507, k2) : mark(1506, 1500, k2)}
        {/* the volume: the felt knob slides left (quieter) and right (louder) in the stitched slot */}
        <View {...volSlide.panHandlers} style={at(SLOT.x, SLOT.y, SLOT.w, SLOT.h)} accessibilityRole="adjustable" accessibilityLabel={t('Volume')}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(vol * 100) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => setAmbientVolume(vol + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))}>
          <Image pointerEvents="none" source={s.night ? THUMB_NIGHT : THUMB} style={at(thumbX - SLOT.x - THUMB_D / 2, Y - SLOT.y - THUMB_D / 2 + 4, THUMB_D, THUMB_D)} />
        </View>
      </View>
    </View>
    </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { zIndex: 170, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center' },
  // a good soft drop shadow, deeper below
  body: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 18 },
  inner: { overflow: 'hidden' },
  mark: { position: 'absolute', borderRadius: 3, backgroundColor: '#2a2a2d' },
  close: { fontFamily: fonts.ui, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' },
  window: { justifyContent: 'center' },
  choice: { fontFamily: fonts.ui, fontWeight: '600', color: '#ffffff', textAlign: 'left' },
});
