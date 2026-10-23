// Profiles (Start page, top right): one for each child. Each child has their own My Notebook, badges,
// playlists, playback choices and parental controls (with their age, so their shelf only shows their books).
// The books, the membership, parents' recordings, the language and the music are the family's.
// Kids can switch between profiles by tapping (unless a grown-up has turned that off); adding, changing and
// removing a profile is behind the grown-up question.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, DESK_BG } from '../look';
import { Bar, Burger, WithBar, barGeo } from '../components/Chrome';
import ParentGate from '../components/ParentGate';
import { useT } from '../i18n';
import { useControls, DEFAULT_CONTROLS } from '../controls';
import { loadJSONFor, saveJSONFor } from '../storage';
import { MAX_PROFILES, PROFILE_COLORS, addProfile, feltFor, getProfiles, onProfiles, removeProfile, switchProfile, updateProfile } from '../profiles';

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function Choice({ label, on, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.choice, on && styles.choiceOn]}>
      <Text style={[styles.choiceText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

// a felt reading character: the child's own (their name is written underneath), with a soft drop shadow.
// The child reading now (or the colour chosen) is a little bigger.
export function ProfileTile({ p, size, active, grow = 1.3 }) {
  const k = useRef(new Animated.Value(active ? grow : 1)).current;
  useEffect(() => { Animated.spring(k, { toValue: active ? grow : 1, friction: 6, useNativeDriver: true }).start(); }, [active]);
  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ scale: k }] }}>
      {/* the child's felt character (it stands on the bottom of its picture) */}
      <Image source={feltFor(p.color)} style={{ width: size * 1.3, height: size * 1.3 }} resizeMode="contain" />
    </Animated.View>
  );
}

