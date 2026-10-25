// Settings (the last item in the main menu, always behind the grown-up question):
//   Language — the app's language, and (members) a different language for the books
//   Parental controls — shape the app down to exactly the experience a parent wants: what shows (Book Store,
//   My Notebook, Make a Book, Help), whether the child may change playback (or it always plays one way),
//   recording, sharing and printing, and changing the language. "Lock everything" leaves only My Library.
import { TitleIcon } from '../titleIcons';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, DESK_BG, IS_TABLET } from '../look';

const IDEAS_FELT = require('../../assets/ideas-felt.png'); // the mossy green stitched felt (Ideas and Support), 1100 × 805
const BAND_FELT = require('../../assets/band-settings.jpg'); // Jörg's grey stitched felt banner
import { Bar, Burger, WithBar } from '../components/Chrome';
import { LANGS, useT } from '../i18n';
import { lockedControls, quickSafeControls, DEFAULT_CONTROLS } from '../controls';
import { usePurchases } from '../purchases';
import { hapticsOn, onHaptics, setHapticsOn, tap } from '../haptics';

const MODES = [['self', 'Read Yourself'], ['learn', 'Learn to Read'], ['auto', 'Auto Play'], ['page', 'Page by Page Play'], ['listen', 'Listen Only']];

function Choice({ label, on, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected: on, disabled }}
      style={[styles.choice, on && styles.choiceOn, disabled && { opacity: 0.4 }]}>
      <Text style={[styles.choiceText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Switch value={value} onValueChange={(v) => { tap(); onChange(v); }} trackColor={{ true: colors.green, false: '#555' }} thumbColor={colors.white} ios_backgroundColor="#555" />
    </View>
  );
}

