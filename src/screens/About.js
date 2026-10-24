// About Coro Reader (from the Settings menu).
import React from 'react';
import { Pressable, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { IS_TABLET } from '../look';
import { Bar, BarMeta, Burger, WithBar } from '../components/Chrome';
import { useT } from '../i18n';

const BAND_FELT = require('../../assets/band-about.jpg');

const VERSION = require('../../app.json').expo.version;

export default function About({ u, openMenu, onSecret }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  // one thin column of words (never stretched across a wide iPad)
  const phone = winW < 600;
  const textStyle = phone ? (winH < 740 ? { fontSize: 14.5, lineHeight: 20 } : { fontSize: 17, lineHeight: 24 }) : null;
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        {/* Jörg's red felt, treated like the other banners (phones); iPad keeps the classic solid red */}
        {!IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : null}
        <Text style={styles.title}>Coro Reader</Text>
        <Text style={styles.tagline}>{t('Picture books in your voice.')}</Text>
      </View>
      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.body, { maxWidth: 520 }, { paddingBottom: 24 }, phone && winH < 740 && { paddingTop: 22, gap: 12 }]}>
        <Text style={[styles.p, textStyle]}>
          {t('Coro Reader is a home for beautifully illustrated stories, made for children who are learning to read and the grown-ups who read with them.')}
        </Text>
        <Text style={[styles.p, textStyle]}>
          {t('Every book can be read aloud by a warm narrator, with each word lighting up as it’s spoken. In Learn to Read mode, children tap any word to hear it sounded out, one part at a time. Parents can record themselves reading each page, so a favourite story can be heard in a familiar voice, any time. And families can make their own books, with their own pictures and words.')}
        </Text>
        <Text style={[styles.p, textStyle]}>{t('Oomlaut is always looking for new picture books. If you’ve written or illustrated a story, send it to us and join the Oomlaut author community. Visit oomlaut.com for more information.')}</Text>
        {/* the store owner's way in: hold the version line for five seconds (nothing happens on a tap) */}
        <Pressable onLongPress={onSecret} delayLongPress={5000} accessible={false}><Text style={styles.version}>{t('Version {v}', { v: VERSION })} · © 2026 Oomlaut Inc.</Text></Pressable>
      </ScrollView>
      </View>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  band: { backgroundColor: colors.red, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 }, // same drop shadow as the other banners
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32 },
  reg: { color: colors.white, fontFamily: fonts.ui, fontSize: 13, lineHeight: 15, marginTop: 4, marginLeft: 1 }, // small raised ®
  tagline: { color: colors.white, fontFamily: 'EBGaramond_400Regular_Italic', fontSize: 20, marginTop: 6 }, // the real italic (iPhone doesn't slant a font by itself)
  body: { paddingHorizontal: 24, paddingTop: 36, gap: 16 },
  p: { fontFamily: fonts.story, fontSize: 19, lineHeight: 28, color: colors.ink },
  version: { fontFamily: fonts.ui, fontSize: 13, color: '#555', marginTop: 8 },
});
