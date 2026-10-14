// My Library and Book Store.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Bar, BarMeta, Burger, Panel, WithBar } from '../components/Chrome';
import { accessLabel, bundledStory, cachedCatalog, coverFor, refreshCatalog, shelvesWithBooks } from '../catalog';
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
      {/* the title block, with the action (Select / Cancel) centred beside the whole block */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: fg, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32 }}>{title}</Text>
          <Text style={{ color: fg, fontFamily: fonts.ui, fontSize: 15, marginTop: 6, opacity: 0.9 }}>{sub}</Text>
        </View>
        {action ? (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 17 }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
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
          {/* Edit: only for a single book you made yourself */}
          <Pressable onPress={() => { const b = chosen[0]; stop(); onEdit(b); }} disabled={!(chosen.length === 1 && chosen[0].mine)} style={[styles.barBtn, !(chosen.length === 1 && chosen[0].mine) && styles.barBtnOff]} accessibilityRole="button">
            <Text style={styles.barBtnText}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm(true)} disabled={!chosen.length} style={[styles.barBtn, !chosen.length && styles.barBtnOff]} accessibilityRole="button">
            <Text style={[styles.barBtnText, { color: '#ff6b6b' }]}>Delete</Text>
          </Pressable>
          {!v ? <Text style={styles.barHint}>{chosen.length > 1 ? 'One book at a time for Share and Edit' : chosen.length === 1 && !chosen[0].mine ? 'Only books you made can be edited' : ''}</Text> : null}
        </Bar>
      ) : (
        <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>
      ))}>
      <Band color={colors.green} title={selecting ? 'Select books' : 'My Library'}
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
      <ParentGate visible={!!gate} reason={gate === 'share' ? 'Sharing sends an invitation to oomlaut Reader by message or email.' : 'Deleting books from the library.'}
        onCancel={() => setGate(null)}
        onPass={() => {
          const g = gate; setGate(null);
          if (g === 'share' && chosen[0]) onShare(chosen[0]);
          if (g === 'delete') { onDelete(chosen); stop(); }
        }} />
    </WithBar>
  );
}

