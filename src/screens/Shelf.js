// My Library and Book Store.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, Felt, IS_TABLET, Stitch, DESK_BG } from '../look';
import { Bar, BarMeta, Burger, DogEar, IDLE, Panel, PlaylistIcon, WithBar, slotStyle } from '../components/Chrome';
import { activeProfile, feltFor, onProfiles as onProfilesChange } from '../profiles';
const SHARE_ICON = require('../../assets/icon-envelope.png');
const EDIT_ICON = require('../../assets/icon-scissors.png');
const TRASH_ICON = require('../../assets/icon-trash.png');
import { loadJSON, saveJSON } from '../storage';
import { ageAllowed, ageOf, ageText, bundledStory, cachedCatalog, coverArtFor, coverFor, loadStoreBook, refreshCatalog, shelvesWithBooks } from '../catalog';
import ParentGate from '../components/ParentGate';
import Membership from '../components/Membership';
import { buyBook, canOpen, usePurchases } from '../purchases';
import { PRICES } from '../prices';
import { useLang, useT } from '../i18n';
import { useControls } from '../controls';
import CoverArt from '../components/CoverArt';
import { SHOWN_BOOKS, STORIES } from '../story';
import { BlurView } from 'expo-blur';
const AnimatedBlur = Animated.createAnimatedComponent(BlurView);
import { playSound } from '../sound';

// Two covers across on a phone; more on an iPad.
const COLS = (w) => (w >= 900 ? 4 : w >= 600 ? 3 : 2);
const TILE = { 2: 47, 3: 31, 4: 22.5 };
const tileWidth = (w) => `${TILE[COLS(w)]}%`;
const gridGap = (w) => { const n = COLS(w); return `${(100 - n * TILE[n]) / (n - 1)}%`; };

function Tile({ plain, u, cover, coverArt, title, sub, onPress, onLongPress, plus, glyph, option, selecting, selected, badge, label, ear: showEar = false }) { // (no dog-ears on the covers)
  const t = useT();
  const { width: winW } = useWindowDimensions();
  const ear = u * 3;
  const coverRef = useRef(null);
  // tells the caller where the cover is on screen (so the book can open from right there)
  const press = () => {
    if (!onPress) return;
    if (coverRef.current && coverRef.current.measureInWindow) coverRef.current.measureInWindow((x, y, w, h) => onPress({ x, y, w, h }));
    else onPress(null);
  };
  return (
    <Pressable onPress={press} onLongPress={onLongPress} style={{ width: tileWidth(winW), gap: 8 }} accessibilityRole="button" accessibilityLabel={label}>
      {/* a very subtle drop shadow under the square cover */}
      <View style={styles.tileShadow}>
      <View ref={coverRef} collapsable={false} style={{ aspectRatio: 1, backgroundColor: plain ? '#2a2a2a' : '#828282', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>{/* plain: a solid dark grey square (pictures to come) */}
        {coverArt ? <CoverArt cover={coverArt} /> : cover ? <Image source={cover} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" /> : null}
        {/* a small, thin grey + in the top right corner (Create a story, Playlists) */}
        {plus ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 10, right: 10, width: 16, height: 16 }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 7.25, height: 1.5, backgroundColor: '#8a8a8a' }} />
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 7.25, width: 1.5, backgroundColor: '#8a8a8a' }} />
          </View>
        ) : null}
        {glyph || null}
        {/* a small dog-ear (My Library only; the Book Store covers have none) */}
        {showEar ? <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderLeftWidth: ear, borderBottomWidth: ear, borderLeftColor: 'transparent', borderBottomColor: colors.earUnder }} /> : null}
        {showEar ? <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderRightWidth: ear, borderTopWidth: ear, borderRightColor: 'transparent', borderTopColor: colors.white }} /> : null}
        {badge ? <View style={styles.badgeAt}>{badge}</View> : null}
        {selecting ? (
          <View style={[styles.check, selected && styles.checkOn]} accessibilityLabel={selected ? t('Selected') : t('Not selected')}>
            {selected ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
        ) : null}
      </View>
      </View>
      {title ? <Text style={[styles.tileTitle, (plus || glyph || option) && styles.tileOption]}>{title}</Text> : null}{/* 'Create a story' is an app option, so it's in Helvetica */}
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </Pressable>
  );
}

const BAND_FELT = { library: require('../../assets/band-library.png'), store: require('../../assets/band-store.png') }; // Jörg's stitched felt strips, cut out along the felt's own bottom edge

