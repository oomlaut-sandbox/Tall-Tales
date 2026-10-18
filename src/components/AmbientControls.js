// Playback Options → Music and sounds: pick a nature sound or a piece of gentle music to play the whole time
// the app is open, how loud, a sleep timer, and whether the little tape player shows.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Slider } from './Chrome';
import { SLEEP_TIMES, TRACKS, getAmbient, onAmbient, pauseAmbient, playAmbient, setAmbientPlayer, setAmbientVolume, setSleepTimer, stopAmbient } from '../ambient';
import { useT } from '../i18n';

const Chip = ({ label, on, onPress }) => (
  <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
    <Text style={[styles.chipText, on && { color: colors.white }]}>{label}</Text>
  </Pressable>
);

export default function AmbientControls() {
  const t = useT();
  const [s, setS] = useState(getAmbient());
  const [vol, setVol] = useState(null);
  useEffect(() => onAmbient(setS), []);
  const pick = (id) => (s.track === id && s.playing ? pauseAmbient() : playAmbient(id));
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.small}>{t('Relaxing sounds and gentle music that keep playing while you use the app. Lovely at bedtime.')}</Text>
      <View style={styles.chips}>
        <Chip label={t('Off')} on={!s.track || !s.playing} onPress={stopAmbient} />
      </View>
      <Text style={styles.group}>{t('Nature sounds')}</Text>
      <View style={styles.chips}>
        {TRACKS.filter((x) => x.kind === 'sound').map((x) => <Chip key={x.id} label={t(x.name)} on={s.track === x.id && s.playing} onPress={() => pick(x.id)} />)}
      </View>
      <Text style={styles.group}>{t('Music')}</Text>
      <View style={styles.chips}>
        {TRACKS.filter((x) => x.kind === 'music').map((x) => <Chip key={x.id} label={t(x.name)} on={s.track === x.id && s.playing} onPress={() => pick(x.id)} />)}
      </View>
      <Text style={styles.group}>{t('Volume')}</Text>
      <Slider value={vol ?? s.volume} min={0.05} max={1} step={0.05} leftLabel={t('Quieter')} rightLabel={t('Louder')} showValue={false}
        onChange={(v) => { setVol(v); setAmbientVolume(v); }} onDone={(v) => { setVol(null); setAmbientVolume(v); }} />
      <Text style={styles.group}>{t('Sleep timer')}</Text>
      <View style={styles.chips}>
        {SLEEP_TIMES.map((m) => <Chip key={m} label={m ? t('{n} min', { n: m }) : t('Off')} on={s.sleep === m} onPress={() => setSleepTimer(m)} />)}
      </View>
      <Text style={styles.group}>{t('Tape player on screen')}</Text>
      <View style={styles.chips}>
        <Chip label={t('Show')} on={s.showPlayer} onPress={() => setAmbientPlayer(true)} />
        <Chip label={t('Hide')} on={!s.showPlayer} onPress={() => setAmbientPlayer(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  small: { color: '#a9a9a9', fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  group: { color: '#bdbdbd', fontFamily: fonts.ui, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.green },
  chipText: { fontFamily: fonts.ui, fontSize: 14, color: '#dcdcdc', fontWeight: '600' },
});
