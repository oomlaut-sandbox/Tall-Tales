// Coro's short film (Jörg's 30-second tour with Fatima's voice, 28 Oct 2026), shown full screen over whatever
// opened it: the kids' and grown-ups' intros and Help → Videos. It plays from the start each time, with the
// phone's own play, pause and scrub controls; the circle-x (or the end of the film) closes it.
import React, { useEffect } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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

// The film inside its own box (Jörg, 29 Oct 2026): tap the box and it opens downwards, the film playing in a
// phone-shaped frame (the same shape as the App Store film); tap the top again to close it.
// look: 'light' (the intro's grey boxes) or 'dark' (Help's cards)
export function FilmBox({ title, boxStyle, titleStyle, look = 'light' }) {
  const [open, setOpen] = React.useState(false);
  const [w, setW] = React.useState(0);
  const grow = React.useRef(new Animated.Value(0)).current;
  const filmW = Math.min(300, Math.round(w * 0.8)), filmH = Math.round(filmW * 1920 / 886);
  const toggle = () => {
    const next = !open;
    if (next) setOpen(true);
    Animated.timing(grow, { toValue: next ? 1 : 0, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => { if (!next) setOpen(false); });
  };
  const dark = look === 'dark';
  const ring = dark ? '#d6d6d6' : '#333', glyph = dark ? '#333' : '#e6e6e6';
  return (
    <View style={boxStyle} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: dark ? 30 : 44, height: dark ? 30 : 44, borderRadius: 22, backgroundColor: open ? 'transparent' : ring, alignItems: 'center', justifyContent: 'center' }}>
          {open ? <LineIcon kind="cancel" size={dark ? 30 : 44} color={ring} weight={dark ? 1.6 : 2} />
            : <View style={{ width: 0, height: 0, marginLeft: dark ? 3 : 4, borderTopWidth: dark ? 6 : 9, borderBottomWidth: dark ? 6 : 9, borderLeftWidth: dark ? 10 : 14, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: glyph }} />}
        </View>
        <Text style={[titleStyle, { flex: 1 }]}>{title}</Text>
      </Pressable>
      {open && filmW ? (
        <Animated.View style={{ height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, filmH + 20] }), opacity: grow, overflow: 'hidden', alignItems: 'center' }}>
          <View style={{ marginTop: 20, width: filmW, height: filmH, borderRadius: Math.round(filmW * 0.14) /* an iPhone's corners */, overflow: 'hidden', backgroundColor: '#000' }}>
            <InlineFilm />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
function InlineFilm() {
  const player = useVideoPlayer(FILM, (p) => { p.loop = false; p.play(); });
  useEffect(() => () => { try { player.pause(); } catch (e) {} }, [player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls allowsFullscreen allowsPictureInPicture={false} />;
}