export default function Profiles({ u, openMenu, setControls, onPicked, onBack }) {
  // picking who reads: the selection box glides to the child, then a quick fade to My Library
  const cells = useRef({}); // each child's box, in the grid
  const boxXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [boxSize, setBoxSize] = useState(null);
  const placed = useRef(false);
  const pageFade = useRef(new Animated.Value(1)).current;
  const picking = useRef(false);
  const t = useT();
  const insets = useSafeAreaInsets();
  const controls = useControls();
  const [s, setS] = useState(getProfiles());
  useEffect(() => onProfiles(setS), []);
  const [ages, setAges] = useState({}); // each child's age, from their own parental controls
  useEffect(() => {
    let live = true;
    Promise.all(s.list.map((p) => loadJSONFor(p.id, 'controls', null).then((c) => [p.id, c && c.childAge != null ? c.childAge : null])))
      .then((pairs) => { if (live) setAges(Object.fromEntries(pairs)); });
    return () => { live = false; };
  }, [s]);
  const [gate, setGate] = useState(null); // what waits for the grown-up question: 'add' | 'edit'
  const [editing, setEditing] = useState(false); // tiles open the editor instead of switching
  const [form, setForm] = useState(null); // { id?, name, color, age }
  const [bandH, setBandH] = useState(0);
  // the title's height (worked out, not measured: the edit box's dark layer starts under it)
  const titleH = insets.top + 30 + 40 + 6;
  const [sure, setSure] = useState(false);
  const canSwitch = controls.profiles !== false;
  const { width: winW, height: winH } = useWindowDimensions();
  const side = Math.min(112, Math.floor((Math.min(520, winW - 48) - 32) / 3));

  const openForm = (p) => {
    setSure(false);
    setForm(p ? { id: p.id, name: p.name, color: p.color, age: ages[p.id] ?? null }
      : { name: '', color: PROFILE_COLORS[s.list.length % PROFILE_COLORS.length][0], age: null });
  };
  const saveForm = async () => {
    const f = form;
    if (f.id) {
      updateProfile(f.id, { name: f.name, color: f.color });
      if (f.id === s.active) setControls({ ...controls, childAge: f.age });
      else {
        const c = await loadJSONFor(f.id, 'controls', null);
        await saveJSONFor(f.id, 'controls', { ...DEFAULT_CONTROLS, ...(c || {}), childAge: f.age });
      }
    } else {
      const first = s.list.length === 0;
      await addProfile({ name: f.name, color: f.color, age: f.age });
      if (first) setControls({ ...controls, childAge: f.age }); // the first child keeps the settings already here
    }
    setForm(null);
  };

  // tapping the child already reading: straight back to My Library (the same quick fade)
  const backToLibrary = () => {
    if (picking.current || !onBack) return;
    picking.current = true;
    Animated.timing(pageFade, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => { picking.current = false; onBack(); });
  };
  const pick = (id) => {
    if (picking.current) return;
    const L = cells.current[id];
    picking.current = true;
    // fade the page away first; then switch (the app starts afresh for that child, straight into My Library)
    const go = () => {
      Animated.timing(pageFade, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        picking.current = false;
        if (onPicked) onPicked(id); else { switchProfile(id); pageFade.setValue(1); }
      });
    };
    if (!L || !placed.current) { go(); return; }
    Animated.timing(boxXY, { toValue: { x: L.x, y: L.y }, duration: 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => setTimeout(go, 120));
  };
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]} onLayout={(e) => setBandH(e.nativeEvent.layout.height)}>
        <Text style={styles.title}>{t('Profiles')}</Text>
      </View>
      {form ? null : (
      <Animated.ScrollView style={{ opacity: pageFade }} contentContainerStyle={styles.body}>
        <View style={styles.col}>
          <Text style={styles.p}>{s.list.length
            ? (editing ? t('Tap a child to change their name, character or age.') : t('Who is reading? Tap your name.'))
            : t('Give each child their own notebook, badges, playlists and settings. Their age decides which books they see.')}</Text>
          <View style={styles.grid}>
            {/* the selection box: one box that glides from child to child */}
            {boxSize && s.list.length ? <Animated.View pointerEvents="none" style={[styles.cellOn, { position: 'absolute', left: 0, top: 0, width: boxSize.w, height: boxSize.h, borderRadius: 16, borderWidth: 1, transform: boxXY.getTranslateTransform() }]} /> : null}
            {s.list.map((p) => {
              const on = p.id === s.active;
              return (
                <Pressable key={p.id} disabled={!editing && !canSwitch && !on} onPress={() => (editing ? openForm(p) : on ? backToLibrary() : pick(p.id))}
                  onLayout={(e) => { const L = e.nativeEvent.layout; cells.current[p.id] = L; if (on && !picking.current) { boxXY.setValue({ x: L.x, y: L.y }); setBoxSize({ w: L.width, h: L.height }); placed.current = true; } }}
                  accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ selected: on }} style={[styles.cell, { width: side }]}>
                  {/* the child reading now gets a box around them instead of growing */}
                  <View style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}><ProfileTile p={p} size={Math.round(side * 0.68)} active={on} grow={1} /></View>
                  <Text numberOfLines={1} style={styles.name}>{p.name}</Text>
                  <Text style={styles.age}>{on ? t('Reading now') : ages[p.id] != null ? t('Age {n}', { n: ages[p.id] }) : ' '}</Text>
                </Pressable>
              );
            })}
            {s.list.length < MAX_PROFILES ? (
              <Pressable onPress={() => setGate('add')} style={[styles.cell, { width: side }]} accessibilityRole="button" accessibilityLabel={t('Add a child')}>
                <View style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={[styles.addTile, { width: Math.round(side * 0.68), height: Math.round(side * 0.68), borderRadius: side }]}>{/* round, like the buttons */}
                    {/* a drawn plus (two thin bars), so it sits exactly in the middle of the circle */}
                    <View style={{ position: 'absolute', width: side * 0.2, height: 2, backgroundColor: '#aaa' }} />
                    <View style={{ position: 'absolute', width: 2, height: side * 0.2, backgroundColor: '#aaa' }} />
                  </View>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.name}>{t('Add a child')}</Text>
                <Text style={styles.age}> </Text>
              </Pressable>
            ) : null}
          </View>
          {s.list.length ? (
            <Pressable onPress={() => (editing ? setEditing(false) : setGate('edit'))} style={[styles.pill, { backgroundColor: editing ? colors.green : '#3a3a3a', marginTop: 22 }]} accessibilityRole="button">{/* well clear of the children above */}
              <Text style={styles.pillText}>{editing ? t('Done editing') : t('Edit profiles')}</Text>
            </Pressable>
          ) : null}
          {!canSwitch ? <Text style={styles.small}>{t('A grown-up has turned off switching profiles.')}</Text> : null}
          <Text style={styles.small}>{t('Books, the membership, recordings, the language and the music are shared by the whole family.')}</Text>
        </View>
      </Animated.ScrollView>
      )}

      {form ? (
        // the edit box takes the page's place, in the room between the title and the bar (in the normal flow:
        // nothing is measured or worked out, so it can't land too low or run under the bar)
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">{/* in the middle of the screen above the bar (the bar stays uncovered) */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 44, paddingVertical: 10, paddingLeft: 10 }}>{/* plenty of room all round the character (it's drawn wider than its box) */}
                <ProfileTile p={{ name: form.name || '?', color: form.color }} size={60} />
                <TextInput allowFontScaling={false} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder={t('Name')} placeholderTextColor="#8a8a8a"
                  style={styles.input} maxLength={20} autoCapitalize="words" autoCorrect={false} returnKeyType="done" accessibilityLabel={t('Name')} />
              </View>
              <Text style={[styles.section, { marginTop: 10 }]}>{t('Character')}</Text>
              <View style={[styles.choices, { marginTop: 4, marginBottom: 2, flexWrap: 'nowrap', justifyContent: 'space-between' }]}>{/* all five on one line */}
                {PROFILE_COLORS.map(([c, img]) => (
                  <Pressable key={c} onPress={() => setForm({ ...form, color: c })} accessibilityRole="radio" accessibilityLabel={c} accessibilityState={{ selected: form.color === c }}
                    style={[styles.swatch, form.color === c && styles.swatchOn]}>{/* the chosen one: boxed (like the reading child), not bigger */}
                    <ProfileTile p={{ color: c }} size={40} active={form.color === c} grow={1} />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.section}>{t('Age')}</Text>
              <View style={styles.choices}>
                <Choice label={t('Show every book')} on={form.age == null} onPress={() => setForm({ ...form, age: null })} />
              </View>
              <View style={styles.choices}>
                {AGES.map((a) => <Choice key={a} label={String(a)} on={form.age === a} onPress={() => setForm({ ...form, age: a })} />)}
              </View>
              <Text style={styles.small}>{t('Books rated for older children are hidden.')}</Text>
              {/* Save and (for a profile that exists) a red Delete; Cancel on the same line, on the right */}
              {/* (they shrink to fit, so longer words in other languages never push one out of the box) */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <Pressable onPress={saveForm} style={[styles.pill, styles.pillFit, { backgroundColor: colors.green }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Save')}</Text></Pressable>
                {form.id ? <Pressable onPress={() => setSure(true)} style={[styles.pill, styles.pillFit, { backgroundColor: '#b3261e' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Delete')}</Text></Pressable> : null}
                <Pressable onPress={() => setForm(null)} style={[styles.pill, styles.pillFit, { backgroundColor: '#4a4a4a', marginLeft: 'auto' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Cancel')}</Text></Pressable>
              </View>
              {form.id ? (
                sure ? (
                  // are you sure? a solid black box popping up over everything
                  <Modal transparent animationType="fade" visible onRequestClose={() => setSure(false)}>
                    <View style={styles.sureBack}>
                      <View style={styles.sureBox}>
                        <Text style={styles.sureText}>{t('Remove {name}? Their notebook and badges stay on this phone, but nobody will see them.', { name: form.name || '?' })}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 26 }}>
                          <Pressable onPress={() => { setSure(false); removeProfile(form.id); setForm(null); }} style={[styles.pill, styles.pillFit, { backgroundColor: '#b3261e', marginLeft: 'auto' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Remove')}</Text></Pressable>
                          <Pressable onPress={() => setSure(false)} style={[styles.pill, styles.pillFit, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Keep')}</Text></Pressable>
                        </View>
                      </View>
                    </View>
                  </Modal>
                ) : null
              ) : null}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <ParentGate visible={!!gate} reason={t('Changing profiles is for grown-ups.')}
        onPass={() => { const g = gate; setGate(null); if (g === 'add') openForm(null); else setEditing(true); }} onCancel={() => setGate(null)} />
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  band: { paddingBottom: 6, paddingHorizontal: 24 }, // just the title, on the felt (no banner)
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 30, /* a little room under the title */ paddingBottom: 24, alignItems: 'center' }, // everything fits on one screen
  col: { width: '100%', maxWidth: 520, gap: 18 },
  p: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 22, color: '#e6e6e6' },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: '#bdbdbd' },
  link: { fontFamily: fonts.ui, fontSize: 14, color: '#ff9a8a', textDecorationLine: 'underline', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 10, marginTop: 6 }, // room under the words above
  cell: { alignItems: 'center', gap: 4, paddingTop: 12, paddingBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  cellOn: { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'transparent' }, // a large see-through black box (no outline)
  activeRing: { borderWidth: 3, borderColor: colors.white },
  initial: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  name: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 16, color: colors.white, maxWidth: '100%', marginTop: 8 }, // clear of the character
  age: { fontFamily: fonts.ui, fontSize: 13, color: '#bdbdbd' },
  addTile: { borderWidth: 2, borderColor: '#777', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  plus: { color: '#aaa', fontFamily: fonts.ui, fontWeight: '300' },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillFit: { flexShrink: 1, minWidth: 0, paddingHorizontal: 18 },
  sureBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sureBox: { width: '100%', maxWidth: 400, backgroundColor: '#000', borderRadius: 24, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 26 },
  sureText: { color: colors.white, fontFamily: fonts.ui, fontSize: 17, lineHeight: 24 },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50, overflow: 'hidden' }, // within the page: the bar stays uncovered
  card: { backgroundColor: 'rgba(0,0,0,0.4)', /* see-through black, lighter than the playlist boxes */ borderRadius: 16, padding: 22, paddingTop: 24, paddingBottom: 28, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },
  input: { flex: 1, minWidth: 0, height: 48, borderRadius: 10, backgroundColor: '#d6d6d6', paddingHorizontal: 14, paddingVertical: 0, includeFontPadding: false, fontFamily: fonts.ui, fontSize: 20, color: '#222' }, // a fixed height and no padding top or bottom: iOS centres the words
  section: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '700', color: '#d0d0d0', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' },
  choiceOn: { backgroundColor: colors.green },
  choiceText: { fontFamily: fonts.ui, fontSize: 15, color: '#dcdcdc', fontWeight: '600' },
  swatchOn: { borderColor: 'transparent', backgroundColor: 'rgba(0,0,0,0.35)' }, // dark box, no outline
  swatch: { width: 60, height: 70, borderRadius: 13, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  buttonShadow: { shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.55, shadowRadius: 6, elevation: 6 },
});
