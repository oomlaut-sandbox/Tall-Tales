// The nightlight for Listen Only: the book fades to black, and a big soft sunset sun glows in the upper part of the
// screen (the left side when sideways), breathing very slowly.
//   the fine slider under it: a solar eclipse. Slide right and the moon moves in from the left (the same way)
//     until it covers the sun completely and only the corona glows (a small sun icon under the slider shows what it does)
//   then: "Now playing" and the book's name
//   the lock and the alarm clock live on the reading bar beside the moon
//     the lock: nothing can be touched (a grown-up's question unlocks it)
//     the alarm clock: a dark grey popup with a soft finger wheel (one dimple, the whole day in one turn) and how to wake up
//   bottom left: the alarm time (when the alarm is on) above the clock icon (when the clock is switched on in Settings):
//     the clock icon lays a delicate analog clock face over the sun
//   under the title: the sleep timer (tap to choose off, 15, 30 or 60 minutes). When it runs out the reading
//     stops, the music fades away and the moon covers the sun.
//   at the alarm time the moon moves away very slowly (sunrise), the chosen sound or music fades in very slowly, and a
//   pill-shaped Snooze pops up.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';
import { LockIcon } from './Chrome';
import ParentGate from './ParentGate';
import { useT } from '../i18n';
import { useControls } from '../controls';
import { fmtTime } from '../clock';
import { TRACKS, setAmbientNight, chooseAmbient, fadeOutAmbient, setAmbientVolume, getAmbient, playAmbient } from '../ambient';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { thunk, tick, withTap } from '../haptics';

const SUN = require('../../assets/nightlight-sun.png');
const CORONA = require('../../assets/nightlight-corona.png');
const CREAM = '#f4e2cf';
const BASE = '#1e1e20'; // the popup's dark grey (a deep, quiet grey at night)
const GRAIN = require('../../assets/noise.png'); // a fine grain over the alarm popup, so it feels like a real object
const AMBER = '#c8862a', AMBER_INK = '#2c1a05'; // the old amber display and its dark, amber-tinted letters
const SNOOZE_MIN = 9;

