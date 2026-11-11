// The Games page in the Garden (Jörg, 11 Nov 2026): tap the picnic table and the games are laid out on the grey felt,
// a big square picture for each. More games will come, so the page says to check back.
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';

const FELT = require('../../assets/desk-felt.jpg');
// the games so far: add one here, with its square picture, and it joins the page
export const GAMES = [
  { game: 'mancala', title: 'Mancala', pic: require('../../assets/garden/games/mancala.jpg') },
  { game: 'pairs', title: 'Find the pairs', pic: require('../../assets/garden/games/pairs.jpg') },
];

export default function GardenGames({ area, onOpen }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const tall = H > W;
  const gap = 18, side = tall ? 22 : 70;
  // two across upright; sideways they sit in a row, no taller than the page allows
  const tile = Math.min((W - side * 2 - gap) / 2, tall ? 9999 : H - (Math.max(insets.top, 12) + 150));
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={FELT} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 12) + 6, paddingBottom: 40, alignItems: 'center' }}>
        <Text style={styles.title} accessibilityRole="header">{t('Games')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap, marginTop: 22, paddingHorizontal: side }}>
          {GAMES.map((g) => (
            <Pressable key={g.game} onPress={withTap(() => onOpen(g.game))} style={{ width: tile }} accessibilityRole="button" accessibilityLabel={t(g.title)}>
              <View style={styles.shadow}>
                <Image source={g.pic} style={{ width: tile, height: tile, borderRadius: 10 }} resizeMode="cover" />
              </View>
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
  shadow: { borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 5 } },
  name: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17, lineHeight: 22, marginTop: 10 },
  more: { color: '#d8d3c8', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 30, paddingHorizontal: 30 },
});
