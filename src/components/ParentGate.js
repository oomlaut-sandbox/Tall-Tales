// A simple grown-up check before anything leaves the app (Apple's Kids category requires one).
import React, { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../theme';

import { NUMBER_WORDS, useLang, useT } from '../i18n';

const GROWNUP = require('../../assets/icon-grownup.png');

export default function ParentGate({ visible, reason, onPass, onCancel }) {
  const t = useT();
  const words = NUMBER_WORDS[useLang()] || NUMBER_WORDS.en;
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
  // The box sits in the middle of the space left above the keyboard (the keyboard comes up straight away).
  const [kbTop, setKbTop] = useState(null); // where the keyboard starts, from the top of the screen
  const [frame, setFrame] = useState(null); // where this dark layer sits on screen
  const scrimRef = useRef(null);
  const { height: winH } = useWindowDimensions();
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKbTop(e.endCoordinates.screenY));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbTop(null));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (!visible) return null;
  // how much of this layer the keyboard covers
  const covered = kbTop != null && frame ? Math.max(0, frame.y + frame.h - kbTop) : 0;
  const check = () => {
    if (parseInt(answer, 10) === q.a * q.b) onPass();
    else { setWrong(true); setAnswer(''); }
  };
  return (
    <View ref={scrimRef} style={[styles.scrim, { paddingBottom: covered }]}
      onLayout={() => scrimRef.current && scrimRef.current.measureInWindow((x, y, w, h) => setFrame({ y, h: h || winH }))}>
      <View style={styles.card}>
        {/* a grown-up holding a child's hand, so even little ones can see this is for a grown-up */}
        <Image source={GROWNUP} style={{ position: 'absolute', top: 18, right: 18, width: 48, height: 48, tintColor: '#8a8a8a' }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.kicker}>{t('For grown-ups')}</Text>
        <Text style={[styles.title, { paddingRight: 52 }]}>{t('What is {a} times {b}?', { a: words[q.a], b: words[q.b] })}</Text>
        {reason ? <Text style={styles.body}>{t(reason)}</Text> : null}
        <TextInput
          value={answer}
          onChangeText={(t) => { setAnswer(t.replace(/\D/g, '')); setWrong(false); }}
          keyboardType="number-pad"
          maxLength={3}
          autoFocus
          onSubmitEditing={check}
          style={styles.input}
          accessibilityLabel={t('Answer')}
        />
        {wrong ? <Text style={styles.wrong}>{t('That’s not quite right. Try again.')}</Text> : null}
        <View style={styles.row}>
          <Pressable onPress={onCancel} style={styles.btn}><Text style={styles.btnText}>{t('Cancel')}</Text></Pressable>
          <Pressable onPress={check} style={[styles.btn, { backgroundColor: colors.deepRed }]}><Text style={styles.btnText}>{t('Continue')}</Text></Pressable>
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
  btn: { flex: 1, backgroundColor: colors.tile, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // pills
  btnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
});
