// Reading Options as a collapsible black glass box (Jörg, 26 Oct 2026): the same box in Settings, and right under
// the books in My Library and the Book Store. Its heading opens it in place: the reading modes, voices, playlists,
// speed, text size, book font and sound effects (the panel's own choices), then haptic feedback.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { boxTitle, colors, fonts, sectionBox } from '../theme';
import { ReadingOptionsContent } from './PlaybackPanel';
import { hapticsOn, onHaptics, setHapticsOn, tap } from '../haptics';
import { useT } from '../i18n';

const ICON = require('../../assets/heading-icons/reading.png');

// open / onToggle: given by Settings (one category open at a time); otherwise the box keeps its own
export default function ReadingOptionsSection({ prefs, setPrefs, toast, onPlaylists, style, open, onToggle }) {
  const t = useT();
  const [own, setOwn] = useState(false);
  const on = open != null ? open : own;
  const toggle = onToggle || (() => setOwn((o) => !o));
  const [view, setView] = useState('main'); // the choices, or the voices
  const [hap, setHap] = useState(hapticsOn());
  useEffect(() => onHaptics(setHap), []);
  return (
    <View style={[styles.box, style]}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: on }} style={[styles.head, on && { marginBottom: 6 }]}>
        <Image source={ICON} style={styles.icon} accessibilityIgnoresInvertColors />
        <Text style={[styles.title, { flex: 1 }]}>{t('Reading Options')}</Text>
        <Text style={styles.chev}>{on ? '−' : '+'}</Text>
      </Pressable>
      {on ? (
        <View style={{ gap: 16, paddingTop: 6 }}>
          <ReadingOptionsContent prefs={prefs} setPrefs={setPrefs} toast={toast} onPlaylists={onPlaylists} view={view} setView={setView} />
          {/* haptic feedback: small clicks you feel on the dials, knobs, sliders and buttons (for the whole phone) */}
          <View style={{ gap: 8, paddingTop: 10 }}>
            <Text style={styles.help}>{t('Haptic feedback')}</Text>
            <View style={styles.row}>
              <Text style={styles.rowText}>{t('Feel a soft click on dials, knobs and buttons')}</Text>
              <Switch value={hap} onValueChange={(v) => { tap(); setHapticsOn(v); }} trackColor={{ true: colors.green, false: '#555' }} thumbColor={colors.white} ios_backgroundColor="#555" />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { ...sectionBox, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 28, height: 28 },
  title: { ...boxTitle },
  chev: { fontFamily: fonts.ui, fontSize: 30, lineHeight: 34, color: 'rgba(255,255,255,0.75)', width: 30, textAlign: 'center' },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 36 },
  rowText: { flex: 1, fontFamily: fonts.ui, fontSize: 16, color: colors.white },
});
