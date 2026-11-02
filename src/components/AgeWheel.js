// "How old are you?" as a finger wheel, like the nightlight alarm's: a soft dial with one round dimple, turned with a
// finger. It clicks through 13 places: Off at the top, then 2 to 12, then Older (Jörg, 2 Nov 2026).
// value: null (Off), 2-12, or OLDER. The middle shows the choice.
import React, { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';
import { thunk, tick } from '../haptics';
import { useT } from '../i18n';

export const OLDER = 13; // older than 12: every book
const STOPS = [null, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, OLDER];
const N = STOPS.length;
const STEP = 360 / N;
const indexOf = (v) => Math.max(0, STOPS.indexOf(v == null ? null : v));

const BASE = '#d6d6d6'; // the grey box it sits in
export default function AgeWheel({ value, onChange, size = 190 }) {
  const t = useT();
  const ref = useRef(null);
  const center = useRef({ x: 0, y: 0 });
  const acc = useRef(0); // degrees, unrounded, while turning
  const last = useRef(null);
  const idxRef = useRef(indexOf(value)); idxRef.current = indexOf(value);
  const cb = useRef(onChange); cb.current = onChange;
  const angleAt = (x, y) => (Math.atan2(x - center.current.x, -(y - center.current.y)) * 180) / Math.PI;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true, // (the page scrolls: a finger on the dial turns the dial)
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const { pageX, pageY } = e.nativeEvent;
      acc.current = idxRef.current * STEP;
      last.current = null;
      if (ref.current && ref.current.measure) ref.current.measure((x, y, w, h, px, py) => { center.current = { x: px + w / 2, y: py + h / 2 }; last.current = angleAt(pageX, pageY); });
    },
    onPanResponderMove: (e) => {
      if (last.current == null) return;
      const a = angleAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
      let d = a - last.current; if (d > 180) d -= 360; if (d < -180) d += 360;
      last.current = a;
      acc.current += d;
      const k = ((Math.round(acc.current / STEP) % N) + N) % N; // clicks from place to place, all the way round
      if (k !== idxRef.current) { if (k === 0) thunk(); else tick(); idxRef.current = k; cb.current(STOPS[k]); }
    },
  })).current;
  const k = indexOf(value);
  const deg = k * STEP;
  const dim = size * 0.2, r = size * 0.33;
  const outer = size + 64;
  const label = (v) => (v == null ? t('Off') : v === OLDER ? '12+' : String(v));
  const big = value == null ? t('Off') : value === OLDER ? t('Older') : String(value);
  return (
    <View style={{ width: outer, height: outer, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      {/* the places around the dial */}
      {STOPS.map((v, i) => {
        const a = (i * STEP * Math.PI) / 180, rr = outer / 2 - 14;
        return (
          <Text key={i} pointerEvents="none" style={[styles.num, i === k && styles.numOn, { left: outer / 2 + rr * Math.sin(a) - 20, top: outer / 2 - rr * Math.cos(a) - 9 }]}>{label(v)}</Text>
        );
      })}
      <View ref={ref} collapsable={false} {...pan.panHandlers} accessibilityRole="adjustable" accessibilityLabel={t('How old are you?')} accessibilityValue={{ text: big }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(STOPS[(k + (e.nativeEvent.actionName === 'increment' ? 1 : -1) + N) % N])}
        style={[styles.wheel, { width: size, height: size, borderRadius: size / 2 }]}>
        {/* the dial turns: its one dimple points at the choice */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', transform: [{ rotate: `${deg}deg` }] }}>
          <View style={[styles.dimple, { marginTop: size / 2 - r - dim / 2, width: dim, height: dim, borderRadius: dim / 2, transform: [{ rotate: `${-deg}deg` }] }]} />
        </View>
        <Text pointerEvents="none" style={styles.big}>{big}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // the same soft, lit-from-the-top-left dial as the alarm's, in the box's light grey
  wheel: { backgroundColor: BASE, alignItems: 'center', justifyContent: 'center', boxShadow: '-8px -8px 18px rgba(255,255,255,0.75), 10px 10px 22px rgba(0,0,0,0.22), inset 2px 2px 3px rgba(255,255,255,0.6), inset -3px -3px 5px rgba(0,0,0,0.08)' },
  dimple: { backgroundColor: '#cfcfcf', boxShadow: 'inset 5px 5px 8px rgba(0,0,0,0.24), inset -3px -3px 6px rgba(255,255,255,0.85)' },
  big: { color: '#555555', fontFamily: fonts.uiMedium, fontSize: 17, letterSpacing: 0.8, userSelect: 'none' }, // like the alarm wheel's time, in dark grey (Jörg, 2 Nov 2026)
  num: { position: 'absolute', userSelect: 'none', width: 40, textAlign: 'center', color: 'rgba(40,40,40,0.5)', fontFamily: fonts.uiMedium, fontSize: 13 },
  numOn: { color: '#1f1f1f', fontFamily: fonts.uiBold },
});
