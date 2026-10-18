// Help: a searchable walk-through of the app, in plain words. In the main menu above About.
// (A short explainer video will live at the top of this page later.)
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { DESK_FELT, IS_TABLET, DESK_BG } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { useT } from '../i18n';

const BAND_FELT = require('../../assets/band-profile.jpg'); // the yellow-orange felt banner
const SEARCH_FELT = require('../../assets/search-felt.png'); // Jörg's grey stitched felt strip, cut out with a shadow

// Each topic: a title, the section it belongs to, and its steps or paragraphs.
export const HELP = [
  { section: 'Getting started', title: 'Opening the app', text: [
    'When the app opens you’ll see your leather notebook on the felt. Tap it, or swipe it up, to open it.',
    'Inside are two choices: My Library (your books) and Book Store (new books). Tap one to go there.',
    'The menu button (three lines) in the bottom bar takes you anywhere in the app.',
  ] },
  { section: 'Reading', title: 'Reading a book', text: [
    'Open My Library and tap a book. Its cover opens and the first page appears.',
    'Each spread has a picture and its words. Turn the page by tapping the folded corner, tapping the right edge, or swiping up (or to the left when the phone is sideways). You can drag the page and it follows your finger.',
    'Swipe down (or to the right) to go back a page.',
    'Pinch the picture to zoom in.',
  ] },
  { section: 'Reading', title: 'Hearing the story read aloud', text: [
    'Tap the play button in the bottom bar and the narrator reads the page. Each word lights up as it’s spoken.',
    'Open Playback Settings from the menu to choose how the book plays: Page by Page, the whole book, Learn to Read or Read Yourself.',
    'Under Voices you can choose Fatima or Henry. Tap a voice to hear a short sample.',
  ] },
  { section: 'Reading', title: 'Learn to Read', text: [
    'In Learn to Read mode, tap any word to hear it, sounded out one part at a time.',
  ] },
  { section: 'Reading', title: 'Text size, font and sound effects', text: [
    'Playback Settings also has the size of the words, the book font, and sound effects (page turns and the cover) with a volume slider.',
  ] },
  { section: 'Your voice', title: 'Recording yourself reading', text: [
    'A grown-up can record their own voice reading each page, so the book plays in a familiar voice.',
    'Open a book and tap the red record button. Read the page, then turn the page to keep going: recording carries on with the next page. Tap the red button again to stop.',
    'Pages with your voice show a small red dot. Your recordings are listed in the recording menu, where you can play or remove them.',
  ] },
  { section: 'Making books', title: 'Making your own book', text: [
    'Choose Create a Story from the menu (or the + tile in My Library).',
    'Tap the picture square to add a picture: choose one from your photos, or take a photo (of a drawing, say). Taking a photo asks a grown-up first.',
    'Tap the words square to type the words for that page. Two or three sentences reads best.',
    'Tap the folded corner for a new page. Tap the title in the bottom bar to name your book and add who wrote and illustrated it.',
    'Everything saves on its own. Tap Finish when you’re done, and the book appears in My Library.',
  ] },
  { section: 'Making books', title: 'Designing a cover', text: [
    'After writing a page, choose Design a cover. Add a picture, then the title if you like.',
    'Drag the title anywhere on the cover. Change its size, colour and font with the buttons under the cover.',
  ] },
  { section: 'Making books', title: 'Pages, printing and sharing', text: [
    'Tap Pages in the bottom bar to see every page. Move pages up or down, or delete them.',
    'From there you can also share the book as a PDF, print it, or delete the whole book. Printing and sharing ask a grown-up first.',
  ] },
  { section: 'My Notebook', title: 'Your notebook', text: [
    'My Notebook is always at the top of My Library. Tap it to open it.',
    'The first page is the inside cover with “My Notes”. Turn the page to see your badges, then your own pages.',
    'Turn the pages by tapping the bottom-right corner or swiping left or up; tap the bottom-left corner or swipe right or down to go back. On the last page, the bottom-right corner adds a page: a Notes page (a picture or drawing with your notes below) or a Sketch page (two squares to draw on).',
  ] },
  { section: 'My Notebook', title: 'Drawing and notes', text: [
    'Tap a picture square to make a drawing, choose a photo or take one. You can also draw on top of a photo.',
    'Draw with your finger in crayon colours. Pick a thin, medium or thick crayon. The paint roller fills a shape with the colour you pick: tap inside it. The eraser rubs out whole lines and fills; undo takes back the last line or fill; Clear starts over.',
    'Tap the lined square to write notes.',
  ] },
  { section: 'My Notebook', title: 'Badges', text: [
    'Badges are earned by reading: finishing books, reading several days in a row, reading at bedtime, and firsts like your first recording, first drawing and first book made.',
    'Badges you haven’t earned yet are grey. Tap any badge to see how to earn it.',
  ] },
  { section: 'Books', title: 'My Library', text: [
    'All your books are here: the books that come with the app, books from the Book Store, and books you made.',
    'Tap Select to choose books to share or delete. Books that came with the app can be brought back with “Show removed books”.',
  ] },
  { section: 'Books', title: 'The Book Store', text: [
    'The Book Store has new books to discover. Tap a cover to see what it’s about, then Read now.',
  ] },
  { section: 'Books', title: 'Membership and buying books', text: [
    'Some books are free. The membership unlocks every book in the Book Store, and each new one as it arrives: $4.99 a month or $39.99 a year, and the first 7 days are free.',
    'Some books can also be bought on their own, to keep, for $2.99. Members can read those too.',
    'Buying is for grown-ups: the app asks a grown-up question first, and payment goes through your Apple ID. Cancel the membership any time in your App Store account settings. On a new phone, use Restore Purchases on the membership screen.',
  ] },
  { section: 'Grown-ups', title: 'Settings and parental controls', text: [
    'Settings is the last item in the menu. It always asks the grown-up question first.',
    'Language: choose English, Deutsch, Français, Español or 日本語 for the app. Members can also read books in a different language from the app’s. The languages are also listed at the top of the start page: tap one to switch.',
    'Parental controls: choose exactly what your child can see and do. Hide the Book Store, My Notebook, Create a Story or Help; switch off recording, sharing and printing; keep the language fixed; and make every book play one way (for example, always Page by Page).',
    'Lock everything leaves only My Library and its books, read the way you chose. Unlock everything brings it all back.',
  ] },
  { section: 'Grown-ups', title: 'The grown-up check', text: [
    'Some things, like taking photos, printing, sharing and deleting, first ask a quick question only a grown-up can answer.',
  ] },
  { section: 'Grown-ups', title: 'Sending us your book', text: [
    'Authors and illustrators young and old can send their books to the Oomlaut Book Store. Visit oomlaut.com for more information.',
  ] },
];

