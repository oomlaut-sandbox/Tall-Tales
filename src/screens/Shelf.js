// My Library and Book Store.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, Felt, IS_TABLET, Stitch } from '../look';
import { Bar, BarMeta, Burger, DogEar, Panel, WithBar } from '../components/Chrome';
import { accessLabel, bundledStory, cachedCatalog, coverFor, refreshCatalog, shelvesWithBooks } from '../catalog';
import ParentGate from '../components/ParentGate';
import { SHOWN_BOOKS, STORIES } from '../story';
import { BlurView } from 'expo-blur';
const AnimatedBlur = Animated.createAnimatedComponent(BlurView);
import { playSound } from '../sound';

// Two covers across on a phone; more on an iPad.
const COLS = (w) => (w >= 900 ? 4 : w >= 600 ? 3 : 2);
const TILE = { 2: 47, 3: 31, 4: 22.5 };
const tileWidth = (w) => `${TILE[COLS(w)]}%`;
const gridGap = (w) => { const n = COLS(w); return `${(100 - n * TILE[n]) / (n - 1)}%`; };

function Tile({ u, cover, title, sub, onPress, onLongPress, plus, selecting, selected, badge, label, ear: showEar = true }) {
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
      <View ref={coverRef} collapsable={false} style={{ aspectRatio: 1, backgroundColor: '#828282', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {cover ? <Image source={cover} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" /> : null}
        {plus ? <Text style={{ color: colors.white, fontSize: 64, fontWeight: '300' }}>+</Text> : null}
        {/* a small dog-ear (My Library only; the Book Store covers have none) */}
        {showEar ? <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderLeftWidth: ear, borderBottomWidth: ear, borderLeftColor: 'transparent', borderBottomColor: colors.earUnder }} /> : null}
        {showEar ? <View style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, borderRightWidth: ear, borderTopWidth: ear, borderRightColor: 'transparent', borderTopColor: colors.white }} /> : null}
        {/* the same thin grey outline as the cover in the book details box */}
        {cover ? <View pointerEvents="none" style={styles.coverLine} /> : null}
        {badge ? <View style={styles.badgeAt}>{badge}</View> : null}
        {selecting ? (
          <View style={[styles.check, selected && styles.checkOn]} accessibilityLabel={selected ? 'Selected' : 'Not selected'}>
            {selected ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
        ) : null}
      </View>
      </View>
      {title ? <Text style={[styles.tileTitle, plus && styles.tileOption]}>{title}</Text> : null}{/* 'Create a story' is an app option, so it's in Helvetica */}
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </Pressable>
  );
}

const BAND_FELT = { library: require('../../assets/band-library.jpg'), store: require('../../assets/band-store.jpg') }; // Jörg's stitched felt strips