function Band({ color, felt, dark, title, sub, action, onAction }) {
  const insets = useSafeAreaInsets();
  const fg = dark ? colors.ink : colors.white;
  return (
    <View style={{ backgroundColor: felt && !IS_TABLET ? 'transparent' : color, paddingTop: insets.top + 30, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 }}>{/* the title block centred top to bottom in the coloured band */}
      {/* iPad keeps the classic solid colour banners */}
      {/* phone: the felt's real bottom edge lets the desk show through, so the colour only fills the status bar strip */}
      {felt && !IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 2, backgroundColor: color }} /> : null}
      {felt && !IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT[felt]} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : <><Felt /><Stitch inset={7} /></>}
      {/* the title alone (no subtitle), centred in the band, with Select / Cancel on the same line */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: fg, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, transform: [{ translateY: -3 }] }}>{title}</Text>{/* nudged up a touch: the big title sat a little low next to Select */}
        </View>
        {action ? (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 17 }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// Select mode: tap books to pick them, then Share (one book, as a PDF) or Delete.
// Your own stories are deleted for good; the built-in books are only removed from the shelf
// and can be brought back with "Show removed books".
// My Notebook's cover: the brown leather of the notebook on the start page
const CREATE_TILE = require('../../assets/tile-create.jpg'); // Jörg's blue felt book on grey paper (a small + sits in the corner)
const PLAYLISTS_TILE = require('../../assets/tile-playlists.jpg'); // Jörg's stack of felt books, behind the Playlists sign
const TIP_CHAR = require('../../assets/tip-headphones.png'); // the grey felt character with headphones, in the Audio Player tip
const NOTEBOOK_COVER = require('../../assets/leather-cover.jpg');

// My Notebook on the shelf: a small copy of the leather notebook on the start page, with the same
// rounded corners (tiny along the spine at the top, rounder at the bottom) and no dog-ear.
function NotebookTile({ onPress, hidden, onRect }) {
  const t = useT();
  const { width: winW } = useWindowDimensions();
  const [w, setW] = useState(0);
  const ref = useRef(null);
  // where the little notebook is on screen: the notebook flies from here when it opens, and lands here from the start page
  const measure = (then) => (ref.current && ref.current.measureInWindow ? ref.current.measureInWindow((x, y, ww, h) => then(ww ? { x, y, w: ww, h } : null)) : then(null));
  const corners = { borderTopLeftRadius: w * 0.012, borderTopRightRadius: w * 0.012, borderBottomLeftRadius: w * 0.102, borderBottomRightRadius: w * 0.102 };
  return (
    <Pressable onPress={() => measure(onPress)} style={{ width: tileWidth(winW), gap: 8 }} accessibilityRole="button" accessibilityLabel={t('My Notebook')}>
      <View ref={ref} collapsable={false} onLayout={(e) => { setW(e.nativeEvent.layout.width); if (onRect) setTimeout(() => measure(onRect), 30); }}
        style={[{ aspectRatio: 1, backgroundColor: '#7c5438', shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.45, shadowRadius: 8, elevation: 8, opacity: hidden ? 0 : 1 }, corners]}>
        <View style={[{ flex: 1, overflow: 'hidden' }, corners]}>
          <Image source={NOTEBOOK_COVER} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      </View>
      <Text style={styles.tileTitle}>{t('My Notebook')}</Text>
    </Pressable>
  );
}

// the child reading now, at the top of the space beside My Notebook (or 'Profiles' before any are made)
function WhoReads({ onPress }) {
  const t = useT();
  const { width: winW } = useWindowDimensions();
  const [, bump] = useState(0);
  useEffect(() => onProfilesChange(() => bump((n) => n + 1)), []);
  const p = activeProfile();
  return (
    <View style={{ width: tileWidth(winW), alignItems: 'flex-start' }}>
      <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Profiles')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: p ? 10 : 7, marginTop: 4 }}>
        {p ? <Image source={feltFor(p.color)} style={{ width: 40, height: 40 }} resizeMode="contain" />
          : <View style={{ alignItems: 'center' }}>{/* a small person: only as tall as itself, so the word centres on it */}
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(235,235,235,0.9)', marginBottom: 1.5 }} />
              <View style={{ width: 16, height: 7.5, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: 'rgba(235,235,235,0.9)' }} />
            </View>}
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={1} style={[styles.whoName, !p && { fontSize: 14 }]}>{p ? p.name : t('Profiles')}</Text>
          {p ? <Text style={styles.whoSub}>{t('Reading now')}</Text> : null}
        </View>
      </Pressable>
    </View>
  );
}

export function Library({ onProfiles, u, stories, openStory, openMenu, onCreate, onPlaylists, onEdit, onShare, onDelete, removedCount, onRestore, onNotebook, notebookHidden, onNotebookRect }) {
  const t = useT();
  const controls = useControls(); // parental controls: My Notebook, Create a story and Select may be hidden
  const { width: winW } = useWindowDimensions();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [gate, setGate] = useState(null); // 'share' | 'delete'
  const chosen = stories.filter((s) => picked.includes(s.id));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const stop = () => { setSelecting(false); setPicked([]); setConfirm(false); };
  const mineCount = chosen.filter((s) => s.mine).length;
  // the Audio Player tip: shown when My Library opens, until "Don't show this message again" is ticked
  const [tip, setTip] = useState(false);
  const [noMore, setNoMore] = useState(false);
  // (the Audio Player tip is retired: the music note on the bar speaks for itself)
  const { width: tipW, height: tipH } = useWindowDimensions();
  const tipWide = tipW > tipH; // sideways: the bar runs down the right side
  const closeTip = () => { setTip(false); if (noMore) saveJSON('tipAudioPlayer', { hide: true }); };
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => (selecting ? (
        <Bar u={u} vertical={v}>
          {/* the menu, house and note stay where they always are; then share (envelope), edit (scissors) and delete
              (trash can) in the next slots, greyed out when they can't be used */}
          <View style={{ flexDirection: v ? 'column' : 'row', alignItems: 'center', alignSelf: 'stretch' }}>{/* no gap: the slots run on from the menu's */}
          <Burger u={u} onPress={openMenu} />
          {[
            [SHARE_ICON, t('Share'), chosen.length === 1, () => setGate('share'), '#ffffff'],
            [EDIT_ICON, t('Edit'), chosen.length === 1 && chosen[0].mine, () => { const b = chosen[0]; stop(); onEdit(b); }, '#ffffff'],
            [TRASH_ICON, t('Delete'), chosen.length > 0, () => setConfirm(true), '#ff6b6b'],
          ].map(([src, label, on, fn, col]) => (
            <Pressable key={label} onPress={fn} disabled={!on} hitSlop={8} style={slotStyle(u, v)} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !on }}>
              <Image source={src} style={{ width: u * 5.2, height: u * 5.2, tintColor: on ? col : IDLE }} resizeMode="contain" />
            </Pressable>
          ))}
          </View>
          <View style={{ flex: 1 }} />{/* (Edit and Share simply grey out when they can't be used) */}
          {/* Cancel sits where Select was: the bottom right of the bar */}
          <Pressable onPress={stop} hitSlop={10} accessibilityRole="button"><View style={styles.cancelPill}><Text style={styles.barSmall}>{t('Cancel')}</Text></View></Pressable>{/* a small red pill */}
        </Bar>
      ) : (
        <Bar u={u} vertical={v}>
          <Burger u={u} onPress={openMenu} />
          <View style={{ flex: 1 }} />
          {/* Select: in the bottom right corner of the bar (not when the parental controls turn sharing off) */}
          {controls.sharing ? <Pressable onPress={() => setSelecting(true)} hitSlop={10} style={styles.barBtn} accessibilityRole="button"><Text style={styles.barSmall}>{t('Select')}</Text></Pressable> : null}
        </Bar>
      ))}>
      <Band color={colors.green} felt="library" title={selecting ? t('Select books') : t('My Library')}
        sub={selecting ? (picked.length ? t('{n} selected', { n: picked.length }) : t('Tap books to select them')) : t('Your stories, ready to read')} />
      <ScrollView contentContainerStyle={[styles.grid, { columnGap: gridGap(winW) }]}>
        {/* My Notebook: always the first book on the shelf (notes, drawings and reading badges) */}
        {!selecting && onNotebook && controls.notebook ? <NotebookTile onPress={onNotebook} hidden={notebookHidden} onRect={onNotebookRect} /> : null}
        {/* beside the notebook: who is reading (their felt character and name); tap it for Profiles */}
        {!selecting && onNotebook && onProfiles ? <WhoReads onPress={onProfiles} /> : null}
        {!selecting && onNotebook ? <View style={{ width: '100%' }} /> : null}{/* the notebook has the top row to itself */}
        {/* (the parental controls can hide books rated for older children) */}
        {stories.filter((s) => ageAllowed(ageOf(null, s), controls.childAge)).map((s) => (
          // just the title under each cover (no author, pages or other details)
          <Tile key={s.id} u={u} cover={s.pages[0] && s.pages[0].image} coverArt={s.cover} title={s.title}
            selecting={selecting} selected={picked.includes(s.id)}
            onPress={(rect) => (selecting ? toggle(s.id) : openStory(s, rect))}
            onLongPress={!selecting && s.mine ? () => onEdit(s) : undefined} />
        ))}
        {/* Create a story always starts its own row, below the books */}
        {!selecting ? <View style={{ width: '100%' }} /> : null}
        {!selecting && controls.create ? <Tile u={u} plus plain title={t('Create a story')} onPress={onCreate} /> : null}
        {/* Playlists (a picture of its own comes later) */}
        {!selecting && onPlaylists ? <Tile u={u} plus plain option title={t('Playlists')} onPress={onPlaylists} /> : null}
        {!selecting && removedCount ? (
          <Pressable onPress={onRestore} style={{ width: '100%', paddingVertical: 8 }} accessibilityRole="button">
            <Text style={styles.restore}>{t('Show removed books ({n})', { n: removedCount })}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {confirm ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>
            {chosen.length === 1 ? t('Delete “{title}”?', { title: chosen[0].title }) : t('Delete {n} books?', { n: chosen.length })}
            {mineCount ? ' ' + t('Stories you made, with their pictures and recordings, are deleted for good.') : ''}
            {chosen.length > mineCount ? ' ' + t('Built-in books can be brought back later.') : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => setGate('delete')} style={[styles.actBtn, { backgroundColor: colors.deepRed }]}><Text style={styles.actText}>{t('Delete')}</Text></Pressable>
            <Pressable onPress={() => setConfirm(false)} style={[styles.actBtn, { backgroundColor: '#333' }]}><Text style={styles.actText}>{t('Keep')}</Text></Pressable>
          </View>
        </View>
      ) : null}
      <ParentGate visible={!!gate} reason={gate === 'share' ? t('Sharing sends an invitation to Oomlaut Reader by message or email.') : t('Deleting books from the library.')}
        onCancel={() => setGate(null)}
        onPass={() => {
          const g = gate; setGate(null);
          if (g === 'share' && chosen[0]) onShare(chosen[0]);
          if (g === 'delete') { onDelete(chosen); stop(); }
        }} />
      {tip && !selecting ? (
        <View style={styles.tipWrap} pointerEvents="box-none">
          <View style={styles.tipBubble}>
            <Text style={styles.tipTitle}>{t('The Audio Player')}</Text>
            <Text style={styles.tipText}>{t('Tap the music note on the black bar to open it, here, in the Book Store or while you read. Turn the knobs to choose a nature sound and some music, press Play, and slide to set the volume. Close it with the little line at the top right.')}</Text>
            <Pressable onPress={() => setNoMore((x) => !x)} style={styles.tipCheckRow} accessibilityRole="checkbox" accessibilityState={{ checked: noMore }} hitSlop={6}>
              <View style={[styles.tipBox, noMore && styles.tipBoxOn]}>{noMore ? <Text style={styles.tipTick}>✓</Text> : null}</View>
              <Text style={styles.tipCheck}>{t('Don’t show this message again')}</Text>
            </Pressable>
            {/* OK on the left; the headphones character stands below it on the right, with lots of room around him */}
            <View style={styles.tipFoot}>
              <Pressable onPress={closeTip} style={styles.tipOk} accessibilityRole="button"><Text style={styles.tipOkText}>{t('OK')}</Text></Pressable>
              <Image source={TIP_CHAR} style={styles.tipChar} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
          </View>
          {/* the tail points down at the music note on the bar (upright; sideways the bar is on the right, so no tail) */}
          {!tipWide ? <View style={[styles.tipTail, { marginLeft: Math.max(12, u * 26 - 28) }]} /> : null}
        </View>
      ) : null}
    </WithBar>
  );
}

