// Coro's short film (Jörg's 30-second tour with Fatima's voice, 28 Oct 2026), shown full screen over whatever
// opened it: the kids' and grown-ups' intros and Help → Videos. It plays from the start each time, with the
// phone's own play, pause and scrub controls; the circle-x (or the end of the film) closes it.
import React, { useEffect } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LineIcon } from './Chrome';
import { useT } from '../i18n';

const FILM = require('../../assets/videos/coro-intro.mp4');

function Film({ onClose }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const player = useVideoPlayer(FILM, (p) => { p.loop = false; p.play(); });
  useEffect(() => {
    let sub;
    try { sub = player.addListener('playToEnd', () => setTimeout(onClose, 600)); } catch (e) {}
    return () => { try { sub && sub.remove(); } catch (e) {} try { player.pause(); } catch (e) {} };
  }, [player]);
  return (
    <View style={styles.back}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls allowsFullscreen={false} allowsPictureInPicture={false} />
      <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel={t('Close')}
        style={{ position: 'absolute', top: insets.top + 10, right: 16 }}>
        <LineIcon kind="cancel" size={30} color="rgba(255,255,255,0.9)" weight={1.6} />
      </Pressable>
    </View>
  );
}

export default function FilmPlayer({ visible, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible transparent={false} animationType="fade" supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} onRequestClose={onClose}>
      <Film onClose={onClose} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: '#000' },
});

// The film's box (Jörg, 29 Oct 2026): tap it and the film comes forward over everything, playing in a
// phone-shaped frame (iPhone corners) as big as the screen allows, on a dark veil; the circle-x, a tap on the veil
// or the end of the film sends it away again.
// look: 'light' (the intro's grey boxes) or 'dark' (Help's cards)
export function FilmBox({ title, boxStyle, titleStyle, look = 'light' }) {
  const [open, setOpen] = React.useState(false);
  const dark = look === 'dark';
  const ring = dark ? '#d6d6d6' : '#333', glyph = dark ? '#333' : '#e6e6e6';
  return (
    <View style={boxStyle}>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: dark ? 30 : 44, height: dark ? 30 : 44, borderRadius: 22, backgroundColor: ring, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 0, height: 0, marginLeft: dark ? 3 : 4, borderTopWidth: dark ? 6 : 9, borderBottomWidth: dark ? 6 : 9, borderLeftWidth: dark ? 10 : 14, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: glyph }} />
        </View>
        <Text style={[titleStyle, { flex: 1 }]}>{title}</Text>
      </Pressable>
      {open ? <PhoneFilm onClose={() => setOpen(false)} /> : null}
    </View>
  );
}
function PhoneFilm({ onClose }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { width: winW, height: winH } = useWindowDimensions();
  // as big as fits: the whole height (less the close button's row), or the width on a short screen
  const roomH = winH - insets.top - insets.bottom - 70, roomW = winW - 32;
  const filmH = Math.min(roomH, roomW * 1920 / 886), filmW = filmH * 886 / 1920;
  const fade = React.useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, []);
  const close = () => Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
  return (
    <Modal visible transparent animationType="none" supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} onRequestClose={close}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <Pressable onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} accessibilityLabel={t('Close')} />
        <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + 50, paddingBottom: insets.bottom + 20 }}>
          <Animated.View style={{ width: filmW, height: filmH, borderRadius: Math.round(filmW * 0.14), overflow: 'hidden', backgroundColor: '#000', borderWidth: 2, borderColor: '#3a3a3a', padding: 8,
            transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
            <View style={{ flex: 1, borderRadius: Math.round(filmW * 0.14) - 8, overflow: 'hidden' }}><InlineFilm onEnd={close} /></View>
          </Animated.View>
        </View>
        <Pressable onPress={close} hitSlop={14} accessibilityRole="button" accessibilityLabel={t('Close')} style={{ position: 'absolute', top: insets.top + 10, right: 18 }}>
          <LineIcon kind="cancel" size={32} color="rgba(255,255,255,0.9)" weight={1.6} />
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
function InlineFilm({ onEnd }) {
  const player = useVideoPlayer(FILM, (p) => { p.loop = false; p.play(); });
  useEffect(() => {
    let sub;
    try { sub = player.addListener('playToEnd', () => setTimeout(() => onEnd && onEnd(), 700)); } catch (e) {}
    return () => { try { sub && sub.remove(); } catch (e) {} try { player.pause(); } catch (e) {} };
  }, [player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls allowsFullscreen={false} allowsPictureInPicture={false} />;
}

// Meet Coro (the intros): just the title and a phone standing upright under it, solid black, the film on its
// screen; the phone's own play button starts it (Jörg, 29 Oct 2026)
export function PagePhone({ room = 250 }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const h = Math.max(260, Math.min(winH - insets.top - insets.bottom - room, (winW - 48) * 1920 / 886 + 16));
  const w = (h - 16) * 886 / 1920 + 16; // a black edge of 8 all round the screen
  const player = useVideoPlayer(FILM, (p) => { p.loop = false; });
  useEffect(() => () => { try { player.pause(); } catch (e) {} }, [player]);
  return (
    <View style={{ alignSelf: 'center', marginTop: 28 /* well clear of the title (Jörg, 29 Oct 2026) */, width: w, height: h, borderRadius: Math.round(w * 0.15), backgroundColor: '#000', padding: 8, borderWidth: 2, borderColor: '#3a3a3a' /* a thin grey rim, like Jörg's mockup */,
      shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 12 }}>
      <View style={{ flex: 1, borderRadius: Math.round(w * 0.15) - 8, overflow: 'hidden', backgroundColor: '#000' }}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls allowsFullscreen={false} allowsPictureInPicture={false} />
      </View>
    </View>
  );
}
