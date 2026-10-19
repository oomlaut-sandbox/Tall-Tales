// Playback Options → Music and sounds: pick a nature sound or a piece of gentle music to play the whole time
// the app is open, how loud, a sleep timer, and whether the little tape player shows.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Slider } from './Chrome';
import { MUSIC, SLEEP_TIMES, SOUNDS, chooseAmbient, getAmbient, onAmbient, pauseAmbient, playAmbient, setAmbientPlayer, setAmbientRate, setAmbientVolume, setSleepTimer, stopAmbient } from '../ambient';
import { useT } from '../i18n';
import ParentGate from './ParentGate';
import { pickMusic, removeMusic } from '../myMusic';

const GUITAR = require('../../assets/music-guitar.png'); // the grey felt character with his cardboard guitar (at the bottom of the page)
const PLAYER = require('../../assets/music-player-thumb.png'); // a small Audio Player (with its shadow drawn in); tap it to open the real one

const Chip = ({ label, on, onPress, onLongPress, style }) => (
  <Pressable onPress={onPress} onLongPress={onLongPress} style={[styles.chip, on && styles.chipOn, style]} accessibilityRole="button" accessibilityState={{ selected: on }}>
    <Text style={[styles.chipText, on && { color: colors.white }]}>{label}</Text>
  </Pressable>
);

export default function AmbientControls() {
  const t = useT();
  const [s, setS] = useState(getAmbient());
  const [vol, setVol] = useState(null);
  const [rate, setRate] = useState(null);
  // a grown-up adds the family's own music (behind the grown-ups' question); a long press on one takes it away again
  const [gate, setGate] = useState(null); // { reason, run }
  useEffect(() => onAmbient(setS), []);
  // tap one to choose it (it starts playing); tap it again to switch that one off. A sound and a piece of music can play together.
  // (tapping the one already chosen while it's paused plays it, instead of switching it off)
  const pick = (kind, id) => {
    if (s[kind] === id && !s.playing) { playAmbient(); return; }
    chooseAmbient(kind, s[kind] === id ? null : id);
  };
  return (
    <View style={{ gap: 10 }}>
      {/* the words and Play / Off in a narrower column on the left, the guitar player beside them on the right */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <Text style={styles.small}>{t('Relaxing sounds and gentle music that keep playing while you use the app. Lovely at bedtime.')}</Text>
          {/* opens the Audio Player over the page */}
          <Pressable onPress={() => setAmbientPlayer(true)} style={styles.openBtn} accessibilityRole="button">
            <Text style={styles.openText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('Open Audio Player')}</Text>
          </Pressable>
          <View style={styles.chips}>
            <Chip label={s.playing ? t('Pause') : t('Play')} on={s.playing} onPress={s.playing ? pauseAmbient : playAmbient} />
            <Chip label={t('Off')} on={!s.sound && !s.music} onPress={stopAmbient} />
          </View>
        </View>
        <Pressable onPress={() => setAmbientPlayer(true)} accessibilityRole="button" accessibilityLabel={t('Open Audio Player')} style={{ marginRight: 4, marginTop: -6 }}>
          <Image source={PLAYER} style={{ width: 118, height: Math.round(118 * 562 / 440) }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Pressable>
      </View>
      <Text style={styles.group}>{t('Music')}</Text>
      <View style={styles.chips}>
        {MUSIC.map((x) => <Chip key={x.id} label={x.mine ? x.name : t(x.name)} on={s.music === x.id} onPress={() => pick('music', x.id)}
          onLongPress={x.mine ? () => setGate({ reason: t('Remove “{name}”', { name: x.name }), run: () => removeMusic(x.id) }) : undefined} />)}
        <Chip label={'+ ' + t('Add your own music')} style={styles.addChip}
          onPress={() => setGate({ reason: t('Add your own music'), run: async () => { const id = await pickMusic(); if (id) chooseAmbient('music', id); } })} />
      </View>
      <Text style={styles.hint}>{t('Grown-ups can add music saved on the phone (in Files). Press and hold your own piece to remove it.')}</Text>
      <ParentGate visible={!!gate} reason={gate ? gate.reason : ''} onPass={() => { const g = gate; setGate(null); if (g) setTimeout(g.run, 350); }} onCancel={() => setGate(null)} />
      <Text style={styles.group}>{t('Nature sounds')}</Text>
      <View style={styles.chips}>
        {SOUNDS.map((x) => <Chip key={x.id} label={t(x.name)} on={s.sound === x.id} onPress={() => pick('sound', x.id)} />)}
      </View>
      <Text style={styles.group}>{t('Volume')}</Text>
      <Slider value={vol ?? s.volume} min={0.05} max={1} step={0.05} leftLabel={t('Quieter')} rightLabel={t('Louder')} showValue={false}
        onChange={(v) => { setVol(v); setAmbientVolume(v); }} onDone={(v) => { setVol(null); setAmbientVolume(v); }} />
      <Text style={styles.group}>{t('Playback speed')}</Text>
      <Slider value={rate ?? (s.rate || 1)} min={0.5} max={1} step={0.05} leftLabel={t('Slower')} rightLabel={t('As made')} showValue={false}
        onChange={(v) => { setRate(v); setAmbientRate(v); }} onDone={(v) => { setRate(null); setAmbientRate(v); }} />
      <Text style={styles.group}>{t('Sleep timer')}</Text>
      <View style={styles.chips}>
        {SLEEP_TIMES.map((m) => <Chip key={m} label={m ? t('{n} min', { n: m }) : t('Off')} on={s.sleep === m} onPress={() => setSleepTimer(m)} />)}
      </View>
      <Text style={styles.group}>{t('Audio Player on screen')}</Text>
      <View style={styles.chips}>
        <Chip label={t('Show')} on={s.showPlayer} onPress={() => setAmbientPlayer(true)} />
        <Chip label={t('Hide')} on={!s.showPlayer} onPress={() => setAmbientPlayer(false)} />
      </View>
      {/* Skippy with his guitar, at the very bottom, in the middle, with plenty of room around him */}
      <Image source={GUITAR} style={{ width: 112, height: 125, alignSelf: 'center', marginTop: 48, marginBottom: 16 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

const styles = StyleSheet.create({
  addChip: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#8a8a8a', borderStyle: 'dashed' },
  hint: { color: '#8a8a8a', fontFamily: fonts.ui, fontSize: 12, marginTop: -2 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  small: { color: '#a9a9a9', fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  group: { color: '#bdbdbd', fontFamily: fonts.ui, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18 }, // room between the sections, above each heading
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  openBtn: { alignSelf: 'flex-start', backgroundColor: colors.blue, height: 38, borderRadius: 19, paddingHorizontal: 14, maxWidth: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  openText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.green },
  chipText: { fontFamily: fonts.ui, fontSize: 14, color: '#dcdcdc', fontWeight: '600' },
});
