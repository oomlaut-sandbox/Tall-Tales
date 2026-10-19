// Playlists (main menu): line books up to be read one after another, in order or shuffled. Play reads
// them all by themselves (Auto Play), one book after the next. Each child has their own playlists;
// "Bedtime" is there from the start.
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, DESK_BG, IS_TABLET } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { useT } from '../i18n';
import { loadPlaylists, newPlaylist, savePlaylists } from '../playlists';

export const coverOf = (s) => (s && s.cover && s.cover.uri ? { uri: s.cover.uri } : s && s.pages && s.pages[0] ? s.pages[0].image : null);

function Thumb({ s, size }) {
  const c = coverOf(s);
  return (
    <View style={{ width: size, height: size, backgroundColor: '#828282', overflow: 'hidden' }}>
      {c ? <Image source={c} style={{ width: size, height: size }} resizeMode="cover" /> : null}
    </View>
  );
}

export default function Playlists({ u, openMenu, shelf, onPlay }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState(null);
  useEffect(() => { loadPlaylists().then(setLists); }, []);
  const loaded = useRef(false);
  useEffect(() => { if (lists && loaded.current) savePlaylists(lists); if (lists) loaded.current = true; }, [lists]);
  const [edit, setEdit] = useState(null); // the playlist being changed (its id)
  const [adding, setAdding] = useState(false); // choosing books to add
  const byId = (id) => shelf.find((s) => s.id === id);
  const set = (id, patch) => setLists((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const move = (pl, k, d) => {
    const b = [...pl.books]; const j = k + d;
    if (j < 0 || j >= b.length) return;
    [b[k], b[j]] = [b[j], b[k]]; set(pl.id, { books: b });
  };
  const nameOf = (pl) => (pl.id === 'bedtime' && pl.name === 'Bedtime' ? t('Bedtime') : pl.name);
  if (!lists) return <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}><View /></WithBar>;
  const pl = edit ? lists.find((p) => p.id === edit) : null;
  const books = (p) => p.books.map(byId).filter(Boolean); // only books still on this child's shelf

  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        <Text style={styles.title}>{pl ? nameOf(pl) : t('Playlists')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.col}>
          {!pl ? (
            <>
              <Text style={styles.p}>{t('Line up books to be read one after another, in order or shuffled.')}</Text>
              {lists.map((p) => {
                const bs = books(p);
                return (
                  <View key={p.id} style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={styles.cardTitle}>{nameOf(p)}</Text>
                        <Text style={styles.small}>{bs.length === 1 ? t('1 book') : t('{n} books', { n: bs.length })}{p.shuffle ? ` · ${t('Shuffle')}` : ''}{p.listen ? ` · ${t('Listen only')}` : ''}</Text>
                      </View>
                      <Pressable onPress={() => { setEdit(p.id); setAdding(false); }} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>{t('Change')}</Text></Pressable>
                    </View>
                    {bs.length ? (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {bs.slice(0, 6).map((s) => <Thumb key={s.id} s={s} size={44} />)}
                        {bs.length > 6 ? <Text style={[styles.small, { alignSelf: 'center' }]}>+{bs.length - 6}</Text> : null}
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Pressable disabled={!bs.length} onPress={() => onPlay(p)} style={[styles.pill, { backgroundColor: colors.green }, !bs.length && { opacity: 0.4 }]} accessibilityRole="button">
                        <Text style={styles.pillText}>▶  {t('Play')}</Text>
                      </Pressable>
                      <Pressable onPress={() => set(p.id, { listen: !p.listen })} style={[styles.chip, p.listen && styles.chipOn]} accessibilityRole="switch" accessibilityState={{ checked: !!p.listen }}>
                        <Text style={[styles.chipText, p.listen && { color: colors.white }]}>{t('Listen only')}</Text>
                      </Pressable>
                      <Pressable onPress={() => set(p.id, { shuffle: !p.shuffle })} style={[styles.chip, p.shuffle && styles.chipOn]} accessibilityRole="switch" accessibilityState={{ checked: !!p.shuffle }}>
                        <Text style={[styles.chipText, p.shuffle && { color: colors.white }]}>{p.shuffle ? t('Shuffle') : t('In order')}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              <Pressable onPress={() => { const n = newPlaylist(t('My playlist')); setLists((l) => [...l, n]); setEdit(n.id); setAdding(true); }} style={[styles.pill, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button">
                <Text style={styles.pillText}>+  {t('New playlist')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput value={pl.name} onChangeText={(name) => set(pl.id, { name })} style={styles.input} maxLength={30} accessibilityLabel={t('Playlist name')} placeholder={t('Playlist name')} placeholderTextColor="#888" />
              {adding ? (
                <>
                  <Text style={styles.p}>{t('Tap books to add them. Tap again to take them out.')}</Text>
                  <View style={styles.grid}>
                    {shelf.map((s) => {
                      const on = pl.books.includes(s.id);
                      return (
                        <Pressable key={s.id} onPress={() => set(pl.id, { books: on ? pl.books.filter((x) => x !== s.id) : [...pl.books, s.id] })}
                          style={{ width: 96, gap: 4 }} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={s.title}>
                          <View>
                            <Thumb s={s} size={96} />
                            {on ? <View style={styles.tick}><Text style={styles.tickText}>{pl.books.indexOf(s.id) + 1}</Text></View> : null}
                          </View>
                          <Text numberOfLines={2} style={styles.bookName}>{s.title}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable onPress={() => setAdding(false)} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Done')}</Text></Pressable>
                </>
              ) : (
                <>
                  {books(pl).length ? books(pl).map((s, k) => (
                    <View key={s.id} style={styles.row}>
                      <Text style={styles.num}>{k + 1}</Text>
                      <Thumb s={s} size={52} />
                      <Text numberOfLines={2} style={[styles.bookName, { flex: 1, fontSize: 15 }]}>{s.title}</Text>
                      <Pressable onPress={() => move(pl, pl.books.indexOf(s.id), -1)} disabled={k === 0} hitSlop={6} style={[styles.pbtn, k === 0 && { opacity: 0.3 }]} accessibilityLabel={t('Move up')}><Text style={styles.pbtnText}>↑</Text></Pressable>
                      <Pressable onPress={() => move(pl, pl.books.indexOf(s.id), 1)} disabled={k === books(pl).length - 1} hitSlop={6} style={[styles.pbtn, k === books(pl).length - 1 && { opacity: 0.3 }]} accessibilityLabel={t('Move down')}><Text style={styles.pbtnText}>↓</Text></Pressable>
                      <Pressable onPress={() => set(pl.id, { books: pl.books.filter((x) => x !== s.id) })} hitSlop={6} style={styles.pbtn} accessibilityLabel={t('Take out')}><Text style={styles.pbtnText}>✕</Text></Pressable>
                    </View>
                  )) : <Text style={styles.small}>{t('No books yet.')}</Text>}
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <Pressable onPress={() => setAdding(true)} style={[styles.pill, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button"><Text style={styles.pillText}>+  {t('Add books')}</Text></Pressable>
                    <Pressable onPress={() => setEdit(null)} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Done')}</Text></Pressable>
                  </View>
                  <Pressable onPress={() => { setLists((l) => l.filter((p) => p.id !== pl.id)); setEdit(null); }} accessibilityRole="button">
                    <Text style={[styles.link, { color: '#ff9a8a' }]}>{t('Delete this playlist')}</Text>
                  </Pressable>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  band: { paddingBottom: 6, paddingHorizontal: 24 }, // just the title, on the felt (no banner)
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 24, paddingBottom: 140, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 14 },
  p: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#e6e6e6' },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: '#bdbdbd' },
  link: { fontFamily: fonts.ui, fontSize: 15, color: colors.white, textDecorationLine: 'underline' },
  card: { backgroundColor: '#3a3a3a', borderRadius: 14, padding: 16, gap: 12 },
  cardTitle: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 18, color: colors.white },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  chip: { paddingHorizontal: 16, height: 44, borderRadius: 22, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: '#6b5b95' },
  chipText: { fontFamily: fonts.ui, fontSize: 15, color: '#dcdcdc', fontWeight: '600' },
  input: { height: 48, borderRadius: 10, backgroundColor: '#d6d6d6', paddingHorizontal: 14, fontFamily: fonts.ui, fontSize: 20, color: '#222' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  bookName: { fontFamily: fonts.ui, fontSize: 13, color: colors.white },
  tick: { position: 'absolute', right: 4, top: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  tickText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#3a3a3a', borderRadius: 10, padding: 8 },
  num: { width: 18, textAlign: 'center', fontFamily: fonts.ui, fontWeight: '700', color: '#bdbdbd' },
  pbtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  pbtnText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16, fontWeight: '700' },
});
