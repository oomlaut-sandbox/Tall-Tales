// About Coro (from the Settings menu).
import { TitleIcon } from '../titleIcons';
import React from 'react';
import { Pressable, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { IS_TABLET, BandFill } from '../look';
import { Bar, BarMeta, Burger, WithBar } from '../components/Chrome';
import { useT } from '../i18n';

const BAND_FELT = require('../../assets/band-about.jpg');

const VERSION = require('../../app.json').expo.version;

export default function About({ u, openMenu, onSecret, onBack }) {
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
        {true ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: IS_TABLET ? 0 : insets.top, bottom: 0, overflow: 'hidden' }}><BandFill source={BAND_FELT} /></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><TitleIcon kind="about" lift={2} /><Text style={[styles.title, { flexShrink: 1 }]}>Coro</Text></View>
        <Text style={styles.tagline}>{t('Books you make together.')}</Text>
      </View>
      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.body, { maxWidth: 520 }, { paddingBottom: 24 }, phone && winH < 740 && { paddingTop: 22, gap: 12 }]}>
        {/* a book maker first (Jörg, 25 Oct 2026): making together, sharing, and a few picture books */}
        <Text style={[styles.p, textStyle]}>
          {t('Coro is for making books together: your photos, your drawings, your words and your voices, in a real picture book you can keep, share with family and read at bedtime.')}
        </Text>
        <Text style={[styles.p, textStyle]}>
          {t('Record yourselves reading each book and send it to grandparents, cousins and friends, who can add their own voices. A few beautiful picture books are here too, read by a warm narrator, with each word lighting up as it’s spoken.')}
        </Text>
        <Text style={[styles.p, textStyle]}>{t('Oomlaut is always looking for new picture books. If you’ve written or illustrated a story, send it to us and join the Oomlaut author community. Visit corobooks.com for more information.')}</Text>
        {/* back to Support (About is opened from there), well clear of the words (Jörg, 26 Oct 2026) */}
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" style={styles.backRow}>
            <View style={styles.backCircle}><View style={styles.backChevron} /></View>
            <Text style={styles.back}>{t('Back to Help')}</Text>
          </Pressable>
        ) : null}
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
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginTop: 56 },
  backCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#444', alignItems: 'center', justifyContent: 'center' },
  backChevron: { width: 8, height: 8, borderLeftWidth: 1.75, borderBottomWidth: 1.75, borderColor: '#444', transform: [{ translateX: 1.5 }, { rotate: '45deg' }] },
  back: { fontFamily: fonts.uiBold, fontSize: 16, color: '#444' }, // dark, on the light grey page
  version: { fontFamily: fonts.ui, fontSize: 13, color: '#555', marginTop: 34 }, // well apart from the words above
});
