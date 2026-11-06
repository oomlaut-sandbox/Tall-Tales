// The Teacher's Desk (Jörg, 30 Oct 2026): a teacher's own screen, from Settings → Teachers and Educators (so behind
// the grown-up question). Everything stays on this iPad (classroom.js):
//   Book prompts: write one ("My weekend", a few lines of instructions, how many pages); each student in the class
//     finds it in My Workspace as a ready-started book.
//   To review: the books students have handed in. Read one, leave a note, then send it back or approve it.
//   Class Library: the approved books, printed or shared as one class anthology.
//   Classroom lock: no Book Store and no sharing outside the class.
//   (6 Nov 2026) A prompt can start from a ready-made starter (All About Me…) or one of the teacher's own books, be
//     one page each for a class book (bound into one book here), carry a word bank, and ask for the book to be read
//     aloud. Each prompt shows how every student is doing. A note can go on any page of a handed-in book. The
//     Class Library sends each student's books home as a PDF for their family.
//   Sheets and pins (Jörg, 6 Nov 2026): draw on a sheet of paper and leave it in students' Things to share, pin it to
//     their Message Boards, or pin a note; for the whole class or chosen students.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Bar, Burger, WithBar } from '../components/Chrome';
// the Teacher's Desk sits on Jörg's light oak, with an apple for the teacher (6 Nov 2026); every other screen keeps the felt
const OAK = require('../../assets/desk-oak.jpg');
const APPLE = require('../../assets/desk-apple.png');
const Oak = () => <Image source={OAK} resizeMode="cover" style={StyleSheet.absoluteFill} />;
import CoverArt from '../components/CoverArt';
import LineInput from '../components/LineInput';
import { useT } from '../i18n';
import { getProfiles, inClass, onProfiles } from '../profiles';
import { STARTERS, addPrompt, classLocked, lockSet, newPromptId, onPrompts, removePrompt, setClassLock, statusOf } from '../classroom';
import { newPageId, overOf, saveUserStory, setBookReview } from '../userStories';
import { keepFile, liveUri } from '../storage';
import { draftFrom } from './Publisher';
import { printAnthology, shareAnthology } from '../pdf';
import { PAPERS, paperFile } from '../sheets';
import { giveSheet } from '../folder';
import { pinFor } from '../corkboard';
import { strokesToImage } from '../components/Strokes';
import { DrawEditor } from './Notebook';

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
  // a note on any page (6 Nov 2026): tap a page, write; the student sees it when that page is open
  const body = (s.pages || []).filter((p) => !p.titlePage);
  const [pageNotes, setPageNotes] = useState(s.pageNotes || {});
  const [onPage, setOnPage] = useState(null);
  const answer = async (handIn) => {
    try {
      const pn = Object.fromEntries(Object.entries(pageNotes).map(([k, v]) => [k, (v || '').trim()]).filter(([k, v]) => v && body.some((p) => p.pid === k)));
      onList(await setBookReview(s.id, { handIn, note: note.trim() || null, pageNotes: Object.keys(pn).length ? pn : null }));
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
      {body.length ? (
        <>
          <Text style={styles.label}>{t('A note on a page')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {body.map((p, k) => (
              <Pressable key={p.pid || k} onPress={() => setOnPage(onPage === p.pid ? null : p.pid)} accessibilityRole="button" accessibilityLabel={t('Page {n}', { n: k + 1 })}
                style={[styles.pageThumb, onPage === p.pid && { borderColor: colors.green }]}>
                {p.image ? <Image source={p.image} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text numberOfLines={4} style={styles.pageThumbText}>{p.text}</Text>}
                <Text style={styles.pageNum}>{k + 1}{(pageNotes[p.pid] || '').trim() ? ' ✎' : ''}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {onPage ? (
            <TextInput value={pageNotes[onPage] || ''} onChangeText={(v) => setPageNotes((m) => ({ ...m, [onPage]: v }))} multiline autoFocus
              placeholder={t('A note about page {n}', { n: body.findIndex((p) => p.pid === onPage) + 1 })} placeholderTextColor="#8a8a8a" allowFontScaling={false} style={styles.input} accessibilityLabel={t('A note on this page')} />
          ) : null}
        </>
      ) : null}
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
  const [together, setTogether] = useState(false); // one page each, for a class book
  const [from, setFrom] = useState('blank'); // 'blank' | a starter's k | 'book'
  const [fromBook, setFromBook] = useState(null); // one of the teacher's books, as the starter
  const [words, setWords] = useState('');
  const [record, setRecord] = useState(false);
  const [adding, setAdding] = useState(false);
  const teacherBooks = stories.filter((s) => s.mine && !s.owner && (s.pages || []).some((p) => !p.titlePage));
  const pickFrom = (k) => {
    setFrom(k); setFromBook(null);
    const st = STARTERS.find((x) => x.k === k);
    if (st) { setTitle(t(st.title)); setNote(t(st.note)); setPages(st.hints.length); setTogether(false); }
  };
  const resetForm = () => { setTitle(''); setNote(''); setWords(''); setRecord(false); setFrom('blank'); setFromBook(null); setTogether(false); };
  const add = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const id = newPromptId();
      const st = STARTERS.find((x) => x.k === from);
      let starter = null;
      const book = from === 'book' && fromBook ? stories.find((s) => s.id === fromBook) : null;
      if (book) {
        // the book's pages, its pictures kept once for every student (prompts/<id>/)
        starter = [];
        const ps = draftFrom(book).pages;
        for (let k = 0; k < ps.length; k += 1) {
          const p = ps[k];
          const copy = async (u, n) => (u ? keepFile(liveUri(u), `prompts/${id}`, `p${k}-${n}.jpg`) : null);
          starter.push({ text: p.text || '', uri: await copy(p.uri, 1), w: p.w, h: p.h, uri2: await copy(p.uri2, 2), w2: p.w2 || 1, h2: p.h2 || 1, ...overOf(p) });
        }
      }
      addPrompt({ id, title, note, pages, cls: klass && klass.id, together, hints: st && !together ? st.hints : null, starter: together ? null : starter, words: words.split(/[,\n]/), record });
      resetForm();
      toast(t('The prompt is waiting in each student’s My Workspace.'));
    } catch (e) { toast(t('That didn’t work. Try again.')); }
    setAdding(false);
  };
  // one page each: the students' pages bound into one class book, in the Class Library (6 Nov 2026)
  const STATUS = { none: 'Not started', working: 'Working on it', in: 'Handed in', back: 'Sent back', ok: 'Approved' };
  const bind = async (pr) => {
    const books = students.map((st) => stories.find((s) => s.promptId === pr.id && s.owner === st.id && (s.handIn === 'in' || s.handIn === 'ok'))).filter(Boolean);
    if (!books.length || busy) return;
    setBusy(true);
    try {
      const id = `s${Date.now()}`;
      const out = [];
      for (const b of books) {
        for (const p of draftFrom(b).pages) {
          const n = out.length;
          const copy = async (u, x) => (u ? keepFile(liveUri(u), `stories/${id}`, `img-${n}-${x}.jpg`) : null);
          out.push({ pid: newPageId(), text: p.text || '', uri: await copy(p.uri, 1), w: p.w, h: p.h, uri2: await copy(p.uri2, 2), w2: p.w2 || 1, h2: p.h2 || 1, ...overOf(p) });
        }
      }
      onList(await saveUserStory({ id, title: pr.title, writer: classTitle, artist: '', pages: out, cls: klass.id }, { publish: true }));
      toast(t('“{title}” is in the Class Library.', { title: pr.title }));
    } catch (e) { toast(t('That didn’t work. Try again.')); }
    setBusy(false);
  };
  // each student's approved books, home to their family as one PDF
  const forFamily = async (st) => {
    const theirs = library.filter((s) => s.owner === st.id);
    if (!theirs.length || making) return;
    setMaking(true);
    try { await shareAnthology(theirs, t('{name}’s books', { name: st.name }), 'stacked', fontKey); } catch (e) { toast(t(e.message)); }
    setMaking(false);
  };
  const mine = (s) => klass && s.mine && s.cls === klass.id;
  const toReview = stories.filter((s) => mine(s) && s.handIn === 'in');
  const library = stories.filter((s) => mine(s) && s.published);
  const classTitle = klass ? (klass.name || t('Classroom')) : t('Classroom');
  const [making, setMaking] = useState(false);
  const [openPrompt, setOpenPrompt] = useState(null); // the prompt showing who's done what
  const anthology = async (share) => {
    if (!library.length || making) return;
    setMaking(true);
    try { await (share ? shareAnthology : printAnthology)(library, t('{name}: our books', { name: classTitle }), 'stacked', fontKey); } catch (e) { toast(t(e.message)); }
    setMaking(false);
  };
  // ---- Sheets and pins: for the whole class, or chosen students ----
  const [forAll, setForAll] = useState(true);
  const [chosen, setChosen] = useState([]);
  const toIds = () => (forAll ? students.map((st) => st.id) : chosen.filter((id) => students.some((st) => st.id === id)));
  const [drawOn, setDrawOn] = useState(null); // { bg }: drawing a sheet
  const [made, setMade] = useState(null); // { strokes, bg }: a finished sheet, where should it go?
  const [pinText, setPinText] = useState('');
  const [busy, setBusy] = useState(false);
  const startPaper = async (src) => { try { setDrawOn({ bg: await paperFile(src) }); } catch (e) { toast(t('That didn’t work. Try again.')); } };
  const deliver = async (where) => {
    const m = made; const ids = toIds();
    if (!m || !ids.length || busy) return;
    setBusy(true);
    try {
      if (where !== 'pin') await giveSheet(ids, { kind: 'page', from: t('Your teacher'), page: { kind: 'drawing', strokes: m.strokes } }, m.bg);
      if (where !== 'folder') { const png = await strokesToImage(m.strokes, 1200, '#ffffff', m.bg); await pinFor(ids, { kind: 'doodle', uri: png }); }
      setMade(null);
      toast(ids.length === 1 ? t('Sent to 1 student.') : t('Sent to {n} students.', { n: ids.length }));
    } catch (e) { toast(t('That didn’t work. Try again.')); }
    setBusy(false);
  };
  const pinNoteNow = async () => {
    const ids = toIds();
    if (!pinText.trim() || !ids.length || busy) return;
    setBusy(true);
    try { await pinFor(ids, { kind: 'note', text: pinText }); setPinText(''); toast(ids.length === 1 ? t('Pinned for 1 student.') : t('Pinned for {n} students.', { n: ids.length })); }
    catch (e) { toast(t('That didn’t work. Try again.')); }
    setBusy(false);
  };
  const [lockOn, setLockOn] = useState(true);
  // the lock is on by default (6 Nov 2026): a class that's never had it set gets it now, for every student in it
  useEffect(() => {
    if (!klass) return;
    (async () => {
      if (!(await lockSet(klass.id))) await setClassLock(klass.id, true, students.map((st) => st.id), controls, setControls);
      setLockOn(await classLocked(klass.id));
    })().catch(() => {});
  }, [klass && klass.id]);
  const lock = async (on) => {
    setLockOn(on);
    try { await setClassLock(klass.id, on, students.map((st) => st.id), controls, setControls); toast(on ? t('The class is locked.') : t('The lock is off.')); } catch (e) { setLockOn(!on); }
  };
  if (!klass) {
    return (
      <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
        <Oak />
        <View style={[styles.band, { paddingTop: insets.top + 30 }]}><Text style={styles.title}>{t('Teacher’s Desk')}</Text></View>
        <View style={styles.body}><Text style={styles.loose}>{t('Set up a classroom first: Settings, then Teachers and Educators.')}</Text></View>
      </WithBar>
    );
  }
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
        <Oak />
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        <Text style={styles.title}>{t('Teacher’s Desk')}</Text>
        <Text style={styles.sub}>{classTitle} · {students.length === 1 ? t('1 student') : t('{n} students', { n: students.length })}</Text>
        {/* an apple for the teacher, sitting on the desk with its shadow */}
        <Image source={APPLE} style={[styles.apple, { top: insets.top + 54 }]} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {classes.length > 1 ? <View style={styles.chips}>{classes.map((c) => <Chip key={c.id} label={c.name || t('Classroom')} on={c.id === klass.id} onPress={() => setCls(c.id)} />)}</View> : null}

        {/* 1. Book prompts */}
        <Text style={styles.h}>{t('Book prompts')}</Text>
        <Text style={styles.loose}>{t('Each student finds a prompt in My Workspace as a ready-started book, with its title and your instructions.')}</Text>
        <View style={styles.row}>
          <LineInput value={title} onChangeText={setTitle} placeholder={t('Title, like My Weekend')} placeholderTextColor="#8a8a8a" maxLength={60} allowFontScaling={false} style={styles.field} accessibilityLabel={t('Prompt title')} />
          <TextInput value={note} onChangeText={setNote} multiline placeholder={t('Instructions, like: A picture and a sentence on each page.')} placeholderTextColor="#8a8a8a" allowFontScaling={false} style={styles.input} accessibilityLabel={t('Instructions')} />
          <Text style={styles.label}>{t('Who makes what')}</Text>
          <View style={styles.chips}>
            <Chip label={t('A book each')} on={!together} onPress={() => setTogether(false)} />
            <Chip label={t('One page each, for a class book')} on={together} onPress={() => { setTogether(true); if (from !== 'blank') pickFrom('blank'); }} />
          </View>
          {!together ? (
            <>
              <Text style={styles.label}>{t('Start from')}</Text>
              <View style={styles.chips}>
                <Chip label={t('Blank pages')} on={from === 'blank'} onPress={() => pickFrom('blank')} />
                {STARTERS.map((st) => <Chip key={st.k} label={t(st.title)} on={from === st.k} onPress={() => pickFrom(st.k)} />)}
                {teacherBooks.length ? <Chip label={t('One of my books')} on={from === 'book'} onPress={() => { setFrom('book'); }} /> : null}
              </View>
              {from === 'book' ? (
                <View style={styles.chips}>
                  {teacherBooks.map((b) => <Chip key={b.id} label={b.title} on={fromBook === b.id} onPress={() => { setFromBook(b.id); if (!title.trim() || teacherBooks.some((x) => x.title === title)) setTitle(b.title); }} />)}
                </View>
              ) : null}
              {from === 'book' ? <Text style={styles.rowSub}>{t('Every student starts with a copy of its pages, pictures and words.')}</Text>
                : STARTERS.some((st) => st.k === from) ? <Text style={styles.rowSub}>{t('Each page starts with a few words to help, like “{hint}”', { hint: t(STARTERS.find((st) => st.k === from).hints[0]) })}</Text> : null}
            </>
          ) : <Text style={styles.rowSub}>{t('Each student makes one page. When they hand them in, bind them into one class book here.')}</Text>}
          {!together && from !== 'book' ? (
            <>
              <Text style={styles.label}>{t('Pages')}</Text>
              <View style={styles.chips}>{PAGES.map((n) => <Chip key={n} label={String(n)} on={pages === n} onPress={() => setPages(n)} />)}</View>
            </>
          ) : null}
          <Text style={styles.label}>{t('Word bank')}</Text>
          <LineInput value={words} onChangeText={setWords} placeholder={t('Words to use, like: seed, root, leaf')} placeholderTextColor="#8a8a8a" maxLength={200} allowFontScaling={false} style={styles.field} accessibilityLabel={t('Word bank')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[styles.note, { flex: 1 }]}>{t('Ask them to read it aloud before they hand it in')}</Text>
            <Switch value={record} onValueChange={setRecord} trackColor={{ true: colors.green }} accessibilityLabel={t('Ask them to read it aloud before they hand it in')} />
          </View>
          <Pressable onPress={add} disabled={!title.trim() || adding || (from === 'book' && !fromBook)} style={[styles.pill, { backgroundColor: colors.green, alignSelf: 'flex-start' }, (!title.trim() || adding || (from === 'book' && !fromBook)) && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={styles.pillText}>{t('Give this prompt to the class')}</Text>
          </Pressable>
        </View>
        {prompts.filter((p) => p.cls === klass.id).map((p) => {
          const started = students.filter((st) => stories.some((s) => s.promptId === p.id && s.owner === st.id)).length;
          const ready = students.filter((st) => ['in', 'ok'].includes(statusOf(p, st.id, stories))).length;
          const open = openPrompt === p.id;
          return (
            <View key={p.id} style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable onPress={() => setOpenPrompt(open ? null : p.id)} style={{ flex: 1, minWidth: 0 }} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                  <Text style={styles.rowTitle}>{p.title}</Text>
                  <Text style={styles.rowSub}>{p.together ? t('One page each, for a class book') : t('{n} pages', { n: p.pages })} · {t('{a} of {b} started', { a: started, b: students.length })}</Text>
                  {p.note ? <Text style={styles.rowSub} numberOfLines={2}>{p.note}</Text> : null}
                  {p.words ? <Text style={styles.rowSub} numberOfLines={1}>{t('Word bank')}: {p.words.join(', ')}</Text> : null}
                  {p.record ? <Text style={styles.rowSub}>{t('Read aloud before handing in')}</Text> : null}
                  <Text style={[styles.rowSub, { color: colors.white, marginTop: 6 }]}>{open ? t('Hide who’s done what') : t('See who’s done what')}</Text>
                </Pressable>
                <Pressable onPress={() => removePrompt(p.id)} style={styles.pill} accessibilityRole="button" accessibilityLabel={t('Remove the prompt {title}', { title: p.title })}><Text style={styles.pillText}>{t('Remove')}</Text></Pressable>
              </View>
              {open ? (
                <View style={{ gap: 6 }}>
                  {students.map((st) => {
                    const k = statusOf(p, st.id, stories);
                    return (
                      <View key={st.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                        <Text style={styles.statusName} numberOfLines={1}>{st.name}</Text>
                        <Text style={[styles.statusText, k === 'ok' && { color: '#9fd39a' }, k === 'in' && { color: '#f2c14e' }, k === 'none' && { color: '#8a8580' }]}>{t(STATUS[k])}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              {p.together && ready ? (
                <Pressable onPress={() => bind(p)} style={[styles.pill, { backgroundColor: colors.green, alignSelf: 'flex-start' }, busy && { opacity: 0.5 }]} accessibilityRole="button">
                  <Text style={styles.pillText}>{ready === 1 ? t('Make the class book (1 page)') : t('Make the class book ({n} pages)', { n: ready })}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}

        {/* Sheets and pins (Jörg, 6 Nov 2026) */}
        <Text style={styles.h}>{t('Sheets and pins')}</Text>
        <Text style={styles.loose}>{t('Leave a sheet in your students’ Things to share, or pin a drawing or a note to their Message Boards.')}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('For')}</Text>
          <View style={styles.chips}>
            <Chip label={t('The whole class')} on={forAll} onPress={() => setForAll(true)} />
            {students.map((st) => <Chip key={st.id} label={st.name} on={!forAll && chosen.includes(st.id)} onPress={() => { setForAll(false); setChosen((c) => (c.includes(st.id) ? c.filter((x) => x !== st.id) : [...c, st.id])); }} />)}
          </View>
          <Text style={styles.label}>{t('Draw on a sheet')}</Text>
          <View style={styles.chips}>
            {PAPERS.map(([k, label, src]) => (
              <Pressable key={k} onPress={() => startPaper(src)} disabled={!toIds().length} style={{ alignItems: 'center', gap: 6, opacity: toIds().length ? 1 : 0.4 }} accessibilityRole="button" accessibilityLabel={t(label)}>
                <Image source={src} style={{ width: 72, height: 72, borderRadius: 3 }} />
                <Text style={styles.rowSub}>{t(label)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{t('Pin a note')}</Text>
          <LineInput value={pinText} onChangeText={setPinText} placeholder={t('Like: Library day tomorrow!')} placeholderTextColor="#8a8a8a" maxLength={60} allowFontScaling={false} style={styles.field} accessibilityLabel={t('Pin a note')} />
          <Pressable onPress={pinNoteNow} disabled={!pinText.trim() || !toIds().length || busy} style={[styles.pill, { backgroundColor: colors.green, alignSelf: 'flex-start' }, (!pinText.trim() || !toIds().length) && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={styles.pillText}>{t('Pin it to their Message Boards')}</Text>
          </Pressable>
        </View>

        {/* 2. To review */}
        <Text style={styles.h}>{t('To review')}</Text>
        {toReview.length ? toReview.map((s) => <ReviewRow key={s.id} s={s} name={nameOf(s.owner)} openStory={openStory} onList={onList} toast={toast} />)
          : <Text style={styles.loose}>{t('Nothing handed in yet. Students tap Hand in to my teacher when a book is ready.')}</Text>}

        {/* 3. Class Library */}
        <Text style={styles.h}>{t('Class Library')}</Text>
        <Text style={styles.loose}>{library.length ? (library.length === 1 ? t('1 approved book, in My Library for the whole class.') : t('{n} approved books, in My Library for the whole class.', { n: library.length })) : t('Approved books appear here, and in My Library for the whole class.')}</Text>
        {library.length ? (
          <View style={styles.chips}>
            <Pressable onPress={() => anthology(false)} style={[styles.pill, making && { opacity: 0.5 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Print the class book')}</Text></Pressable>
            <Pressable onPress={() => anthology(true)} style={[styles.pill, making && { opacity: 0.5 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Share it as a PDF')}</Text></Pressable>
          </View>
        ) : null}
        {/* home to families: each student's approved books, as one PDF (6 Nov 2026) */}
        {students.some((st) => library.some((s) => s.owner === st.id)) ? (
          <View style={styles.row}>
            <Text style={styles.label}>{t('For families')}</Text>
            <Text style={styles.note}>{t('Send a student’s books home as one PDF, to share with their family.')}</Text>
            <View style={styles.chips}>
              {students.filter((st) => library.some((s) => s.owner === st.id)).map((st) => <Chip key={st.id} label={st.name} on={false} onPress={() => forFamily(st)} />)}
            </View>
          </View>
        ) : null}

        {/* 4. Classroom lock */}
        <Text style={styles.h}>{t('Classroom lock')}</Text>
        <View style={[styles.row, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Text style={[styles.note, { flex: 1 }]}>{t('No Book Store, no buying, and no sharing or printing outside the class.')}</Text>
          <Switch value={lockOn} onValueChange={lock} trackColor={{ true: colors.deepRed }} ios_backgroundColor="#5a5a5a" accessibilityLabel={t('Classroom lock')} />
        </View>
      </ScrollView>
      {/* a finished sheet: where it goes */}
      {made ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 }]}>
          <View style={[styles.row, { width: '100%', maxWidth: 420, backgroundColor: 'rgba(0,0,0,0.88)', borderRadius: 24, padding: 24, gap: 12 }]}>
            <Text style={[styles.rowTitle, { fontSize: 18 }]}>{t('Where should the sheet go?')}</Text>
            <Text style={styles.note}>{forAll ? t('For the whole class.') : t('For {n} students.', { n: toIds().length })}</Text>
            <Pressable onPress={() => deliver('folder')} style={[styles.pill, busy && { opacity: 0.5 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Things to share')}</Text></Pressable>
            <Pressable onPress={() => deliver('pin')} style={[styles.pill, busy && { opacity: 0.5 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('The Message Board')}</Text></Pressable>
            <Pressable onPress={() => deliver('both')} style={[styles.pill, { backgroundColor: colors.green }, busy && { opacity: 0.5 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Both')}</Text></Pressable>
            <Pressable onPress={() => setMade(null)} style={[styles.pill, { backgroundColor: '#2e2e2e' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Cancel')}</Text></Pressable>
          </View>
        </View>
      ) : null}
      {/* drawing the sheet: the drawing tools, over the desk */}
      {drawOn ? (
        <DrawEditor insets={insets} photo={drawOn.bg} strokes={[]} title={t('A sheet for the class')} draftKey="teacher:sheet"
          onDone={(strokes) => { const d = drawOn; setDrawOn(null); if ((strokes || []).some((x) => !x.e)) setMade({ strokes, bg: d.bg }); }} />
      ) : null}
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1c1c1c' },
  band: { backgroundColor: 'rgba(0,0,0,0.55)', paddingBottom: 26, paddingHorizontal: 24, gap: 6 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32, transform: [{ translateY: -3 }] }, // (level with the other screens' titles)
  sub: { color: '#cfcac0', fontFamily: fonts.ui, fontSize: 15 },
  body: { padding: 20, paddingBottom: 80, gap: 14 },
  // on the oak (6 Nov 2026): loose headings and notes sit in light see-through white boxes, in black and very dark grey
  h: { color: '#111111', fontFamily: fonts.uiBold, fontSize: 21, marginTop: 14, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, overflow: 'hidden' },
  loose: { color: '#2a2a2a', fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden' },
  apple: { position: 'absolute', right: 22, width: 84, height: 86, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 3, height: 6 } },
  note: { color: '#cfcac0', fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  label: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17, marginTop: 12 }, // (plain words, bigger and white, with room above: 6 Nov 2026)
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
  pageThumb: { width: 64, height: 64, backgroundColor: '#f4f1ea', borderRadius: 4, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', padding: 4 },
  pageThumbText: { fontFamily: fonts.ui, fontSize: 8, lineHeight: 10, color: '#2b2b2b' },
  pageNum: { position: 'absolute', right: 3, bottom: 2, fontFamily: fonts.uiBold, fontSize: 11, color: '#1c1c1c', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 6, paddingHorizontal: 4, overflow: 'hidden' },
  statusName: { color: colors.white, fontFamily: fonts.ui, fontSize: 14, flex: 1, minWidth: 0 },
  statusText: { color: '#cfcac0', fontFamily: fonts.uiBold, fontSize: 14 },
});
