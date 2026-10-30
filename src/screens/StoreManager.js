// The Store Manager: the store owner's own screen (in the menu only for them). Every Book Store book,
// hidden ones too: show or hide it, feature it, choose its shelf and its place on the shelf, write its
// synopsis and age range, see how its narration is doing (and make it again), or take it out of the store.
// New books arrive here from the book maker's "Publish to the Book Store" (hidden until shown here).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Bar, Burger, WithBar } from '../components/Chrome';
import CoverArt from '../components/CoverArt';
import { ageText, coverFor, storageUrl } from '../catalog';
import { LANG_NAMES, addShelf, approveTranslation, loadAllForManager, loadStoreContent, removeFromStore, saveTranslation, startNarration, startTranslation, updateBook, updateShelf, withdrawTranslation } from '../storeAdmin';

const NARRATION = { none: 'No narration yet', working: 'Narration being made…', ready: 'Narration ready', failed: 'Narration failed' };

function Choice({ options, value, onChange }) {
  return (
    <View style={styles.choices}>
      {options.map(([v, label]) => (
        <Pressable key={String(v)} onPress={() => onChange(v)} style={[styles.chip, value === v && { backgroundColor: colors.green }]} accessibilityRole="button" accessibilityState={{ selected: value === v }}>
          <Text style={styles.chipText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Languages (30 Oct 2026) ─────────────────────────────────────────────────────────────────────────
// Each store book in German, French, Spanish, Japanese and Arabic: made by the translation service when
// the book is published, read over (and corrected) here, then approved, which makes its narration.
// Families only see a language once it is ready; until then the book shows and reads in English.
const LANG_STATUS = {
  translating: 'Being translated…', review: 'Ready for you to read over', narrating: 'Approved, narration being made…',
  ready: 'Ready: families see and hear it', failed: 'Something went wrong',
};
const busyLang = (st) => st === 'translating' || st === 'narrating';
const langSummary = (b) => {
  const v = Object.values(b.langs || {});
  if (b.bundled || !v.length) return null;
  const ready = v.filter((x) => x.status === 'ready').length, review = v.filter((x) => x.status === 'review').length;
  return [ready ? `${ready + 1} of 6 languages` : null, review ? `${review} to read over` : null].filter(Boolean).join(', ') || null;
};

function LangReview({ book, lang, onDone, toast }) {
  const [c, setC] = useState(null); // content.json
  const [ed, setEd] = useState(null); // { title, coverTitle, credits, blurb, pages: { pid: words } }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    (book.demoContent ? Promise.resolve(book.demoContent) : loadStoreContent(book.id)).then((cc) => {
      const L = (cc.langs || {})[lang] || {};
      setC(cc);
      setEd({ title: L.title || '', coverTitle: L.coverTitle || '', credits: L.credits || '', blurb: L.blurb || '', pages: { ...(L.pages || {}) } });
    }).catch((e) => setErr(e.message));
  }, [book.id, lang]);
  if (err) return <Text style={styles.err}>{err}</Text>;
  if (!c || !ed) return <ActivityIndicator color={colors.ink} />;
  const rtl = lang === 'ar';
  const field = (value, onChange, opts = {}) => (
    <TextInput value={value} onChangeText={onChange} multiline={!!opts.multi} allowFontScaling={false}
      style={[styles.input, opts.multi && { minHeight: 70 }, rtl && { textAlign: 'right', writingDirection: 'rtl' }]} />
  );
  const set = (k) => (v) => setEd((e) => ({ ...e, [k]: v }));
  const setPage = (pid) => (v) => setEd((e) => ({ ...e, pages: { ...e.pages, [pid]: v } }));
  const pages = (c.pages || []).filter((p) => p.text && p.text.trim());
  const missing = pages.filter((p) => !(ed.pages[p.pid] || '').trim()).length + (ed.title.trim() ? 0 : 1);
  const run = async (fn, note) => { setBusy(true); try { await fn(); toast(note); onDone(); } catch (e) { toast(`Couldn’t do it. ${e.message}`); } setBusy(false); };
  const ready = (book.langs || {})[lang]?.status === 'ready';
  return (
    <View style={styles.review}>
      <Text style={styles.note}>The English is in grey above each line. Change anything that doesn’t sound right; it’s narrated exactly as written here.</Text>
      <Text style={styles.label}>Title</Text>
      <Text style={styles.en}>{c.title}</Text>
      {field(ed.title, set('title'))}
      {c.coverTitle && c.coverTitle.text ? (
        <>
          <Text style={styles.label}>Title on the cover</Text>
          <Text style={styles.en}>{c.coverTitle.text}</Text>
          {field(ed.coverTitle, set('coverTitle'))}
        </>
      ) : null}
      {ed.credits || c.writer || c.artist ? (
        <>
          <Text style={styles.label}>Credits on the title page</Text>
          {field(ed.credits, set('credits'))}
        </>
      ) : null}
      {book.blurb ? (
        <>
          <Text style={styles.label}>Synopsis</Text>
          <Text style={styles.en}>{book.blurb}</Text>
          {field(ed.blurb, set('blurb'), { multi: true })}
        </>
      ) : null}
      {pages.map((p, i) => (
        <View key={p.pid} style={{ gap: 6 }}>
          <Text style={styles.label}>Page {i + 1}</Text>
          <Text style={styles.en}>{p.text}</Text>
          {field(ed.pages[p.pid] || '', setPage(p.pid), { multi: true })}
        </View>
      ))}
      <View style={[styles.choices, { marginTop: 10 }]}>
        <Pressable disabled={busy || missing > 0} onPress={() => run(() => approveTranslation(book.id, lang, ed), `${LANG_NAMES[lang]} approved. Making the narration…`)}
          style={[styles.pill, { backgroundColor: colors.green }, (busy || missing > 0) && { opacity: 0.4 }]} accessibilityRole="button">
          <Text style={styles.pillText}>{ready ? 'Save and narrate again' : 'Approve and narrate'}</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => run(() => saveTranslation(book.id, lang, ed), 'Saved.')} style={[styles.pill, busy && { opacity: 0.4 }]} accessibilityRole="button">
          <Text style={styles.pillText}>Save for later</Text>
        </Pressable>
      </View>
      {missing > 0 ? <Text style={styles.note}>{missing === 1 ? 'One line is' : `${missing} lines are`} still empty.</Text> : null}
      {ready ? (
        <Pressable disabled={busy} onPress={() => run(() => withdrawTranslation(book.id, lang), `${LANG_NAMES[lang]} is hidden from families.`)} style={[styles.pill, { backgroundColor: colors.deepRed }]} accessibilityRole="button">
          <Text style={styles.pillText}>Hide this language from families</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Languages({ book, onChanged, toast }) {
  const [openLang, setOpenLang] = useState(null);
  const langs = book.langs || {};
  const doTr = async (force) => { try { await startTranslation(book.id, null, force); toast('Translating…'); onChanged(); } catch (e) { toast(`Couldn’t start it. ${e.message}`); } };
  return (
    <>
      <Text style={styles.label}>Languages</Text>
      <Text style={styles.note}>Families see the book in their language once you approve the translation and its narration is made. Until then it’s in English.</Text>
      {Object.entries(LANG_NAMES).map(([l, name]) => {
        const L = langs[l] || {};
        const st = L.status;
        return (
          <View key={l} style={styles.langRow}>
            <Pressable disabled={!st || busyLang(st) || (st === 'failed' && !L.title)} onPress={() => setOpenLang((o) => (o === l ? null : l))} style={styles.langHead} accessibilityRole="button" accessibilityState={{ expanded: openLang === l }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>{name}{L.title ? `: ${L.title}` : ''}</Text>
                <Text style={[styles.rowSub, st === 'review' && { color: '#9a4b00' }, st === 'failed' && { color: '#b00000' }]}>{st ? LANG_STATUS[st] || st : 'Not translated yet'}{st === 'failed' && L.note ? `: ${L.note}` : ''}</Text>
              </View>
              {busyLang(st) ? <ActivityIndicator color={colors.ink} /> : st && !(st === 'failed' && !L.title) ? <Text style={styles.chev}>{openLang === l ? '–' : st === 'review' ? 'Read' : '+'}</Text> : null}
            </Pressable>
            {openLang === l ? <LangReview book={book} lang={l} toast={toast} onDone={() => { setOpenLang(null); onChanged(); }} /> : null}
          </View>
        );
      })}
      <View style={styles.choices}>
        <Pressable onPress={() => doTr(false)} style={[styles.pill, { backgroundColor: colors.blue }]} accessibilityRole="button">
          <Text style={styles.pillText}>{Object.keys(langs).length ? 'Translate what changed' : 'Translate'}</Text>
        </Pressable>
        {Object.keys(langs).length ? (
          <Pressable onPress={() => doTr(true)} style={styles.pill} accessibilityRole="button"><Text style={styles.pillText}>Translate everything again</Text></Pressable>
        ) : null}
      </View>
    </>
  );
}

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function BookRow({ book, shelves, siblings, onChanged, toast }) {
  const [open, setOpen] = useState(false);
  const [blurb, setBlurb] = useState(book.blurb || '');
  const [process, setProcess] = useState(book.process || '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const save = async (patch, note) => {
    try { await updateBook(book.id, patch); if (note) toast(note); onChanged(); } catch (e) { toast(`Couldn’t save. ${e.message}`); }
  };
  // move it one place earlier or later on its shelf (swaps places with its neighbour)
  const move = async (dir) => {
    const i = siblings.findIndex((b) => b.id === book.id), j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    const other = siblings[j];
    const a = book.sort === other.sort ? other.sort + dir : other.sort;
    try { await updateBook(book.id, { sort: a }); await updateBook(other.id, { sort: book.sort }); onChanged(); } catch (e) { toast(`Couldn’t move it. ${e.message}`); }
  };
  const art = !book.bundled && book.cover_title ? { uri: storageUrl(book.cover_path), title: book.cover_title } : null;
  const cover = coverFor(book);
  const status = [book.published ? 'In the store' : 'Hidden', book.featured ? 'Featured' : null, (shelves.find((s) => s.id === book.shelf_id) || {}).title, book.bundled ? 'Inside the app' : NARRATION[book.narration_status] || null, langSummary(book)].filter(Boolean).join(' · ');
  return (
    <View style={styles.row}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.rowHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={styles.thumb}>
          {art ? <CoverArt cover={art} /> : cover ? <Image source={cover} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{book.title}</Text>
          <Text style={[styles.rowSub, !book.published && { color: '#9a4b00' }]} numberOfLines={2}>{status}</Text>
        </View>
        <Text style={styles.chev}>{open ? '–' : '+'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.edit}>
          <Text style={styles.label}>In the Book Store</Text>
          <Choice options={[[false, 'Hidden'], [true, 'Shown']]} value={!!book.published}
            onChange={(v) => save({ published: v }, v ? `“${book.title}” is in the Book Store now.` : `“${book.title}” is hidden.`)} />
          <Text style={styles.label}>Featured at the top</Text>
          <Choice options={[[false, 'No'], [true, 'Yes']]} value={!!book.featured} onChange={(v) => save({ featured: v })} />
          <Text style={styles.label}>Shelf</Text>
          <Choice options={shelves.map((s) => [s.id, s.title])} value={book.shelf_id} onChange={(v) => save({ shelf_id: v })} />
          <Text style={styles.label}>Place on the shelf</Text>
          <View style={styles.choices}>
            <Pressable onPress={() => move(-1)} style={styles.chip}><Text style={styles.chipText}>‹ Earlier</Text></Pressable>
            <Pressable onPress={() => move(1)} style={styles.chip}><Text style={styles.chipText}>Later ›</Text></Pressable>
          </View>
          <Text style={styles.label}>Synopsis</Text>
          <TextInput value={blurb} onChangeText={setBlurb} onBlur={() => blurb !== (book.blurb || '') && save({ blurb: blurb.trim() || null }, 'Synopsis saved.')}
            multiline placeholder="A few sentences about the book" placeholderTextColor="#888" style={[styles.input, { minHeight: 90 }]} />
          {/* how the book was made: shown on its card in the store, including any use of AI (full transparency) */}
          <Text style={styles.label}>Process</Text>
          <TextInput value={process} onChangeText={setProcess} onBlur={() => process !== (book.process || '') && save({ process: process.trim() || null }, 'Process saved.')}
            multiline placeholder="How the book was made: who wrote and drew it, the tools used, and any use of AI" placeholderTextColor="#888" style={[styles.input, { minHeight: 90 }]} />
          <Text style={styles.label}>Who can read it</Text>
          <Choice options={[['free', 'Free'], ['member', 'Members']]} /* membership only (Jörg, 29 Oct 2026) */ value={book.access || 'member'}
            onChange={(v) => save(v === 'paid' ? { access: v, price_label: book.price_label || '$2.99' } : { access: v }, v === 'free' ? 'Free for everyone.' : v === 'member' ? 'For members.' : 'For members, or $2.99 on its own.')} />
          {/* the age rating: parents can show only the books rated for their child's age (Settings) */}
          <Text style={styles.label}>Age rating: from age</Text>
          <Choice options={[[null, 'Not set'], ...AGES.map((a) => [a, String(a)])]} value={book.min_age == null ? null : book.min_age}
            onChange={(v) => save({ min_age: v, max_age: v == null ? null : book.max_age != null && book.max_age < v ? v : book.max_age, age_range: v == null ? null : ageText({ min: v, max: book.max_age != null && book.max_age >= v ? book.max_age : null }) }, v == null ? 'Age rating removed.' : 'Age rating saved.')} />
          {book.min_age != null ? (
            <>
              <Text style={styles.label}>Up to age</Text>
              <Choice options={[[null, 'And up'], ...AGES.filter((a) => a >= book.min_age).map((a) => [a, String(a)])]} value={book.max_age == null ? null : book.max_age}
                onChange={(v) => save({ max_age: v, age_range: ageText({ min: book.min_age, max: v }) }, 'Age rating saved.')} />
              <Text style={styles.note}>Shown in the store as “ages {ageText({ min: book.min_age, max: book.max_age })}”.</Text>
            </>
          ) : null}
          {!book.bundled ? (
            <>
              <Text style={styles.label}>Narration (Fatima and Henry)</Text>
              <Text style={styles.note}>{NARRATION[book.narration_status] || book.narration_status}{book.narration_note ? `: ${book.narration_note}` : ''}</Text>
              <Pressable onPress={async () => { try { await startNarration(book.id); toast('Making the narration…'); onChanged(); } catch (e) { toast(`Couldn’t start it. ${e.message}`); } }}
                style={[styles.pill, { backgroundColor: colors.blue }]} accessibilityRole="button">
                <Text style={styles.pillText}>{book.narration_status === 'ready' ? 'Make the narration again' : 'Make the narration'}</Text>
              </Pressable>
              <Languages book={book} onChanged={onChanged} toast={toast} />
              {confirmRemove ? (
                <View style={{ gap: 10, marginTop: 24 }}>
                  <Text style={styles.note}>Take “{book.title}” out of the Book Store for good? The book stays in your own library on this phone.</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable onPress={async () => { try { await removeFromStore(book.id); toast('Taken out of the Book Store.'); onChanged(); } catch (e) { toast(`Couldn’t remove it. ${e.message}`); } }}
                      style={[styles.pill, { flex: 1, backgroundColor: colors.deepRed }]}><Text style={styles.pillText}>Remove</Text></Pressable>
                    <Pressable onPress={() => setConfirmRemove(false)} style={[styles.pill, { flex: 1 }]}><Text style={styles.pillText}>Keep it</Text></Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmRemove(true)} style={[styles.pill, { backgroundColor: colors.deepRed, marginTop: 24 }]} accessibilityRole="button">
                  <Text style={styles.pillText}>Remove from the store</Text>
                </Pressable>
              )}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ShelfRow({ shelf, shelves, onChanged, toast }) {
  const [title, setTitle] = useState(shelf.title);
  const save = async (patch, note) => { try { await updateShelf(shelf.id, patch); if (note) toast(note); onChanged(); } catch (e) { toast(`Couldn’t save. ${e.message}`); } };
  const move = async (dir) => {
    const i = shelves.findIndex((x) => x.id === shelf.id), j = i + dir;
    if (j < 0 || j >= shelves.length) return;
    const other = shelves[j];
    try { await updateShelf(shelf.id, { sort: other.sort === shelf.sort ? other.sort + dir : other.sort }); await updateShelf(other.id, { sort: shelf.sort }); onChanged(); } catch (e) { toast(`Couldn’t move it. ${e.message}`); }
  };
  return (
    <View style={[styles.row, { padding: 12, gap: 8 }]}>
      <TextInput value={title} onChangeText={setTitle} onBlur={() => title.trim() && title !== shelf.title && save({ title: title.trim() }, 'Shelf renamed.')} style={styles.input} accessibilityLabel="Shelf name" />
      <View style={styles.choices}>
        <Pressable onPress={() => move(-1)} style={styles.chip}><Text style={styles.chipText}>▲ Higher</Text></Pressable>
        <Pressable onPress={() => move(1)} style={styles.chip}><Text style={styles.chipText}>▼ Lower</Text></Pressable>
        <Pressable onPress={() => save({ published: !shelf.published })} style={[styles.chip, shelf.published && { backgroundColor: colors.green }]}>
          <Text style={styles.chipText}>{shelf.published ? 'Shown' : 'Hidden'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Sample books for the web preview only (#store-demo), so the screen can be looked at before the store is set up.
const DEMO = {
  shelves: [{ id: 'free', title: 'Free to read', sort: 10, published: true }, { id: 'new', title: 'New', sort: 20, published: true }, { id: 'bedtime', title: 'Bedtime', sort: 30, published: true }],
  books: [
    { id: 'different', title: 'Different', author: 'Jörg Schmidt', shelf_id: 'free', sort: 10, published: true, featured: true, bundled: true },
    { id: 'falling', title: 'Falling', author: 'Jörg Schmidt', shelf_id: 'free', sort: 20, published: true, bundled: true },
    { id: 'little-boat-x1y2', title: 'The Little Boat', author: 'Mia', shelf_id: 'new', sort: 100, published: false, bundled: false, narration_status: 'ready', narration_note: '3 pages narrated (lily, gregory)', blurb: 'A little boat sails all the way to the sea.',
      langs: { de: { status: 'ready', title: 'Das kleine Boot' }, fr: { status: 'review', title: 'Le petit bateau' }, es: { status: 'narrating', title: 'El barquito' }, ja: { status: 'review', title: 'ちいさな ふね' }, ar: { status: 'translating' } },
      demoContent: { title: 'The Little Boat', writer: 'Mia', artist: 'Mia', coverTitle: { text: 'The Little Boat' },
        pages: [{ pid: 'p1', text: 'The little boat lived by the lake.' }, { pid: 'p2', text: 'One morning it wanted to see the sea.' }, { pid: 'p3', text: 'So off it went, all the way.' }],
        langs: { fr: { title: 'Le petit bateau', coverTitle: 'Le petit bateau', credits: 'Écrit et illustré par Mia.', pages: { p1: 'Le petit bateau vivait au bord du lac.', p2: 'Un matin, il voulut voir la mer.', p3: 'Alors il partit, tout au bout du chemin.' } },
          ja: { title: 'ちいさな ふね', coverTitle: 'ちいさな ふね', credits: 'さく・え ミア。', pages: { p1: 'ちいさな ふねは みずうみの そばに すんで いました。', p2: 'ある あさ、 うみを みたく なりました。', p3: 'そこで ずっと ずっと でかけて いきました。' } } } } },
  ],
};

export default function StoreManager({ u, openMenu, toast, demo }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [newShelf, setNewShelf] = useState('');
  const load = async (pull) => {
    if (pull) setRefreshing(true);
    try { setData(demo ? DEMO : await loadAllForManager()); setErr(''); } catch (e) { setErr(e.message); }
    if (pull) setRefreshing(false);
  };
  useEffect(() => { load(false); }, []);
  // while a narration is being made, check back every few seconds
  const working = data && data.books.some((b) => b.narration_status === 'working' || Object.values(b.langs || {}).some((x) => busyLang(x.status)));
  useEffect(() => { if (!working) return undefined; const t = setInterval(() => load(false), 5000); return () => clearInterval(t); }, [working]);
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        <Text style={styles.title}>Store Manager</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Text style={styles.intro}>Every book in the Book Store, hidden ones too. New books come from the book maker: open a book you made, tap Pages, then “Publish to the Book Store”.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        {!data && !err ? <ActivityIndicator color={colors.ink} /> : null}
        {data ? data.shelves.map((sh) => {
          const books = data.books.filter((b) => b.shelf_id === sh.id).sort((a, b) => a.sort - b.sort);
          return (
            <View key={sh.id} style={{ gap: 10 }}>
              <Text style={styles.shelf}>{sh.title}</Text>
              {books.length ? books.map((b) => <BookRow key={b.id} book={b} shelves={data.shelves} siblings={books} onChanged={() => load(false)} toast={toast} />)
                : <Text style={styles.note}>No books on this shelf.</Text>}
            </View>
          );
        }) : null}
        {data && data.books.some((b) => !data.shelves.find((s) => s.id === b.shelf_id)) ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.shelf}>Not on a shelf</Text>
            {data.books.filter((b) => !data.shelves.find((s) => s.id === b.shelf_id)).map((b) => <BookRow key={b.id} book={b} shelves={data.shelves} siblings={[b]} onChanged={() => load(false)} toast={toast} />)}
          </View>
        ) : null}
        {/* the shelves themselves: their names, their order in the Book Store, shown or hidden, and new ones */}
        {data ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            <Text style={styles.shelf}>Shelves</Text>
            <Text style={styles.note}>The rows of the Book Store, top to bottom. A shelf with no shown books doesn’t appear.</Text>
            {data.shelves.map((sh) => <ShelfRow key={sh.id} shelf={sh} shelves={data.shelves} onChanged={() => load(false)} toast={toast} />)}
            <View style={[styles.row, { padding: 12, gap: 8 }]}>
              <TextInput allowFontScaling={false} value={newShelf} onChangeText={setNewShelf} placeholder="New shelf, e.g. Animals" placeholderTextColor="#888" style={styles.input} />
              <Pressable disabled={!newShelf.trim()} onPress={async () => { try { await addShelf(newShelf); setNewShelf(''); toast('Shelf added.'); load(false); } catch (e) { toast(`Couldn’t add it. ${e.message}`); } }}
                style={[styles.pill, { backgroundColor: colors.green }, !newShelf.trim() && { opacity: 0.4 }]}><Text style={styles.pillText}>Add shelf</Text></Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  band: { backgroundColor: '#3b3b3b', paddingBottom: 30, paddingHorizontal: 24 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32 },
  body: { padding: 20, paddingBottom: 60, gap: 26 },
  intro: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#333' },
  err: { fontFamily: fonts.ui, fontSize: 15, color: '#b00000' },
  shelf: { fontFamily: fonts.uiBold, fontSize: 20, color: colors.ink },
  row: { backgroundColor: '#e2e2e2', borderRadius: 14, overflow: 'hidden' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  thumb: { width: 54, height: 54, backgroundColor: '#999', overflow: 'hidden' },
  rowTitle: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.ink },
  rowSub: { fontFamily: fonts.ui, fontSize: 13, color: '#555', marginTop: 2 },
  chev: { fontFamily: fonts.uiBold, fontSize: 22, color: '#555', width: 24, textAlign: 'center' },
  edit: { paddingHorizontal: 14, paddingBottom: 18, gap: 8 },
  label: { fontFamily: fonts.uiBold, fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#6b6b6b', borderRadius: 18, height: 36, paddingHorizontal: 14, justifyContent: 'center' },
  chipText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14 },
  input: { backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.ui, fontSize: 15, color: colors.ink, textAlignVertical: 'top' },
  note: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: '#333' },
  pill: { backgroundColor: '#6b6b6b', borderRadius: 22, height: 44, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
  langRow: { backgroundColor: '#d4d4d4', borderRadius: 12, overflow: 'hidden' },
  langHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  review: { paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  en: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: '#666' },
});
