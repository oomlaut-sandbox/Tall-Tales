// Settings (the last item in the main menu, always behind the grown-up question):
//   Language — the app's language, and (members) a different language for the books
//   Parental controls — shape the app down to exactly the experience a parent wants: what shows (Book Store,
//   My Notebook, Create a Story, Help), whether the child may change playback (or it always plays one way),
//   recording, sharing and printing, and changing the language. "Lock everything" leaves only My Library.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, DESK_BG } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { LANGS, useT } from '../i18n';
import { lockedControls, quickSafeControls, DEFAULT_CONTROLS } from '../controls';
import { usePurchases } from '../purchases';

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
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.green, false: '#555' }} thumbColor={colors.white} ios_backgroundColor="#555" />
    </View>
  );
}

export default function Settings({ u, openMenu, lang, setLang, bookLang, setBookLang, controls, setControls, mode, onDone, onJoin }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const ps = usePurchases();
  const set = (patch) => setControls({ ...controls, ...patch });
  // (the child's age is its own setting: Lock and Unlock everything keep it)
  const same = (a, b) => Object.keys(DEFAULT_CONTROLS).every((k) => k === 'childAge' || a[k] === b[k]);
  const allOn = same(controls, DEFAULT_CONTROLS);
  const quick = same(controls, quickSafeControls());
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        <Text style={styles.title}>{t('Settings')}</Text>
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
            {quick ? <Text style={[styles.p, { color: colors.white, fontWeight: '700' }]}>{t('Quick and Safe Kid is on.')}</Text> : (
              <Pressable onPress={() => setControls(quickSafeControls(controls.childAge))} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button">
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
            <Toggle label={t('Show Create a Story')} value={controls.create} onChange={(v) => set({ create: v })} />
            <Toggle label={t('Help and About')} value={controls.help} onChange={(v) => set({ help: v })} />
            <Toggle label={t('Recording own voice')} value={controls.recording} onChange={(v) => set({ recording: v })} />
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
          <View style={styles.card}>
            <Pressable onPress={() => setControls(lockedControls(controls.playMode || mode, controls.childAge))} style={[styles.pill, { backgroundColor: colors.deepRed }]} accessibilityRole="button">
              <Text style={styles.pillText}>{t('Lock everything')}</Text>
            </Pressable>
            <Text style={styles.small}>{t('Only My Library and the books in it, read the way you chose.')}</Text>
            {!allOn ? (
              <Pressable onPress={() => setControls({ ...DEFAULT_CONTROLS, childAge: controls.childAge })} style={[styles.pill, { backgroundColor: '#5f5f5f', marginTop: 6 }]} accessibilityRole="button">
                <Text style={styles.pillText}>{t('Unlock everything')}</Text>
              </Pressable>
            ) : null}
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
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 24, paddingBottom: 40, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 12 },
  section: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '700', color: '#d0d0d0', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14 },
  card: { backgroundColor: '#3a3a3a', borderRadius: 14, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  cardTitle: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 16, color: colors.white },
  p: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#e6e6e6' },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: '#bdbdbd' },
  link: { fontFamily: fonts.ui, fontSize: 14, color: colors.white, textDecorationLine: 'underline' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  choiceOn: { backgroundColor: colors.green },
  choiceText: { fontFamily: fonts.ui, fontSize: 15, color: '#dcdcdc', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 36 },
  rowText: { flex: 1, fontFamily: fonts.ui, fontSize: 16, color: colors.white },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
});
