// The Teacher's Desk (Jörg, 30 Oct 2026): a teacher's own screen, from Settings → Teachers and Educators (so behind
// the grown-up question). Everything stays on this iPad (classroom.js):
//   Book prompts: write one ("My weekend", a few lines of instructions, how many pages); each student in the class
//     finds it in My Workspace as a ready-started book.
//   To review: the books students have handed in. Read one, leave a note, then send it back or approve it.
//   Class Library: the approved books, printed or shared as one class anthology.
//   Classroom lock: no Book Store and no sharing outside the class.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { DESK_FELT } from '../look';
import CoverArt from '../components/CoverArt';
import LineInput from '../components/LineInput';
import { useT } from '../i18n';
import { getProfiles, inClass, onProfiles } from '../profiles';
import { addPrompt, classLocked, onPrompts, removePrompt, setClassLock } from '../classroom';
import { setBookReview } from '../userStories';
import { printAnthology, shareAnthology } from '../pdf';

const PAGES = [2, 4, 6, 8, 12];

function Chip({ label, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && { backgroundColor: colors.green }]} accessibilityRole="radio" accessibilityState={{ selected: !!on }}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function Thumb({ s }) {
  const img = s.cover && s.cover.uri ? null : s.pages[0] && s.pages[0].image;
  return (
    <View style={styles.thumb}>
      {s.cover && s.cover.uri ? <CoverArt cover={s.cover} /> : img ? <Image source={img} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
    </View>
  );
}

// one handed-in book: read it, write a note, send it back or approve it
function ReviewRow({ s, name, openStory, onList, toast }) {
  const t = useT();
  const [note, setNote] = useState(s.note || '');
  const answer = async (handIn) => {
    try {
      onList(await setBookReview(s.id, { handIn, note: note.trim() || null }));
      toast(handIn === 'ok' ? t('“{title}” is in the Class Library.', { title: s.title }) : t('“{title}” went back to {name}.', { title: s.title, name: name || t('the student') }));
    } catch (e) { toast(t('Couldn’t save that. Try again.')); }
  };
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Thumb s={s} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={2}>{s.title}</Text>
          <Text style={styles.rowSub}>{name}</Text>
        </View>
        <Pressable onPress={() => openStory(s)} style={styles.pill} accessibilityRole="button"><Text style={styles.pillText}>{t('Read')}</Text></Pressable>
      </View>
      <TextInput value={note} onChangeText={setNote} multiline placeholder={t('A note for the student (they see it when they open the book)')} placeholderTextColor="#8a8a8a" allowFontScaling={false} style={styles.input} accessibilityLabel={t('A note for the student')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => answer('back')} style={[styles.pill, { flex: 1 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Send back')}</Text></Pressable>
        <Pressable onPress={() => answer('ok')} style={[styles.pill, { flex: 1, backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Approve')}</Text></Pressable>
      </View>
    </View>
  );
}

export default function TeacherDesk({ u, openMenu, toast, stories, onList, openStory, controls, setControls, fontKey }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [, bump] = useState(0);
  useEffect(() => onProfiles(() => bump((n) => n + 1)), []);
  const [prompts, setPrompts] = useState([]);
  useEffect(() => onPrompts(setPrompts), []);
  const classes = getProfiles().classes || [];
  const [cls, setCls] = useState(classes[0] ? classes[0].id : null);
  const klass = classes.find((c) => c.id === cls) || classes[0] || null;
  const students = klass ? inClass(klass.id) : [];
  const nameOf = (id) => (getProfiles().list.find((p) => p.id === id) || {}).name || '';
  // a new prompt
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [pages, setPages] = useState(4);
  const add = () => { addPrompt({ title, note, pages, cls: klass && klass.id }); setTitle(''); setNote(''); toast(t('The prompt is waiting in each student’s My Workspace.')); };
  const mine = (s) => klass && s.mine && s.cls === klass.id;
  const toReview = stories.filter((s) => mine(s) && s.handIn === 'in');
  const library = stories.filter((s) => mine(s) && s.published);
  const classTitle = klass ? (klass.name || t('Classroom')) : t('Classroom');
  const [making, setMaking] = useState(false);
  const anthology = async (share) => {
    if (!library.length || making) return;
    setMaking(true);
    try { await (share ? shareAnthology : printAnthology)(library, t('{name}: our books', { name: classTitle }), 'stacked', fontKey); } catch (e) { toast(t(e.message)); }
    setMaking(false);
  };
  const [lockOn, setLockOn] = useState(false);
  useEffect(() => { if (klass) classLocked(klass.id).then(setLockOn).catch(() => {}); }, [klass && klass.id]);
  const lock = async (on) => {
    setLockOn(on);
    try { await setClassLock(klass.id, on, students.map((st) => st.id), controls, setControls); toast(on ? t('The class is locked.') : t('The lock is off.')); } catch (e) { setLockOn(!on); }
  };
  if (!klass) {
    return (
      <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
        <View style={[styles.band, { paddingTop: insets.top + 30 }]}><Text style={styles.title}>{t('Teacher’s Desk')}</Text></View>
        <View style={styles.body}><Text style={styles.note}>{t('Set up a classroom first: Settings, then Teachers and Educators.')}</Text></View>
      </WithBar>
    );
  }
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        <Text style={styles.title}>{t('Teacher’s Desk')}</Text>
        <Text style={styles.sub}>{classTitle} · {students.length === 1 ? t('1 student') : t('{n} students', { n: students.length })}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {classes.length > 1 ? <View style={styles.chips}>{classes.map((c) => <Chip key={c.id} label={c.name || t('Classroom')} on={c.id === klass.id} onPress={() => setCls(c.id)} />)}</View> : null}

        {/* 1. Book prompts */}
        <Text style={styles.h}>{t('Book prompts')}</Text>
        <Text style={styles.note}>{t('Each student finds a prompt in My Workspace as a ready-started book, with its title and your instructions.')}</Text>
        <View style={styles.row}>
          <LineInput value={title} onChangeText={setTitle} placeholder={t('Title, like My Weekend')} placeholderTextColor="#8a8a8a" maxLength={60} allowFontScaling={false} style={styles.field} accessibilityLabel={t('Prompt title')} />
          <TextInput value={note} onChangeText={setNote} multiline placeholder={t('Instructions, like: A picture and a sentence on each page.')} placeholderTextColor="#8a8a8a" allowFontScaling={false} style={styles.input} accessibilityLabel={t('Instructions')} />
          <Text style={styles.label}>{t('Pages')}</Text>
          <View style={styles.chips}>{PAGES.map((n) => <Chip key={n} label={String(n)} on={pages === n} onPress={() => setPages(n)} />)}</View>
          <Pressable onPress={add} disabled={!title.trim()} style={[styles.pill, { backgroundColor: colors.green, alignSelf: 'flex-start' }, !title.trim() && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={styles.pillText}>{t('Give this prompt to the class')}</Text>
          </Pressable>
        </View>
        {prompts.filter((p) => p.cls === klass.id).map((p) => {
          const started = students.filter((st) => stories.some((s) => s.promptId === p.id && s.owner === st.id)).length;
          return (
            <View key={p.id} style={[styles.row, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>{p.title}</Text>
                <Text style={styles.rowSub}>{t('{n} pages', { n: p.pages })} · {t('{a} of {b} started', { a: started, b: students.length })}</Text>
                {p.note ? <Text style={styles.rowSub} numberOfLines={2}>{p.note}</Text> : null}
              </View>
              <Pressable onPress={() => removePrompt(p.id)} style={styles.pill} accessibilityRole="button" accessibilityLabel={t('Remove the prompt {title}', { title: p.title })}><Text style={styles.pillText}>{t('Remove')}</Text></Pressable>
            </View>
          );
        })}

        {/* 2. To review */}
        <Text style={styles.h}>{t('To review')}</Text>
        {toReview.length ? toReview.map((s) => <ReviewRow key={s.id} s={s} name={nameOf(s.owner)} openStory={openStory} onList={onList} toast={toast} />)
          : <Text style={styles.note}>{t('Nothing handed in yet. Students tap Hand in to my teacher when a book is ready.')}</Text>}

        {/* 3. Class Library */}
        <Text style={styles.h}>{t('Class Library')}</Text>
        <Text style={styles.note}>{library.length ? (library.length === 1 ? t('1 approved book, in My Library for the whole class.') : t('{n} approved books, in My Library for the whole class.', { n: library.length })) : t('Approved books appear here, and in My Library for the whole class.')}</Text>
        {library.length ? (
          <View style={styles.chips}>
            <Pressable onPress={() => anthology(false)} style={[styles.pill, making && { opacity: 0.5 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Print the class book')}</Text></Pressable>
            <Pressable onPress={() => anthology(true)} style={[styles.pill, making && { opacity: 0.5 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Share it as a PDF')}</Text></Pressable>
          </View>
        ) : null}

        {/* 4. Classroom lock */}
        <Text style={styles.h}>{t('Classroom lock')}</Text>
        <View style={[styles.row, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Text style={[styles.note, { flex: 1 }]}>{t('No Book Store, no buying, and no sharing or printing outside the class.')}</Text>
          <Switch value={lockOn} onValueChange={lock} trackColor={{ true: colors.green }} accessibilityLabel={t('Classroom lock')} />
        </View>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1c1c1c' },
  band: { backgroundColor: 'rgba(0,0,0,0.55)', paddingBottom: 26, paddingHorizontal: 24, gap: 6 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32 },
  sub: { color: '#cfcac0', fontFamily: fonts.ui, fontSize: 15 },
  body: { padding: 20, paddingBottom: 80, gap: 14 },
  h: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 21, marginTop: 14 },
  note: { color: '#cfcac0', fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  label: { color: '#9d988f', fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  row: { backgroundColor: 'rgba(16,16,16,0.82)', borderRadius: 14, padding: 14, gap: 10 },
  rowTitle: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  rowSub: { color: '#b5b0a7', fontFamily: fonts.ui, fontSize: 13, marginTop: 2 },
  thumb: { width: 54, height: 54, backgroundColor: '#444', overflow: 'hidden' },
  field: { backgroundColor: '#0e0e0e', borderRadius: 12, height: 46, paddingHorizontal: 12, fontFamily: fonts.ui, fontSize: 15, color: colors.white },
  input: { backgroundColor: '#0e0e0e', borderRadius: 12, minHeight: 70, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.ui, fontSize: 15, color: colors.white, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#454545', borderRadius: 18, height: 36, minWidth: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14 },
  pill: { backgroundColor: '#454545', borderRadius: 22, height: 44, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
});
