// The nightlight for Listen Only: the book fades almost to black, and a big soft sunset sun glows in the upper
// part of the screen (the left side when sideways), breathing very slowly.
//   the fine slider under it: a solar eclipse. Slide right and the moon moves across the sun until it covers it
//     completely and only the corona glows (a small sun icon under the slider shows what it does)
//   then: "Now playing" and the book's name
//   bottom right: the lock (locked, nothing can be touched; a grown-up's question unlocks it)
//   bottom left: the clock icon (when the clock is switched on in Settings): a delicate analog clock face over the
//     sun. Above it, the alarm time (when the alarm is on): tap it to set the alarm and how to wake up.
//   under the title: the sleep timer (tap to choose off, 15, 30 or 60 minutes). When it runs out the reading
//     stops, the music fades away and the moon covers the sun.
//   at the alarm time the moon moves away (sunrise) and the chosen wake-up sound fades in.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';
import { LockIcon } from './Chrome';
import ParentGate from './ParentGate';
import { useT } from '../i18n';
import { useControls } from '../controls';
import { addMin, fmtTime } from '../clock';
import { chooseAmbient, fadeOutAmbient, setAmbientVolume, getAmbient, playAmbient } from '../ambient';
import { useKeepAwake } from 'expo-keep-awake';

const SUN = require('../../assets/nightlight-sun.png');
const CORONA = require('../../assets/nightlight-corona.png');
const CREAM = '#f4e2cf';
export const WAKE_SOUNDS = [['forest-birds', 'Birds in the forest'], ['wind-chimes', 'Wind chimes'], ['music-box', 'Music box lullaby'], ['gentle-guitar', 'Gentle guitar']];

// a fine, minimal slider: a hairline with a small round knob
function FineSlider({ value, onChange, width, label }) {
  const w = useRef(width); w.current = width;
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
  const x0 = useRef(0);
  const at = (x) => Math.max(0, Math.min(1, x / w.current));
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { x0.current = e.nativeEvent.locationX; onChangeRef.current(at(x0.current)); },
    onPanResponderMove: (_, g) => onChangeRef.current(at(x0.current + g.dx)),
  })).current;
  const k = 14;
  return (
    <View {...pan.panHandlers} style={{ width, height: 36, justifyContent: 'center' }} accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(1, value + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))))}>
      <View pointerEvents="none" style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.22)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: value * width, height: 1, backgroundColor: 'rgba(255,214,170,0.75)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: value * width - k / 2, width: k, height: k, borderRadius: k / 2, backgroundColor: CREAM }} />
    </View>
  );
}

// a simple sun: a small ring with eight short rays
function SunIcon({ size = 18, color = 'rgba(244,226,207,0.6)' }) {
  const r = size * 0.22;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={{ position: 'absolute', width: 1.4, height: size * 0.2, backgroundColor: color, transform: [{ rotate: `${i * 45}deg` }, { translateY: -size * 0.38 }] }} />
      ))}
      <View style={{ width: r * 2, height: r * 2, borderRadius: r, borderWidth: 1.4, borderColor: color }} />
    </View>
  );
}

// a simple clock: a ring with two hands
function ClockIcon({ size = 22, color = CREAM }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.6, borderColor: color }}>
      <View style={{ position: 'absolute', left: size / 2 - 1.8, top: size * 0.16, width: 1.6, height: size * 0.36, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: size / 2 - 1.8, top: size / 2 - 1.8, width: size * 0.26, height: 1.6, backgroundColor: color }} />
    </View>
  );
}

// a delicate analog clock face, thin strokes, laid over the sun
function ClockFace({ size, now, color }) {
  const h = now.getHours() % 12, m = now.getMinutes();
  // a hand: a thin bar from the middle outwards, turned around the middle
  const hand = (len, w, deg) => (
    <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', transform: [{ rotate: `${deg}deg` }] }}>
      <View style={{ marginTop: size / 2 - len, width: w, height: len, borderRadius: w / 2, backgroundColor: color }} />
    </View>
  );
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: color }} />
      {Array.from({ length: 12 }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', transform: [{ rotate: `${i * 30}deg` }] }}>
          <View style={{ marginTop: size * 0.04, width: i % 3 === 0 ? 1.6 : 1, height: i % 3 === 0 ? size * 0.08 : size * 0.045, backgroundColor: color }} />
        </View>
      ))}
      {hand(size * 0.26, 2.2, (h + m / 60) * 30)}
      {hand(size * 0.38, 1.3, m * 6)}
      <View style={{ position: 'absolute', left: size / 2 - 2.5, top: size / 2 - 2.5, width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
    </View>
  );
}