export default function Help({ u, openMenu, onAbout }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  // the felt strip: the column's width (its picture has a little room around it for the shadow)
  const stripW = Math.min(520, winW - 48) + 16, stripH = stripW * 366 / 1260;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null); // the open topic's title (when not searching)
  const found = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return HELP;
    return HELP.filter((h) => {
      const all = `${h.section} ${h.title} ${h.text.join(' ')}`.toLowerCase();
      return words.every((w) => all.includes(w));
    });
  }, [q]);
  const searching = !!q.trim();
  let lastSection = null;
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        {!IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : null}
        <Text style={styles.title}>{t('Help')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.col}>
          {/* (a short video tour will go here later) */}
          {/* the search window: a white pill the width of the topics, with a soft inner shadow along its top edge */}
          <View style={[styles.searchWrap, { marginTop: 14 }]}>
            <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0)']} locations={[0, 0.35, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 14 }} />
            <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0)']} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 16 }} />
            <TextInput value={q} onChangeText={setQ} placeholder={t('Search help')} placeholderTextColor="#666"
              style={styles.search} clearButtonMode="while-editing" returnKeyType="search" accessibilityLabel="Search help" />
          </View>
          {/* About lives here now (it left the main menu) */}
          <Pressable onPress={onAbout} accessibilityRole="button" style={styles.aboutPill}><Text style={styles.aboutText}>{t('About Oomlaut Reader')}</Text></Pressable>
          <View style={{ height: 18 }} />
          {!found.length ? <Text style={[styles.p, { color: colors.white }]}>Nothing found for “{q.trim()}”. Try another word.</Text> : null}
          {found.map((h) => {
            const head = h.section !== lastSection ? h.section : null;
            lastSection = h.section;
            const shown = searching || open === h.title;
            return (
              <View key={h.title}>
                {head ? <Text style={styles.section}>{head}</Text> : null}
                <View style={styles.card}>
                  <Pressable onPress={() => setOpen((o) => (o === h.title ? null : h.title))} accessibilityRole="button" accessibilityState={{ expanded: shown }} style={styles.cardHead}>
                    <Text style={styles.cardTitle}>{h.title}</Text>
                    <Text style={styles.chev}>{shown ? '−' : '+'}</Text>
                  </Pressable>
                  {shown ? (
                    <View style={{ gap: 10, paddingTop: 14 }}>{/* a clear gap under the topic's title */}
                      {h.text.map((t, k) => <Text key={k} style={styles.p}>{t}</Text>)}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG }, // the dark felt, as everywhere else
  band: { backgroundColor: colors.orange, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 34, paddingBottom: 40, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 12 },
  video: { aspectRatio: 16 / 9, backgroundColor: '#2b2b2b', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  videoPlay: { color: 'rgba(255,255,255,0.85)', fontSize: 34 },
  videoText: { color: '#cfcfcf', fontFamily: fonts.ui, fontSize: 14 },
  searchWrap: { height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: '#d6d6d6' }, // light grey
  search: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 18, fontFamily: fonts.ui, fontSize: 16, color: colors.ink, outlineWidth: 0 },
  aboutPill: { alignSelf: 'flex-start', backgroundColor: colors.green, height: 44, borderRadius: 22, paddingHorizontal: 26, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  aboutText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  section: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '700', color: '#d0d0d0', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  card: { backgroundColor: '#3a3a3a', // dark grey, with white writing
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 28 },
  cardTitle: { flex: 1, fontFamily: fonts.ui, fontWeight: '700', fontSize: 17, color: colors.white },
  chev: { fontFamily: fonts.ui, fontSize: 22, color: 'rgba(255,255,255,0.75)', width: 22, textAlign: 'center' },
  p: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, color: colors.white },
});
