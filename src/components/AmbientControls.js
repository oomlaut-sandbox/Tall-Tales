// Playback Options → Music and sounds: pick a nature sound or a piece of gentle music to play the whole time
// the app is open, how loud, a sleep timer, and whether the little tape player shows.
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Slider } from './Chrome';
import { MUSIC, SLEEP_TIMES, SOUNDS, chooseAmbient, getAmbient, onAmbient, pauseAmbient, playAmbient, setAmbientPlayer, setAmbientRate, setAmbientVolume, setSleepTimer, stopAmbient } from '../ambient';
import { useT } from '../i18n';
import ParentGate from './ParentGate';
import { removeMusic } from '../myMusic';
import MyMusicSheet from './MyMusicSheet';
import { thunk, tap, withTap } from '../haptics';

const GUITAR = require('../../assets/music-guitar.png'); // the grey felt character with his cardboard guitar (at the bottom of the page)
const PLAYER = require('../../assets/music-player-thumb.png'); // a small Audio Player (with its shadow drawn in); tap it to open the real one

const Chip = ({ label, on, onPress, onLongPress, style }) => (
  <Pressable onPress={withTap(onPress)} onLongPress={onLongPress ? withTap(onLongPress, thunk) : undefined} style={[styles.chip, on && styles.chipOn, style]} accessibilityRole="button" accessibilityState={{ selected: on }}>
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
  const lastGate = useRef(null); if (gate) lastGate.current = gate;
  const [sheet, setSheet] = useState(null); // 'music' | 'sound': upload or record one
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
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between', gap: 10 }}>
          <Text style={[styles.small, { marginTop: 5 }]}>{t('Relaxing sounds and gentle music that keep playing while you use the app. Lovely at bedtime.')}</Text>{/* its top lines up with the top of the player picture */}
          {/* opens the Audio Player over the page; its bottom lines up with the bottom of the player picture */}
          <Pressable onPress={withTap(() => setAmbientPlayer(true))} style={[styles.openBtn, { marginTop: 0, marginBottom: 10 }]} accessibilityRole="button">
            <Text style={styles.openText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t('Open Audio Player')}</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => setAmbientPlayer(true)} accessibilityRole="button" accessibilityLabel={t('Open Audio Player')} style={{ marginRight: 4 }}>
          <Image source={PLAYER} style={{ width: 118, height: Math.round(118 * 562 / 440) }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Pressable>
      </View>
      <Text style={[styles.small, { marginTop: 14 }]}>{t('Tap a sound or a piece of music to hear it. Tap it again to turn it off.')}</Text>
      {/* the music, in its own slightly lighter box */}
      <View style={styles.section}>
        <Text style={[styles.group, { marginTop: 0, marginBottom: 6 }]}>{t('Music')}</Text>
        <View style={styles.chips}>
          {MUSIC.map((x) => <Chip key={x.id} label={x.mine ? x.name : t(x.name)} on={s.playing && s.music === x.id} onPress={() => pick('music', x.id)} style={styles.chipIn}
            onLongPress={x.mine ? () => setGate({ reason: t('Remove “{name}”', { name: x.name }), run: () => removeMusic(x.id) }) : undefined} />)}
        </View>
        {/* the family's own music: upload a file or record one (behind the grown-ups' question), then name it */}
        <Pressable onPress={() => tap() || setGate({ reason: t('Upload or record music'), run: () => setSheet('music') })} style={[styles.uploadBtn, { marginTop: 14 }]} accessibilityRole="button">
          <Text style={styles.openText}>{t('Upload or record music')}</Text>
        </Pressable>
        {MUSIC.some((x) => x.mine) ? <Text style={styles.hint}>{t('Press and hold your own music to remove it.')}</Text> : null}
      </View>
      {/* the nature sounds, in a box of their own */}
      <View style={styles.section}>
        <Text style={[styles.group, { marginTop: 0, marginBottom: 6 }]}>{t('Nature sounds')}</Text>
        <View style={styles.chips}>
          {SOUNDS.map((x) => <Chip key={x.id} label={x.mine ? x.name : t(x.name)} on={s.playing && s.sound === x.id} onPress={() => pick('sound', x.id)} style={styles.chipIn}
            onLongPress={x.mine ? () => setGate({ reason: t('Remove “{name}”', { name: x.name }), run: () => removeMusic(x.id) }) : undefined} />)}
        </View>
        <Pressable onPress={() => tap() || setGate({ reason: t('Upload or record a sound'), run: () => setSheet('sound') })} style={[styles.uploadBtn, { marginTop: 14 }]} accessibilityRole="button">
          <Text style={styles.openText}>{t('Upload or record a sound')}</Text>
        </Pressable>
        {SOUNDS.some((x) => x.mine) ? <Text style={styles.hint}>{t('Press and hold your own sound to remove it.')}</Text> : null}
      </View>
      {/* only there while it's open: its recorder mustn't hold the phone's audio while you're just listening */}
      {sheet ? <MyMusicSheet visible kind={sheet} onClose={() => setSheet(null)} /> : null}
      {/* the question keeps its words while it fades away (they used to vanish first and the box jumped) */}
      {/* (in its own full-screen layer: inside the page it sat in the middle of the long list and jumped about) */}
      <Modal visible={!!gate} transparent animationType="fade" onRequestClose={() => setGate(null)}>
        <ParentGate visible reason={(gate || lastGate.current || {}).reason || ''} onPass={() => { const g = gate; setGate(null); if (g) setTimeout(g.run, 600); }} onCancel={() => setGate(null)} />
      </Modal>
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
  uploadBtn: { alignSelf: 'flex-start', backgroundColor: colors.green, height: 38, borderRadius: 19, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  hint: { color: '#8a8a8a', fontFamily: fonts.ui, fontSize: 12, marginTop: -2 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  small: { color: '#a9a9a9', fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  group: { color: '#bdbdbd', fontFamily: fonts.ui, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18 }, // room between the sections, above each heading
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { backgroundColor: '#383838', borderRadius: 12, padding: 14, paddingBottom: 16, gap: 8, marginTop: 8 }, // a slightly lighter box for each list
  chipIn: { backgroundColor: '#4a4a4a' },
  openBtn: { alignSelf: 'flex-start', backgroundColor: '#555555', height: 38, borderRadius: 19, paddingHorizontal: 14, maxWidth: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  openText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.green },
  chipText: { fontFamily: fonts.ui, fontSize: 14, color: '#dcdcdc', fontWeight: '600' },
});
