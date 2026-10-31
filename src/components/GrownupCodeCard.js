// Settings → Parental controls: the optional grown-up passcode (see grownupCode.js). Off to start.
// Set: four digits, then the same four again. On: Change or Turn off.
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { setGrownupCode, useGrownupCode } from '../grownupCode';

export default function GrownupCodeCard({ styles }) {
  const t = useT();
  const on = useGrownupCode();
  const [step, setStep] = useState(null); // null | 'first' | 'again'
  const [first, setFirst] = useState('');
  const [val, setVal] = useState('');
  const [err, setErr] = useState(null);
  const start = () => { setStep('first'); setFirst(''); setVal(''); setErr(null); };
  const enter = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    setVal(d); setErr(null);
    if (d.length < 4) return;
    if (step === 'first') { setFirst(d); setVal(''); setStep('again'); return; }
    if (d === first) { setGrownupCode(d); setStep(null); setVal(''); }
    else { setErr(t('Those didn’t match. Choose four digits again.')); setStep('first'); setFirst(''); setVal(''); }
  };
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('Grown-up passcode')}</Text>
      <Text style={styles.small}>{t('Instead of the times-table question, ask for a four-digit passcode before Settings, sharing, buying and the Teacher’s Desk. Good for classrooms and older kids. It works for every profile on this device.')}</Text>
      {step ? (
        <View style={{ gap: 10 }}>
          <Text style={styles.p}>{step === 'first' ? t('Choose four digits') : t('Type them again')}</Text>
          <TextInput key={step} value={val} onChangeText={enter} keyboardType="number-pad" maxLength={4} secureTextEntry autoFocus
            accessibilityLabel={step === 'first' ? t('Choose four digits') : t('Type them again')}
            style={{ alignSelf: 'flex-start', width: 150, height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', color: colors.white, fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: 10, paddingHorizontal: 16 }} />
          <Pressable onPress={() => { setStep(null); setVal(''); setErr(null); }} style={[styles.pill, { backgroundColor: '#555' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Cancel')}</Text></Pressable>
        </View>
      ) : on ? (
        <View style={{ gap: 10 }}>
          <Text style={[styles.p, { color: colors.white, fontFamily: fonts.uiBold }]}>{t('The passcode is on.')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Pressable onPress={start} style={[styles.pill, { backgroundColor: '#555' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Change passcode')}</Text></Pressable>
            <Pressable onPress={() => setGrownupCode(null)} style={[styles.pill, { backgroundColor: colors.red }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Turn off')}</Text></Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={start} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Set a passcode')}</Text></Pressable>
      )}
      {err ? <Text style={[styles.small, { color: '#ff7b7b' }]}>{err}</Text> : null}
    </View>
  );
}
