// My Library and Book Store.
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Bar, BarMeta, Burger, WithBar } from '../components/Chrome';
import ParentGate from '../components/ParentGate';
import { STORIES } from '../story';

// Two covers across on a phone; more on an iPad.
const COLS = (w) => (w >= 900 ? 4 : w >= 600 ? 3 : 2);
const TILE = { 2: 47, 3: 31, 4: 22.5 };
const tileWidth = (w) => `${TILE[COLS(w)]}%`;
const gridGap = (w) => { const n = COLS(w); return `${(100 - n * TILE[n]) / (n - 1)}%`; };

function Tile({ u, cover, title, sub, onPress, onLongPress, plus, selecting, selected }) {
  const { width: winW } = useWindowDimensions();
  const ear = u * 3;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width: tileWidth(winW), gap: 8 }} accessibilityRole="button">
      {/* a very subtle drop shadow under the square cover */}
      <View style={styles.tileShadow}>
      <View style={{ aspectRatio: 1, backgroundColor: '#828282', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {cover ? <Image source={cover} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" /> : null}
        {plus ? <Text style={{ color: colors.white, fontSize: 64, fontWeight: '300' }}>+</Text> : null}
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderLeftWidth: ear, borderBottomWidth: ear, borderLeftColor: 'transparent', borderBottomColor: colors.earUnder }} />
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderRightWidth: ear, borderTopWidth: ear, borderRightColor: 'transparent', borderTopColor: colors.white }} />
        {selecting ? (
          <View style={[styles.check, selected && styles.checkOn]} accessibilityLabel={selected ? 'Selected' : 'Not selected'}>
            {selected ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
        ) : null}
      </View>
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </Pressable>
  );
}

function Band({ color, dark, title, sub, action, onAction }) {
  const insets = useSafeAreaInsets();
  const fg = dark ? colors.ink : colors.white;
  return (
    <View style={{ backgroundColor: color, paddingTop: insets.top + 40, paddingBottom: 22, paddingHorizontal: 24 }}>
      {/* the title, with the action (Select / Done) on the same line at the right */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, color: fg, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32 }}>{title}</Text>
        {action ? (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 17 }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ color: fg, fontFamily: fonts.ui, fontSize: 15, marginTop: 6, opacity: 0.9 }}>{sub}</Text>
    </View>
  );
}

