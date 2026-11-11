// The Games page in the Garden (Jörg, 11 Nov 2026): tap the picnic table and the games sit together in one black
// glass box on the grey felt, each with a small picture of itself (a little Mancala board with its stones, a stack
// of the felt cards with the mushroom on top). More games will come, so the page says to check back.
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, sectionBox } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';

const FELT = require('../../assets/desk-felt.jpg');
// the games so far: add one here, with its square picture, and it joins the page
export const GAMES = [
  { game: 'mancala', title: 'Mancala', pic: require('../../assets/garden/games/mancala.png') },
  { game: 'pairs', title: 'Find the pairs', pic: require('../../assets/garden/games/pairs.png') },
];

export default function GardenGames({ area, onOpen }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const tall = H > W;
  const side = tall ? 16 : 70, pad = 14, gap = 14;
  // two across, in one glass box; sideways no taller than the page allows
  const boxW = Math.min(W - side * 2, 640);
  const tile = Math.min((boxW - pad * 2 - gap) / 2, tall ? 9999 : H - (Math.max(insets.top, 12) + 190));
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={FELT} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 12) + 6, paddingBottom: 40, alignItems: 'center' }}>
        <Text style={styles.title} accessibilityRole="header">{t('Games')}</Text>
        <View style={[sectionBox, { width: boxW, marginTop: 22, paddingHorizontal: pad, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap }]}>
          {GAMES.map((g) => (
            <Pressable key={g.game} onPress={withTap(() => onOpen(g.game))} style={{ width: tile, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={t(g.title)}>
              <Image source={g.pic} style={{ width: tile, height: tile }} resizeMode="contain" />
              <Text style={styles.name} numberOfLines={2}>{t(g.title)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.more}>{t('Check back here for more games.')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 26, textAlign: 'center' },
  name: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17, lineHeight: 22, marginTop: 2, marginBottom: 6, textAlign: 'center' },
  more: { color: '#d8d3c8', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 30, paddingHorizontal: 30 },
});