function Band({ color, felt, dark, title, sub, action, onAction }) {
  const insets = useSafeAreaInsets();
  const fg = dark ? colors.ink : colors.white;
  return (
    <View style={{ backgroundColor: color, paddingTop: insets.top + 30, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 }}>{/* the title block centred top to bottom in the coloured band */}
      {/* iPad keeps the classic solid colour banners */}
      {felt && !IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT[felt]} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : <><Felt /><Stitch inset={7} /></>}
      {/* the title alone (no subtitle), centred in the band, with Select / Cancel on the same line */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: fg, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, transform: [{ translateY: -3 }] }}>{title}</Text>{/* nudged up a touch: the big title sat a little low next to Select */}
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
export function Library({ u, stories, openStory, openMenu, onCreate, onEdit, onShare, onDelete, removedCount, onRestore }) {
  const { width: winW } = useWindowDimensions();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [gate, setGate] = useState(null); // 'share' | 'delete'
  const chosen = stories.filter((s) => picked.includes(s.id));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const stop = () => { setSelecting(false); setPicked([]); setConfirm(false); };
  const mineCount = chosen.filter((s) => s.mine).length;
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => (selecting ? (
        <Bar u={u} vertical={v}>
          <Pressable onPress={() => setGate('share')} disabled={chosen.length !== 1} style={[styles.barBtn, chosen.length !== 1 && styles.barBtnOff]} accessibilityRole="button">
            <Text style={styles.barBtnText}>Share</Text>
          </Pressable>
          {/* Edit: only for a single book you made yourself */}
          <Pressable onPress={() => { const b = chosen[0]; stop(); onEdit(b); }} disabled={!(chosen.length === 1 && chosen[0].mine)} style={[styles.barBtn, !(chosen.length === 1 && chosen[0].mine) && styles.barBtnOff]} accessibilityRole="button">
            <Text style={styles.barBtnText}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm(true)} disabled={!chosen.length} style={[styles.barBtn, !chosen.length && styles.barBtnOff]} accessibilityRole="button">
            <Text style={[styles.barBtnText, { color: '#ff6b6b' }]}>Delete</Text>
          </Pressable>
          <View style={{ flex: 1 }} />{/* (Edit and Share simply grey out when they can't be used) */}
          {/* Cancel sits where Select was: the bottom right of the bar */}
          <Pressable onPress={stop} hitSlop={10} style={styles.barBtn} accessibilityRole="button"><Text style={styles.barSmall}>Cancel</Text></Pressable>
        </Bar>
      ) : (
        <Bar u={u} vertical={v}>
          <Burger u={u} onPress={openMenu} />
          <View style={{ flex: 1 }} />
          {/* Select: in the bottom right corner of the bar */}
          <Pressable onPress={() => setSelecting(true)} hitSlop={10} style={styles.barBtn} accessibilityRole="button"><Text style={styles.barSmall}>Select</Text></Pressable>
        </Bar>
      ))}>
      <Band color={colors.green} felt="library" title={selecting ? 'Select books' : 'My Library'}
        sub={selecting ? (picked.length ? `${picked.length} selected` : 'Tap books to select them') : 'Your stories, ready to read'} />
      <ScrollView contentContainerStyle={[styles.grid, { columnGap: gridGap(winW) }]}>
        {stories.map((s) => (
          // just the title under each cover (no author, pages or other details)
          <Tile key={s.id} u={u} cover={s.pages[0] && s.pages[0].image} title={s.title}
            selecting={selecting} selected={picked.includes(s.id)}
            onPress={(rect) => (selecting ? toggle(s.id) : openStory(s, rect))}
            onLongPress={!selecting && s.mine ? () => onEdit(s) : undefined} />
        ))}
        {/* Create a story always starts its own row, below the books */}
        {!selecting ? <View style={{ width: '100%' }} /> : null}
        {!selecting ? <Tile u={u} plus title="Create a story" onPress={onCreate} /> : null}
        {!selecting && removedCount ? (
          <Pressable onPress={onRestore} style={{ width: '100%', paddingVertical: 8 }} accessibilityRole="button">
            <Text style={styles.restore}>Show removed books ({removedCount})</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {confirm ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>
            {`Delete ${chosen.length === 1 ? `“${chosen[0].title}”` : `${chosen.length} books`}?`}
            {mineCount ? ' Stories you made, with their pictures and recordings, are deleted for good.' : ''}
            {chosen.length > mineCount ? ' Built-in books can be brought back later.' : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => setGate('delete')} style={[styles.actBtn, { backgroundColor: colors.highlight }]}><Text style={styles.actText}>Delete</Text></Pressable>
            <Pressable onPress={() => setConfirm(false)} style={[styles.actBtn, { backgroundColor: '#333' }]}><Text style={styles.actText}>Keep</Text></Pressable>
          </View>
        </View>
      ) : null}
      <ParentGate visible={!!gate} reason={gate === 'share' ? 'Sharing sends an invitation to Oomlaut Reader by message or email.' : 'Deleting books from the library.'}
        onCancel={() => setGate(null)}
        onPass={() => {
          const g = gate; setGate(null);
          if (g === 'share' && chosen[0]) onShare(chosen[0]);
          if (g === 'delete') { onDelete(chosen); stop(); }
        }} />
    </WithBar>
  );
}