export default function Settings({ u, openMenu, lang, setLang, bookLang, setBookLang, controls, setControls, mode, onDone, onJoin, onProfiles, onPlaylists }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [hap, setHap] = useState(hapticsOn());
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
        {!IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><TitleIcon kind="settings" /><Text style={[styles.title, { flexShrink: 1 }]}>{t('Settings')}</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.col}>
          <Text style={styles.section}>{t('Language')}</Text>
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
            {!ps.member ? <Pressable onPress={onJoin} hitSlop={8}><Text style={styles.link}>{t('Join the membership to choose')}</Text></Pressable> : null}
          </View>

          <Text style={styles.section}>{t('Parental controls')}</Text>
          {/* the recommended one-tap setup for a child reading alone */}
          <View style={[styles.card, { borderWidth: 2, borderColor: quick ? colors.green : 'transparent' }]}>
            <Text style={[styles.cardTitle, { fontSize: 18 }]}>{t('Quick and Safe Kid')}</Text>
            <Text style={styles.small}>{t('Recommended for a child reading alone')}</Text>
            <Text style={styles.p}>{t('The simplest, most foolproof setup: only My Library and My Notebook. Every book reads itself aloud a page at a time, and your child turns the page when ready. Nothing can be bought, shared, printed, recorded or changed. With your child’s age set, only books rated for that age.')}</Text>
            {quick ? <Text style={[styles.p, { color: colors.white, fontFamily: fonts.uiBold }]}>{t('Quick and Safe Kid is on.')}</Text> : (
              <Pressable onPress={() => setControls({ ...quickSafeControls(controls.childAge), ...night })} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button">
                <Text style={styles.pillText}>{t('Use Quick and Safe Kid')}</Text>
              </Pressable>
            )}
          </View>
          {/* the child's age: books rated for older children are hidden everywhere */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('Your child’s age')}</Text>
            <View style={styles.choices}>
              <Choice label={t('Show every book')} on={controls.childAge == null} onPress={() => set({ childAge: null })} />
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((a) => <Choice key={a} label={String(a)} on={controls.childAge === a} onPress={() => set({ childAge: a })} />)}
            </View>
            <Text style={styles.small}>{t('Each book has an age rating. Books rated for older children are hidden in My Library and the Book Store.')}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.p}>{t('Choose exactly what your child can see and do. Settings always asks the grown-up question first.')}</Text>
            <Toggle label={t('Show the Book Store')} value={controls.store} onChange={(v) => set({ store: v })} />
            <Toggle label={t('Show My Notebook')} value={controls.notebook} onChange={(v) => set({ notebook: v })} />
            <Toggle label={t('Show Make a Book')} value={controls.create} onChange={(v) => set({ create: v })} />
            <Toggle label={t('Ideas, Support and About')} value={controls.help} onChange={(v) => set({ help: v })} />
            <Toggle label={t('Recording own voice')} value={controls.recording} onChange={(v) => set({ recording: v })} />
            <Toggle label={t('Read in family voices when there are some')} value={controls.familyVoices !== false} onChange={(v) => set({ familyVoices: v })} />
            <Toggle label={t('Sharing and printing')} value={controls.sharing} onChange={(v) => set({ sharing: v })} />
            <Toggle label={t('Let my child change the language')} value={controls.language} onChange={(v) => set({ language: v })} />
            <Toggle label={t('Let my child switch profiles')} value={controls.profiles !== false} onChange={(v) => set({ profiles: v })} />
            <Toggle label={t('Let my child change playback')} value={controls.playback} onChange={(v) => set({ playback: v })} />
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
          <Text style={styles.section}>{t('Nightlight')}</Text>
          <View style={styles.card}>
            <Text style={styles.small}>{t('In Listen Only, the screen becomes a soft nightlight. It can also show the time and wake your child gently.')}</Text>
            <Toggle label={t('Nightlight mode')} value={controls.nightlight !== false} onChange={(v) => set({ nightlight: v })} />
            <Text style={styles.small}>{t('The alarm lives on the nightlight’s bar, beside the lock. It works while the nightlight is on: keep the app open in Listen Only, with the phone plugged in.')}</Text>
          </View>
          {/* the Garden: a secret place below My Library, locked until a grown-up unlocks it */}
          <Text style={styles.section}>{t('The Garden')}</Text>
          {/* on the mossy green stitched felt from Ideas and Support */}
          <View onLayout={(e) => setGardenBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
            style={[styles.card, { backgroundColor: '#4f5a2e', paddingHorizontal: 26, paddingVertical: 26, borderRadius: gardenBox ? gardenBox.w * 98 / 1100 : 24 }]}>
            {gardenBox ? <Image source={IDEAS_FELT} style={{ position: 'absolute', left: 0, top: 0, width: gardenBox.w, height: gardenBox.h }} resizeMode="stretch" /> : null}
            <Text style={[styles.small, { color: '#eef0e2' }]}>{t('The Garden is a secret place for your child to discover: calm nature games with rocks, sticks and animals, to play and learn after a good book. It starts locked. Unlock it whenever you like, as a surprise or a reward.')}</Text>
            <Toggle label={t('Unlock the Garden')} value={!!controls.garden} onChange={(v) => set({ garden: v })} />
            <Text style={[styles.small, { color: '#eef0e2' }]}>{t('Once it’s unlocked, your child finds the way in by scrolling past the corkboard at the bottom of My Library. We won’t tell them.')}</Text>
          </View>
          {/* haptic feedback: small clicks you feel on the dials, knobs, sliders and buttons (for the whole phone) */}
          <Text style={styles.section}>{t('Haptic feedback')}</Text>
          <View style={styles.card}>
            <Toggle label={t('Feel a soft click on dials, knobs and buttons')} value={hap} onChange={setHapticsOn} />
          </View>
          {/* Playlists: books that play one after another (bedtime, a car ride…) */}
          <Text style={styles.section}>{t('Playlists')}</Text>
          <View style={styles.card}>
            <Text style={styles.small}>{t('Books read one after another')}</Text>
            <Pressable onPress={onPlaylists} style={[styles.pill, { backgroundColor: '#5f5f5f' }]} accessibilityRole="button">
              <Text style={styles.pillText}>{t('Open playlists')}</Text>
            </Pressable>
          </View>
          {/* Profiles: one for each child (their own notebook, badges, playlists and settings) */}
          <Text style={styles.section}>{t('Profiles')}</Text>
          <View style={styles.card}>
            <Text style={styles.small}>{t('Each child can have their own profile, with their own notebook, badges, playlists and settings.')}</Text>
            <Pressable onPress={onProfiles} style={[styles.pill, { backgroundColor: '#5f5f5f' }]} accessibilityRole="button">
              <Text style={styles.pillText}>{t('Manage profiles')}</Text>
            </Pressable>
          </View>
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
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
});
