// Playlists (main menu): line books up to be read one after another, in order or shuffled. Play reads
// them all by themselves (Auto Play), one book after the next. Each child has their own playlists;
// "Bedtime" is there from the start.
import { TitleIcon } from '../titleIcons';
import { useScrollMemory } from '../nav';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, LayoutAnimation, Platform, Pressable, ScrollView, UIManager, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, DESK_BG, IS_TABLET, BandFill } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { useT } from '../i18n';
import { loadPlaylists, newPlaylist, savePlaylists } from '../playlists';
import { sharePlaylist } from '../invite';
import { useControls } from '../controls';

export const coverOf = (s) => (s && s.cover && s.cover.uri ? { uri: s.cover.uri } : s && s.pages && s.pages[0] ? s.pages[0].image : null);

function Thumb({ s, size }) {
  const c = coverOf(s);
  return (
    <View style={{ width: size, height: size, backgroundColor: '#828282', overflow: 'hidden' }}>
      {c ? <Image source={c} style={{ width: size, height: size }} resizeMode="cover" /> : null}
    </View>
  );
}

const TAPE = require('../../assets/playlist-tape.png');
// the two reels, cut from the cassette picture (same size and place), turning slowly like a tape playing
const REEL_L = require('../../assets/playlist-reel-l.png');
const REEL_R = require('../../assets/playlist-reel-r.png');
const REELS = [[REEL_L, 296.2, 320.6], [REEL_R, 621.0, 320.5]]; // centres in the 920 × 675 picture
const REEL_R0 = 39; // their radius there

function Cassette({ width }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  const k = width / 920, h = width * 675 / 920;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ width, height: h, alignSelf: 'center', marginBottom: 6 }}>
      <Image source={TAPE} style={{ width, height: h }} resizeMode="contain" accessibilityIgnoresInvertColors />
      {REELS.map(([src, cx, cy], i) => (
        <Animated.Image key={i} source={src} resizeMode="stretch"
          style={{ position: 'absolute', left: (cx - REEL_R0) * k, top: (cy - REEL_R0) * k, width: 2 * REEL_R0 * k, height: 2 * REEL_R0 * k, transform: [{ rotate }] }} />
      ))}
    </View>
  );
}
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
const BAND_FELT = require('../../assets/band-playlists.png'); // Jörg's brown felt banner
const BAND_COLOR = '#7a5534'; // its colour (iPad, and the status bar strip)
const ENVELOPE = require('../../assets/icon-envelope.png'); // share