// The Book Store: shelves of books from the catalog you curate in Supabase (see src/catalog.js).
export function Store({ u, openStory, openMenu, toast }) {
  const t = useT();
  const controls = useControls();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sideways = winW > winH * 1.1;
  const [cat, setCat] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(null); // the book whose details are showing
  const ps = usePurchases(); // member? which single books are bought?
  const [pay, setPay] = useState(null); // { kind: 'join' | 'buy', book } waiting for the grown-up question
  const [member, setMember] = useState(false); // the membership screen
  const [buying, setBuying] = useState(null);
  const passed = async () => {
    const p = pay; setPay(null);
    if (!p) return;
    if (p.kind === 'join') { setMember(true); return; }
    setBuying(p.book.id);
    try { const r = await buyBook(p.book); if (r === 'done') toast && toast(t('“{title}” is yours. Tap Read now.', { title: p.book.title })); } catch (e) { toast && toast(t(e.message)); }
    setBuying(null);
  };
  const load = async (pull) => {
    if (pull) setRefreshing(true);
    try { const c = await refreshCatalog(); if (c) setCat(c); } catch (e) { /* offline: keep the saved copy */ }
    if (pull) setRefreshing(false);
  };
  useEffect(() => { cachedCatalog().then((c) => setCat((cur) => cur || c)); load(false); }, []);
  // only the books shown for now (see SHOWN_BOOKS); books marked libraryOnly (Tips for Authors) stay out of the Store
  // books inside the app that name a store shelf (storeShelf) appear there even before the online catalogue lists them
  const extra = cat ? STORIES.filter((st) => st.storeShelf && SHOWN_BOOKS.includes(st.id) && !cat.books.some((b) => b.id === st.id))
    .map((st, i) => ({ id: st.id, title: st.title, author: st.author || null, blurb: st.blurb || null, shelf_id: st.storeShelf, sort: i, access: 'free', bundled: true, featured: false })) : [];
  const shown = cat ? { ...cat, books: [...cat.books.filter((b) => (SHOWN_BOOKS.includes(b.id) || !b.bundled) && !STORIES.some((st) => st.id === b.id && st.libraryOnly)), ...extra] } : null; // plus every book published from the Store Manager
  // (web preview only, #pay-demo: two books shown as a members' book and a single book to buy)
  if (shown && Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash === '#pay-demo') {
    shown.books = shown.books.map((b) => (b.id === 'rough-lives' ? { ...b, access: 'member' } : b.id === 'two-snakes' ? { ...b, access: 'paid', price_label: '$2.99' } : b));
  }
  // the parental controls can hide books rated for older children
  if (shown && controls.childAge != null) shown.books = shown.books.filter((b) => ageAllowed(ageOf(b, bundledStory(b.id)), controls.childAge));
  const featured = shown ? shown.books.find((b) => b.featured) : null;
  // a book is on the shelves only once: the featured book isn't repeated on the shelf below
  const rows = shown ? shelvesWithBooks(featured ? { ...shown, books: shown.books.filter((b) => b.id !== featured.id) } : shown) : [];
  // Read now: the cover in the card opens like a book does from My Library (the card stays until the reader takes over)
  const [fetching, setFetching] = useState(null); // a store book being downloaded
  const read = async (b, rect) => {
    const st = bundledStory(b.id);
    if (st) return openStory(st, rect);
    setFetching(b.id);
    try { openStory(await loadStoreBook(b), rect); } catch (e) { toast && toast(t(e.message)); }
    setFetching(null);
  };
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /><View style={{ flex: 1 }} /></Bar>}>
      <Band color={colors.blue} felt="store" title={t('Book Store')} sub={t('Discover and buy new books')} />
      <ScrollView contentContainerStyle={{ paddingTop: 46, paddingBottom: 24, gap: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.white} />}>
        {/* laid out like My Library: whole covers in a grid, nothing cut off, no sideways scrolling */}
        {[...(featured ? [{ id: 'featured', title: t('Featured'), books: [featured] }] : []), ...rows].map((sh) => (
          <View key={sh.id} style={{ gap: 14 }}>
            <Text style={styles.shelfTitle}>{t(sh.title)}</Text>
            <View style={[styles.shelfGrid, { columnGap: gridGap(winW) }]}>
              {sh.books.map((b) => (
                // covers only: the title and author are in the details box that opens on a tap
                <Tile key={b.id} u={u} ear={false} cover={coverFor(b)} coverArt={coverArtFor(b)} label={sh.id === 'featured' ? t('{title}, featured', { title: b.title }) : b.title}
                  badge={<Badge book={b} />}
                  onPress={(rect) => setOpen({ book: b, rect })} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      {open ? (
        <BookCard key={open.book.id} u={u} book={open.book} rect={open.rect} sideways={sideways}
          barH={sideways ? 0 : u * 17 + insets.bottom} barW={sideways ? Math.round(u * 17 * 1.15) : 0}
          busy={fetching === open.book.id || buying === open.book.id} onClose={() => setOpen(null)} onRead={(rect) => read(open.book, rect)}
          allowed={canOpen(ps, open.book)} onJoin={() => setPay({ kind: 'join', book: open.book })} onBuy={() => setPay({ kind: 'buy', book: open.book })} />
      ) : null}
      {/* buying is for grown-ups: the grown-up question first */}
      <ParentGate visible={!!pay} reason={pay && pay.kind === 'buy' ? t('Buying “{title}” for {price}.', { title: pay.book.title, price: pay.book.price_label || PRICES.book }) : t('The membership is a paid subscription.')}
        onPass={passed} onCancel={() => setPay(null)} />
      <Membership visible={member} onClose={() => setMember(false)} toast={toast} />
    </WithBar>
  );
}

// A book's details as a floating card in the middle of the screen. The tapped cover first slides
// and grows into the card's top-left corner, then the card fades in around it, with the title and
// details underneath (beside it when the phone is sideways). Closing runs it backwards.
function BookCard({ u, book, rect, sideways, barH, barW, onClose, onRead, busy, allowed, onJoin, onBuy }) {
  const t = useT();
  const lang = useLang();
  const L = ((bundledStory(book.id) || {}).langs || {})[lang]; // a translated book inside the app: its title and description
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const areaW = winW - barW, areaH = winH - barH;
  const across = sideways; // cover on the left, details beside it
  const boxW = Math.min(areaW - 40, across ? 600 : 400);
  const M = 20; // margin around the cover inside the card
  const ear = Math.max(24, u * 7.5); // the dog-ear's size (as in DogEar)
  const cs = Math.round(across ? Math.min(boxW * 0.42, areaH - Math.max(insets.top, 20) - 40 - 2 * M) : boxW * 0.52); // cover size
  const [boxH, setBoxH] = useState(0);
  // right in the middle of the space between the bars (top bar / camera strip and the menu bar)
  const spaceL = across ? insets.left : 0, spaceT = across ? 0 : insets.top;
  const boxX = Math.round(spaceL + (areaW - spaceL - boxW) / 2);
  const boxY = Math.round(Math.max(spaceT + 10, spaceT + (areaH - spaceT - boxH) / 2));
  // The box simply fades in with the cover already in place (the cover no longer flies over from its tile),
  // and fades out again when closed.
  const mv = useRef(new Animated.Value(1)).current; // cover position: kept in the card
  const fade = useRef(new Animated.Value(0)).current; // the card and its cover
  const coverOp = useRef(new Animated.Value(0)).current; // the cover (stays put when 'Read now' opens the book)
  const blur = useRef(new Animated.Value(0)).current; // the blur behind it (not on the native driver)
  const started = useRef(false);
  useEffect(() => {
    if (!boxH || started.current) return;
    started.current = true;
    playSound('cardLift');
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(coverOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(blur, { toValue: 22, duration: 280, useNativeDriver: false }),
    ]).start();
  }, [boxH]);
  const closing = useRef(false);
  const close = (then) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 240, useNativeDriver: true }),
      // reading: the cover stays so the book can open from it; closing: it fades out with the box
      Animated.timing(coverOp, { toValue: then ? 1 : 0, duration: 240, useNativeDriver: true }),
      Animated.timing(blur, { toValue: 0, duration: 240, useNativeDriver: false }),
    ]).start(() => (then ? then() : onClose()));
  };
  const r = rect || { x: boxX + M, y: boxY + M, w: cs, h: cs };
  const dx = r.x + r.w / 2 - (boxX + M + cs / 2), dy = r.y + r.h / 2 - (boxY + M + cs / 2), k = r.w / cs;
  const coverMove = [
    { translateX: mv.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
    { translateY: mv.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
    { scale: mv.interpolate({ inputRange: [0, 1], outputRange: [k, 1] }) },
  ];
  const dim = fade.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const cover = coverFor(book);
  // every square is a page (a screen is a picture page and a words page), so bundled books count both
  const blurb = (L && L.blurb) || book.blurb || (bundledStory(book.id) || {}).blurb; // the catalog's text, or the bundled book's own
  const pageCount = bundledStory(book.id) ? bundledStory(book.id).pages.length * 2 : book.page_count;
  const access = book.access === 'free' ? t('Free') : book.access === 'member' ? t('Members') : t('Members or {price}', { price: book.price_label || PRICES.book });
  const meta = [pageCount ? t('{n} pages', { n: pageCount }) : null, ageText(ageOf(book, bundledStory(book.id))) ? t('ages {n}', { n: ageText(ageOf(book, bundledStory(book.id))) }) : book.age_range ? t('ages {n}', { n: book.age_range }) : null, access].filter(Boolean).join(' · ');
  const here = !!(bundledStory(book.id) || !book.bundled); // in the app, or downloadable from the store
  const canRead = allowed && here; // free, a member, or a single book they bought
  // the action: a small solid green pill beside the cover, level with its bottom.
  // Read now when it can be read; otherwise Buy (single books) or Join to read (members' books)
  const action = canRead ? 'read' : book.access === 'paid' ? 'buy' : book.access === 'member' ? 'join' : null;
  const label = busy ? t('One moment…') : action === 'read' ? t('Read now') : action === 'buy' ? t('Buy {price}', { price: book.price_label || PRICES.book }) : action === 'join' ? t('Join to read') : t('Read now');
  const pill = (
    <Pressable disabled={!action || busy} onPress={() => (action === 'read' ? onRead({ x: boxX + M, y: boxY + M, w: cs, h: cs }) : action === 'buy' ? onBuy() : onJoin())}
      style={[styles.sheetBtn, { paddingHorizontal: 16 }, !action && { opacity: 0.45 }]} accessibilityRole="button">
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.sheetBtnText}>{label}</Text>
    </Pressable>
  );
  // under the cover: title, author, pages and price, then a short description
  const info = (
    <View style={{ gap: 8 }}>
      <Text style={[styles.cardTitle, { marginTop: 10 }]}>{(L && L.title) || book.title}</Text>
      {book.author ? <Text style={styles.sheetSub}>{t('by {name}', { name: book.author })}</Text> : null}
      <Text style={styles.sheetSub}>{meta}</Text>
      {blurb ? <Text style={[styles.sheetText, { marginTop: 6 }]}>{blurb}</Text> : null}
      {!here ? <Text style={[styles.sheetText, { marginTop: 6 }]}>{t('Downloading new books arrives in the next update.')}</Text> : null}
      {/* a single book can also be read with the membership */}
      {action === 'buy' ? <Pressable onPress={onJoin} hitSlop={8} accessibilityRole="button"><Text style={[styles.sheetSub, { textDecorationLine: 'underline', marginBottom: 18 }]}>{t('Or read every book with the membership')}</Text></Pressable> : null}
    </View>
  );
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 60 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: dim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel={t('Close')} />
      </Animated.View>
      {/* the card (it also measures itself so it can sit in the middle) */}
      <View onLayout={(e) => setBoxH(e.nativeEvent.layout.height)}
        style={[styles.card, { left: boxX, top: boxY, width: boxW, maxHeight: areaH - boxY - 16 }]}>
        <Felt />
        {/* the grey card, with its top-right corner cut away under the dog-ear so the background shows through */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: ear, bottom: 0, backgroundColor: CARD_GREY }} />
          <View style={{ position: 'absolute', left: 0, right: ear, top: 0, height: ear, backgroundColor: CARD_GREY }} />
          <View style={{ position: 'absolute', right: 0, top: 0, width: 0, height: 0, borderTopWidth: ear, borderLeftWidth: ear, borderTopColor: 'transparent', borderLeftColor: CARD_GREY }} />
        </Animated.View>
        <Animated.View pointerEvents={boxH ? 'auto' : 'none'} style={{ opacity: fade, flexDirection: across ? 'row' : 'column' }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: cs + M, height: cs + 2 * M }} />{/* the same margin above and below the cover */}
          {!across ? (
            <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingLeft: 16, paddingTop: M, paddingBottom: M }}>
              <View />
              {pill}
            </View>
          ) : null}
        </View>
        {across ? (
          <View style={{ flex: 1, padding: M, minHeight: cs + 2 * M, justifyContent: 'space-between' }}>
            <View>
              <View style={{ height: 26 }} />
              {info}
            </View>
            <View style={{ alignItems: 'flex-start', marginTop: 14 }}>{pill}</View>
          </View>
        ) : (
          <View style={{ padding: M, paddingTop: 2, paddingBottom: M + 8 }}>{info}</View>
        )}
        </Animated.View>
        {/* close: a dog-ear in the top-right corner, folded like a page corner (it replaces the ×) */}
        <Animated.View style={{ position: 'absolute', right: 0, top: 0, width: 56, height: 56, opacity: fade, transform: [{ scaleY: -1 }] }}>
          <DogEar u={u} onPress={() => close()} label={t('Close')} under="transparent" />{/* just the white fold and its shadow; the corner behind it is open */}
        </Animated.View>
      </View>
      {/* the cover, already in place in the card's top-left corner (it fades with the box) */}
      <Animated.View pointerEvents="none" style={[styles.tileShadow, { position: 'absolute', left: boxX + M, top: boxY + M, width: cs, height: cs, opacity: boxH ? coverOp : 0, transform: coverMove }]}>
        {coverArtFor(book) ? <CoverArt cover={coverArtFor(book)} /> : cover ? <Image source={cover} style={styles.coverImg} resizeMode="cover" /> : null}
        {/* a very thin dark grey line just outside the cover */}
        <View pointerEvents="none" style={{ position: 'absolute', left: -1, top: -1, right: -1, bottom: -1, borderWidth: 1, borderColor: '#8c8c8c' }} />
      </Animated.View>
    </View>
  );
}

