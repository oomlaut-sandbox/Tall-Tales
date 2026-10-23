// The trim editor: a solid dark grey box in the middle of the screen with a simple white picture of the
// recording's sound, and a white line at each end to slide in. Play / Pause plays just the part between the
// lines; Save keeps those points (the file itself stays whole, so it can always be untrimmed).
import React, { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { playVoice, stopVoice } from '../voice';

const BARS = 64; // how many bars the picture of the sound is drawn with
const MIN_GAP = 0.06; // the lines never come closer than this (a fraction of the recording)

// the loudness samples squeezed (or stretched) into BARS bars; a gentle even shape when there are none
function barsFor(levels) {
  if (!levels || levels.length < 4) return Array.from({ length: BARS }, (_, i) => 0.22 + 0.06 * Math.sin(i * 0.9));
  const out = [];
  for (let i = 0; i < BARS; i++) {
    const a = Math.floor((i * levels.length) / BARS), b = Math.max(a + 1, Math.floor(((i + 1) * levels.length) / BARS));
    let m = 0; for (let k = a; k < b && k < levels.length; k++) m = Math.max(m, levels[k]);
    out.push(Math.max(0.04, m));
  }
  return out;
}

export default function TrimEditor({ rec, title, onCancel, onSave }) {
  const tr = useT();
  const { width: winW } = useWindowDimensions();
  const W = Math.min(winW - 88, 420); // the picture's width
  const H = 150;
  const dur = Math.max(0.5, rec ? rec.seconds : 1);
  const [a, setA] = useState(rec && rec.start ? rec.start / dur : 0);
  const [b, setB] = useState(rec && rec.end ? rec.end / dur : 1);
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState(null); // where the playback is (0..1 of the whole recording)
  const ab = useRef({ a, b }); ab.current = { a, b };
  const bars = useRef(barsFor(rec && rec.levels)).current;
  useEffect(() => () => stopVoice(), []);

  const stop = () => { stopVoice(); setPlaying(false); setHead(null); };
  const drag = (which) => {
    const from = { v: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { stop(); from.v = ab.current[which]; },
      onPanResponderMove: (_, g) => {
        const v = from.v + g.dx / W;
        if (which === 'a') setA(Math.max(0, Math.min(ab.current.b - MIN_GAP, v)));
        else setB(Math.min(1, Math.max(ab.current.a + MIN_GAP, v)));
      },
    });
  };
  const panA = useRef(drag('a')).current;
  const panB = useRef(drag('b')).current;

  const play = () => {
    if (playing) { stop(); return; }
    const s = a * dur, e = b * dur;
    setPlaying(true); setHead(a);
    playVoice(rec.uri, { start: s, end: b < 0.999 ? e : null,
      onProgress: (f) => setHead(a + f * (b - a)),
      onDone: () => { setPlaying(false); setHead(null); },
      onFail: () => { setPlaying(false); setHead(null); } });
  };
  const save = () => { stop(); onSave(a <= 0.001 ? 0 : a * dur, b >= 0.999 ? null : b * dur); };
  const secs = Math.max(0, (b - a) * dur);
  if (!rec) return null;

  const LINE = 3, GRAB = 36;
  return (
    <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => { stop(); onCancel(); }}>
      <View style={styles.back}>
        <View style={styles.box}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.len}>{secs.toFixed(1)} s</Text>
          </View>
          {/* the sound, in white; outside the two lines it fades back */}
          <View style={{ width: W, height: H, marginTop: 34, alignSelf: 'center' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {bars.map((v, i) => {
                const f = (i + 0.5) / BARS, inside = f >= a && f <= b;
                return <View key={i} style={{ width: Math.max(2, W / BARS - 2.5), height: Math.max(3, v * H * 0.9), borderRadius: 2, backgroundColor: '#ffffff', opacity: inside ? 0.95 : 0.22 }} />;
              })}
            </View>
            {/* where it's playing */}
            {head != null ? <View pointerEvents="none" style={{ position: 'absolute', top: 6, bottom: 6, left: head * W - 0.75, width: 1.5, backgroundColor: colors.green }} /> : null}
            {/* the two lines: drag them in from either end */}
            <View {...panA.panHandlers} hitSlop={{ left: 10, right: 10 }} style={{ position: 'absolute', top: -10, bottom: -10, left: a * W - GRAB / 2, width: GRAB, alignItems: 'center' }}
              accessibilityRole="adjustable" accessibilityLabel={tr('Start of the recording')}>
              <View style={{ flex: 1, width: LINE, borderRadius: 2, backgroundColor: '#ffffff' }} />
              <View style={styles.knob} />
            </View>
            <View {...panB.panHandlers} hitSlop={{ left: 10, right: 10 }} style={{ position: 'absolute', top: -10, bottom: -10, left: b * W - GRAB / 2, width: GRAB, alignItems: 'center' }}
              accessibilityRole="adjustable" accessibilityLabel={tr('End of the recording')}>
              <View style={{ flex: 1, width: LINE, borderRadius: 2, backgroundColor: '#ffffff' }} />
              <View style={styles.knob} />
            </View>
          </View>
          {/* below: play / pause on the left; Cancel and Save on the right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 44 }}>
            <Pressable onPress={withTap(play)} hitSlop={10} accessibilityRole="button" accessibilityLabel={playing ? tr('Pause') : tr('Play')} style={styles.playBtn}>
              {playing ? (
                <View style={{ flexDirection: 'row', gap: 5 }}><View style={styles.bar} /><View style={styles.bar} /></View>
              ) : (
                <View style={{ marginLeft: 4, width: 0, height: 0, borderLeftWidth: 16, borderTopWidth: 10, borderBottomWidth: 10, borderLeftColor: '#ffffff', borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
              )}
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={withTap(() => { stop(); onCancel(); })} style={[styles.pill, { backgroundColor: '#4a4a4a' }]} accessibilityRole="button"><Text style={styles.pillText}>{tr('Cancel')}</Text></Pressable>
            <Pressable onPress={withTap(save)} style={[styles.pill, { backgroundColor: colors.green, marginLeft: 10 }]} accessibilityRole="button"><Text style={styles.pillText}>{tr('Save')}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  box: { backgroundColor: '#2b2b2d', borderRadius: 28, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 20 },
  len: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.ui, fontSize: 13, fontVariant: ['tabular-nums'] },
  knob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ffffff', marginTop: -2 },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3d3d40', alignItems: 'center', justifyContent: 'center' },
  bar: { width: 5, height: 18, borderRadius: 1, backgroundColor: '#ffffff' },
  pill: { height: 46, borderRadius: 23, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
});