// The Book Store: shelves of books from the catalog you curate in Supabase (see src/catalog.js).
export function Store({ u, openStory, openMenu }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sideways = winW > winH * 1.1;
  const [cat, setCat] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(null); // the book whose details are showing
  const load = async (pull) => {
    if (pull) setRefreshing(true);
    try { const c = await refreshCatalog(); if (c) setCat(c); } catch (e) { /* offline: keep the saved copy */ }
    if (pull) setRefreshing(false);
  };
  useEffect(() => { cachedCatalog().then((c) => setCat((cur) => cur || c)); load(false); }, []);
  const rows = cat ? shelvesWithBooks(cat) : [];
  const featured = cat ? cat.books.find((b) => b.featured) : null;
  const tileW = Math.min(170, Math.max(120, winW * 0.36));
  const read = (b) => { const st = bundledStory(b.id); if (st) { setOpen(null); openStory(st); } };
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <Band color={colors.blue} title="Book Store" sub="Find and buy new stories" />
      <ScrollView contentContainerStyle={{ paddingVertical: 20, gap: 26 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.white} />}>
        {featured ? (
          <Pressable onPress={() => setOpen(featured)} style={styles.feature} accessibilityRole="button" accessibilityLabel={`${featured.title}, featured`}>
            <View style={[styles.tileShadow, { width: tileW * 1.15, aspectRatio: 1 }]}>
              {coverFor(featured) ? <Image source={coverFor(featured)} style={styles.coverImg} resizeMode="cover" /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Text style={styles.kicker}>Featured</Text>
              <Text style={styles.featureTitle}>{featured.title}</Text>
              {featured.author ? <Text style={styles.tileSub}>by {featured.author}</Text> : null}
              <Badge book={featured} />
            </View>
          </Pressable>
        ) : null}
        {rows.map((sh) => (
          <View key={sh.id} style={{ gap: 12 }}>
            <Text style={styles.shelfTitle}>{sh.title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
              {sh.books.map((b) => (
                <Pressable key={b.id} onPress={() => setOpen(b)} style={{ width: tileW, gap: 8 }} accessibilityRole="button" accessibilityLabel={b.title}>
                  <View style={[styles.tileShadow, { width: tileW, height: tileW }]}>
                    {coverFor(b) ? <Image source={coverFor(b)} style={styles.coverImg} resizeMode="cover" /> : null}
                    <View style={styles.badgeAt}><Badge book={b} /></View>
                  </View>
                  <Text numberOfLines={2} style={styles.tileTitle}>{b.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
      <Panel open={!!open} side="right" title={open ? open.title : ''} bottom={sideways ? 0 : u * 17 + insets.bottom} inset={sideways ? u * 17 + insets.right : 0} onClose={() => setOpen(null)}>
        {open ? (
          <View style={{ gap: 12 }}>
            {open.author ? <Text style={styles.sheetSub}>by {open.author}</Text> : null}
            {open.blurb ? <Text style={styles.sheetText}>{open.blurb}</Text> : null}
            <Text style={styles.sheetSub}>{[open.page_count ? `${open.page_count} pages` : null, open.age_range ? `ages ${open.age_range}` : null, accessLabel(open)].filter(Boolean).join(' · ')}</Text>
            {open.access === 'free' && bundledStory(open.id) ? (
              <Pressable onPress={() => read(open)} style={styles.sheetBtn} accessibilityRole="button"><Text style={styles.sheetBtnText}>Read now</Text></Pressable>
            ) : (
              <Text style={styles.sheetText}>{open.access === 'free' ? 'Downloading new books arrives in the next update.' : 'Memberships and buying single books arrive in the next update.'}</Text>
            )}
          </View>
        ) : null}
      </Panel>
    </WithBar>
  );
}

function Badge({ book }) {
  const free = book.access === 'free';
  return (
    <View style={[styles.badge, free ? { backgroundColor: colors.green } : book.access === 'member' ? { backgroundColor: colors.blue } : { backgroundColor: colors.orange }]}>
      <Text style={[styles.badgeText, book.access === 'paid' && { color: colors.ink }]}>{accessLabel(book)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk }, // same dark grey as reading
  grid: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 22 },
  tileShadow: { backgroundColor: '#828282', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  tileTitle: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 16, color: colors.white },
  tileSub: { fontFamily: fonts.ui, fontSize: 13, color: '#d0d0d0' },
  check: { position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.white, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  checkOn: { backgroundColor: colors.highlight, borderColor: colors.white },
  checkMark: { color: colors.white, fontWeight: '800', fontSize: 16, lineHeight: 18 },
  restore: { fontFamily: fonts.ui, fontSize: 15, color: '#d0d0d0', textDecorationLine: 'underline', textAlign: 'center' },
  confirm: { position: 'absolute', left: 16, right: 16, bottom: 150, backgroundColor: colors.panel, padding: 18, gap: 14, zIndex: 40 },
  confirmText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16, lineHeight: 22 },
  actBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  actText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  barBtn: { paddingVertical: 10, paddingHorizontal: 6 },
  barBtnOff: { opacity: 0.35 },
  barBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 18 },
  barHint: { flex: 1, textAlign: 'right', color: colors.muted, fontFamily: fonts.ui, fontSize: 12 },
  coverImg: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  feature: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingHorizontal: 20 },
  kicker: { color: '#d0d0d0', fontFamily: fonts.ui, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  featureTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 22 },
  shelfTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 19, paddingHorizontal: 20 },
  badgeAt: { position: 'absolute', left: 6, top: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 12 },
  sheetSub: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15 },
  sheetText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16, lineHeight: 23 },
  sheetBtn: { backgroundColor: colors.green, paddingVertical: 14, alignItems: 'center' },
  sheetBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  note: { width: '100%', backgroundColor: '#4a4a4a', padding: 16, fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.white },
});