// The access label: a small solid tag (green for Free, blue for members, orange to buy) with a soft shadow.
function Badge({ book }) {
  const t = useT();
  const bg = book.access === 'free' ? colors.green : book.access === 'member' ? colors.blue : colors.orange;
  return (
    <View style={styles.badgeShadow}>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, book.access === 'paid' && { color: colors.ink }]}>{book.access === 'free' ? t('Free') : book.access === 'member' ? t('Members') : t('Members or {price}', { price: book.price_label || PRICES.book })}</Text>
      </View>
    </View>
  );
}

// the book details box: light grey with very dark grey letters
const CARD_GREY = '#bdbdbd', CARD_INK = '#222222';

const styles = StyleSheet.create({
  tipWrap: { position: 'absolute', left: 16, right: 16, bottom: 24, alignItems: 'flex-start', zIndex: 60 },
  tipBubble: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#f4f1ea', borderRadius: 22, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 24, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 10 },
  tipTail: { marginLeft: 46, width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#f4f1ea' },
  tipFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 14 },
  tipChar: { width: 116, height: 152, marginTop: 20, marginRight: 26, marginBottom: 24 }, // a bit bigger
  tipTitle: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 19, color: '#2b2b2b' },
  tipText: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#2b2b2b' },
  tipCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  tipBox: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#7a7a7a', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  tipBoxOn: { backgroundColor: colors.green, borderColor: colors.green },
  tipTick: { color: colors.white, fontWeight: '700', fontSize: 14, lineHeight: 16 },
  tipCheck: { fontFamily: fonts.ui, fontSize: 14, color: '#3a3a3a' },
  tipOk: { marginLeft: -4, backgroundColor: colors.green, borderRadius: 20, paddingHorizontal: 24, height: 40, alignItems: 'center', justifyContent: 'center' },
  tipOkText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
  screen: { flex: 1, backgroundColor: DESK_BG }, // same dark grey as reading
  // a generous gap between the felt title band and the first row of books
  grid: { padding: 20, paddingTop: 42, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 22 },
  tileShadow: { backgroundColor: '#828282', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.55, shadowRadius: 9, elevation: 8 }, // a clear shadow, so covers lift off the felt
  tileTitle: { fontFamily: 'EBGaramond_700Bold', fontSize: 19, lineHeight: 23, color: colors.white }, // book titles and details: the book serif
  tileOption: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 16, lineHeight: 23 },
  tileSub: { fontFamily: fonts.story, fontSize: 15, lineHeight: 19, color: '#d0d0d0' },
  check: { position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.white, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  checkOn: { backgroundColor: colors.green, borderColor: colors.white }, // selected: the standard green
  checkMark: { color: colors.white, fontWeight: '800', fontSize: 16, lineHeight: 18 },
  restore: { fontFamily: fonts.ui, fontSize: 15, color: '#d0d0d0', textDecorationLine: 'underline', textAlign: 'center' },
  confirm: { position: 'absolute', left: 16, right: 16, bottom: 150, backgroundColor: colors.panel, padding: 18, gap: 14, zIndex: 40 },
  confirmText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16, lineHeight: 22 },
  actBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // pills
  actText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  cancelPill: { backgroundColor: '#d4312a', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, overflow: 'hidden' },
  whoName: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  whoSub: { color: 'rgba(235,235,235,0.6)', fontFamily: fonts.ui, fontSize: 12, marginTop: 1 },
  barBtn: { paddingVertical: 10, paddingHorizontal: 6 },
  barSmall: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 }, // Select / Cancel: the same size as Share, Edit and Delete, on the same line
  barBtnOff: { opacity: 0.35 },
  barBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
  barHint: { flex: 1, textAlign: 'right', color: colors.muted, fontFamily: fonts.ui, fontSize: 12 },
  coverImg: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  feature: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingHorizontal: 20 },
  kicker: { color: '#d0d0d0', fontFamily: fonts.ui, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  featureTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 22 },
  shelfGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', rowGap: 22 },
  shelfTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 19, paddingHorizontal: 20 },
  badgeAt: { position: 'absolute', left: 6, bottom: 6 }, // bottom-left corner of the cover
  badgeShadow: { alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 3, elevation: 3 },
  badge: { paddingHorizontal: 8, paddingTop: 2, paddingBottom: 4, overflow: 'hidden' }, // a little more room below: the word sits centred
  badgeText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 12 },
  card: { position: 'absolute', overflow: 'hidden' },
  cardTitle: { color: CARD_INK, fontFamily: 'EBGaramond_700Bold', fontSize: 30, lineHeight: 34 },
  sheetSub: { color: '#4a4a4a', fontFamily: fonts.story, fontSize: 18 },
  sheetText: { color: CARD_INK, fontFamily: fonts.story, fontSize: 18, lineHeight: 25 , marginBottom: 22 },
  sheetBtn: { backgroundColor: colors.green, height: 40, borderRadius: 20, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }, // a small solid green pill
  sheetBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  note: { width: '100%', backgroundColor: '#4a4a4a', padding: 16, fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.white },
});
