// The quick peek (Jörg, 27 Oct 2026): from the 'Want to have a quick peek?' bubble. The bubble closes and a black
// glass box opens with Jörg's screen recording of a Coro book playing inside a drawn black phone (shaped like an
// iPhone), at double speed (the clip itself is made twice as fast). When it ends, a green 'Got it' closes the box.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, fonts } from '../theme';

const CLIP = require('../../assets/tour.mp4'); // 540 x 1090 (the status bar trimmed off), 17 seconds
const AR = 540 / 1090;

export default function TourVideo({ onClose, tr }) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [ended, setEnded] = useState(false);
  const a = useRef(new Animated.Value(0)).current;
  const btn = useRef(new Animated.Value(0)).current;
  const player = useVideoPlayer(CLIP, (p) => { p.loop = false; p.muted = true; try { p.audioMixingMode = 'mixWithOthers'; } catch (e) {} p.play(); });
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    let sub = null;
    try { sub = player.addListener('playToEnd', () => setEnded(true)); } catch (e) {}
    const safety = setTimeout(() => setEnded(true), 22000); // never without a way out
    return () => { clearTimeout(safety); try { sub && sub.remove(); } catch (e) {} try { player.pause(); } catch (e) {} };
  }, [player]);
  useEffect(() => { if (ended) Animated.timing(btn, { toValue: 1, duration: 260, useNativeDriver: true }).start(); }, [ended]);
  const close = () => Animated.timing(a, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => onClose());
  // the phone: as tall as fits, with room in the box for the button under it
  const room = H - insets.top - insets.bottom - 40 - 30 - 28 - 44 - 26; // box padding, the gap and the button
  const bez = 9; // the black edge around the screen
  let sh = Math.min(room - 2 * bez, (W - 40 - 56 - 2 * bez) / AR); // screen height
  sh = Math.max(220, Math.min(sh, 640));
  const sw = sh * AR;
  const pw = sw + 2 * bez, ph = sh + 2 * bez;
  const r = pw * 0.15; // iPhone-like round corners
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 95, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', opacity: a }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={ended ? close : undefined} accessible={false} />
      <Animated.View style={[styles.glass, { transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
        {/* the phone: a black body with a thin lighter edge, the screen inside, and the island at the top */}
        <View style={{ width: pw, height: ph, borderRadius: r, backgroundColor: '#050505', borderWidth: 1.5, borderColor: '#3a3a3a', padding: bez - 1.5, alignItems: 'center' }}
          accessible accessibilityRole="image" accessibilityLabel={tr('A quick peek at a Coro book')}>
          <View style={{ width: sw, height: sh, borderRadius: r - bez, overflow: 'hidden', backgroundColor: '#000' }}>
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', top: bez + sh * 0.018, width: sw * 0.3, height: sw * 0.085, borderRadius: sw * 0.05, backgroundColor: '#000' }} />
        </View>
        <Animated.View style={{ height: 44, marginTop: 26, opacity: btn }} pointerEvents={ended ? 'auto' : 'none'}>
          <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={styles.got}>
            <Text style={styles.gotText}>{tr('Got it')}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glass: { backgroundColor: 'rgba(12,12,12,0.86)', borderRadius: 28, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 28, alignItems: 'center', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' },
  got: { height: 44, borderRadius: 22, paddingHorizontal: 30, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  gotText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
});