// The Book Store: shelves of books from the catalog you curate in Supabase (see src/catalog.js).
export function Store({ u, openStory, openMenu }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sideways = winW > winH * 1.1;
  const [cat, setCat] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(null); // the book whose details are showing
  const load = async (pull) => {
    if (pull) setRefreshing(true);
    try { const c = await refreshCatalog(); if (c) setCat(c); } catch (e) { /* offline: keep the saved copy */ }
    if (pull) setRefreshing(false);
  };
  useEffect(() => { cachedCatalog().then((c) => setCat((cur) => cur || c)); load(false); }, []);
  // only the books shown for now (see SHOWN_BOOKS)
  const shown = cat ? { ...cat, books: cat.books.filter((b) => SHOWN_BOOKS.includes(b.id)) } : null;
  const rows = shown ? shelvesWithBooks(shown) : [];
  const featured = shown ? shown.books.find((b) => b.featured) : null;
  // Read now: the cover in the card opens like a book does from My Library (the card stays until the reader takes over)
  const read = (b, rect) => { const st = bundledStory(b.id); if (st) openStory(st, rect); };
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <Band color={colors.blue} felt="store" title="Book Store" sub="Discover and buy new books" />
      <ScrollView contentContainerStyle={{ paddingTop: 46, paddingBottom: 24, gap: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.white} />}>
        {/* laid out like My Library: whole covers in a grid, nothing cut off, no sideways scrolling */}
        {[...(featured ? [{ id: 'featured', title: 'Featured', books: [featured] }] : []), ...rows].map((sh) => (
          <View key={sh.id} style={{ gap: 14 }}>
            <Text style={styles.shelfTitle}>{sh.title}</Text>
            <View style={[styles.shelfGrid, { columnGap: gridGap(winW) }]}>
              {sh.books.map((b) => (
                // covers only: the title and author are in the details box that opens on a tap
                <Tile key={b.id} u={u} ear={false} cover={coverFor(b)} label={sh.id === 'featured' ? `${b.title}, featured` : b.title}
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
          onClose={() => setOpen(null)} onRead={(rect) => read(open.book, rect)} />
      ) : null}
    </WithBar>
  );
}

// A book's details as a floating card in the middle of the screen. The tapped cover first slides
// and grows into the card's top-left corner, then the card fades in around it, with the title and
// details underneath (beside it when the phone is sideways). Closing runs it backwards.
function BookCard({ u, book, rect, sideways, barH, barW, onClose, onRead }) {
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
  const blurb = book.blurb || (bundledStory(book.id) || {}).blurb; // the catalog's text, or the bundled book's own
  const pageCount = bundledStory(book.id) ? bundledStory(book.id).pages.length * 2 : book.page_count;
  const meta = [pageCount ? `${pageCount} pages` : null, book.age_range ? `ages ${book.age_range}` : null, accessLabel(book)].filter(Boolean).join(' · ');
  const canRead = book.access === 'free' && bundledStory(book.id);
  // the action: a small solid green pill beside the cover, level with its bottom
  const pill = (
    <Pressable disabled={!canRead} onPress={() => onRead({ x: boxX + M, y: boxY + M, w: cs, h: cs })}
      style={[styles.sheetBtn, !canRead && { opacity: 0.45 }]} accessibilityRole="button">
      <Text style={styles.sheetBtnText}>{book.access === 'free' ? 'Read now' : 'Buy now'}</Text>
    </Pressable>
  );
  // under the cover: title, author, pages and price, then a short description
  const info = (
    <View style={{ gap: 8 }}>
      <Text style={styles.cardTitle}>{book.title}</Text>
      {book.author ? <Text style={styles.sheetSub}>by {book.author}</Text> : null}
      <Text style={styles.sheetSub}>{meta}</Text>
      {blurb ? <Text style={[styles.sheetText, { marginTop: 6 }]}>{blurb}</Text> : null}
      {!canRead ? <Text style={[styles.sheetText, { marginTop: 6 }]}>{book.access === 'free' ? 'Downloading new books arrives in the next update.' : 'Memberships and buying single books arrive in the next update.'}</Text> : null}
    </View>
  );
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 60 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: dim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close" />
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
          <DogEar u={u} onPress={() => close()} label="Close" under="transparent" />{/* just the white fold and its shadow; the corner behind it is open */}
        </Animated.View>
      </View>
      {/* the cover, already in place in the card's top-left corner (it fades with the box) */}
      <Animated.View pointerEvents="none" style={[styles.tileShadow, { position: 'absolute', left: boxX + M, top: boxY + M, width: cs, height: cs, opacity: boxH ? coverOp : 0, transform: coverMove }]}>
        {cover ? <Image source={cover} style={styles.coverImg} resizeMode="cover" /> : null}
        {/* a very thin dark grey line just outside the cover */}
        <View pointerEvents="none" style={{ position: 'absolute', left: -1, top: -1, right: -1, bottom: -1, borderWidth: 1, borderColor: '#8c8c8c' }} />
      </Animated.View>
    </View>
  );
}

// The access label: a small solid tag (green for Free, blue for members, orange to buy) with a soft shadow.
function Badge({ book }) {
  const bg = book.access === 'free' ? colors.green : book.access === 'member' ? colors.blue : colors.orange;
  return (
    <View style={styles.badgeShadow}>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, book.access === 'paid' && { color: colors.ink }]}>{accessLabel(book)}</Text>
      </View>
    </View>
  );
}

// the book details box: light grey with very dark grey letters
const CARD_GREY = '#bdbdbd', CARD_INK = '#222222';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk }, // same dark grey as reading
  // a generous gap between the felt title band and the first row of books
  grid: { padding: 20, paddingTop: 42, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 22 },
  coverLine: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 1, borderColor: '#8c8c8c' },
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
  actBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', overflow: 'hidden' },
  actText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  barBtn: { paddingVertical: 10, paddingHorizontal: 6 },
  barSmall: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 }, // Select / Cancel: small, tucked in the corner
  barBtnOff: { opacity: 0.35 },
  barBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 18 },
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
  sheetText: { color: CARD_INK, fontFamily: fonts.story, fontSize: 18, lineHeight: 25 },
  sheetBtn: { backgroundColor: colors.green, height: 40, borderRadius: 20, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }, // a small solid green pill
  sheetBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  note: { width: '100%', backgroundColor: '#4a4a4a', padding: 16, fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.white },
});
