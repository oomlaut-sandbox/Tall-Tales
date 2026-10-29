// Profiles (Start page, top right): one for each child. Each child has their own My Notes, badges,
// playlists, playback choices and parental controls (with their age, so their shelf only shows their books).
// The books, the membership, parents' recordings, the language and the music are the family's.
// Kids can switch between profiles by tapping (unless a grown-up has turned that off); adding, changing and
// removing a profile is behind the grown-up question.
import { TITLE_ICONS, TitleIcon } from '../titleIcons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, DESK_BG } from '../look';
import { Bar, Burger, WithBar, barGeo } from '../components/Chrome';
import ParentGate from '../components/ParentGate';
import { useT } from '../i18n';
import { useControls, DEFAULT_CONTROLS } from '../controls';
import { keepFile, liveUri, loadJSONFor, saveJSONFor } from '../storage';
import { MAX_CLASS, MORE_AVATARS, PROFILE_COLORS, endClassroom, removeClasses, addClass, addProfile, canAdd, feltFor, getProfiles, inClass, onProfiles, removeClass, removeProfile, removeProfiles, renameClass, switchProfile, updateProfile } from '../profiles';
import { IDLE, slotStyle } from '../components/Chrome';
const SELECT_ICON = require('../../assets/icon-select.png');
const TRASH_ICON = require('../../assets/icon-trash.png');
const CLASS_FOLDER = require('../../assets/class-folder.png'); // Jörg's blue paper folder (900 × 880); the class's name goes on its white tab label

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// the avatars' names, for VoiceOver (the keys are the old colour names: see profiles.js)
const AVATAR_NAMES = {
  red: 'Rust friend', green: 'Olive friend', orange: 'Mustard friend', grey: 'Blue friend',
  unicorn: 'Unicorn', elephant: 'Elephant', dogs: 'Dogs', bee: 'Bee', hamster: 'Hamster', wolf: 'Wolf', worms: 'Worms',
  'coro-jump': 'Coro jumping', 'coro-green': 'Coro in green', 'coro-red': 'Coro in red', 'coro-headphones': 'Coro listening',
  'coro-writing': 'Coro writing', 'coro-blue': 'Coro in blue', 'coro-reading': 'Coro reading', 'coro-cheer': 'Coro cheering', robot: 'Robot',
};

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
      {/* the child's felt character (it stands on the bottom of its picture), or their own photo in a circle */}
      {p.color === 'photo' ? (
        <View style={{ width: size * 1.1, height: size * 1.1, borderRadius: size, overflow: 'hidden', backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }}>
          {p.photo ? <Image source={{ uri: liveUri(p.photo) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <Image source={TITLE_ICONS.profile} style={{ width: size * 0.55, height: size * 0.55 }} resizeMode="contain" />}
        </View>
      ) : (
        // an avatar: the whole photo inside the same white-edged circle
        <View style={{ width: size * 1.1, height: size * 1.1, borderRadius: size, overflow: 'hidden', backgroundColor: '#3a3a3a', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }}>
          <Image source={feltFor(p.color)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      )}
    </Animated.View>
  );
}

const WORKSPACE_BLUE = '#385c7d'; // the blue of the blue cloth book (Let's make a book)
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
  const room = s.classroom; // classroom mode: class folders, each with up to 30 students
  const classes = s.classes || [];
  const [openCls, setOpenCls] = useState(null); // the class folder that's open (classroom mode)
  const cls = room ? (classes.find((c) => c.id === openCls) || null) : null;
  const folders = !!room && !cls; // the classes themselves, as folders
  const shown = room ? (cls ? inClass(cls.id) : []) : s.list;
  const [view, setView] = useState('grid'); // 'grid' | 'list' (the names, A to Z)
  const [selecting, setSelecting] = useState(false); // Select on the bar: tap profiles, then the trash can
  const [picked, setPicked] = useState([]);
  const [sureMany, setSureMany] = useState(false);
  const [classForm, setClassForm] = useState(null); // { id?, name }: a new class, or one being renamed
  const [moreAv, setMoreAv] = useState(false); // Explore more avatars
  const stopSelect = () => { setSelecting(false); setPicked([]); };
  const togglePick = (id) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  // each child's box: a third of the row, much wider than the character (Jörg, 26 Oct 2026), so names and
  // "Reading now" sit on one line; the character itself stays its size
  const cellW = Math.floor((Math.min(520, winW - 48) - 2 * 10) / 3);
  const side = Math.min(112, cellW);

  const openForm = (p) => {
    setSure(false);
    setForm(p ? { id: p.id, name: p.name, color: p.color, photo: p.photo || null, age: ages[p.id] ?? null }
      : { name: '', color: PROFILE_COLORS[s.list.length % PROFILE_COLORS.length][0], age: null, cls: cls ? cls.id : undefined });
  };
  // a photo for the profile: from the phone's photos, a small square from its middle, kept with the app
  const pickPhoto = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1, allowsEditing: false });
      if (r.canceled || !r.assets || !r.assets[0]) { if (form.photo) setForm((f) => ({ ...f, color: 'photo' })); return; }
      let uri = r.assets[0].uri;
      try {
        const a0 = r.assets[0], w = a0.width || 0, h = a0.height || 0, sd = Math.min(w, h);
        const acts = sd ? [{ crop: { originX: Math.round((w - sd) / 2), originY: Math.round((h - sd) / 2), width: sd, height: sd } }, { resize: { width: Math.min(400, sd) } }] : [{ resize: { width: 400 } }];
        uri = (await ImageManipulator.manipulateAsync(uri, acts, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG })).uri;
      } catch (e) {}
      try { uri = await keepFile(uri, 'profiles', `p-${Date.now().toString(36)}.jpg`); } catch (e) {}
      setForm((f) => ({ ...f, color: 'photo', photo: uri }));
    } catch (e) {}
  };
  const saveForm = async () => {
    const f = form;
    if (f.id) {
      updateProfile(f.id, { name: f.name, color: f.color, photo: f.photo || null });
      if (f.id === s.active) setControls({ ...controls, childAge: f.age });
      else {
        const c = await loadJSONFor(f.id, 'controls', null);
        await saveJSONFor(f.id, 'controls', { ...DEFAULT_CONTROLS, ...(c || {}), childAge: f.age });
      }
    } else {
      const first = s.list.length === 0;
      await addProfile({ name: f.name, color: f.color, age: f.age, photo: f.photo || null, cls: f.cls });
      if (first) setControls({ ...controls, childAge: f.age }); // the first child keeps the settings already here
    }
    setForm(null);
  };

  // tapping the child already reading: straight back to My Library (the same quick fade)
  const backToLibrary = (to) => {
    if (picking.current || !onBack) return;
    picking.current = true;
    Animated.timing(pageFade, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => { picking.current = false; onBack(to); });
  };
  const pick = (id, glide = true) => {
    if (picking.current) return;
    const L = glide ? cells.current[id] : null;
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
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => (selecting ? (
        // selecting: the trash can (for the profiles ticked), and a red × to stop, where Select was
        <Bar u={u} vertical={v}>
          <Burger u={u} onPress={openMenu} />
          <Pressable onPress={() => setSureMany(true)} disabled={!picked.length} hitSlop={8} style={slotStyle(u, v)} accessibilityRole="button" accessibilityLabel={t('Delete')} accessibilityState={{ disabled: !picked.length }}>
            <Image source={TRASH_ICON} style={{ width: u * 5.2, height: u * 5.2, tintColor: picked.length ? '#ff6b6b' : IDLE }} resizeMode="contain" />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={stopSelect} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Cancel')} style={{ paddingHorizontal: 4 }}>
            <View style={{ width: 29, height: 29, borderRadius: 14.5, backgroundColor: colors.deepRed, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', width: 12, height: 2, borderRadius: 1, backgroundColor: colors.white, transform: [{ rotate: '45deg' }] }} />
              <View style={{ position: 'absolute', width: 12, height: 2, borderRadius: 1, backgroundColor: colors.white, transform: [{ rotate: '-45deg' }] }} />
            </View>
          </Pressable>
        </Bar>
      ) : (
        <Bar u={u} vertical={v}>
          <Burger u={u} onPress={openMenu} />
          <View style={{ flex: 1 }} />
          {/* Select: the circle with a tick, far right (like My Library), to delete several profiles at once */}
          {(folders ? classes.length : shown.length) && !form ? (
            <Pressable onPress={() => setGate('select')} hitSlop={12} style={{ paddingVertical: 10, paddingHorizontal: 10 }} accessibilityRole="button" accessibilityLabel={t('Select')}>
              <Image source={SELECT_ICON} style={{ width: 29, height: 29, tintColor: colors.white }} resizeMode="contain" />
            </Pressable>
          ) : null}
        </Bar>
      ))}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]} onLayout={(e) => setBandH(e.nativeEvent.layout.height)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><TitleIcon kind="profiles" /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.title, { flexShrink: 1 }]}>{room ? (cls ? (cls.name || t('Classroom')) : t('Classes')) : t('Profiles')}</Text></View>
      </View>
      {form ? null : (
      <Animated.ScrollView style={{ opacity: pageFade }} contentContainerStyle={styles.body}>
        <View style={styles.col}>
          {room && cls ? (
            <Pressable onPress={() => { stopSelect(); setOpenCls(null); }} hitSlop={10} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
              <View style={styles.backCircle}><View style={styles.backChevron} /></View>
              <Text style={styles.back}>{t('All classes')}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.p}>{folders && selecting ? (picked.length ? t('{n} selected', { n: picked.length }) : t('Tap classes to select them.'))
            : folders
            ? t('Each class has its own folder, with up to {n} students. Tap a class to open it.', { n: MAX_CLASS })
            : selecting ? (picked.length ? t('{n} selected', { n: picked.length }) : t('Tap profiles to select them.'))
            : shown.length
            ? (editing ? t('Tap a profile to change its name, character or age.') : t('Who is reading? Tap your name.'))
            : t('Give each reader their own notebook, badges, playlists and settings: children and grown-ups. A child’s age decides which books they see.')}</Text>
          {/* Grid or List (the names, A to Z) */}
          {room && !folders && shown.length ? (
            <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-end', marginTop: -6 }}>
              {[['grid', t('Grid')], ['list', t('List')]].map(([k, label]) => (
                <Pressable key={k} onPress={() => setView(k)} accessibilityRole="tab" accessibilityState={{ selected: view === k }} style={[styles.choice, view === k && styles.choiceOn]}>
                  <Text style={styles.choiceText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {folders ? (
            // the class folders: blue squares for now, with the class's name and how many students
            <View style={styles.grid}>
              {classes.map((c) => (
                <Pressable key={c.id} onPress={() => (selecting ? togglePick(c.id) : editing ? setClassForm({ id: c.id, name: c.name }) : setOpenCls(c.id))} accessibilityRole="button" accessibilityLabel={c.name || t('Classroom')} accessibilityState={selecting ? { selected: picked.includes(c.id) } : undefined} style={[styles.cell, { width: cellW }]}>
                  <View style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}>
                    {(() => { const fw = Math.round(side * 0.92), fh = Math.round(fw * 880 / 900); return (
                      <View style={{ width: fw, height: fh, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 6 }}>
                        <Image source={CLASS_FOLDER} style={{ width: fw, height: fh }} resizeMode="contain" />
                        {/* the class's name, small, on the folder's white tab label */}
                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ position: 'absolute', left: fw * 0.065, width: fw * 0.23, top: fh * 0.012, height: fh * 0.052, fontFamily: fonts.uiSemiBold, fontSize: Math.max(7, fh * 0.04), lineHeight: fh * 0.052, color: '#444' }}>{c.name}</Text>
                      </View>); })()}
                  </View>
                  {selecting ? <View style={[styles.tick, { position: 'absolute', top: 8, right: 8 }, picked.includes(c.id) && styles.tickOn]}>{picked.includes(c.id) ? <View style={styles.tickMark} /> : null}</View> : null}
                  <Text numberOfLines={1} style={styles.name}>{c.name || t('Classroom')}</Text>
                  <Text numberOfLines={1} style={styles.age}>{inClass(c.id).length === 1 ? t('1 student') : t('{n} students', { n: inClass(c.id).length })}</Text>
                </Pressable>
              ))}
              {selecting ? null : <Pressable onPress={() => setGate('class')} style={[styles.cell, { width: cellW }]} accessibilityRole="button" accessibilityLabel={t('Add a class')}>
                <View style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={[styles.addTile, { width: Math.round(side * 0.72), height: Math.round(side * 0.72), borderRadius: 6 }]}>
                    <View style={{ position: 'absolute', width: side * 0.2, height: 2, backgroundColor: '#aaa' }} />
                    <View style={{ position: 'absolute', width: 2, height: side * 0.2, backgroundColor: '#aaa' }} />
                  </View>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.name}>{t('Add a class')}</Text>
                <Text style={styles.age}> </Text>
              </Pressable>}
            </View>
          ) : room && view === 'list' ? (
            // the list: everyone's name, A to Z
            <View style={{ gap: 6 }}>
              {[...shown].sort((x, y) => x.name.localeCompare(y.name)).map((p) => {
                const on = p.id === s.active, sel = picked.includes(p.id);
                return (
                  <Pressable key={p.id} disabled={!selecting && !editing && !canSwitch && !on}
                    onPress={() => (selecting ? togglePick(p.id) : editing ? openForm(p) : on ? backToLibrary() : pick(p.id, false))}
                    accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ selected: selecting ? sel : on }}
                    style={[styles.row, (on && !selecting) && { backgroundColor: '#000' }]}>
                    <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><ProfileTile p={p} size={30} grow={1} /></View>
                    <Text numberOfLines={1} style={[styles.name, { flex: 1, marginTop: 0, fontSize: 17 }]}>{p.name}</Text>
                    <Text style={styles.age}>{on ? t('Reading now') : ages[p.id] != null ? t('Age {n}', { n: ages[p.id] }) : ''}</Text>
                    {selecting ? <View style={[styles.tick, sel && styles.tickOn]}>{sel ? <View style={styles.tickMark} /> : null}</View> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
          <View style={styles.grid}>
            {/* the selection box: one box that glides from child to child */}
            {boxSize && shown.some((p) => p.id === s.active) && !selecting ? <Animated.View pointerEvents="none" style={[styles.cellOn, { position: 'absolute', left: 0, top: 0, width: boxSize.w, height: boxSize.h, borderRadius: 16, borderWidth: 1, transform: boxXY.getTranslateTransform() }]} /> : null}
            {shown.map((p) => {
              const on = p.id === s.active, sel = picked.includes(p.id);
              return (
                <Pressable key={p.id} disabled={!selecting && !editing && !canSwitch && !on} onPress={() => (selecting ? togglePick(p.id) : editing ? openForm(p) : on ? backToLibrary() : pick(p.id))}
                  onLayout={(e) => { const L = e.nativeEvent.layout; cells.current[p.id] = L; if (on && !picking.current) { boxXY.setValue({ x: L.x, y: L.y }); setBoxSize({ w: L.width, h: L.height }); placed.current = true; } }}
                  accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ selected: selecting ? sel : on }} style={[styles.cell, { width: cellW }]}>
                  {/* the child reading now gets a box around them instead of growing */}
                  <View style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}><ProfileTile p={p} size={Math.round(side * 0.68)} active={on} grow={1} /></View>
                  {selecting ? <View style={[styles.tick, { position: 'absolute', top: 8, right: 8 }, sel && styles.tickOn]}>{sel ? <View style={styles.tickMark} /> : null}</View> : null}
                  <Text numberOfLines={1} style={styles.name}>{p.name}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.age}>{on ? t('Reading now') : ages[p.id] != null ? t('Age {n}', { n: ages[p.id] }) : ' '}</Text>
                </Pressable>
              );
            })}
            {!selecting && canAdd(cls ? cls.id : undefined) ? (
              <Pressable onPress={() => setGate('add')} style={[styles.cell, { width: cellW }]} accessibilityRole="button" accessibilityLabel={room ? t('Add a student') : t('Add a profile')}>
                <View style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={[styles.addTile, { width: Math.round(side * 0.68), height: Math.round(side * 0.68), borderRadius: side }]}>{/* round, like the buttons */}
                    {/* a drawn plus (two thin bars), so it sits exactly in the middle of the circle */}
                    <View style={{ position: 'absolute', width: side * 0.2, height: 2, backgroundColor: '#aaa' }} />
                    <View style={{ position: 'absolute', width: 2, height: side * 0.2, backgroundColor: '#aaa' }} />
                  </View>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.name}>{room ? t('Add a student') : t('Add a profile')}</Text>
                <Text style={styles.age}> </Text>
              </Pressable>
            ) : null}
          </View>
          )}
          {/* Edit profiles on the left; My Library (back to the books) on the right, level with it */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
            {(shown.length || folders) && !selecting ? (
              <Pressable onPress={() => (editing ? setEditing(false) : setGate('edit'))} style={[styles.pill, { backgroundColor: editing ? colors.green : '#3a3a3a' }]} accessibilityRole="button">{/* well clear of the children above */}
                <Text style={styles.pillText}>{editing ? t('Done editing') : folders ? t('Edit classes') : t('Edit profiles')}</Text>
              </Pressable>
            ) : <View />}
          </View>
          {!canSwitch ? <Text style={styles.small}>{t('A grown-up has turned off switching profiles.')}</Text> : null}
          {/* back to the family's profiles: ends classroom mode (everyone's profile stays); a grown-up question first */}
          {folders && !selecting ? (
            <Pressable onPress={() => setGate('endclass')} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
              <Text style={[styles.small, { color: '#d6d6d6', textDecorationLine: 'underline' }]}>{t('End classroom mode')}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.small}>{room ? t('Books are shared by the whole class, so students can make books together. Each student’s notebook, badges and settings are their own.') : t('Books, the membership, recordings, the language and the music are shared by the whole family.')}</Text>
          {/* well below everything: on to My Library (green) or My Workspace (the blue of the blue book) (Jörg, 29 Oct 2026) */}
          {onBack && !editing ? (
            <View style={{ marginTop: 70, gap: 16, alignItems: 'stretch' }}>
              <Pressable onPress={() => backToLibrary('library')} style={[styles.pill, { backgroundColor: '#2f5a31', alignItems: 'center' }]} accessibilityRole="button">
                <Text style={styles.pillText}>{t('My Library')}</Text>
              </Pressable>
              <Pressable onPress={() => backToLibrary('workspace')} style={[styles.pill, { backgroundColor: WORKSPACE_BLUE, alignItems: 'center' }]} accessibilityRole="button">
                <Text style={styles.pillText}>{t('My Workspace')}</Text>
              </Pressable>
            </View>
          ) : null}
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
                {/* the chosen character; with a photo, tap the circle to choose another photo */}
                <Pressable onPress={form.color === 'photo' ? pickPhoto : undefined} disabled={form.color !== 'photo'} accessibilityRole="button" accessibilityLabel={t('Use a photo')}><ProfileTile p={{ name: form.name || '?', color: form.color, photo: form.photo }} size={60} /></Pressable>
                <TextInput allowFontScaling={false} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder={t('Name')} placeholderTextColor="#8a8a8a"
                  style={styles.input} maxLength={20} autoCapitalize="words" autoCorrect={false} returnKeyType="done" accessibilityLabel={t('Name')} />
              </View>
              <Text style={[styles.section, { marginTop: 10 }]}>{t('Character')}</Text>
              <View style={[styles.choices, { marginTop: 4, marginBottom: 2, flexWrap: 'nowrap', justifyContent: 'space-between' }]}>{/* all five on one line */}
                {PROFILE_COLORS.map(([c, img]) => (
                  <Pressable key={c} onPress={() => setForm({ ...form, color: c })} accessibilityRole="radio" accessibilityLabel={AVATAR_NAMES[c] ? t(AVATAR_NAMES[c]) : t('Character')} accessibilityState={{ selected: form.color === c }}
                    style={[styles.swatch, form.color === c && styles.swatchOn]}>{/* the chosen one: boxed (like the reading child), not bigger */}
                    {form.color === c ? <View pointerEvents="none" style={styles.glow} /> : null}
                    <ProfileTile p={{ color: c }} size={40} active={form.color === c} grow={1} />
                  </Pressable>
                ))}
                {/* the last choice: a circle with a person in it; tap it to choose a photo from the phone */}
                <Pressable onPress={pickPhoto} accessibilityRole="radio" accessibilityLabel={t('Use a photo')} accessibilityState={{ selected: form.color === 'photo' }}
                  style={[styles.swatch, form.color === 'photo' && styles.swatchOn]}>
                  {form.color === 'photo' ? <View pointerEvents="none" style={styles.glow} /> : null}
                  <ProfileTile p={{ color: 'photo', photo: form.photo }} size={40} grow={1} />
                </Pressable>
              </View>
              {/* more characters to choose from (Jörg will send a large set) */}
              <Pressable onPress={() => setMoreAv(true)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-end', marginTop: -4 }}>
                <Text style={[styles.small, { color: '#d6d6d6', textDecorationLine: 'underline' }]}>{t('Explore more avatars')}</Text>
              </Pressable>
              <Text style={styles.section}>{t('Age')}</Text>
              <View style={styles.choices}>
                <Choice label={t('Grown-up')} on={form.age == null} onPress={() => setForm({ ...form, age: null })} />{/* (grown-ups have profiles too: they see every book) */}
              </View>
              <View style={styles.choices}>
                {AGES.map((a) => <Choice key={a} label={String(a)} on={form.age === a} onPress={() => setForm({ ...form, age: a })} />)}
              </View>
              <Text style={styles.small}>{t('A grown-up sees every book. For a child, books rated for older children are hidden.')}</Text>
              {/* (for a profile that exists) a red Delete on the left; Cancel, then Save in the bottom right corner (Jörg, 26 Oct 2026) */}
              {/* (they shrink to fit, so longer words in other languages never push one out of the box) */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                {form.id ? <Pressable onPress={() => setSure(true)} style={[styles.pill, styles.pillFit, { backgroundColor: '#b3261e' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Delete')}</Text></Pressable> : null}
                <Pressable onPress={() => setForm(null)} style={[styles.pill, styles.pillFit, { backgroundColor: '#4a4a4a', marginLeft: 'auto' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Cancel')}</Text></Pressable>
                <Pressable onPress={saveForm} style={[styles.pill, styles.pillFit, { backgroundColor: colors.green }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Save')}</Text></Pressable>
              </View>
              {form.id ? (
                sure ? (
                  // are you sure? a solid black box popping up over everything
                  <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setSure(false)}>
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

      {/* delete the profiles ticked: are you sure? */}
      {sureMany ? (
        <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setSureMany(false)}>
          <View style={styles.sureBack}>
            <View style={styles.sureBox}>
              <Text style={styles.sureText}>{folders ? (picked.length === 1 ? t('Remove 1 class? Its students’ profiles go too. Their notebooks and badges stay on this phone, but nobody will see them.') : t('Remove {n} classes? Their students’ profiles go too. Their notebooks and badges stay on this phone, but nobody will see them.', { n: picked.length })) : picked.length === 1 ? t('Remove 1 profile? Their notebook and badges stay on this phone, but nobody will see them.') : t('Remove {n} profiles? Their notebooks and badges stay on this phone, but nobody will see them.', { n: picked.length })}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 26 }}>
                <Pressable onPress={() => { setSureMany(false); if (folders) removeClasses(picked); else removeProfiles(picked); stopSelect(); }} style={[styles.pill, styles.pillFit, { backgroundColor: '#b3261e', marginLeft: 'auto' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Remove')}</Text></Pressable>
                <Pressable onPress={() => setSureMany(false)} style={[styles.pill, styles.pillFit, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Keep')}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      {/* a new class folder (or renaming one; an empty class can be removed) */}
      {classForm ? (
        <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setClassForm(null)}>
          <View style={styles.sureBack}>
            <View style={[styles.sureBox, { gap: 16 }]}>
              <Text style={[styles.sureText, { fontFamily: fonts.uiBold }]}>{classForm.id ? t('Class name') : t('Add a class')}</Text>
              <TextInput allowFontScaling={false} value={classForm.name} onChangeText={(name) => setClassForm({ ...classForm, name })} placeholder={t('Class name, like Room 4')} placeholderTextColor="#8a8a8a"
                style={[styles.input, { flex: 0 }]} maxLength={30} autoFocus accessibilityLabel={t('Class name')} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Pressable onPress={() => { if (classForm.id) renameClass(classForm.id, classForm.name); else setOpenCls(addClass(classForm.name)); setClassForm(null); }} style={[styles.pill, styles.pillFit, { backgroundColor: colors.green }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Save')}</Text></Pressable>
                {classForm.id && !inClass(classForm.id).length ? <Pressable onPress={() => { removeClass(classForm.id); setClassForm(null); }} style={[styles.pill, styles.pillFit, { backgroundColor: '#b3261e' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Remove')}</Text></Pressable> : null}
                <Pressable onPress={() => setClassForm(null)} style={[styles.pill, styles.pillFit, { backgroundColor: '#3a3a3a', marginLeft: 'auto' }]} accessibilityRole="button"><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pillText}>{t('Cancel')}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      {/* Explore more avatars: a black glass box (the large set arrives soon) */}
      {moreAv ? (
        <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setMoreAv(false)}>
          <Pressable style={styles.sureBack} onPress={() => setMoreAv(false)} accessible={false}>{/* (not one big VoiceOver element: the avatars inside stay reachable; Close is below) */}
            <Pressable style={[styles.sureBox, { backgroundColor: 'rgba(0,0,0,0.86)', gap: 18 }]} onPress={() => {}} accessible={false}>
              <Text style={[styles.sureText, { fontFamily: fonts.uiBold, fontSize: 20 }]}>{t('More avatars')}</Text>
              {/* the avatars scroll when there are more than fit (more are coming) */}
              <ScrollView style={{ maxHeight: Math.max(220, winH * 0.5) }} contentContainerStyle={{ paddingVertical: 6 }} showsVerticalScrollIndicator>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {MORE_AVATARS.map(([c]) => (
                  <Pressable key={c} onPress={() => { setForm((f) => ({ ...f, color: c })); setMoreAv(false); }} accessibilityRole="radio" accessibilityLabel={AVATAR_NAMES[c] ? t(AVATAR_NAMES[c]) : t('Character')} accessibilityState={{ selected: !!(form && form.color === c) }} style={[styles.swatch, form && form.color === c && styles.swatchOn]}>
                    {form && form.color === c ? <View pointerEvents="none" style={styles.glow} /> : null}
                    <ProfileTile p={{ color: c }} size={40} grow={1} />
                  </Pressable>
                ))}
              </View>
              </ScrollView>
              <Text style={styles.small}>{t('Many more are on the way.')}</Text>
              <Pressable onPress={() => setMoreAv(false)} style={[styles.pill, { backgroundColor: '#3a3a3a', alignSelf: 'flex-end' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Close')}</Text></Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
      <ParentGate visible={!!gate} reason={t('Changing profiles is for grown-ups.')}
        onPass={() => { const g = gate; setGate(null); if (g === 'add') openForm(null); else if (g === 'select') { setEditing(false); setSelecting(true); } else if (g === 'class') setClassForm({ name: '' }); else if (g === 'endclass') { endClassroom(); setOpenCls(null); } else setEditing(true); }} onCancel={() => setGate(null)} />
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  band: { paddingBottom: 6, paddingHorizontal: 24 }, // just the title, on the felt (no banner)
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 30, /* a little room under the title */ paddingBottom: 24, alignItems: 'center' }, // everything fits on one screen
  col: { width: '100%', maxWidth: 520, gap: 18 },
  p: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 22, color: '#e6e6e6' },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: '#bdbdbd' },
  link: { fontFamily: fonts.ui, fontSize: 14, color: '#ff9a8a', textDecorationLine: 'underline', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 10, marginTop: 6 }, // room under the words above
  cell: { alignItems: 'center', gap: 4, paddingTop: 12, paddingBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  cellOn: { backgroundColor: '#000', borderColor: 'transparent' }, // a pure black box (no outline) (Jörg, 26 Oct 2026)
  activeRing: { borderWidth: 3, borderColor: colors.white },
  initial: { color: colors.white, fontFamily: fonts.uiBold, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  name: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.white, maxWidth: '100%', marginTop: 8 }, // clear of the character
  age: { fontFamily: fonts.ui, fontSize: 13, color: '#bdbdbd' },
  addTile: { borderWidth: 2, borderColor: '#777', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  plus: { color: '#aaa', fontFamily: fonts.uiMedium },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillFit: { flexShrink: 1, minWidth: 0, paddingHorizontal: 18 },
  sureBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sureBox: { width: '100%', maxWidth: 400, backgroundColor: '#000', borderRadius: 24, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 26 },
  sureText: { color: colors.white, fontFamily: fonts.ui, fontSize: 17, lineHeight: 24 },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50, overflow: 'hidden' }, // within the page: the bar stays uncovered
  card: { backgroundColor: 'rgba(0,0,0,0.4)', /* see-through black, lighter than the playlist boxes */ borderRadius: 16, padding: 22, paddingTop: 24, paddingBottom: 28, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },
  input: { flex: 1, minWidth: 0, height: 48, borderRadius: 10, backgroundColor: '#d6d6d6', paddingHorizontal: 14, paddingVertical: 0, includeFontPadding: false, fontFamily: fonts.ui, fontSize: 20, color: '#222' }, // a fixed height and no padding top or bottom: iOS centres the words
  section: { fontFamily: fonts.uiBold, fontSize: 13, color: '#d0d0d0', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)' },
  tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: colors.green, borderColor: colors.green },
  tickMark: { width: 11, height: 6, borderLeftWidth: 2.2, borderBottomWidth: 2.2, borderColor: colors.white, transform: [{ translateY: -1 }, { rotate: '-45deg' }] },
  backCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#d6d6d6', alignItems: 'center', justifyContent: 'center' },
  backChevron: { width: 8, height: 8, borderLeftWidth: 1.75, borderBottomWidth: 1.75, borderColor: '#d6d6d6', transform: [{ translateX: 1.5 }, { rotate: '45deg' }] },
  back: { fontFamily: fonts.uiBold, fontSize: 16, color: '#d6d6d6' },
  choice: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' },
  choiceOn: { backgroundColor: colors.green },
  choiceText: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: '#dcdcdc' },
  swatchOn: { borderColor: 'transparent' }, // the chosen one: a soft white glow behind its circle (Jörg, 26 Oct 2026)
  glow: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', shadowColor: '#fff', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  swatch: { width: 60, height: 70, borderRadius: 13, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  buttonShadow: { shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.55, shadowRadius: 6, elevation: 6 },
});
