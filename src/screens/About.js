// About Oomlaut Reader (from the Settings menu).
import React from 'react';
import { Pressable, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { IS_TABLET } from '../look';
import { Bar, BarMeta, Burger, WithBar } from '../components/Chrome';

const BAND_FELT = require('../../assets/band-about.jpg');
const SKIPPY = require('../../assets/skippy/glasses-book.png'); // Skippy with his glasses and a book (449 × 600)

const VERSION = require('../../app.json').expo.version;

export default function About({ u, openMenu, onSecret }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  // the words run the width of the page; Skippy stands on his own at the bottom right and stays put
  // (the words leave room for him at the end, so the last lines never sit behind him)
  const skW = Math.min(150, Math.round(winW * 0.32));
  const skH = Math.round(skW * 600 / 449);
  // phones: slightly smaller words so it all fits; the last paragraph runs beside Skippy, like a wrap
  const phone = winW < 600;
  const textStyle = phone ? (winH < 740 ? { fontSize: 14.5, lineHeight: 20 } : { fontSize: 17, lineHeight: 24 }) : null;
  const beside = { marginRight: skW + 16 }; // a little narrower, so Skippy has room
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        {/* Jörg's red felt, treated like the other banners (phones); iPad keeps the classic solid red */}
        {!IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : null}
        {/* the ® sits raised (superscript) after Oomlaut */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={styles.title}>Oomlaut</Text>
          <Text style={styles.reg}>®</Text>
          <Text style={styles.title}> Reader</Text>
        </View>
        <Text style={styles.tagline}>Picture books in your voice.</Text>
      </View>
      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 24 }, phone && winH < 740 && { paddingTop: 22, gap: 12 }]}>
        <Text style={[styles.p, textStyle]}>
          Oomlaut Reader is a home for beautifully illustrated stories, made for children who are learning to read and the grown-ups who read with them.
        </Text>
        <Text style={[styles.p, textStyle]}>
          Every book can be read aloud by a warm narrator, with each word lighting up as it’s spoken. In Learn to Read mode, children tap any word to hear it sounded out, one part at a time. Parents can record themselves reading each page, so a favourite story can be heard in a familiar voice, any time. And families can make their own books, with their own pictures and words.
        </Text>
        <Text style={[styles.p, textStyle, beside]}>Oomlaut is always looking for new picture books. If you’ve written or illustrated a story, send it to us and join the Oomlaut author community. Visit oomlaut.com for more information.</Text>
        <Text style={[styles.version, beside]}>Version {VERSION}</Text>
      </ScrollView>
      {/* the store owner's way in: hold Skippy for five seconds (nothing happens on a tap) */}
      <Pressable onLongPress={onSecret} delayLongPress={5000} style={{ position: 'absolute', right: 14, bottom: 12, width: skW, height: skH }} accessible={false}>
        <Image source={SKIPPY} resizeMode="contain" accessibilityIgnoresInvertColors style={{ width: skW, height: skH }} />
      </Pressable>
      </View>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  band: { backgroundColor: colors.red, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 }, // same drop shadow as the other banners
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  reg: { color: colors.white, fontFamily: fonts.ui, fontSize: 13, lineHeight: 15, marginTop: 4, marginLeft: 1 }, // small raised ®
  tagline: { color: colors.white, fontFamily: 'EBGaramond_400Regular_Italic', fontSize: 20, marginTop: 6 }, // the real italic (iPhone doesn't slant a font by itself)
  body: { paddingHorizontal: 24, paddingTop: 36, gap: 16 },
  p: { fontFamily: fonts.story, fontSize: 19, lineHeight: 28, color: colors.ink },
  version: { fontFamily: fonts.ui, fontSize: 13, color: '#555', marginTop: 8 },
});
