// Settings (the last item in the main menu, always behind the grown-up question):
//   Language — the app's language, and (members) a different language for the books
//   Parental controls — shape the app down to exactly the experience a parent wants: what shows (Book Store,
//   My Notes, Make a Book, Help), whether the child may change playback (or it always plays one way),
//   recording, sharing and printing, and changing the language. "Lock everything" leaves only My Library.
import LineInput from '../components/LineInput';
import { TitleIcon } from '../titleIcons';
import { useScrollMemory } from '../nav';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { boxTitle, colors, fonts, sectionBox } from '../theme';
import { DESK_FELT, DESK_BG, IS_TABLET, BandFill } from '../look';

const IDEAS_FELT = require('../../assets/ideas-felt.png'); // the mossy green stitched felt (Ideas and Support), 1100 × 805
const BAND_FELT = require('../../assets/band-settings.jpg'); // Jörg's grey stitched felt banner
import { Bar, Burger, MusicIcon, Option, WithBar, ChoiceLabel } from '../components/Chrome';
import ReadingOptionsSection from '../components/ReadingOptionsSection';
import GrownupCodeCard from '../components/GrownupCodeCard';
import { LANGS, useT } from '../i18n';
import { lockedControls, quickSafeControls, DEFAULT_CONTROLS, STORE_ON } from '../controls';
import { usePurchases } from '../purchases';
import { MAX_CLASS, PROFILE_COLORS, activeProfile, addProfile, canAdd, endClassroom, inClass, getProfiles, onProfiles as watchProfiles, setClassroom } from '../profiles';
import { hapticsOn, onHaptics, tap } from '../haptics';
const LOCK_ICON = require('../../assets/heading-icons/grown-ups.png'); // (the lock, before Use Quick and Safe Kid)

const MODES = [['self', 'Read Yourself'], ['learn', 'Learn to Read'], ['auto', 'Auto Play'], ['page', 'Page by Page Play'], ['listen', 'Listen Only']];

function Choice({ label, on, onPress, disabled }) {
  return (
    <Pressable hitSlop={6} onPress={onPress} disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected: on, disabled }}
      style={[styles.choice, on && styles.choiceOn, disabled && { opacity: 0.4 }]}>
      <Text style={[styles.choiceText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ label, value, onChange, disabled }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={(v) => { tap(); onChange(v); }} trackColor={{ true: colors.green, false: '#555' }} thumbColor={colors.white} ios_backgroundColor="#555" />
    </View>
  );
}

// the little line icons beside the category headings (in the style of Ideas and Support's)
const SET_ICONS = {
  parental: require('../../assets/heading-icons/grown-ups.png'),
  reading: require('../../assets/heading-icons/reading-options.png'),
  music: require('../../assets/heading-icons/music-and-sounds.png'),
  profiles: require('../../assets/heading-icons/profiles.png'),
  languages: require('../../assets/heading-icons/languages.png'),
  teachers: require('../../assets/heading-icons/learning.png'),
};

// a category: its heading with a + / − on the right, and its cards when it's open
function Section({ id, icon, title, open, setOpen, children }) {
  const on = open === id;
  return (
    <View style={styles.box}>
      <Pressable onPress={() => setOpen((o) => (o === id ? null : id))} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: on }} style={[styles.secHead, on && { marginBottom: 6 }]}>
        <Image source={icon} style={styles.secIcon} accessibilityIgnoresInvertColors />
        <Text style={[styles.secTitle, { flex: 1 }]}>{title}</Text>
        <Text style={styles.secChev}>{on ? '−' : '+'}</Text>
      </Pressable>
      {on ? children : null}
    </View>
  );
}

