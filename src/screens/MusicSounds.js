// Music and Sounds (main menu): nature sounds and gentle music that keep playing all through the app,
// how loud, a sleep timer, and the little floating tape player.
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, IS_TABLET, DESK_BG } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import AmbientControls from '../components/AmbientControls';
import { useT } from '../i18n';

const BAND_FELT = require('../../assets/band-music.jpg'); // Jörg's dark brown felt, stitched along the bottom

export default function MusicSounds({ u, openMenu, prefs, setPrefs }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        {!IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : null}
        <Text style={styles.title}>{t('Music and Sounds')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.col}>
          <View style={styles.card}><AmbientControls prefs={prefs} setPrefs={setPrefs} /></View>
        </View>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  band: { backgroundColor: '#3a2a20' /* the brown felt's colour */, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 28, paddingBottom: 140, alignItems: 'center' }, // room at the bottom for the tape player
  col: { width: '100%', maxWidth: 520, gap: 14 },
  card: { backgroundColor: '#2e2e2e', borderRadius: 14, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
});
