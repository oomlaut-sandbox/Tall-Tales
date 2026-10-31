// The Store Manager: the store owner's own screen (in the menu only for them). Every Book Store book,
// hidden ones too: show or hide it, feature it, choose its shelf and its place on the shelf, write its
// synopsis and age range, see how its narration is doing (and make it again), or take it out of the store.
// New books arrive here from the book maker's "Publish to the Book Store" (hidden until shown here).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { PRICES } from '../prices';

const BOOK_PRICES = ['$0.99', '$1.99', '$2.99', '$3.99', '$4.99']; // what an artist's book can cost (App Store price points)
import { Bar, Burger, WithBar } from '../components/Chrome';
import { DESK_FELT } from '../look';
import { createAudioPlayer } from 'expo-audio';
import { pickFile, cleanName } from '../myMusic';
import { addTrackFile, deleteTrackRow, loadHiddenBuiltins, loadTracksForManager, replaceTrackFile, setBuiltinHidden, translateTrack, updateTrackRow } from '../storeAdmin';
import { BUILTIN_TRACKS, setHiddenBuiltins } from '../ambient';
import { supabase } from '../account';
import CoverArt from '../components/CoverArt';
import { ageText, coverFor, storageUrl } from '../catalog';
import { LANG_NAMES, addShelf, productIdFor, setAccess, translateShelf, approveTranslation, loadAllForManager, loadStoreContent, removeFromStore, saveTranslation, startNarration, startTranslation, updateBook, updateShelf, withdrawTranslation } from '../storeAdmin';

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
    (book.demoContent ? Promise.resolve(book.demoContent) : loadStoreContent(book.id, book.access)).then((cc) => {
      const L = (cc.langs || {})[lang] || {};
      setC(cc);
      setEd({ title: L.title || '', coverTitle: L.coverTitle || '', credits: L.credits || '', blurb: L.blurb || '', pages: { ...(L.pages || {}) } });
    }).catch((e) => setErr(e.message));
  }, [book.id, lang]);
  if (err) return <Text style={styles.err}>{err}</Text>;
  if (!c || !ed) return <ActivityIndicator color={colors.white} />;
  const rtl = lang === 'ar';
  const field = (value, onChange, opts = {}) => (
    <TextInput value={value} onChangeText={onChange} multiline={!!opts.multi} allowFontScaling={false}
      style={[styles.input, opts.multi && { minHeight: 70 }, rtl && { textAlign: 'right', writingDirection: 'rtl' }]} />
  );
  const set = (k) => (v) => setEd((e) => ({ ...e, [k]: v }));
  const setPage = (pid) => (v) => setEd((e) => ({ ...e, pages: { ...e.pages, [pid]: v } }));
  const pages = (c.pages || []).filter((p) => (p.text && p.text.trim()) || (p.both && (p.text2 || '').trim()));
  const missing = pages.filter((p) => (p.text || '').trim() && !(ed.pages[p.pid] || '').trim()).length + pages.filter((p) => p.both && p.textOn === 'top' && p.image2 && (p.text2 || '').trim() && !(ed.pages[`${p.pid}#2`] || '').trim()).length + (ed.title.trim() ? 0 : 1);
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
          {/* words on both pictures: the bottom picture's words too (31 Oct 2026) */}
          {p.both && p.textOn === 'top' && p.image2 && (p.text2 || '').trim() ? (
            <>
              <Text style={styles.en}>{p.text2}</Text>
              {field(ed.pages[`${p.pid}#2`] || '', setPage(`${p.pid}#2`), { multi: true })}
            </>
          ) : null}
        </View>
      ))}
      <View style={[styles.choices, { marginTop: 10 }]}>
        <Pressable disabled={busy || missing > 0} onPress={() => run(() => approveTranslation(book.id, lang, ed, book.access), `${LANG_NAMES[lang]} approved. Making the narration…`)}
          style={[styles.pill, { backgroundColor: colors.green }, (busy || missing > 0) && { opacity: 0.4 }]} accessibilityRole="button">
          <Text style={styles.pillText}>{ready ? 'Save and narrate again' : 'Approve and narrate'}</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => run(() => saveTranslation(book.id, lang, ed, book.access), 'Saved.')} style={[styles.pill, busy && { opacity: 0.4 }]} accessibilityRole="button">
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
                <Text style={[styles.rowSub, st === 'review' && { color: '#f0b46a' }, st === 'failed' && { color: '#ff8a7e' }]}>{st ? LANG_STATUS[st] || st : 'Not translated yet'}{st === 'failed' && L.note ? `: ${L.note}` : ''}</Text>
              </View>
              {busyLang(st) ? <ActivityIndicator color={colors.white} /> : st && !(st === 'failed' && !L.title) ? (st === 'review' && openLang !== l ? <Text style={styles.readTag}>Read over</Text> : <Text style={styles.chev}>{openLang === l ? '–' : '+'}</Text>) : null}
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
  const [moving, setMoving] = useState(false);
  const setAccessTo = async (access, price) => {
    if (moving || (access === (book.access === 'paid' ? 'paid' : 'free') && (access !== 'paid' || price === book.price_label))) return;
    setMoving(true);
    try {
      if (book.bundled) await updateBook(book.id, { access });
      else await setAccess(book.id, access, price);
      toast(access === 'paid' ? `“${book.title}” is for sale at ${price}.` : `“${book.title}” is free for everyone.`); onChanged();
    } catch (e) { toast(`Couldn’t change it. ${e.message}`); }
    setMoving(false);
  };
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
          <Text style={[styles.rowSub, !book.published && { color: '#f0b46a' }]} numberOfLines={2}>{status}</Text>
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
          {/* free for everyone, or an artist's book for sale, bought on its own by everyone, members too (Jörg, 30 Oct 2026).
              Books inside the app are always free. A book for sale's files move to the private folder on the server. */}
          <Choice options={book.bundled ? [['free', 'Free']] : [['free', 'Free'], ['paid', 'For sale']]} value={book.access === 'paid' ? 'paid' : 'free'}
            onChange={(v) => setAccessTo(v, v === 'paid' ? book.price_label || PRICES.book : null)} />
          {book.access === 'paid' ? (
            <>
              <Text style={styles.label}>Price</Text>
              <Choice options={BOOK_PRICES.map((p) => [p, p])} value={book.price_label || PRICES.book} onChange={(v) => setAccessTo('paid', v)} />
              <Text style={styles.note}>In App Store Connect, this book needs its own in-app purchase (Non-Consumable) at the same price, with the product ID{'\n'}<Text style={{ fontFamily: fonts.uiBold, color: colors.white }} selectable>{productIdFor(book.id)}</Text>{'\n'}Families buy it on its own, members too. The store says it’s made by people, without AI (only the translations are made with AI’s help, once, and checked by you), and that half of what Coro earns from it goes to the artist.</Text>
            </>
          ) : book.access === 'member' ? <Text style={styles.note}>Marked for members (from before). Choose Free or For sale.</Text> : null}
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
            </>
          ) : null}
              {confirmRemove ? (
                <View style={{ gap: 10, marginTop: 24 }}>
                  <Text style={styles.note}>{book.bundled ? `Take “${book.title}” out of the Book Store? It’s inside the app, so it stays in the app itself; this only removes it from the store’s shelves.` : `Take “${book.title}” out of the Book Store for good? Its pages, narration and translations are deleted from the store. The book stays in your own library on this phone.`}</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable onPress={() => setConfirmRemove(false)} style={[styles.pill, { flex: 1 }]} accessibilityRole="button"><Text style={styles.pillText}>Keep</Text></Pressable>
                    <Pressable onPress={async () => { try { await removeFromStore(book.id, book.bundled); toast('Taken out of the Book Store.'); onChanged(); } catch (e) { toast(`Couldn’t remove it. ${e.message}`); } }}
                      style={[styles.pill, { flex: 1, backgroundColor: colors.danger }]} accessibilityRole="button"><Text style={styles.pillText}>Remove</Text></Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmRemove(true)} style={[styles.pill, { backgroundColor: colors.deepRed, marginTop: 24 }]} accessibilityRole="button">
                  <Text style={styles.pillText}>Remove from the store</Text>
                </Pressable>
              )}
        </View>
      ) : null}
    </View>
  );
}