const toMin = (hm) => { const [h, m] = String(hm || '07:00').split(':').map(Number); return h * 60 + m; };
const toHm = (min) => { const v = (((Math.round(min / 5) * 5) % 1440) + 1440) % 1440; return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };
const hmOf = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// a fine, minimal slider: a hairline with a small round knob
function FineSlider({ value, onChange, width, label }) {
  const w = useRef(width); w.current = width;
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
  const x0 = useRef(0);
  const at = (x) => Math.max(0, Math.min(1, x / w.current));
  const q = useRef(null); // a soft click every 5%
  const send = (v) => { const k = Math.round(v * 20); if (q.current !== null && k !== q.current) tick(); q.current = k; onChangeRef.current(v); };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { x0.current = e.nativeEvent.locationX; q.current = null; send(at(x0.current)); },
    onPanResponderMove: (_, g) => send(at(x0.current + g.dx)),
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

// the alarm's finger wheel: a soft dark grey dial (neumorphic, lit from the top left) with one round dimple for the
// index finger. One turn is the whole day: midnight at the top, 6 on the right, noon at the bottom, 18 on the left.
// It moves in 5 minute steps; the time shows in the still middle.
function FingerWheel({ size, value, onChange, label }) {
  const ref = useRef(null);
  const center = useRef({ x: 0, y: 0 });
  const acc = useRef(0); // minutes, unrounded, while turning
  const last = useRef(null); // the finger's last angle (degrees)
  const valueRef = useRef(value); valueRef.current = value;
  const cb = useRef(onChange); cb.current = onChange;
  const angleAt = (x, y) => (Math.atan2(x - center.current.x, -(y - center.current.y)) * 180) / Math.PI;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const { pageX, pageY } = e.nativeEvent;
      acc.current = toMin(valueRef.current);
      last.current = null;
      if (ref.current && ref.current.measure) ref.current.measure((x, y, w, h, px, py) => { center.current = { x: px + w / 2, y: py + h / 2 }; last.current = angleAt(pageX, pageY); });
    },
    onPanResponderMove: (e) => {
      if (last.current == null) return;
      const a = angleAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
      let d = a - last.current; if (d > 180) d -= 360; if (d < -180) d += 360;
      last.current = a;
      acc.current += d * 4; // 360 degrees = 1440 minutes
      const v = toHm(acc.current);
      if (v !== valueRef.current) { if (v.endsWith(':00')) thunk(); else tick(); valueRef.current = v; cb.current(v); }
    },
  })).current;
  const deg = toMin(value) / 4;
  const dim = size * 0.18, r = size * 0.35;
  const outer = size * 1.3;
  // the hour marks around the dial; at 0, 6, 12 and 18 the numbers stand in for the marks
  const marks = Array.from({ length: 24 }, (_, h) => {
    const big = h % 6 === 0;
    if (big) return null;
    return (
      <View key={h} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: outer, height: outer, alignItems: 'center', transform: [{ rotate: `${h * 15}deg` }] }}>
        <View style={{ marginTop: 2, width: big ? 2 : 1.2, height: big ? size * 0.05 : size * 0.028, borderRadius: 1, backgroundColor: big ? 'rgba(244,226,207,0.6)' : 'rgba(255,255,255,0.22)' }} />
      </View>
    );
  });
  const num = (h) => {
    const a = (h * 15 * Math.PI) / 180, rr = outer / 2 - 2 - size * 0.02; // where the marks are
    return <Text key={'n' + h} style={[styles.wheelNum, { left: outer / 2 + rr * Math.sin(a) - 15, top: outer / 2 - rr * Math.cos(a) - 7 }]}>{h}</Text>;
  };
  return (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      {marks}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>{[0, 6, 12, 18].map(num)}</View>
      <View ref={ref} collapsable={false} {...pan.panHandlers} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: fmtTime(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(toHm(toMin(value) + (e.nativeEvent.actionName === 'increment' ? 15 : -15)))}
        style={[styles.wheel, { width: size, height: size, borderRadius: size / 2 }]}>
        {/* the dial turns: its one dimple points at the alarm time */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', transform: [{ rotate: `${deg}deg` }] }}>
          <View style={[styles.dimple, { marginTop: size / 2 - r - dim / 2, width: dim, height: dim, borderRadius: dim / 2, transform: [{ rotate: `${-deg}deg` }] }]} />{/* turned back, so its shadow always falls from the top left like the light on the dial */}
        </View>
        <Text pointerEvents="none" style={styles.wheelTime}>{fmtTime(value)}</Text>
      </View>
    </View>
  );
}

