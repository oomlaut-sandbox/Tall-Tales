// The quick tour (Jörg, 27 Oct 2026): a short screen recording of a Coro book, played full screen from the
// 'Want a quick little tour?' bubble. A tap on Close (or the end of the film) brings you back.
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, fonts } from '../theme';

const CLIP = require('../../assets/tour.mp4');

export default function TourVideo({ onClose, tr }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(CLIP, (p) => { p.loop = false; try { p.audioMixingMode = 'mixWithOthers'; } catch (e) {} p.play(); });
  useEffect(() => {
    let sub = null;
    try { sub = player.addListener('playToEnd', () => setTimeout(onClose, 600)); } catch (e) {}
    return () => { try { sub && sub.remove(); } catch (e) {} try { player.pause(); } catch (e) {} };
  }, [player]);
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 95, backgroundColor: '#000' }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button"
        style={{ position: 'absolute', right: 16 + insets.right, top: insets.top + 12, height: 40, borderRadius: 20, paddingHorizontal: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 }}>{tr('Close')}</Text>
      </Pressable>
    </View>
  );
}