function ShelfRow({ shelf, shelves, onChanged, toast }) {
  const [title, setTitle] = useState(shelf.title);
  const [langs, setLangs] = useState(shelf.langs || {}); // the name in the other languages (correctable here)
  useEffect(() => { setLangs(shelf.langs || {}); }, [shelf.langs]);
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
      {Object.keys(langs).length ? (
        <View style={{ gap: 6 }}>
          {Object.entries(LANG_NAMES).map(([l, name]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={[styles.rowSub, { width: 72, marginTop: 0 }]}>{name}</Text>
              <TextInput value={langs[l] || ''} onChangeText={(v) => setLangs((x) => ({ ...x, [l]: v }))} allowFontScaling={false}
                onBlur={() => (langs[l] || '') !== ((shelf.langs || {})[l] || '') && save({ langs: { ...(shelf.langs || {}), [l]: (langs[l] || '').trim() } }, 'Saved.')}
                style={[styles.input, { flex: 1, paddingVertical: 6 }, l === 'ar' && { textAlign: 'right', writingDirection: 'rtl' }]} accessibilityLabel={`${name} name`} />
            </View>
          ))}
        </View>
      ) : <Text style={styles.note}>Being translated into the other languages…</Text>}
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

// ---- Music and sounds for the tape player (31 Oct 2026): see remoteTracks.js ----
let preview = null; // one piece playing at a time, to listen before showing it
const stopPreview = () => { try { if (preview) { preview.pause(); preview.remove(); } } catch (e) {} preview = null; };
const trackUrl = (path) => { try { return supabase.storage.from('tracks').getPublicUrl(path).data.publicUrl; } catch (e) { return null; } };

function TrackRow({ track, tracks, onChanged, toast }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: track.name, artist: track.artist || '', artist_note: track.artist_note || '', artist_link: track.artist_link || '' });
  const [langs, setLangs] = useState(track.langs || {});
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setLangs(track.langs || {}); }, [track.langs]);
  useEffect(() => () => { if (playing) stopPreview(); }, [playing]);
  const save = async (patch, note) => { try { await updateTrackRow(track.id, patch); if (note) toast(note); onChanged(); } catch (e) { toast(`Couldn’t save. ${e.message}`); } };
  const field = (k, label, ph) => (
    <TextInput value={f[k]} onChangeText={(v) => setF((x) => ({ ...x, [k]: v }))} placeholder={ph} placeholderTextColor="#777" allowFontScaling={false}
      onBlur={() => (f[k] || '') !== (track[k] || '') && save({ [k]: f[k].trim() || (k === 'name' ? track.name : null) }, 'Saved.')}
      style={styles.input} accessibilityLabel={label} autoCapitalize={k === 'artist_link' ? 'none' : 'sentences'} />
  );
  const move = async (dir) => {
    const i = tracks.findIndex((x) => x.id === track.id), j = i + dir;
    if (j < 0 || j >= tracks.length) return;
    const other = tracks[j];
    try { await updateTrackRow(track.id, { sort: other.sort === track.sort ? other.sort + dir : other.sort }); await updateTrackRow(other.id, { sort: track.sort }); onChanged(); } catch (e) { toast(`Couldn’t move it. ${e.message}`); }
  };
  const listen = () => {
    if (playing) { stopPreview(); setPlaying(false); return; }
    stopPreview();
    try { preview = createAudioPlayer({ uri: trackUrl(track.file) }); preview.play(); setPlaying(true); } catch (e) { toast('Couldn’t play it.'); }
  };
  const replace = async () => {
    const file = await pickFile(); if (!file) return;
    setBusy(true);
    try { await replaceTrackFile(track, file.uri, file.name); toast('New file uploaded. Phones fetch it the next time it plays.'); onChanged(); } catch (e) { toast(`Couldn’t upload it. ${e.message}`); }
    setBusy(false);
  };
  return (
    <View style={styles.row}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.rowHead} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{track.name}{track.artist ? ` · ${track.artist}` : ''}</Text>
          <Text style={styles.rowSub}>{track.kind === 'sound' ? 'Sound' : 'Music'} · {track.hidden ? 'Hidden' : 'Shown'}{track.featured ? ' · Featured musician' : ''}{track.fade ? ' · Fades between repeats' : ''}{track.size_kb ? ` · ${Math.round(track.size_kb / 102.4) / 10} MB` : ''}</Text>
        </View>
        <Text style={styles.chev}>{open ? '–' : '+'}</Text>
      </Pressable>
      <View style={[styles.choices, { paddingHorizontal: 14, paddingBottom: open ? 0 : 14 }]}>
        <Pressable onPress={listen} style={[styles.chip, playing && { backgroundColor: colors.green }]}><Text style={styles.chipText}>{playing ? '■ Stop' : '▶ Listen'}</Text></Pressable>
        <Pressable onPress={() => save({ hidden: !track.hidden }, track.hidden ? 'Shown in the app.' : 'Hidden.')} style={[styles.chip, !track.hidden && { backgroundColor: colors.green }]}><Text style={styles.chipText}>{track.hidden ? 'Hidden' : 'Shown'}</Text></Pressable>
        <Pressable onPress={() => move(-1)} style={styles.chip}><Text style={styles.chipText}>▲</Text></Pressable>
        <Pressable onPress={() => move(1)} style={styles.chip}><Text style={styles.chipText}>▼</Text></Pressable>
      </View>
      {open ? (
        <View style={styles.edit}>
          <Text style={styles.label}>Name</Text>
          {field('name', 'Name', 'e.g. Rainy day piano')}
          <Text style={styles.label}>Kind</Text>
          <Choice options={[['music', 'Music'], ['sound', 'Nature sound']]} value={track.kind} onChange={(v) => save({ kind: v })} />
          <Text style={styles.label}>Musician</Text>
          {field('artist', 'Musician', 'Their name (optional)')}
          {field('artist_note', 'About the musician', 'A line about them (optional)')}
          {field('artist_link', 'Musician’s website', 'https://… (optional; opens after the grown-up question)')}
          <View style={styles.choices}>
            <Pressable onPress={async () => { if (!track.featured) { for (const o of tracks.filter((x) => x.featured && x.id !== track.id)) await updateTrackRow(o.id, { featured: false }).catch(() => {}); } save({ featured: !track.featured }, track.featured ? 'No longer featured.' : 'Featured on Music and Sounds.'); }}
              style={[styles.chip, track.featured && { backgroundColor: colors.green }]}><Text style={styles.chipText}>{track.featured ? '★ Featured musician' : '☆ Feature this musician'}</Text></Pressable>
            <Pressable onPress={() => save({ fade: !track.fade })} style={[styles.chip, track.fade && { backgroundColor: colors.green }]}><Text style={styles.chipText}>Fade between repeats</Text></Pressable>
          </View>
          <Text style={styles.label}>Name in the other languages</Text>
          {Object.keys(langs).length ? Object.entries(LANG_NAMES).map(([l, name]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={[styles.rowSub, { width: 72, marginTop: 0 }]}>{name}</Text>
              <TextInput value={langs[l] || ''} onChangeText={(v) => setLangs((x) => ({ ...x, [l]: v }))} allowFontScaling={false}
                onBlur={() => (langs[l] || '') !== ((track.langs || {})[l] || '') && save({ langs: { ...(track.langs || {}), [l]: (langs[l] || '').trim() } }, 'Saved.')}
                style={[styles.input, { flex: 1, paddingVertical: 6 }, l === 'ar' && { textAlign: 'right', writingDirection: 'rtl' }]} accessibilityLabel={`${name} name`} />
            </View>
          )) : <Text style={styles.note}>Not translated yet.</Text>}
          <View style={styles.choices}>
            <Pressable onPress={async () => { try { await translateTrack(track.id); toast('Translated.'); onChanged(); } catch (e) { toast(`Couldn’t translate it. ${e.message}`); } }} style={styles.chip}><Text style={styles.chipText}>Translate the name</Text></Pressable>
            <Pressable onPress={replace} disabled={busy} style={[styles.chip, busy && { opacity: 0.5 }]}><Text style={styles.chipText}>{busy ? 'Uploading…' : 'Replace the file'}</Text></Pressable>
          </View>
          {sure ? (
            <View style={{ gap: 10, marginTop: 14 }}>
              <Text style={styles.note}>Take “{track.name}” out? It disappears from everyone’s player the next time the app opens.</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => setSure(false)} style={[styles.pill, { flex: 1 }]}><Text style={styles.pillText}>Keep</Text></Pressable>
                <Pressable onPress={async () => { try { stopPreview(); await deleteTrackRow(track); toast('Taken out.'); onChanged(); } catch (e) { toast(`Couldn’t remove it. ${e.message}`); } }} style={[styles.pill, { flex: 1, backgroundColor: colors.danger }]}><Text style={styles.pillText}>Remove</Text></Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setSure(true)} style={[styles.pill, { backgroundColor: colors.danger, marginTop: 14 }]}><Text style={styles.pillText}>Remove</Text></Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

// the pieces built into the app: each can be hidden (left out of the player for everyone) or shown again
// (Jörg, 31 Oct 2026)
function BuiltinTracks({ toast, demo }) {
  const [hidden, setHidden] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (demo) { setHidden([]); return; } loadHiddenBuiltins().then(setHidden).catch((e) => setErr(e.message)); }, []);
  const flip = async (id) => {
    const hide = !hidden.includes(id);
    try {
      if (!demo) await setBuiltinHidden(id, hide);
      const next = hide ? [...hidden, id] : hidden.filter((x) => x !== id);
      setHidden(next); setHiddenBuiltins(next);
      toast(hide ? 'Hidden for everyone.' : 'Shown in the app again.');
    } catch (e) { toast(`Couldn’t change it. ${e.message}`); }
  };
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <Text style={[styles.rowTitle, { marginTop: 4 }]}>Built into the app</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {!hidden && !err ? <ActivityIndicator color={colors.white} /> : null}
      {hidden ? BUILTIN_TRACKS.map((x) => {
        const off = hidden.includes(x.id);
        return (
          <View key={x.id} style={[styles.row, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{x.name}</Text>
              <Text style={styles.rowSub}>{x.kind === 'sound' ? 'Sound' : 'Music'} · {off ? 'Hidden' : 'Shown'}</Text>
            </View>
            <Pressable onPress={() => flip(x.id)} style={[styles.chip, !off && { backgroundColor: colors.green }]} accessibilityRole="switch" accessibilityState={{ checked: !off }}><Text style={styles.chipText}>{off ? 'Hidden' : 'Shown'}</Text></Pressable>
          </View>
        );
      }) : null}
      <Text style={styles.rowTitle}>Added in the Store Manager</Text>
    </View>
  );
}

function TracksSection({ toast, demo }) {
  const [tracks, setTracks] = useState(null);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('music');
  const [adding, setAdding] = useState(false);
  const load = async () => { if (demo) { setTracks([]); return; } try { setTracks(await loadTracksForManager()); setErr(''); } catch (e) { setErr(e.message); } };
  useEffect(() => { load(); return () => stopPreview(); }, []);
  const add = async () => {
    const file = await pickFile(); if (!file) return;
    setAdding(true);
    try {
      const nm = name.trim() || cleanName(file.name);
      const sort = (tracks && tracks.length ? Math.max(...tracks.map((x) => x.sort || 0)) : 90) + 10;
      await addTrackFile({ uri: file.uri, fname: file.name, name: nm, kind, sort });
      setName(''); toast('Added (hidden). Listen to it, then tap Hidden to show it.'); load();
    } catch (e) { toast(`Couldn’t add it. ${e.message}`); }
    setAdding(false);
  };
  return (
    <View style={{ gap: 10, marginTop: 10 }}>
      <Text style={styles.shelf}>Music and Sounds</Text>
      <Text style={styles.note}>Pieces for the tape player and Music and Sounds, added without an app update. New ones start hidden. A piece plays from the internet the first time and is then kept on the phone. The pieces built into the app aren’t listed here.</Text>
      <BuiltinTracks toast={toast} demo={demo} />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {!tracks && !err ? <ActivityIndicator color={colors.white} /> : null}
      {tracks ? tracks.map((x) => <TrackRow key={`${x.id}-${x.version}`} track={x} tracks={tracks} onChanged={load} toast={toast} />) : null}
      <View style={[styles.row, { padding: 12, gap: 8 }]}>
        <TextInput allowFontScaling={false} value={name} onChangeText={setName} placeholder="Name, e.g. Rainy day piano (or the file’s name)" placeholderTextColor="#888" style={styles.input} />
        <Choice options={[['music', 'Music'], ['sound', 'Nature sound']]} value={kind} onChange={setKind} />
        <Pressable disabled={adding} onPress={add} style={[styles.pill, { backgroundColor: colors.green }, adding && { opacity: 0.5 }]}><Text style={styles.pillText}>{adding ? 'Uploading…' : 'Choose a file and add it'}</Text></Pressable>
        <Text style={styles.rowSub}>MP3 or M4A. Only music the musician has agreed to in writing.</Text>
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
  // shelves made before shelf names had languages: translate them once (30 Oct 2026)
  const tried = React.useRef(false);
  useEffect(() => {
    if (demo || tried.current || !data) return;
    const missing = data.shelves.filter((sh) => sh.langs && !Object.keys(sh.langs).length);
    if (!missing.length) return;
    tried.current = true;
    Promise.all(missing.map((sh) => translateShelf(sh.id).catch(() => null))).then(() => load(false));
  }, [data]);
  // while a narration is being made, check back every few seconds
  const working = data && data.books.some((b) => b.narration_status === 'working' || Object.values(b.langs || {}).some((x) => busyLang(x.status)));
  useEffect(() => { if (!working) return undefined; const t = setInterval(() => load(false), 5000); return () => clearInterval(t); }, [working]);
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        <Text style={styles.title}>Store Manager</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Text style={styles.intro}>Every book in the Book Store, hidden ones too. New books come from the book maker: open a book you made, tap Pages, then “Publish to the Book Store”.</Text>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        {!data && !err ? <ActivityIndicator color={colors.white} /> : null}
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
        {data ? <TracksSection toast={toast} demo={demo} /> : null}
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1c1c1c' }, // dark, on the charcoal felt like the rest of the app (Jörg, 30 Oct 2026)
  band: { backgroundColor: 'rgba(0,0,0,0.55)', paddingBottom: 30, paddingHorizontal: 24 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32, transform: [{ translateY: -3 }] }, // (level with the other screens' titles)
  body: { padding: 20, paddingBottom: 60, gap: 26 },
  intro: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#cfcac0' },
  err: { fontFamily: fonts.ui, fontSize: 15, color: '#ff8a7e' },
  shelf: { fontFamily: fonts.uiBold, fontSize: 20, color: colors.white },
  row: { backgroundColor: 'rgba(16,16,16,0.82)', borderRadius: 14, overflow: 'hidden' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  thumb: { width: 54, height: 54, backgroundColor: '#444', overflow: 'hidden' },
  rowTitle: { fontFamily: fonts.uiBold, fontSize: 16, color: colors.white },
  rowSub: { fontFamily: fonts.ui, fontSize: 13, color: '#b5b0a7', marginTop: 2 },
  chev: { fontFamily: fonts.uiBold, fontSize: 22, color: '#b5b0a7', width: 24, textAlign: 'center' },
  edit: { paddingHorizontal: 14, paddingBottom: 18, gap: 8 },
  label: { fontFamily: fonts.uiBold, fontSize: 12, color: '#9d988f', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#454545', borderRadius: 18, height: 36, paddingHorizontal: 14, justifyContent: 'center' },
  chipText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14 },
  input: { backgroundColor: '#0e0e0e', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.ui, fontSize: 15, color: colors.white, textAlignVertical: 'top' },
  note: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: '#cfcac0' },
  pill: { backgroundColor: '#454545', borderRadius: 22, height: 44, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
  langRow: { backgroundColor: '#2a2a2a', borderRadius: 12, overflow: 'hidden' },
  langHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  review: { paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  en: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: '#9d988f' },
  readTag: { backgroundColor: colors.green, color: colors.white, fontFamily: fonts.uiBold, fontSize: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
});