export default function Playlists({ onDone, u, openMenu, shelf, onPlay }) {
  const keep = useScrollMemory('playlists'); // Back returns to this spot
  const { width: winW } = useWindowDimensions();
  const tapeW = Math.round(Math.min(520, winW - 48) * 0.575); // the cassette itself is about half the column (the rest is its shadow)
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
    // the book slides up or down and the others make room
    LayoutAnimation.configureNext(LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    [b[k], b[j]] = [b[j], b[k]]; set(pl.id, { books: b });
  };
  const controls = useControls();
  const nameOf = (pl) => (pl.id === 'bedtime' && pl.name === 'Bedtime' ? t('Bedtime') : pl.name);
  if (!lists) return <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}><View /></WithBar>;
  const pl = edit ? lists.find((p) => p.id === edit) : null;
  const books = (p) => p.books.map(byId).filter(Boolean); // only books still on this child's shelf

  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }, { backgroundColor: 'transparent' }]}>
        {/* Jörg's brown felt banner (phone); its soft bottom edge shows the desk, so the colour only fills the status bar strip */}
        {true ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 2, backgroundColor: BAND_COLOR }} /> : null}
        {true ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: IS_TABLET ? 0 : insets.top, bottom: 0, overflow: 'hidden' }}><BandFill source={BAND_FELT} /></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><TitleIcon kind="playlists" /><Text style={[styles.title, { flexShrink: 1 }]}>{t('Playlists')}</Text></View>
      </View>
      <ScrollView {...keep} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.col}>
          {(
            <>
              {/* Jörg's felt cassette, centred, about half the column wide (its soft shadow is part of the picture) */}
              <Cassette width={tapeW} />{/* its two reels turn */}
              {lists.map((p) => {
                const bs = books(p);
                return (
                  <View key={p.id} style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={styles.cardTitle}>{nameOf(p)}</Text>
                        <Text style={styles.small}>{bs.length === 1 ? t('1 book') : t('{n} books', { n: bs.length })}{p.shuffle ? ` · ${t('Shuffle')}` : ''}{p.listen ? ` · ${t('Listen Only Mode')}` : ''}{p.loop ? ` · ${t('Loop')}` : ''}</Text>
                      </View>
                      <Pressable onPress={() => { setEdit(p.id); setAdding(false); }} hitSlop={8} accessibilityRole="button"><View style={styles.editTab}><Text style={styles.editTabText}>{t('Edit')}</Text></View></Pressable>
                    </View>
                    {bs.length ? (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {bs.slice(0, 6).map((s) => <Thumb key={s.id} s={s} size={44} />)}
                        {bs.length > 6 ? <Text style={[styles.small, { alignSelf: 'center' }]}>+{bs.length - 6}</Text> : null}
                      </View>
                    ) : null}
                    {/* Play on its own line, then how it plays */}
                    <Pressable disabled={!bs.length} onPress={() => onPlay(p)} style={[styles.pill, { backgroundColor: colors.green }, !bs.length && { opacity: 0.4 }]} accessibilityRole="button">
                      <Text style={styles.pillText}>{t('Play')}</Text>
                    </Pressable>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Pressable onPress={() => set(p.id, { listen: !p.listen })} style={[styles.chip, p.listen && styles.chipOn]} accessibilityRole="switch" accessibilityState={{ checked: !!p.listen }}>
                        <Text style={[styles.chipText, p.listen && { color: colors.white }]}>{t('Listen Only Mode')}</Text>
                      </Pressable>
                      <Pressable onPress={() => set(p.id, { shuffle: !p.shuffle })} style={[styles.chip, p.shuffle && styles.chipOn]} accessibilityRole="switch" accessibilityState={{ checked: !!p.shuffle }}>
                        <Text style={[styles.chipText, p.shuffle && { color: colors.white }]}>{t('Shuffle')}</Text>
                      </Pressable>
                      {/* Loop: after the last book it starts again from the first */}
                      <Pressable onPress={() => set(p.id, { loop: !p.loop })} style={[styles.chip, p.loop && styles.chipOn]} accessibilityRole="switch" accessibilityState={{ checked: !!p.loop }}>
                        <Text style={[styles.chipText, p.loop && { color: colors.white }]}>{t('Loop')}</Text>
                      </Pressable>
                    </View>
                    {/* Share: a small envelope in the card's bottom right corner (the playlist's name and books, with the app link) */}
                    {controls.sharing !== false && bs.length ? (
                      <View style={{ alignItems: 'flex-end', marginTop: -4 }}>
                        <Pressable onPress={() => sharePlaylist(nameOf(p), bs.map((b) => b.title), t)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Share playlist')}>
                          <Image source={ENVELOPE} style={{ width: 24, height: 24, tintColor: colors.white }} resizeMode="contain" />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              <Pressable onPress={() => { const n = newPlaylist(t('My playlist')); setLists((l) => [...l, n]); setEdit(n.id); setAdding(true); }} style={[styles.pill, { backgroundColor: '#3a3a3a', alignSelf: 'flex-end', marginTop: 14 }]} accessibilityRole="button">{/* on the right, with room above */}
                <Text style={styles.pillText}>+  {t('New playlist')}</Text>
              </Pressable>
              {/* Done: under New playlist, back to My Library */}
              <Pressable onPress={() => onDone && onDone()} style={[styles.pill, { backgroundColor: colors.green, alignSelf: 'flex-end' }]} accessibilityRole="button">
                <Text style={styles.pillText}>{t('Done')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
      {/* changing a playlist: a large grey box pops up over the page (the bar stays below it) */}
      {pl ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>{/* above the banner */}
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={() => (adding ? setAdding(false) : setEdit(null))} accessible={false} />
          <View pointerEvents="box-none" style={{ flex: 1, paddingTop: insets.top + 24, paddingBottom: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}>
            <View style={styles.sheet}>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>{t('Edit playlist')}</Text>
            <>
              <TextInput allowFontScaling={false} value={pl.name} onChangeText={(name) => set(pl.id, { name })} style={styles.input} maxLength={30} accessibilityLabel={t('Playlist name')} placeholder={t('Playlist name')} placeholderTextColor="#888" />
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
                  <Pressable onPress={() => setAdding(false)} style={[styles.pill, { backgroundColor: colors.green, marginTop: 14 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Done')}</Text></Pressable>{/* room above it */}
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
                    <Pressable onPress={() => setEdit(null)} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Save')}</Text></Pressable>
                  </View>
                  <Pressable onPress={() => { setLists((l) => l.filter((p) => p.id !== pl.id)); setEdit(null); }} accessibilityRole="button"
                    style={{ alignSelf: 'flex-start', backgroundColor: colors.deepRed, height: 44, borderRadius: 22, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                    <Text style={{ color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 }}>{t('Delete this playlist')}</Text>
                  </Pressable>
                </>
              )}
            </>
              </ScrollView>
            </View>
          </View>
        </View>
      ) : null}
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  band: { backgroundColor: BAND_COLOR, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  sheetTitle: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 20 },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '100%', backgroundColor: '#2b2b2d', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }, // the edit box
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 24, paddingBottom: 140, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 14 },
  p: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#e6e6e6' },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: '#bdbdbd' },
  editTab: { backgroundColor: '#e8a317', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 }, // an orangey yellow tab
  editTabText: { fontFamily: fonts.uiBold, fontSize: 15, color: '#1a1a1a' },
  donePill: { backgroundColor: colors.green, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, overflow: 'hidden' },
  donePillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15, paddingHorizontal: 3 },
  link: { fontFamily: fonts.ui, fontSize: 15, color: colors.white, textDecorationLine: 'underline' },
  card: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: 16, gap: 12 },
  cardTitle: { fontFamily: fonts.uiBold, fontSize: 18, color: colors.white },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.blue },
  chipText: { fontFamily: fonts.uiSemiBold, fontSize: 13, color: '#dcdcdc' },
  input: { height: 48, borderRadius: 10, backgroundColor: '#d6d6d6', paddingHorizontal: 14, paddingVertical: 0, includeFontPadding: false, fontFamily: fonts.ui, fontSize: 20, color: '#222' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  bookName: { fontFamily: fonts.ui, fontSize: 13, color: colors.white },
  tick: { position: 'absolute', right: 4, top: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  tickText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#3a3a3a', borderRadius: 10, padding: 8 },
  num: { width: 18, textAlign: 'center', fontFamily: fonts.uiBold, color: '#bdbdbd' },
  pbtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  pbtnText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
});
