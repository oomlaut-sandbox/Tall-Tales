// Coro's short film (Jörg's 30-second tour with Fatima's voice, 28 Oct 2026), shown full screen over whatever
// opened it: the kids' and grown-ups' intros and Help → Videos. It plays from the start each time, with the
// phone's own play, pause and scrub controls; the circle-x (or the end of the film) closes it.
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
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