// the alarm popup (from the alarm clock on the bar): on/off, the finger wheel, then how to wake up
const WAKE_GROUPS = [['forest-birds', 'wind-chimes', 'brook', 'waves'], ['gentle-guitar', 'music-box', 'soft-piano', 'dreamy-harp']];
function AlarmPopup({ visible, on, time, sound, onTime, onSound, onOn, onClose, wide, area }) {
  const t = useT();
  const [draft, setDraft] = useState(time);
  const [popW, setPopW] = useState(0);
  const [popH, setPopH] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    setDraft(time);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [visible]);
  if (!visible) return null;
  const size = Math.max(150, Math.min(200, wide ? area.height * 0.42 : area.width * 0.5));
  const name = (id) => { const tr = TRACKS.find((x) => x.id === id); return tr ? (tr.mine ? tr.name : t(tr.name)) : id; };
  const close = () => { onTime(draft); onClose(); };
  // every way to wake up, in one ring: the nature sounds, the music, then the family's own
  const choices = [...WAKE_GROUPS[0], ...WAKE_GROUPS[1], ...TRACKS.filter((x) => x.mine).map((x) => x.id)];
  const at = Math.max(0, choices.indexOf(sound));
  const step = (d) => onSound(choices[(at + d + choices.length) % choices.length]);
  const knobDeg = -150 + (at / Math.max(1, choices.length - 1)) * 300; // the knob's line turns a notch per choice
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: fade }]} onStartShouldSetResponder={() => true} onResponderRelease={close}>
      <View style={[styles.popup, wide && { maxWidth: 640 }]} onStartShouldSetResponder={() => true} onLayout={(e) => { setPopW(e.nativeEvent.layout.width); setPopH(e.nativeEvent.layout.height); }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
          <Text style={styles.popTitle}>{t('Alarm')}</Text>
          <Pressable onPress={withTap(() => onOn(!on))} hitSlop={10} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={t('Wake-up alarm')} style={[styles.switch, on && styles.switchOn]}>
            <View style={[styles.knob, on && { backgroundColor: '#1b1b1d', transform: [{ translateX: 20 }] }]} />
          </Pressable>
        </View>
        <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: wide ? 28 : 0, marginTop: 8, opacity: on ? 1 : 0.5 }}>
          <FingerWheel size={size} value={draft} onChange={setDraft} label={t('Alarm time')} />
          {/* how to wake up: one amber display and a small knob beside it (turn it, or tap the display, for the next) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: wide ? 0 : 26 }}>
            <Pressable onPress={withTap(() => step(1), thunk)} style={styles.lcd} accessibilityRole="adjustable" accessibilityLabel={t('Wake up with')} accessibilityValue={{ text: name(sound) }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
              <Text style={styles.lcdLabel}>{t('Wake up with')}</Text>
              <Text style={styles.lcdText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{name(sound)}</Text>
            </Pressable>
            <Pressable onPress={withTap(() => step(1), thunk)} onLongPress={withTap(() => step(-1), thunk)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Next')}
              style={styles.smallKnob}>
              <View style={{ position: 'absolute', left: 0, top: 0, width: 46, height: 46, alignItems: 'center', transform: [{ rotate: `${knobDeg}deg` }] }}>
                <View style={{ marginTop: 6, width: 2.5, height: 11, borderRadius: 1.5, backgroundColor: AMBER }} />
              </View>
            </Pressable>
          </View>
        </View>
        <Pressable onPress={withTap(() => { onTime(draft); if (!on) onOn(true); onClose(); })} hitSlop={10} style={styles.donePill} accessibilityRole="button">
          <Text style={styles.donePillText}>{on ? t('Done') : t('Set alarm')}</Text>
        </Pressable>
        {/* a fine grain over everything, for a tactile, made-of-something feel */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden', opacity: 0.42 }]}>
          <View style={{ width: Math.ceil((popW || 380) / 128) * 128, flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: Math.ceil((popW || 380) / 128) * Math.ceil((popH || 700) / 128) }, (_, k) => <Image key={k} source={GRAIN} style={{ width: 128, height: 128 }} />)}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// layers: the dark layer and the sun sit just over a turning page (40, after it) and under the menus (41);
