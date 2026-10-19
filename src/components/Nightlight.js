// The nightlight for Listen Only: the book fades almost to black, and a big soft sunset sun glows in the upper
// part of the screen (the left side when sideways), breathing very slowly. Under it: a fine brightness slider,
// the book's title in small white Helvetica, and a lock. Locking covers the whole screen (bars too) so little
// hands can't tap anything; unlocking asks the grown-ups' multiplication question.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { fonts } from '../theme';
import { LockIcon } from './Chrome';
import ParentGate from './ParentGate';
import { useT } from '../i18n';
import { useControls } from '../controls';
import { fmtTime } from '../clock';
import { chooseAmbient, setAmbientVolume, getAmbient, playAmbient } from '../ambient';
import { useKeepAwake } from 'expo-keep-awake';

const SUN = require('../../assets/nightlight-sun.png');

// a fine, minimal slider: a hairline with a small round knob
function FineSlider({ value, onChange, width, label }) {
  const w = useRef(width); w.current = width;
  const x0 = useRef(0);
  const at = (x) => Math.max(0, Math.min(1, x / w.current));
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { x0.current = e.nativeEvent.locationX; onChangeRef.current(at(x0.current)); },
    onPanResponderMove: (_, g) => onChangeRef.current(at(x0.current + g.dx)),
  })).current;
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
  const k = 14;
  return (
    <View {...pan.panHandlers} style={{ width, height: 36, justifyContent: 'center' }} accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(1, value + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))))}>
      <View pointerEvents="none" style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.22)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: value * width, height: 1, backgroundColor: 'rgba(255,214,170,0.75)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: value * width - k / 2, width: k, height: k, borderRadius: k / 2, backgroundColor: '#f4e2cf' }} />
    </View>
  );
}

// layers: the dark layer and the sun sit just over a turning page (40, after it) and under the menus (41);
// locked, a blocker covers everything (78) with the sun and lock above it (79), and the question above that (80)
// area: where the book is (the dark layer covers it); bar: where the reading bar is (left uncovered unless locked)
export default function Nightlight({ title, brightness = 0.7, onBrightness, wide, area, end }) {
  const t = useT();
  const { width: W, height: H } = useWindowDimensions();
  const [locked, setLocked] = useState(false);
  const [gate, setGate] = useState(false);
  const controls = useControls();
  useKeepAwake(); // the screen stays on while the nightlight is showing
  // the clock: the time now, updated every few seconds
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(iv); }, []);
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  // the wake-up alarm: at the set time the sun rises to full over about a minute and a half, and the
  // wake-up sound fades in. "Good morning" with a stop button (it works even when the screen is locked).
  const [waking, setWaking] = useState(false);
  const rise = useRef(new Animated.Value(0)).current;
  const firedOn = useRef(null);
  useEffect(() => {
    if (!controls.alarm || waking) return;
    const day = now.toDateString();
    if (hm === (controls.alarmTime || '07:00') && firedOn.current !== day) {
      firedOn.current = day;
      setWaking(true);
      Animated.timing(rise, { toValue: 1, duration: 90000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
      const id = controls.alarmSound || 'forest-birds';
      const kind = ['music-box', 'soft-piano', 'gentle-guitar', 'dreamy-harp'].includes(id) ? 'music' : 'sound';
      const target = Math.max(0.5, getAmbient().volume || 0.5);
      setAmbientVolume(0.05);
      chooseAmbient(kind === 'music' ? 'sound' : 'music', null); // just the wake-up sound
      chooseAmbient(kind, id); playAmbient();
      let k = 0; const iv = setInterval(() => { k += 1; setAmbientVolume(0.05 + (target - 0.05) * Math.min(1, k / 30)); if (k >= 30) clearInterval(iv); }, 2000);
    }
  }, [hm, controls.alarm, controls.alarmTime]);
  const stopWaking = () => { setWaking(false); rise.setValue(0); };
  // the sun breathes: very slowly a little bigger and brighter, then back
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });
  // sizes: most of the upper part of the screen (upright), or the left side (sideways)
  const sun = wide ? Math.min(area.width * 0.62, area.height * 1.05) : Math.min(area.width * 1.05, area.height * 0.62);
  const sliderW = Math.min(220, (wide ? area.width * 0.36 : area.width * 0.6));
  const info = (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <FineSlider value={brightness} onChange={onBrightness} width={sliderW} label={t('Nightlight brightness')} />
      {controls.clock ? <Text style={styles.clock}>{fmtTime(hm)}</Text> : null}
      {controls.alarm ? <Text style={styles.small}>{t('Alarm {time}', { time: fmtTime(controls.alarmTime || '07:00') })}</Text> : null}
      {waking ? (
        <Pressable onPress={stopWaking} hitSlop={12} style={styles.wakeBtn} accessibilityRole="button">
          <Text style={styles.wakeText}>{t('Good morning!')}</Text>
        </Pressable>
      ) : null}
      {title ? <Text numberOfLines={2} style={styles.title}>{title}</Text> : null}
      <Text style={styles.small}>{t('Nightlight')}</Text>
      <Pressable onPress={() => (locked ? setGate(true) : setLocked(true))} hitSlop={16} style={{ marginTop: 14, opacity: locked ? 0.9 : 0.55 }}
        accessibilityRole="button" accessibilityLabel={locked ? t('Unlock the screen') : t('Lock the screen')}>
        <LockIcon size={22} color="#f4e2cf" />
      </Pressable>
      {locked ? <Text style={[styles.small, { marginTop: 2 }]}>{t('Locked')}</Text> : null}
    </View>
  );
  return (
    <>
      {/* the book, almost hidden: nothing under it can be touched (The End's buttons still work) */}
      <View pointerEvents={end && !locked ? 'none' : 'auto'} style={[styles.abs, area, { backgroundColor: '#000', opacity: 0.93, zIndex: 40 }]} />
      {/* locked: the whole screen, bars too, takes every touch */}
      {locked ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 78 }]} onStartShouldSetResponder={() => true} /> : null}
      <View pointerEvents="box-none" style={[styles.abs, area, { zIndex: locked ? 79 : 40, flexDirection: wide ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: wide ? 8 : 0 }]}>
        <Animated.View pointerEvents="none" style={{ width: sun, height: sun, marginTop: wide ? 0 : -area.height * 0.06, opacity: Animated.multiply(glow, Animated.add(Math.max(0.04, brightness), Animated.multiply(rise, 1 - Math.max(0.04, brightness)))), transform: [{ scale }] }}>
          <Image source={SUN} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </Animated.View>
        <View style={{ marginTop: wide ? 0 : -sun * 0.06, width: wide ? area.width * 0.38 : undefined, alignItems: 'center' }}>{info}</View>
      </View>
      <ParentGate visible={gate} reason={t('Unlock the screen')} onPass={() => { setGate(false); setLocked(false); }} onCancel={() => setGate(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  title: { color: 'rgba(255,255,255,0.82)', fontFamily: fonts.ui, fontSize: 17, fontWeight: '300', letterSpacing: 0.3, textAlign: 'center', marginTop: 10, maxWidth: 280 },
  clock: { color: 'rgba(255,255,255,0.88)', fontFamily: fonts.ui, fontSize: 44, fontWeight: '200', letterSpacing: 1, marginTop: 6 },
  wakeBtn: { marginTop: 10, paddingHorizontal: 22, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,214,170,0.7)', alignItems: 'center', justifyContent: 'center' },
  wakeText: { color: '#f4e2cf', fontFamily: fonts.ui, fontSize: 16, fontWeight: '400' },
  small: { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.ui, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
});
