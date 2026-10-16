// A book cover made in the Cover Editor: the cover picture with the title laid on top
// (where the maker dragged it, at the size they chose). Fills its parent square.
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export const COVER_FONT = 'EBGaramond_700Bold';
export const titleStyle = { fontFamily: COVER_FONT, color: '#ffffff', textAlign: 'center',
  textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 };

// cover: { uri, title: { text, x, y, size } | null }; x and y are the title's centre as a share of the
// square (0..1), size is the letter size as a share of the square's width.
export default function CoverArt({ cover }) {
  const [w, setW] = useState(0);
  if (!cover || !cover.uri) return null;
  const t = cover.title;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Image source={{ uri: cover.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {t && t.text && w ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: t.y * w, alignItems: 'center', transform: [{ translateX: (t.x - 0.5) * w }, { translateY: -t.size * w * 0.65 }] }}>
          <Text style={[titleStyle, { fontSize: t.size * w, lineHeight: t.size * w * 1.2, paddingHorizontal: w * 0.04 }]}>{t.text}</Text>
        </View>
      ) : null}
    </View>
  );
}
