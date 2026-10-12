// A simple grown-up check before anything leaves the app (Apple's Kids category requires one).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export default function ParentGate({ visible, reason, onPass, onCancel }) {
  const [q, setQ] = useState({ a: 7, b: 8 });
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  useEffect(() => {
    if (visible) {
      setQ({ a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) });
      setAnswer('');
      setWrong(false);
    }
  }, [visible]);
  if (!visible) return null;
  const check = () => {
    if (parseInt(answer, 10) === q.a * q.b) onPass();
    else { setWrong(true); setAnswer(''); }
  };
  return (
    <View style={styles.scrim}>
      <View style={styles.card}>
        <Text style={styles.kicker}>For grown-ups</Text>
        <Text style={styles.title}>What is {NUMBER_WORDS[q.a]} times {NUMBER_WORDS[q.b]}?</Text>
        {reason ? <Text style={styles.body}>{reason}</Text> : null}
        <TextInput
          value={answer}
          onChangeText={(t) => { setAnswer(t.replace(/\D/g, '')); setWrong(false); }}
          keyboardType="number-pad"
          maxLength={3}
          autoFocus
          onSubmitEditing={check}
          style={styles.input}
          accessibilityLabel="Answer"
        />
        {wrong ? <Text style={styles.wrong}>That’s not quite right. Try again.</Text> : null}
        <View style={styles.row}>
          <Pressable onPress={onCancel} style={styles.btn}><Text style={styles.btnText}>Cancel</Text></Pressable>
          <Pressable onPress={check} style={[styles.btn, { backgroundColor: colors.highlight }]}><Text style={styles.btnText}>Continue</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 80 },
  card: { backgroundColor: colors.panel, padding: 24, gap: 12 },
  kicker: { color: colors.muted, fontFamily: fonts.ui, fontSize: 13, fontWeight: '700' },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 24 },
  body: { color: '#e2e2e2', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  input: { backgroundColor: '#2e2e2e', color: colors.white, fontFamily: fonts.ui, fontSize: 24, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 10 },
  wrong: { color: '#ff7b7b', fontFamily: fonts.ui, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { flex: 1, backgroundColor: colors.tile, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
});
