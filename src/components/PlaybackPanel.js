// Playback Options from the main menu when no book is open: how books play (the mode), the voice, speed,
// text size, book font and sound effects. Inside a book the reader shows its own panel (with Print too).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BOOK_FONTS, colors, fonts } from '../theme';
import { BubbleIcon, Option, Panel, Slider } from './Chrome';
import { TEXT_SIZES } from './PageView';
import { MODES, NARRATORS, Seg, narratorOf, speedOf } from '../screens/Reader';
import { SAMPLES } from '../narration/samples';
import { playVoice } from '../voice';
import { playSound, setEffects, setEffectsVolume } from '../sound';

export default function PlaybackPanel({ open, onClose, prefs, setPrefs, toast, bottom, inset }) {
  const [view, setView] = useState('main'); // 'main' | 'voices'
  const [speed, setSpeed] = useState(null);
  const [vol, setVol] = useState(null);
  const close = () => { setView('main'); onClose(); };
  return (
    <Panel open={open} side="right" title={view === 'voices' ? 'Voices' : 'Playback Options'} bottom={bottom} inset={inset} onClose={close}>
      {view === 'voices' ? (
        <>
          {NARRATORS.map(([k, label]) => (
            <Option key={k} glyph={<BubbleIcon />} title={label} sub={k === 'lily' ? 'Warm and gentle' : 'Pleasant older man'} selected={narratorOf(prefs) === k}
              onPress={() => { setPrefs((p) => ({ ...p, narrator: k })); if (SAMPLES[k]) playVoice(SAMPLES[k]); toast(`${label} will read the stories.`); }} />
          ))}
          <Text style={styles.help}>The voice reads the stories aloud and sounds out words in Learn to Read. Pages you recorded in your own voice still play in yours.</Text>
          <Pressable onPress={() => setView('main')} hitSlop={8}><Text style={styles.backlink}>‹ Back to Playback Options</Text></Pressable>
        </>
      ) : (
        <>
          {MODES.map(([g, id, t, s]) => (
            <Option key={id} glyph={g} title={t} sub={s} selected={prefs.mode === id}
              onPress={() => { setPrefs((p) => ({ ...p, mode: id })); toast(`Books will play: ${t}.`); }} />
          ))}
          <Option glyph={<BubbleIcon />} title="Voices" sub={`Narrator: ${(NARRATORS.find(([k]) => k === narratorOf(prefs)) || NARRATORS[0])[1]}`} onPress={() => setView('voices')} />
          <View style={styles.setting}>
            <Text style={styles.help}>Playback speed</Text>
            <Slider value={speed ?? speedOf(prefs)} min={0.5} max={1.5} step={0.05} leftLabel="Slower" rightLabel="Faster"
              format={(v) => `${v.toFixed(2).replace(/0$/, '')}×`}
              onChange={setSpeed}
              onDone={(v) => { setSpeed(null); setPrefs((p) => ({ ...p, rate: Math.round(v * 100) / 100 })); }} />
          </View>
          <View style={styles.setting}>
            <Text style={styles.help}>Text size</Text>
            <Seg value={prefs.textScale || 1} options={TEXT_SIZES.map(([label, v]) => [v, label])} onChange={(v) => setPrefs((p) => ({ ...p, textScale: v }))} />
          </View>
          <View style={styles.setting}>
            <Text style={styles.help}>Book font</Text>
            <Seg stacked value={prefs.font || 'serif'} options={Object.entries(BOOK_FONTS).map(([k, f]) => [k, f.label, f.family])} onChange={(v) => setPrefs((p) => ({ ...p, font: v }))} />
          </View>
          <View style={styles.setting}>
            <Text style={styles.help}>Sound effects</Text>
            <Seg value={prefs.sound ? 'on' : 'off'} options={[['off', 'Off'], ['on', 'On']]}
              onChange={(v) => { const on = v === 'on'; setPrefs((p) => ({ ...p, sound: on })); setEffects(on); if (on) playSound('swish'); }} />
            {prefs.sound ? (
              <Slider value={vol ?? (prefs.soundVol == null ? 0.5 : prefs.soundVol)} min={0.05} max={1} step={0.05} leftLabel="Quieter" rightLabel="Louder"
                format={(v) => `${Math.round(v * 100)}%`} showValue={false}
                onChange={setVol}
                onDone={(v) => { setVol(null); const x = Math.round(v * 100) / 100; setPrefs((p) => ({ ...p, soundVol: x })); setEffectsVolume(x); playSound('swish'); }} />
            ) : null}
          </View>
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  setting: { gap: 8, paddingTop: 10, paddingBottom: 8 },
  backlink: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, fontWeight: '700', paddingVertical: 6 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
});