// locked, a blocker covers everything (78) with the nightlight above it (79), and the question above that (80)
// area: where the book is (covered)
export default function Nightlight({ title, onSleep, locked = false, lockRect, onUnlock, eclipse = 0, onEclipse, alarmTime = '07:00', alarmSound = 'forest-birds', alarmOn = false, alarmOpen = false, onAlarmClose, onAlarm, wide, area, end }) {
  const t = useT();
  const controls = useControls();
  const [gate, setGate] = useState(false);
  const showFace = false; // (the analog clock face isn't offered for now)
  useKeepAwake(); // the screen stays on while the nightlight is showing
  useEffect(() => { setAmbientNight(true); if (onEclipse) onEclipse(0); /* it always opens with the whole sun showing */ return () => { setAmbientNight(false); if (onAlarmClose) onAlarmClose(); }; }, []);
  // when the nightlight starts, the screen fades slowly to black and the sun fades in with it
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(appear, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(); }, []);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(iv); }, []);
  const hm = hmOf(now);
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

  // the wake-up alarm: the moon slides away very slowly (sunrise, about three minutes) and the chosen sound or music
  // fades in even more slowly (about four minutes). A pill-shaped Snooze pops up: the sound fades out, the moon comes
  // back, and nine minutes later it all starts again. "Good morning!" ends it.
  const [waking, setWaking] = useState(false);
  const [snoozeAt, setSnoozeAt] = useState(null);
  const pop = useRef(new Animated.Value(0)).current;
  const firedOn = useRef(null);
  const riseTimer = useRef(null);
  const volTimer = useRef(null);
  const before = useRef(0); // the eclipse before the alarm (Snooze brings it back)
  const eRef = useRef(eclipse); eRef.current = eclipse;
  const onEclipseRef = useRef(onEclipse); onEclipseRef.current = onEclipse;
  const soundRef = useRef(alarmSound); soundRef.current = alarmSound;
  const rampEclipse = (to, steps) => {
    clearInterval(riseTimer.current);
    const from = eRef.current; let k = 0;
    riseTimer.current = setInterval(() => {
      k += 1; const q = Math.min(1, k / steps);
      onEclipseRef.current(from + (to - from) * q * q * (3 - 2 * q));
      if (k >= steps) clearInterval(riseTimer.current);
    }, 2000);
  };
  const ring = () => {
    before.current = eRef.current;
    setWaking(true); setSnoozeAt(null);
    pop.setValue(0);
    Animated.sequence([Animated.delay(15000), Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true })]).start();
    rampEclipse(0, 90);
    const id = soundRef.current;
    const kind = (TRACKS.find((x) => x.id === id) || {}).kind || 'sound';
    const target = Math.max(0.5, getAmbient().volume || 0.5);
    setAmbientVolume(0.01);
    chooseAmbient(kind === 'music' ? 'sound' : 'music', null);
    chooseAmbient(kind, id); playAmbient();
    clearInterval(volTimer.current);
    let j = 0;
    volTimer.current = setInterval(() => { j += 1; const q = Math.min(1, j / 120); setAmbientVolume(0.01 + (target - 0.01) * q * q); if (j >= 120) clearInterval(volTimer.current); }, 2000);
  };
  useEffect(() => {
    if (!alarmOn || waking || snoozeAt) return;
    const day = now.toDateString();
    if (hm === alarmTime && firedOn.current !== day) { firedOn.current = day; ring(); }
  }, [hm, alarmOn, alarmTime]);
  useEffect(() => {
    if (!snoozeAt) return undefined;
    const tm = setTimeout(ring, Math.max(0, snoozeAt - Date.now()));
    return () => clearTimeout(tm);
  }, [snoozeAt]);
  const hidePill = () => Animated.timing(pop, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setWaking(false));
  const snooze = () => {
    clearInterval(volTimer.current);
    fadeOutAmbient(6000);
    rampEclipse(before.current, 10);
    hidePill();
    setSnoozeAt(Date.now() + SNOOZE_MIN * 60000);
  };
  const goodMorning = () => {
    clearInterval(volTimer.current);
    fadeOutAmbient(12000);
    hidePill();
  };
  useEffect(() => { if (!alarmOn && snoozeAt) setSnoozeAt(null); }, [alarmOn]);
  useEffect(() => () => { clearInterval(riseTimer.current); clearInterval(volTimer.current); }, []);

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
      rampEclipse(1, 15);
    }, Math.max(0, sleepAt - Date.now()));
    return () => clearTimeout(tm);
  }, [sleepAt]);
  // the countdown under the title ticks every second while the sleep timer runs
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { if (!sleepAt) return undefined; const iv = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(iv); }, [sleepAt]);
  const secs = sleepAt ? Math.max(0, Math.round((sleepAt - tick) / 1000)) : 0;
  const countdown = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const left = sleepAt ? Math.max(1, Math.ceil(secs / 60)) : 0; // whole minutes left (agrees with the countdown)

  // sizes: most of the upper part of the screen (upright), or the left side (sideways)
  // upright, the black camera bar covers the top of the screen: everything starts just below it (top down, so the
  // time can never be pushed up under the bar on a shorter phone)
  const insets = useSafeAreaInsets();
  const topPad = wide ? 0 : Math.max(insets.top, 44) + 8;
  const availH = area.height - topPad;
  const S = wide ? Math.min(area.width * 0.55, area.height * 0.78) : Math.min(area.width * 1.05, availH * 0.54);
  const sliderW = Math.min(220, (wide ? area.width * 0.34 : area.width * 0.6));
  // the eclipse: the moon slides in from the left (the same way the slider goes); the sun dims; at the very end only
  // the corona glows
  const e = Math.max(0, Math.min(1, eclipse));
  const moonD = S * 0.31;
  const moonX = -(1 - e) * (area.width / 2 + moonD); // starts off screen on the left, the same way the slider goes
  const sunOpacity = 1 - 0.9 * Math.pow(e, 1.4);
  const coronaOpacity = Math.max(0, Math.min(1, (e - 0.82) / 0.18));
  const faceColor = e > 0.6 ? 'rgba(244,226,207,0.7)' : 'rgba(0,0,0,0.62)';

  const sunBlock = (
    <Animated.View pointerEvents="none" style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
      <Animated.View style={{ position: 'absolute', width: S, height: S, opacity: Animated.multiply(glow, sunOpacity) }}>
        <Image source={SUN} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </Animated.View>
      {coronaOpacity > 0 ? <Image source={CORONA} style={{ position: 'absolute', width: S, height: S, opacity: coronaOpacity }} resizeMode="contain" /> : null}
      <View style={{ position: 'absolute', width: moonD, height: moonD, borderRadius: moonD / 2, backgroundColor: '#050506', transform: [{ translateX: moonX }] }} />
      {showFace && controls.clock ? <View style={{ position: 'absolute' }}><ClockFace size={S * 0.5} now={now} color={faceColor} /></View> : null}
    </Animated.View>
  );
  const info = (
    <View pointerEvents="box-none" style={{ alignItems: 'center' }}>
      <FineSlider value={e} onChange={onEclipse} width={sliderW} label={t('Nightlight brightness')} />
      <View style={{ marginTop: 4 }}><SunIcon /></View>
      <Text style={[styles.small, { marginTop: 64 }]}>{t('Now playing')}</Text>
      {title ? <Text numberOfLines={2} style={styles.title}>{title}</Text> : null}
      <Pressable onPress={withTap(cycleSleep)} disabled={locked} hitSlop={12} style={{ marginTop: 52, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: sleepAt ? 0.9 : 0.5 }} accessibilityRole="button">
        <Text style={styles.small}>{sleepAt ? t('Sleep timer: {n} min', { n: left }) : t('Sleep timer: off')}</Text>
        {/* the countdown, right after it, the same size */}
        {sleepAt ? <Text style={[styles.small, { fontVariant: ['tabular-nums'] }]}>{countdown}</Text> : null}
      </Pressable>
    </View>
  );
  const snoozeHm = snoozeAt ? hmOf(new Date(snoozeAt)) : null;
  return (
    <>
      {/* the book, hidden: nothing under it can be touched (The End's buttons still work) */}
      <Animated.View pointerEvents={end && !locked ? 'none' : 'auto'} style={[styles.abs, area, { backgroundColor: '#000', opacity: appear, zIndex: 40 }]} />
      {/* locked: the whole screen, bars too, takes every touch */}
      {locked ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 78 }]} onStartShouldSetResponder={() => true} /> : null}
      <Animated.View pointerEvents="box-none" style={[styles.abs, area, { zIndex: locked ? 79 : 40, opacity: appear }]}>
        <View pointerEvents="box-none" style={{ flex: 1, paddingTop: topPad, flexDirection: wide ? 'row' : 'column', alignItems: 'center', justifyContent: wide ? 'center' : 'flex-start', gap: wide ? 8 : 0 }}>
          <View pointerEvents="none" style={{ alignItems: 'center' }}>
            {/* the time, in fine letters above the sun */}
            <Text style={[styles.now, { marginBottom: -S * 0.08, zIndex: 1 }]}>{fmtTime(hm)}</Text>
            {sunBlock}
          </View>
          <View pointerEvents="box-none" style={{ marginTop: wide ? 0 : -S * 0.04, width: wide ? area.width * 0.38 : undefined, alignItems: 'center' }}>{info}</View>
        </View>
        {/* waking up: a pill-shaped Snooze pops up (it works even when the screen is locked) */}
        {waking ? (
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: wide ? 40 : 56 }]}>
            <Animated.View style={{ alignItems: 'center', opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
              <Pressable onPress={withTap(snooze, thunk)} hitSlop={12} style={styles.snooze} accessibilityRole="button" accessibilityLabel={t('Snooze')}>
                <Text style={styles.snoozeText}>{t('Snooze')}</Text>
              </Pressable>
              <Pressable onPress={withTap(goodMorning)} hitSlop={12} style={{ marginTop: 16 }} accessibilityRole="button">
                <Text style={styles.wakeText}>{t('Good morning!')}</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
      </Animated.View>
      {/* locked: the lock on the bar stays tappable, above the blocker (it asks the grown-ups' question) */}
      {locked && lockRect ? (
        <Pressable onPress={withTap(() => setGate(true))} hitSlop={16} style={{ position: 'absolute', left: lockRect.x, top: lockRect.y, width: lockRect.width, height: lockRect.height, zIndex: 79, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button" accessibilityLabel={t('Unlock the screen')}>
          <LockIcon size={Math.min(lockRect.width, lockRect.height)} color={CREAM} />
        </Pressable>
      ) : null}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 81 }]}>
        <AlarmPopup visible={alarmOpen && !locked} on={alarmOn} time={alarmTime} sound={alarmSound} wide={wide} area={area}
          onTime={(v) => { if (v !== alarmTime) firedOn.current = null; onAlarm({ alarmTime: v }); }}
          onSound={(v) => onAlarm({ alarmSound: v })} onOn={(v) => onAlarm({ alarmOn: v })} onClose={onAlarmClose} />
      </View>
      <ParentGate visible={gate} reason={t('Unlock the screen')} onPass={() => { setGate(false); if (onUnlock) onUnlock(); }} onCancel={() => setGate(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  title: { color: 'rgba(255,255,255,0.82)', fontFamily: fonts.ui, fontSize: 17, fontWeight: '300', letterSpacing: 0.3, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  countdown: { color: 'rgba(244,226,207,0.7)', fontFamily: fonts.ui, fontSize: 22, fontWeight: '200', letterSpacing: 2, marginTop: 10, fontVariant: ['tabular-nums'] },
  // the time above the sun: thin, quiet, large
  now: { color: 'rgba(244,226,207,0.78)', fontFamily: fonts.ui, fontSize: 30, fontWeight: '200', letterSpacing: 1.5, textAlign: 'center' },
  small: { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.ui, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center' },
  note: { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.ui, fontSize: 12.5, textAlign: 'center', lineHeight: 17 },
  alarm: { color: 'rgba(244,226,207,0.8)', fontFamily: fonts.ui, fontSize: 15, fontWeight: '300', letterSpacing: 0.5 },
  cornerL: { position: 'absolute', left: 22, bottom: 22, alignItems: 'center' },
  wakeText: { color: 'rgba(244,226,207,0.8)', fontFamily: fonts.ui, fontSize: 15, fontWeight: '300', letterSpacing: 0.4 },
  // Snooze: a big soft pill, easy to find half asleep
  snooze: { minWidth: 180, height: 56, paddingHorizontal: 36, borderRadius: 28, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(255,180,110,0.45)' },
  snoozeText: { color: '#1b1b1d', fontFamily: fonts.ui, fontSize: 19, fontWeight: '500', letterSpacing: 1.2 },
  // the alarm popup: dark grey, soft (neumorphic) shapes lit from the top left
  scrim: { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  popup: { width: '100%', maxWidth: 380, backgroundColor: BASE, borderRadius: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18, alignItems: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.8)' },
  // the dial: one flat face, its edge just slightly rounded (a soft light rim at the top left, a soft dark one at the bottom right)
  wheel: { backgroundColor: BASE, alignItems: 'center', justifyContent: 'center', boxShadow: '-8px -8px 18px rgba(255,255,255,0.04), 12px 12px 26px rgba(0,0,0,0.8), inset 2px 2px 3px rgba(255,255,255,0.05), inset -3px -3px 5px rgba(0,0,0,0.45)' },
  dimple: { backgroundColor: '#19191b', boxShadow: 'inset 5px 5px 8px rgba(0,0,0,0.85), inset -3px -3px 6px rgba(255,255,255,0.06)' },
  wheelTime: { color: CREAM, fontFamily: fonts.ui, fontSize: 17, fontWeight: '300', letterSpacing: 0.8 }, // small, so it keeps clear of the finger hole
  popTitle: { flex: 1, color: '#bdb9b3', fontFamily: fonts.ui, fontWeight: '700', fontSize: 24 }, // like the other page titles, a light grey
  wheelNum: { position: 'absolute', width: 30, textAlign: 'center', color: 'rgba(244,226,207,0.62)', fontFamily: fonts.ui, fontSize: 12, fontWeight: '400' },
  chip: { paddingHorizontal: 13, height: 34, borderRadius: 17, backgroundColor: BASE, alignItems: 'center', justifyContent: 'center', boxShadow: '-3px -3px 6px rgba(255,255,255,0.05), 3px 3px 7px rgba(0,0,0,0.6)' },
  // the amber display: an old backlit LCD, its letters dark with an amber tint; and the small knob beside it
  lcd: { width: 232, height: 58, borderRadius: 8, backgroundColor: AMBER, paddingHorizontal: 14, justifyContent: 'center', boxShadow: 'inset 2px 3px 6px rgba(0,0,0,0.45), inset -1px -1px 2px rgba(255,220,160,0.35), 0 0 14px rgba(200,134,42,0.18)' },
  lcdLabel: { color: 'rgba(44,26,5,0.6)', fontFamily: fonts.ui, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  lcdText: { color: AMBER_INK, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 15, fontWeight: '600', marginTop: 2, letterSpacing: 0 },
  smallKnob: { width: 46, height: 46, borderRadius: 23, backgroundColor: BASE, boxShadow: '-4px -4px 9px rgba(255,255,255,0.045), 5px 5px 11px rgba(0,0,0,0.8), inset 1px 1px 2px rgba(255,255,255,0.05), inset -2px -2px 3px rgba(0,0,0,0.4)' },
  chipOn: { backgroundColor: '#8f8578' }, // the chosen one: a dim warm grey, easy on the eyes at night
  chipText: { color: 'rgba(244,226,207,0.85)', fontFamily: fonts.ui, fontSize: 13 },
  switch: { width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: '#161618', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.7), inset -2px -2px 4px rgba(255,255,255,0.04)' },
  switchOn: { backgroundColor: '#8f8578' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#8a8a8e' },
  donePill: { marginTop: 4, paddingHorizontal: 32, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(244,226,207,0.5)', alignItems: 'center', justifyContent: 'center' },
  donePillText: { color: CREAM, fontFamily: fonts.ui, fontSize: 15, fontWeight: '500', letterSpacing: 0.5 },
});