export default function Settings({ u, openMenu, lang, setLang, bookLang, setBookLang, controls, setControls, mode, onDone, onJoin, onProfiles, onPlaylists, onReadingOptions, onMusic, onTeacherDesk, prefs, setPrefs, toast }) {
  const keep = useScrollMemory('settings'); // Back returns to this spot
  const t = useT();
  const insets = useSafeAreaInsets();
  const [hap, setHap] = useState(hapticsOn());
  const [roView, setRoView] = useState('main'); // Reading Options: the choices, or the voices
  const [openSec, setOpenSec] = useState(null);
  const [room, setRoom] = useState(getProfiles().classroom || null); // the classroom folder, if there is one
  // whose controls these are: the reader using the app now (Jörg, 28 Oct 2026)
  const [who, setWho] = useState(() => (activeProfile() || {}).name || null);
  useEffect(() => watchProfiles(() => setWho((activeProfile() || {}).name || null)), []);
  useEffect(() => watchProfiles((st) => setRoom(st.classroom || null)), []); // (not the onProfiles prop, which opens Profiles)
  const [roomName, setRoomName] = useState('');
  const [names, setNames] = useState(''); // a pasted class list: one name per line (or separated by commas)
  const [added, setAdded] = useState(null);
  const [importTo, setImportTo] = useState(null); // which class the list goes into (the first, until another is chosen)
  // make a profile for every name on the list, up to 30 in the class (names already there are skipped)
  const importNames = async () => {
    const cl = getProfiles().classes || [];
    const to = (cl.find((c) => c.id === importTo) || cl[0] || {}).id;
    const have = new Set((to ? inClass(to) : getProfiles().list).map((p) => p.name.trim().toLowerCase()));
    const list = [...new Set(names.split(/[\n,;\t]+/).map((n) => n.trim()).filter(Boolean))].filter((n) => !have.has(n.toLowerCase()));
    let n = 0;
    for (const name of list) {
      const st = getProfiles();
      if (!canAdd(to)) break;
      await addProfile({ name, color: PROFILE_COLORS[st.list.length % PROFILE_COLORS.length][0], age: null, cls: to });
      n += 1;
    }
    setNames(''); setAdded(n);
  }; // the category that's open (one at a time)
  const [gardenBox, setGardenBox] = useState(null); // the Garden's felt card, once measured
  useEffect(() => onHaptics(setHap), []);
  const ps = usePurchases();
  const set = (patch) => setControls({ ...controls, ...patch });
  // (the child's age is its own setting: Lock and Unlock everything keep it)
  // the nightlight's clock and alarm, and the Garden, are kept whatever preset is chosen (and don't count when comparing)
  const NIGHT = ['nightlight', 'clock', 'alarm', 'garden'];
  const night = Object.fromEntries(NIGHT.map((k) => [k, controls[k] ?? DEFAULT_CONTROLS[k]]));
  const same = (a, b) => Object.keys(DEFAULT_CONTROLS).every((k) => k === 'childAge' || NIGHT.includes(k) || a[k] === b[k]);
  const allOn = same(controls, DEFAULT_CONTROLS);
  const quick = same(controls, quickSafeControls());
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        {true ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: IS_TABLET ? 0 : insets.top, bottom: 0, overflow: 'hidden' }}><BandFill source={BAND_FELT} /></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><TitleIcon kind="settings" /><Text style={[styles.title, { flexShrink: 1 }]}>{t('Settings')}</Text></View>
      </View>
      <ScrollView {...keep} contentContainerStyle={styles.body}>
        <View style={styles.col}>
          {/* five categories, each in its own black glass box that opens when tapped (like Ideas and Support):
              Parental Controls, Reading Options, Music and Sounds, Profiles, Languages (Jörg, 26 Oct 2026) */}
          <Section id="parental" icon={SET_ICONS.parental} title={who ? t('Parental controls for {name}', { name: who }) : t('Parental controls')} open={openSec} setOpen={setOpenSec}>
              {/* the recommended one-tap setup for a child reading alone */}
              <View style={[styles.card, { borderWidth: 2, borderColor: quick ? colors.green : 'transparent' }]}>
                <Text style={[styles.cardTitle, { fontSize: 18 }]}>{t('Quick and Safe Kid')}</Text>
                <Text style={styles.small}>{t('Recommended when your child reads by themselves')}</Text>
                <Text style={styles.p}>{t('The simplest, most foolproof setup: only My Library and My Notes. Every book reads itself aloud a page at a time, and your child turns the page when ready. Nothing can be bought, shared, printed, recorded or changed. With your child’s age set, only books rated for that age.')}</Text>
                {quick ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>{/* a big red Turn off beside it (Jörg, 27 Oct 2026): everything back on, the age and bedtime kept */}
                    <Text style={[styles.p, { color: colors.white, fontFamily: fonts.uiBold, flexShrink: 1 }]}>{t('Quick and Safe Kid is on.')}</Text>
                    <Pressable onPress={() => setControls({ ...DEFAULT_CONTROLS, childAge: controls.childAge, ...night })} style={[styles.pill, { backgroundColor: colors.red, alignSelf: 'center' }]} accessibilityRole="button" accessibilityLabel={t('Turn off Quick and Safe Kid')}>
                      <Text style={styles.pillText}>{t('Turn off')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => setControls({ ...quickSafeControls(controls.childAge), ...night })} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button">
                    <ChoiceLabel icon={LOCK_ICON} text={t('Use Quick and Safe Kid')} style={styles.pillText} />
                  </Pressable>
                )}
              </View>
              {/* the child's age: books rated for older children are hidden everywhere */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{who ? t('{name}’s age', { name: who }) : t('Your child’s age')}</Text>
                <View style={styles.choices}>
                  <Choice label={t('Show every book')} on={controls.childAge == null} onPress={() => set({ childAge: null })} />
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((a) => <Choice key={a} label={String(a)} on={controls.childAge === a} onPress={() => set({ childAge: a })} />)}
                </View>
                <Text style={styles.small}>{STORE_ON ? t('Each book has an age rating. Books rated for older children are hidden in My Library and the Book Store.') : t('Books rated for older children are hidden.')}</Text>
              </View>
              {/* the optional grown-up passcode, instead of the times-table question (Jörg, 30 Oct 2026) */}
              <GrownupCodeCard styles={styles} />
              <View style={styles.card}>
                <Text style={styles.p}>{t('Choose exactly what your child can see and do. Settings always asks the grown-up question first.')}</Text>
                {STORE_ON ? <Toggle label={t('Show the Book Store')} value={controls.store} onChange={(v) => set({ store: v })} /> : null}
                <Toggle label={t('Show My Notes')} value={controls.notebook} onChange={(v) => set({ notebook: v })} />
                <Toggle label={t('Show Let’s make a book')} value={controls.create} onChange={(v) => set({ create: v })} />
                {/* the Advanced page editor: off to start, so the book maker stays simple for kids (Jörg, 30 Oct 2026) */}
                {/* members only: everyone sees it, only Coro Family members can switch it on (Jörg, 31 Oct 2026) */}
                {controls.create ? <Toggle label={t('Advanced page editor')} value={!!controls.advancedPages && ps.member} disabled={!ps.member} onChange={(v) => set({ advancedPages: v })} /> : null}
                {controls.create && !ps.member ? <Pressable onPress={onJoin} hitSlop={8} accessibilityRole="link"><Text style={styles.link}>{t('Comes with Coro Family. Join to turn it on.')}</Text></Pressable> : null}
                {controls.create ? <Text style={styles.small}>{t('Put the words on a picture, and choose their look, size and place. Off: the book maker stays simple, with the words on their own page.')}</Text> : null}
                <Toggle label={t('Show Ideas and Help')} value={controls.help} onChange={(v) => set({ help: v })} />
                <Toggle label={t('Recording own voice')} value={controls.recording} onChange={(v) => set({ recording: v })} />
                <Toggle label={t('Read in family voices when there are some')} value={controls.familyVoices !== false} onChange={(v) => set({ familyVoices: v })} />
                <Toggle label={t('Sharing and printing')} value={controls.sharing} onChange={(v) => set({ sharing: v })} />
                <Toggle label={t('Let my child change the language')} value={controls.language} onChange={(v) => set({ language: v })} />
                <Toggle label={t('Let my child switch profiles')} value={controls.profiles !== false} onChange={(v) => set({ profiles: v })} />
                <Toggle label={t('Let my child change Reading Options')} value={controls.playback} onChange={(v) => set({ playback: v })} />
                <Text style={[styles.cardTitle, { marginTop: 8 }]}>{t('Always play like this')}</Text>
                <View style={styles.choices}>
                  <Choice label={t('Your child can choose')} on={!controls.playMode} onPress={() => set({ playMode: null })} />
                  {MODES.map(([k, label]) => <Choice key={k} label={t(label)} on={controls.playMode === k} onPress={() => set({ playMode: k })} />)}
                </View>
              </View>
              {/* Lock everything / Unlock everything: right after the parental controls */}
              <View style={styles.card}>
                <Pressable onPress={() => setControls({ ...lockedControls(controls.playMode || mode, controls.childAge), ...night })} style={[styles.pill, { backgroundColor: colors.deepRed }]} accessibilityRole="button">
                  <Text style={styles.pillText}>{t('Lock everything')}</Text>
                </Pressable>
                <Text style={styles.small}>{t('Only My Library and the books in it, read the way you chose.')}</Text>
                {!allOn ? (
                  <Pressable onPress={() => setControls({ ...DEFAULT_CONTROLS, childAge: controls.childAge, ...night })} style={[styles.pill, { backgroundColor: '#5f5f5f', marginTop: 6 }]} accessibilityRole="button">
                    <Text style={styles.pillText}>{t('Unlock everything')}</Text>
                  </Pressable>
                ) : null}
              </View>
              {/* the nightlight in Listen Only: a clock, and a gentle wake-up alarm */}
              <Text style={styles.sub}>{t('Nightlight')}</Text>
              <View style={styles.card}>
                <Text style={styles.small}>{t('In Listen Only, the screen becomes a soft nightlight. It can also show the time and wake your child gently.')}</Text>
                <Toggle label={t('Nightlight mode')} value={controls.nightlight !== false} onChange={(v) => set({ nightlight: v })} />
                <Text style={styles.small}>{t('The alarm lives on the nightlight’s bar, beside the lock. It works while the nightlight is on: keep the app open in Listen Only, with the phone plugged in.')}</Text>
              </View>
              {/* the Garden: a secret place below My Library, locked until a grown-up unlocks it */}
              <Text style={styles.sub}>{t('The Garden')}</Text>
              {/* on the mossy green stitched felt from Ideas and Support */}
              <View onLayout={(e) => setGardenBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
                style={[styles.card, { backgroundColor: '#4f5a2e', paddingHorizontal: 26, paddingVertical: 26, borderRadius: gardenBox ? gardenBox.w * 98 / 1100 : 24 }]}>
                {gardenBox ? <Image source={IDEAS_FELT} style={{ position: 'absolute', left: 0, top: 0, width: gardenBox.w, height: gardenBox.h }} resizeMode="stretch" /> : null}
                <Text style={[styles.small, { color: '#eef0e2' }]}>{t('The Garden is a secret place for your child to discover: calm nature games with rocks, sticks and animals, to play and learn after a good book. It starts locked. Unlock it whenever you like, as a surprise or a reward.')}</Text>
                <Toggle label={t('Unlock the Garden')} value={!!controls.garden} onChange={(v) => set({ garden: v })} />
                <Text style={[styles.small, { color: '#eef0e2' }]}>{t('Once it’s unlocked, your child finds the way in by scrolling past the Message Board at the bottom of My Workspace. We won’t tell them.')}</Text>
              </View>
          </Section>
          <ReadingOptionsSection prefs={prefs} setPrefs={setPrefs} toast={toast} onPlaylists={onPlaylists} open={openSec === 'reading'} onToggle={() => setOpenSec((o) => (o === 'reading' ? null : 'reading'))} />
          <Section id="music" icon={SET_ICONS.music} title={t('Music and Sounds')} open={openSec} setOpen={setOpenSec}>
            {onMusic ? <View style={styles.card}><Option glyph={<MusicIcon size={24} weight={3.4} />} title={t('Music and Sounds')} sub={t('Relaxing and gentle')} onPress={onMusic} /></View> : null}
          </Section>
          <Section id="profiles" icon={SET_ICONS.profiles} title={t('Profiles')} open={openSec} setOpen={setOpenSec}>
              {/* Profiles: one for each child (their own notebook, badges, playlists and settings) */}
              <View style={styles.card}>
                <Text style={styles.small}>{t('Everyone can have their own profile, children and grown-ups, with their own notes, badges, Book Playlists and settings.')}</Text>
                <Pressable onPress={onProfiles} style={[styles.pill, { backgroundColor: '#5f5f5f' }]} accessibilityRole="button">
                  <Text style={styles.pillText}>{t('Manage profiles')}</Text>
                </Pressable>
              </View>
          </Section>
          <Section id="languages" icon={SET_ICONS.languages} title={t('Languages')} open={openSec} setOpen={setOpenSec}>
              <View style={styles.card}>
                <Text style={styles.p}>{t('The app speaks this language.')}</Text>
                <View style={styles.choices}>
                  {LANGS.map(([k, name]) => <Choice key={k} label={name} on={lang === k} onPress={() => setLang(k)} />)}
                </View>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('Read books in')}</Text>
                <View style={styles.choices}>
                  <Choice label={t('Same as the app')} on={!bookLang} onPress={() => setBookLang(null)} />
                  {LANGS.map(([k, name]) => <Choice key={k} label={name} on={bookLang === k} disabled={!ps.member} onPress={() => setBookLang(k)} />)}
                </View>
                <Text style={styles.small}>{t('Members can read books in another language than the app’s: a German book in an English app, for example. Each book can be read in the languages it has been translated into.')}</Text>
                {!ps.member ? <Pressable onPress={onJoin} hitSlop={8} accessibilityRole="link"><Text style={styles.link}>{t('Join the membership to choose')}</Text></Pressable> : null}
              </View>
          </Section>
          {/* Teachers and Educators: a classroom folder of up to 30 students (Jörg, 26 Oct 2026) */}
          <Section id="teachers" icon={SET_ICONS.teachers} title={t('Teachers and Educators')} open={openSec} setOpen={setOpenSec}>
            <View style={styles.card}>
              <Text style={styles.p}>{t('Set up a classroom folder with up to {n} student profiles. Students can make books together or on their own: books are shared by the class, and each student keeps their own notebook, badges and settings.', { n: MAX_CLASS })}</Text>
              {room ? (
                <>
                  <Text style={styles.cardTitle}>{(getProfiles().classes || []).length === 1 ? t('Classroom: {name}', { name: room.name || t('Classroom') }) : t('{n} classes', { n: (getProfiles().classes || []).length })}</Text>
                  <Pressable onPress={onProfiles} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button">
                    <Text style={styles.pillText}>{t('Open the classroom')}</Text>
                  </Pressable>
                  {/* book prompts, handed-in books, the Class Library and the classroom lock (TeacherDesk.js, 30 Oct 2026) */}
                  {onTeacherDesk ? (
                    <Pressable onPress={onTeacherDesk} style={[styles.pill, { backgroundColor: colors.blue }]} accessibilityRole="button">
                      <Text style={styles.pillText}>{t('Open the Teacher’s Desk')}</Text>
                    </Pressable>
                  ) : null}
                  {onTeacherDesk ? <Text style={styles.small}>{t('Give the class book prompts, read the books they hand in, and print the class book.')}</Text> : null}
                  {/* the class list: paste the names (from a spreadsheet or an email) and each one gets a profile */}
                  <Text style={[styles.cardTitle, { marginTop: 8 }]}>{t('Add students from a list')}</Text>
                  <Text style={styles.small}>{t('Paste your class list: one name per line, or separated by commas. Each name gets its own profile, up to {n} in the class.', { n: MAX_CLASS })}</Text>
                  <TextInput value={names} onChangeText={(v) => { setNames(v); setAdded(null); }} multiline placeholder={t('Ava\nLeo\nMia')} placeholderTextColor="#8a8a8a"
                    allowFontScaling={false} style={[styles.input, { height: 120, paddingTop: 10, textAlignVertical: 'top' }]} accessibilityLabel={t('Add students from a list')} />
                  {/* with several classes: which one the names go into */}
                  {(getProfiles().classes || []).length > 1 ? (
                    <View style={styles.choices}>
                      {(getProfiles().classes || []).map((c, k) => <Choice key={c.id} label={c.name || t('Classroom')} on={importTo ? importTo === c.id : k === 0} onPress={() => setImportTo(c.id)} />)}
                    </View>
                  ) : null}
                  <Pressable onPress={importNames} disabled={!names.trim()} style={[styles.pill, { backgroundColor: colors.green }, !names.trim() && { opacity: 0.45 }]} accessibilityRole="button">
                    <Text style={styles.pillText}>{t('Add these students')}</Text>
                  </Pressable>
                  {added != null ? <Text style={styles.small}>{added === 1 ? t('1 student added.') : t('{n} students added.', { n: added })}</Text> : null}
                  <Pressable onPress={endClassroom} style={[styles.pill, { backgroundColor: '#5f5f5f' }]} accessibilityRole="button">
                    <Text style={styles.pillText}>{t('End classroom mode')}</Text>
                  </Pressable>
                  <Text style={styles.small}>{t('The students’ profiles stay. Without a classroom, up to six profiles can be added.')}</Text>
                </>
              ) : (
                <>
                  <LineInput value={roomName} onChangeText={setRoomName} placeholder={t('Class name, like Room 4')} placeholderTextColor="#8a8a8a" maxLength={30}
                    allowFontScaling={false} style={styles.input} accessibilityLabel={t('Class name, like Room 4')} />
                  <Pressable onPress={() => { setClassroom(roomName); setRoomName(''); }} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button">
                    <Text style={styles.pillText}>{t('Set up a classroom')}</Text>
                  </Pressable>
                  <Text style={styles.small}>{t('Then add each student in Profiles. Students tap their name to start.')}</Text>
                </>
              )}
            </View>
          </Section>
          <Pressable onPress={onDone} style={[styles.pill, { alignSelf: 'flex-end', backgroundColor: colors.green, marginTop: 8 }]} accessibilityRole="button">
            <Text style={styles.pillText}>{t('Done')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  band: { backgroundColor: '#4a4a4a', paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 24, paddingBottom: 40, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 12 },
  section: { fontFamily: fonts.uiBold, fontSize: 13, color: '#d0d0d0', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 }, // as in the Reading Options panel
  sub: { fontFamily: fonts.uiBold, fontSize: 13, color: '#d0d0d0', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10 }, // a heading inside a category
  box: { ...sectionBox, gap: 12 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  secIcon: { width: 28, height: 28 },
  secTitle: { ...boxTitle },
  secChev: { fontFamily: fonts.ui, fontSize: 30, lineHeight: 34, color: 'rgba(255,255,255,0.75)', width: 30, textAlign: 'center' },
  card: { backgroundColor: '#3a3a3a', borderRadius: 14, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  cardTitle: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.white },
  p: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#e6e6e6' },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: '#bdbdbd' },
  link: { fontFamily: fonts.ui, fontSize: 14, color: colors.white, textDecorationLine: 'underline' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  choiceOn: { backgroundColor: colors.green },
  choiceText: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: '#dcdcdc' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 36 },
  rowText: { flex: 1, fontFamily: fonts.ui, fontSize: 16, color: colors.white },
  input: { height: 46, borderRadius: 10, backgroundColor: '#d6d6d6', paddingHorizontal: 14, paddingVertical: 0, includeFontPadding: false, fontFamily: fonts.ui, fontSize: 17, color: '#222' },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
});