// Select mode: tap books to pick them, then Share (one book, as a PDF) or Delete.
// Your own stories are deleted for good; the built-in books are only removed from the shelf
// and can be brought back with "Show removed books".
export function Library({ u, stories, openStory, openMenu, onCreate, onEdit, onShare, onDelete, removedCount, onRestore }) {
  const { width: winW } = useWindowDimensions();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [gate, setGate] = useState(null); // 'share' | 'delete'
  const chosen = stories.filter((s) => picked.includes(s.id));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const stop = () => { setSelecting(false); setPicked([]); setConfirm(false); };
  const mineCount = chosen.filter((s) => s.mine).length;
  return (
    <WithBar style={styles.screen} bar={(v) => (selecting ? (
        <Bar u={u} vertical={v}>
          <Pressable onPress={() => setGate('share')} disabled={chosen.length !== 1} style={[styles.barBtn, chosen.length !== 1 && styles.barBtnOff]} accessibilityRole="button">
            <Text style={styles.barBtnText}>Share</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm(true)} disabled={!chosen.length} style={[styles.barBtn, !chosen.length && styles.barBtnOff]} accessibilityRole="button">
            <Text style={[styles.barBtnText, { color: '#ff6b6b' }]}>Delete</Text>
          </Pressable>
          {!v ? <Text style={styles.barHint}>{chosen.length > 1 ? 'Share one book at a time' : ''}</Text> : null}
        </Bar>
      ) : (
        <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>
      ))}>
      <Band color={colors.orange} title={selecting ? 'Select books' : 'My Library'}
        sub={selecting ? (picked.length ? `${picked.length} selected` : 'Tap books to select them') : 'Your stories, ready to read'}
        action={selecting ? 'Cancel' : 'Select'} onAction={selecting ? stop : () => setSelecting(true)} />
      <ScrollView contentContainerStyle={[styles.grid, { columnGap: gridGap(winW) }]}>
        {stories.map((s) => (
          <Tile key={s.id} u={u} cover={s.pages[0] && s.pages[0].image} title={s.title}
            selecting={selecting} selected={picked.includes(s.id)}
            sub={s.mine ? `${s.pages.length} page${s.pages.length === 1 ? '' : 's'} · made by you${selecting ? '' : ' · hold to edit'}` : `${s.author ? `by ${s.author} · ` : ''}${s.pages.length} pages · read-along`}
            onPress={() => (selecting ? toggle(s.id) : openStory(s))}
            onLongPress={!selecting && s.mine ? () => onEdit(s) : undefined} />
        ))}
        {!selecting ? <Tile u={u} plus title="Create a story" sub="Add pictures and words" onPress={onCreate} /> : null}
        {!selecting && removedCount ? (
          <Pressable onPress={onRestore} style={{ width: '100%', paddingVertical: 8 }} accessibilityRole="button">
            <Text style={styles.restore}>Show removed books ({removedCount})</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {confirm ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>
            {`Delete ${chosen.length === 1 ? `“${chosen[0].title}”` : `${chosen.length} books`}?`}
            {mineCount ? ' Stories you made, with their pictures and recordings, are deleted for good.' : ''}
            {chosen.length > mineCount ? ' Built-in books can be brought back later.' : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => setGate('delete')} style={[styles.actBtn, { backgroundColor: colors.highlight }]}><Text style={styles.actText}>Delete</Text></Pressable>
            <Pressable onPress={() => setConfirm(false)} style={[styles.actBtn, { backgroundColor: '#333' }]}><Text style={styles.actText}>Keep</Text></Pressable>
          </View>
        </View>
      ) : null}
      <ParentGate visible={!!gate} reason={gate === 'share' ? 'Sharing sends this book outside the app as a PDF.' : 'Deleting books from the library.'}
        onCancel={() => setGate(null)}
        onPass={() => {
          const g = gate; setGate(null);
          if (g === 'share' && chosen[0]) onShare(chosen[0]);
          if (g === 'delete') { onDelete(chosen); stop(); }
        }} />
    </WithBar>
  );
}

export function Store({ u, openStory, openMenu }) {
  const { width: winW } = useWindowDimensions();
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <Band color={colors.blue} title="Book Store" sub="Find and buy new stories" />
      <ScrollView contentContainerStyle={[styles.grid, { columnGap: gridGap(winW) }]}>
        <Text style={styles.note}>Buying and downloading stories arrives in a later build. For now, the sample story is free to read.</Text>
        {STORIES.map((s) => (
          <Tile key={s.id} u={u} cover={s.pages[0].image} title={s.title} sub={s.author ? `by ${s.author} · in your library` : 'Free sample · in your library'} onPress={() => openStory(s)} />
        ))}
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  grid: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 22 },
  tileShadow: { backgroundColor: '#828282', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 4, elevation: 2 },
  tileTitle: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 16, color: colors.ink },
  tileSub: { fontFamily: fonts.ui, fontSize: 13, color: '#444' },
  check: { position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.white, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  checkOn: { backgroundColor: colors.highlight, borderColor: colors.white },
  checkMark: { color: colors.white, fontWeight: '800', fontSize: 16, lineHeight: 18 },
  restore: { fontFamily: fonts.ui, fontSize: 15, color: '#333', textDecorationLine: 'underline', textAlign: 'center' },
  confirm: { position: 'absolute', left: 16, right: 16, bottom: 150, backgroundColor: colors.panel, padding: 18, gap: 14, zIndex: 40 },
  confirmText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16, lineHeight: 22 },
  actBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  actText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  barBtn: { paddingVertical: 10, paddingHorizontal: 6 },
  barBtnOff: { opacity: 0.35 },
  barBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 18 },
  barHint: { flex: 1, textAlign: 'right', color: colors.muted, fontFamily: fonts.ui, fontSize: 12 },
  note: { width: '100%', backgroundColor: '#bdbdbd', padding: 16, fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.ink },
});
