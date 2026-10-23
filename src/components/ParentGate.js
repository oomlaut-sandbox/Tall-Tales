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
  const { width: winW, height: winH } = useWindowDimensions();
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
  // sideways the keyboard takes most of the screen: a compact box (the question, then the answer field and
  // the two buttons on one line), centred in the space above the keyboard and no wider than it needs to be
  const flat = winW > winH;
  const input = (
    <TextInput
      value={answer}
      onChangeText={(t) => { setAnswer(t.replace(/\D/g, '')); setWrong(false); }}
      keyboardType="number-pad"
      maxLength={3}
      autoFocus
      onSubmitEditing={check}
      allowFontScaling={false} style={[styles.input, flat ? { flex: 1, minWidth: 0, fontSize: 20, height: 40 } : { marginTop: 16 }]}
      accessibilityLabel={t('Answer')}
    />
  );
  const wide = !flat && Math.min(winW, winH) >= 600; // iPad: a compact box in the middle (iPhone unchanged)
  const cancelBtn = <Pressable onPress={onCancel} style={[styles.btn, flat && styles.btnFlat]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.btnText}>{t('Cancel')}</Text></Pressable>;
  const goBtn = <Pressable onPress={check} style={[styles.btn, flat && styles.btnFlat, { backgroundColor: colors.deepRed }]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.btnText}>{t('Continue')}</Text></Pressable>;
  return (
    <View ref={scrimRef} style={[styles.scrim, { paddingBottom: covered }, (flat || wide) && { alignItems: 'center' }, flat && { paddingTop: 8 }]}
      onLayout={() => scrimRef.current && scrimRef.current.measureInWindow((x, y, w, h) => setFrame({ y, h: h || winH }))}>
      <View style={[styles.card, flat ? styles.cardFlat : wide && styles.cardWide]}>
        {/* a grown-up holding a child's hand, so even little ones can see this is for a grown-up */}
        <Image source={GROWNUP} style={[{ position: 'absolute', top: 18, right: 18, width: 48, height: 48, tintColor: '#8a8a8a' }, flat && { top: 12, right: 14, width: 34, height: 34 }]} resizeMode="contain" accessibilityIgnoresInvertColors />
        {flat ? null : <Text style={styles.kicker}>{t('For grown-ups')}</Text>}
        <Text style={[styles.title, { paddingRight: flat ? 40 : 52 }, flat && { fontSize: 19 }]}>{t('What is {a} times {b}?', { a: words[q.a], b: words[q.b] })}</Text>
        {reason && !flat ? <Text style={styles.body}>{t(reason)}</Text> : null}
        {flat ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>{input}{cancelBtn}{goBtn}</View>
        ) : input}
        {wrong ? <Text style={styles.wrong}>{t('That’s not quite right. Try again.')}</Text> : null}
        {flat ? null : <View style={styles.row}>{cancelBtn}{goBtn}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 80 },
  card: { backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 24, paddingHorizontal: 26, paddingTop: 26, paddingBottom: 28, gap: 14 }, // black glass, like the other boxes
  kicker: { color: colors.muted, fontFamily: fonts.ui, fontSize: 13, fontWeight: '700' },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 24 },
  body: { color: '#e2e2e2', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, color: colors.white, fontFamily: fonts.ui, fontSize: 24, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 0, includeFontPadding: false, height: 52 },
  wrong: { color: '#ff7b7b', fontFamily: fonts.ui, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, backgroundColor: colors.tile, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // pills
  cardFlat: { width: '100%', maxWidth: 560, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, gap: 10, borderRadius: 16 },
  cardWide: { width: 460, borderRadius: 20 },
  btnFlat: { flex: 0, flexGrow: 0, flexShrink: 0, width: 128, height: 40, paddingHorizontal: 12 }, // a set width: on iPad 'auto' shrank them to dots
  btnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
});
