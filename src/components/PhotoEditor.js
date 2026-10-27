// Edit photo (Jörg, 26 Oct 2026): what picture-book makers offer, kept simple.
//   Crop:   drag the photo to move it, pinch (or − / +) to zoom; turn it a quarter, or flip it
//   Layout: full page, the whole photo, a white border, or a circle, on a page colour of your choice
//   Look:   original, black & white, sepia, warm, cool
// Everything shows live in the square. Done makes the page picture; the original photo is kept, so it can be
// edited again any time without losing anything.
import React, { useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../theme';
import { DeskFelt } from '../look';
import { PhotoPreview, composePhoto } from './PhotoCanvas';
import { DEFAULT_EDIT, LAYOUTS, LOOKS, PAGE_COLORS, frameOf } from './photoLayout';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function PhotoEditor({ src, edit: given, tr, insets, onDone, onCancel }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const [e, setE] = useState({ ...DEFAULT_EDIT, ...(given || {}) });
  const [tab, setTab] = useState('crop');
  const [busy, setBusy] = useState(false);
  const wide = winW > winH;
  const S = Math.floor(Math.min(winW - insets.left - insets.right - 40, (wide ? winH - insets.top - insets.bottom - 40 : winH * 0.48)));
  const set = (patch) => setE((x) => ({ ...x, ...patch }));
  // drag to move, pinch to zoom (the photo can't be moved so far that the frame shows an empty edge… roughly)
  const g = useRef({});
  const eRef = useRef(e); eRef.current = e;
  const dist = (t) => (t.length > 1 ? Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) : 0);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false, // (the page doesn't scroll while the photo is being moved)
    onPanResponderGrant: (ev) => { const t = ev.nativeEvent.touches; g.current = { ox: eRef.current.ox, oy: eRef.current.oy, zoom: eRef.current.zoom, d0: dist(t), x0: null, y0: null }; },
    onPanResponderMove: (ev, gs) => {
      const t = ev.nativeEvent.touches;
      const F = frameOf(eRef.current.layout, S);
      if (t.length > 1) {
        if (!g.current.d0) { g.current.d0 = dist(t); g.current.zoom = eRef.current.zoom; return; }
        setE((x) => ({ ...x, zoom: clamp(g.current.zoom * dist(t) / g.current.d0, 0.5, 5) }));
      } else {
        g.current.d0 = 0;
        setE((x) => ({ ...x, ox: clamp(g.current.ox + gs.dx / F.w, -1.5, 1.5), oy: clamp(g.current.oy + gs.dy / F.h, -1.5, 1.5) }));
      }
    },
  })).current;
  const done = async () => {
    if (busy) return;
    setBusy(true);
    let out = null;
    try { out = await composePhoto(src.uri, e); } catch (er) {}
    setBusy(false);
    onDone(out, e);
  };
  const Chip = ({ on, label, onPress }) => (
    <Pressable onPress={onPress} style={[styles.chip, on && { backgroundColor: colors.green }]} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
      <Text numberOfLines={1} style={styles.chipText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 90, backgroundColor: colors.desk }]}>
      <DeskFelt spot="photo-editor" overlay />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: 20, alignItems: 'center', gap: 14, ...(wide ? { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' } : null) }}>
        <View style={{ gap: 10 }}>
          <Text style={styles.head}>{tr('Edit photo')}</Text>
          <View {...pan.panHandlers} style={styles.shadow}>
            <PhotoPreview uri={src.uri} edit={e} size={S} />
          </View>
          <Text style={styles.hint}>{tr('Drag to move. Pinch to zoom.')}</Text>
        </View>
        <View style={[styles.box, { width: wide ? Math.min(380, winW - S - 80) : S }]}>
          {/* the three kinds of tools */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[['crop', tr('Crop')], ['layout', tr('Layout')], ['look', tr('Look')]].map(([k, l]) => <Chip key={k} on={tab === k} label={l} onPress={() => setTab(k)} />)}
          </View>
          <View style={styles.rule} />
          {tab === 'crop' ? (
            <View style={styles.row}>
              <Chip label={'−'} onPress={() => set({ zoom: clamp(e.zoom / 1.15, 0.5, 5) })} />
              <Chip label={'+'} onPress={() => set({ zoom: clamp(e.zoom * 1.15, 0.5, 5) })} />
              <Chip label={tr('Turn')} onPress={() => set({ rot: ((e.rot || 0) + 90) % 360 })} />
              <Chip on={e.flip} label={tr('Flip')} onPress={() => set({ flip: !e.flip })} />
              <Chip label={tr('Reset')} onPress={() => set({ zoom: 1, ox: 0, oy: 0, rot: 0, flip: false })} />
            </View>
          ) : null}
          {tab === 'layout' ? (
            <>
              <View style={styles.row}>
                {LAYOUTS.map(([k, l]) => <Chip key={k} on={e.layout === k} label={tr(l)} onPress={() => set({ layout: k, zoom: 1, ox: 0, oy: 0 })} />)}
              </View>
              {e.layout !== 'fill' ? (
                <>
                  <Text style={styles.label}>{tr('Page colour')}</Text>
                  <View style={styles.row}>
                    {PAGE_COLORS.map((c) => (
                      <Pressable key={c} onPress={() => set({ bg: c })} accessibilityLabel={c} style={[styles.swatch, { backgroundColor: c }, e.bg === c && styles.swatchOn]} />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
          {tab === 'look' ? (
            <View style={styles.row}>
              {Object.entries(LOOKS).map(([k, L]) => <Chip key={k} on={e.look === k} label={tr(L.label)} onPress={() => set({ look: k })} />)}
            </View>
          ) : null}
          <View style={[styles.row, { justifyContent: 'flex-end', marginTop: 14 }]}>
            <Pressable onPress={onCancel} style={[styles.pill, { backgroundColor: '#4a4a4a' }]} accessibilityRole="button"><Text style={styles.pillText}>{tr('Cancel')}</Text></Pressable>
            <Pressable onPress={done} disabled={busy} style={[styles.pill, { backgroundColor: colors.green, opacity: busy ? 0.6 : 1 }]} accessibilityRole="button"><Text style={styles.pillText}>{tr('Done')}</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 22 },
  hint: { color: '#bdbdbd', fontFamily: fonts.ui, fontSize: 13 },
  shadow: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 2, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  box: { backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 18, padding: 12, gap: 10 },
  rule: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  label: { color: '#bdbdbd', fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 4 },
  chip: { minWidth: 40, height: 34, borderRadius: 17, paddingHorizontal: 12, backgroundColor: '#4a4a4a', alignItems: 'center', justifyContent: 'center' },
  chipText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 13 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  swatchOn: { borderColor: colors.white, borderWidth: 3, transform: [{ scale: 1.12 }] },
  pill: { height: 40, borderRadius: 20, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
});