// a simple alarm setter (until the felt alarm clock is drawn): the time, and how to wake up
function AlarmSheet({ visible, time, sound, onTime, onSound, onClose }) {
  const t = useT();
  if (!visible) return null;
  const Btn = ({ label, onPress, on }) => (
    <Pressable onPress={onPress} hitSlop={6} style={[styles.sheetBtn, on && { borderColor: CREAM, backgroundColor: 'rgba(244,226,207,0.12)' }]} accessibilityRole="button">
      <Text style={styles.sheetBtnText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[StyleSheet.absoluteFill, styles.sheetScrim]} onStartShouldSetResponder={() => true} onResponderRelease={onClose}>
      <View style={styles.sheet} onStartShouldSetResponder={() => true}>
        <Text style={styles.small}>{t('Wake-up alarm')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Btn label="−1 h" onPress={() => onTime(addMin(time, -60))} />
          <Btn label="−5" onPress={() => onTime(addMin(time, -5))} />
          <Text style={styles.sheetTime}>{fmtTime(time)}</Text>
          <Btn label="+5" onPress={() => onTime(addMin(time, 5))} />
          <Btn label="+1 h" onPress={() => onTime(addMin(time, 60))} />
        </View>
        <Text style={[styles.small, { marginTop: 18 }]}>{t('Wake up with')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          {WAKE_SOUNDS.map(([id, label]) => <Btn key={id} label={t(label)} on={sound === id} onPress={() => onSound(id)} />)}
        </View>
        <Text style={[styles.note, { marginTop: 14 }]}>{t('The sun rises slowly, then the sound fades in.')}</Text>
        <Pressable onPress={onClose} hitSlop={10} style={{ marginTop: 16 }} accessibilityRole="button"><Text style={styles.sheetDone}>{t('Done')}</Text></Pressable>
      </View>
    </View>
  );
}

// layers: the dark layer and the sun sit just over a turning page (40, after it) and under the menus (41);
// locked, a blocker covers everything (78) with the nightlight above it (79), and the question above that (80)
// area: where the book is (covered)
export default function Nightlight({ title, onSleep, eclipse = 0, onEclipse, alarmTime = '07:00', alarmSound = 'forest-birds', onAlarm, wide, area, end }) {
  const t = useT();
  const controls = useControls();
  const [locked, setLocked] = useState(false);
  const [gate, setGate] = useState(false);
  const [showFace, setShowFace] = useState(false);
  const [sheet, setSheet] = useState(false);
  useKeepAwake(); // the screen stays on while the nightlight is showing
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(iv); }, []);
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
  // the wake-up alarm: the moon slides away (sunrise) over about a minute and a half, and the sound fades in
  const [waking, setWaking] = useState(false);
  const firedOn = useRef(null);
  const riseTimer = useRef(null);
  const eRef = useRef(eclipse); eRef.current = eclipse;
  useEffect(() => {
    if (!controls.alarm || waking) return;
    const day = now.toDateString();
    if (hm === alarmTime && firedOn.current !== day) {
      firedOn.current = day;
      setWaking(true);
      const from = eRef.current; let k = 0;
      clearInterval(riseTimer.current);
      riseTimer.current = setInterval(() => { k += 1; onEclipse(Math.max(0, from * (1 - k / 45))); if (k >= 45) clearInterval(riseTimer.current); }, 2000);
      const kind = ['music-box', 'soft-piano', 'gentle-guitar', 'dreamy-harp'].includes(alarmSound) ? 'music' : 'sound';
      const target = Math.max(0.5, getAmbient().volume || 0.5);
      setAmbientVolume(0.05);
      chooseAmbient(kind === 'music' ? 'sound' : 'music', null);
      chooseAmbient(kind, alarmSound); playAmbient();
      let j = 0; const iv = setInterval(() => { j += 1; setAmbientVolume(0.05 + (target - 0.05) * Math.min(1, j / 30)); if (j >= 30) clearInterval(iv); }, 2000);
    }
  }, [hm, controls.alarm, alarmTime]);
  useEffect(() => () => clearInterval(riseTimer.current), []);
  // the sleep timer: off, 15, 30 or 60 minutes
  const [sleepAt, setSleepAt] = useState(null); // when it ends (ms), or null
  const [sleepMin, setSleepMin] = useState(0);
  const cycleSleep = () => {
    const next = { 0: 15, 15: 30, 30: 60, 60: 0 }[sleepMin] ?? 0;
    setSleepMin(next); setSleepAt(next ? Date.now() + next * 60000 : null);
  };
  useEffect(() => {
    if (!sleepAt) return undefined;
    const tm = setTimeout(() => {
      setSleepAt(null); setSleepMin(0);
      if (onSleep) onSleep();
      fadeOutAmbient(30000);
      let k = 0; const from = eRef.current;
      const iv = setInterval(() => { k += 1; onEclipse(from + (1 - from) * Math.min(1, k / 15)); if (k >= 15) clearInterval(iv); }, 2000);
    }, Math.max(0, sleepAt - Date.now()));
    return () => clearTimeout(tm);
  }, [sleepAt]);
  const left = sleepAt ? Math.max(1, Math.ceil((sleepAt - now.getTime()) / 60000)) : 0;

  // sizes: most of the upper part of the screen (upright), or the left side (sideways)
  const S = wide ? Math.min(area.width * 0.6, area.height * 1.0) : Math.min(area.width * 1.05, area.height * 0.58);
  const sliderW = Math.min(220, (wide ? area.width * 0.34 : area.width * 0.6));
  // the eclipse: the moon slides in from the right; the sun dims; at the very end only the corona glows
  const e = Math.max(0, Math.min(1, eclipse));
  const moonD = S * 0.31;
  const moonX = (1 - e) * S * 0.42;
  const sunOpacity = 1 - 0.9 * Math.pow(e, 1.4);
  const coronaOpacity = Math.max(0, Math.min(1, (e - 0.82) / 0.18));
  const faceColor = e > 0.6 ? 'rgba(244,226,207,0.7)' : 'rgba(0,0,0,0.62)';

  const sunBlock = (
    <Animated.View pointerEvents="none" style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
      <Animated.View style={{ position: 'absolute', width: S, height: S, opacity: Animated.multiply(glow, sunOpacity) }}>
        <Image source={SUN} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </Animated.View>
      {coronaOpacity > 0 ? <Image source={CORONA} style={{ position: 'absolute', width: S, height: S, opacity: coronaOpacity }} resizeMode="contain" /> : null}
      <View style={{ position: 'absolute', width: moonD, height: moonD, borderRadius: moonD / 2, backgroundColor: '#050506', opacity: Math.min(1, e * 4), transform: [{ translateX: moonX }] }} />
      {showFace && controls.clock ? <View style={{ position: 'absolute' }}><ClockFace size={S * 0.5} now={now} color={faceColor} /></View> : null}
    </Animated.View>
  );
  const info = (
    <View pointerEvents="box-none" style={{ alignItems: 'center' }}>
      <FineSlider value={e} onChange={onEclipse} width={sliderW} label={t('Nightlight brightness')} />
      <View style={{ marginTop: 4 }}><SunIcon /></View>
      <Text style={[styles.label, { marginTop: 30 }]}>{t('Now playing')}</Text>
      {title ? <Text numberOfLines={2} style={styles.title}>{title}</Text> : null}
      <Pressable onPress={cycleSleep} disabled={locked} hitSlop={12} style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: sleepAt ? 0.9 : 0.5 }} accessibilityRole="button">
        <Text style={styles.small}>{sleepAt ? t('Sleep timer: {n} min', { n: left }) : t('Sleep timer: off')}</Text>
      </Pressable>
      {waking ? (
        <Pressable onPress={() => { setWaking(false); clearInterval(riseTimer.current); }} hitSlop={12} style={styles.wakeBtn} accessibilityRole="button">
          <Text style={styles.wakeText}>{t('Good morning!')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
  return (
    <>
      {/* the book, almost hidden: nothing under it can be touched (The End's buttons still work) */}
      <View pointerEvents={end && !locked ? 'none' : 'auto'} style={[styles.abs, area, { backgroundColor: '#000', opacity: 0.965, zIndex: 40 }]} />
      {/* locked: the whole screen, bars too, takes every touch */}
      {locked ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 78 }]} onStartShouldSetResponder={() => true} /> : null}
      <View pointerEvents="box-none" style={[styles.abs, area, { zIndex: locked ? 79 : 40 }]}>
        <View pointerEvents="box-none" style={{ flex: 1, flexDirection: wide ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: wide ? 8 : 0 }}>
          <View pointerEvents="none" style={{ marginTop: wide ? 0 : -area.height * 0.08, alignItems: 'center' }}>
            {/* the time, in fine letters above the sun */}
            <Text style={[styles.now, { marginBottom: -S * 0.08, zIndex: 1 }]}>{fmtTime(hm)}</Text>
            {sunBlock}
          </View>
          <View pointerEvents="box-none" style={{ marginTop: wide ? 0 : -S * 0.04, width: wide ? area.width * 0.38 : undefined, alignItems: 'center' }}>{info}</View>
        </View>
        {/* bottom left: the alarm time (when the alarm is on) above the clock icon (when the clock is on) */}
        <View pointerEvents="box-none" style={styles.cornerL}>
          {controls.alarm ? (
            <Pressable onPress={() => setSheet(true)} disabled={locked} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Alarm {time}', { time: fmtTime(alarmTime) })}>
              <Text style={styles.alarm}>{fmtTime(alarmTime)}</Text>
            </Pressable>
          ) : null}
          {controls.clock ? (
            <Pressable onPress={() => setShowFace((x) => !x)} hitSlop={14} style={{ marginTop: 18, opacity: showFace ? 0.95 : 0.55 }} accessibilityRole="button" accessibilityLabel={t('Show a clock')}>
              <ClockIcon />
            </Pressable>
          ) : null}
        </View>
        {/* bottom right: the lock */}
        <View pointerEvents="box-none" style={styles.cornerR}>
          <Pressable onPress={() => (locked ? setGate(true) : setLocked(true))} hitSlop={16} style={{ opacity: locked ? 0.95 : 0.55 }}
            accessibilityRole="button" accessibilityLabel={locked ? t('Unlock the screen') : t('Lock the screen')}>
            <LockIcon size={22} color={CREAM} />
          </Pressable>
        </View>
      </View>
      <View pointerEvents="box-none" style={[styles.abs, area, { zIndex: 79 }]}>
        <AlarmSheet visible={sheet} time={alarmTime} sound={alarmSound} onTime={(v) => onAlarm({ alarmTime: v })} onSound={(v) => onAlarm({ alarmSound: v })} onClose={() => setSheet(false)} />
      </View>
      <ParentGate visible={gate} reason={t('Unlock the screen')} onPass={() => { setGate(false); setLocked(false); }} onCancel={() => setGate(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  title: { color: 'rgba(255,255,255,0.82)', fontFamily: fonts.ui, fontSize: 17, fontWeight: '300', letterSpacing: 0.3, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  label: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.ui, fontSize: 13, fontWeight: '300', letterSpacing: 0.3, textAlign: 'center' },
  // the time above the sun: thin, quiet, large
  now: { color: 'rgba(244,226,207,0.78)', fontFamily: fonts.ui, fontSize: 30, fontWeight: '200', letterSpacing: 1.5, textAlign: 'center' },
  small: { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.ui, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center' },
  note: { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.ui, fontSize: 13, textAlign: 'center' },
  alarm: { color: 'rgba(244,226,207,0.8)', fontFamily: fonts.ui, fontSize: 15, fontWeight: '300', letterSpacing: 0.5 },
  cornerL: { position: 'absolute', left: 22, bottom: 22, alignItems: 'center' },
  cornerR: { position: 'absolute', right: 22, bottom: 22 },
  wakeBtn: { marginTop: 14, paddingHorizontal: 22, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,214,170,0.7)', alignItems: 'center', justifyContent: 'center' },
  wakeText: { color: CREAM, fontFamily: fonts.ui, fontSize: 16, fontWeight: '400' },
  sheetScrim: { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: '#141210', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(244,226,207,0.18)', padding: 20, alignItems: 'center' },
  sheetTime: { color: CREAM, fontFamily: fonts.ui, fontSize: 26, fontWeight: '200', minWidth: 96, textAlign: 'center' },
  sheetBtn: { paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(244,226,207,0.3)', alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { color: CREAM, fontFamily: fonts.ui, fontSize: 14 },
  sheetDone: { color: CREAM, fontFamily: fonts.ui, fontSize: 16, fontWeight: '600' },
});
