// Help: a searchable walk-through of the app, in plain words. In the main menu above About.
// (A short explainer video will live at the top of this page later.)
import { TitleIcon } from '../titleIcons';
import { HEADING_ICONS } from '../headingIcons';
import { STORE_ON } from '../controls';
import React, { useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, sectionTitle, boxTitle, sectionBox, SECTION_GAP } from '../theme';
import { DESK_FELT, IS_TABLET, DESK_BG } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { useLang, useT } from '../i18n';
import { IDEA_COUNT } from '../ideas';

const BAND_FELT = require('../../assets/band-profile.jpg'); // the yellow-orange felt banner
const SEARCH_FELT = require('../../assets/search-felt.png'); // Jörg's grey stitched felt strip, cut out with a shadow

// Each topic: a title, the section it belongs to, and its steps or paragraphs.
const ALL_HELP = [
  { section: 'Getting started', title: 'Opening the app', text: [
    'When the app opens you’ll see your leather notebook on the felt. Tap it, or swipe it up, to open it.',
    'Inside are two choices: Make a book and Read a book (My Library). Tap one to go there.',
    'The menu button (three lines) in the bottom bar takes you anywhere in the app.',
  ] },
  { section: 'Getting started', title: 'Profiles for each child', text: [
    'Everyone can have their own profile, children and grown-ups, with their own notebook, badges, playlists and settings. Grown-ups add and change them in Settings, under Profiles. To switch, tap your picture beside My Notebook in My Library.',
  ] },
  { section: 'Reading', title: 'Reading a book', text: [
    'Open My Library and tap a book. Its cover opens and the first page appears.',
    'Each spread has a picture and its words. Turn the page by tapping the folded corner, tapping the right edge, or swiping up (or to the left when the phone is sideways). You can drag the page and it follows your finger.',
    'Swipe down (or to the right) to go back a page.',
    'Pinch the picture to zoom in.',
  ] },
  { section: 'Reading', title: 'Hearing the story read aloud', text: [
    'Tap the play button in the bottom bar and the narrator reads the page. Each word lights up as it’s spoken.',
    'Open Reading Options (under your books in My Library, or in Settings) to choose how the book plays: Page by Page, the whole book, Learn to Read or Read Yourself.',
    'Under Voices you can choose Fatima or Henry. Tap a voice to hear a short sample.',
  ] },
  { section: 'Reading', title: 'Learn to Read', text: [
    'In Learn to Read mode, tap any word to hear it, sounded out one part at a time.',
  ] },
  { section: 'Reading', title: 'Text size, font and sound effects', text: [
    'Reading Options also has the size of the words, the book font, and the page-turn sound with a volume slider.',
  ] },
  { section: 'Reading', title: 'Amber light', text: [
    'Amber light warms the pages for evening reading: amber paper, softer words and warmer pictures.',
    'Tap the small light bulb at the top left of the felt to turn it on or off, or switch it in Reading Options.',
  ] },
  { section: 'Music and sounds', title: 'The Audio Player', text: [
    'Tap the music note on the black bar to open the Audio Player. It’s there while you read, in My Library and in the Book Store.',
    'Turn the top knob to choose a nature sound and the bottom knob to choose music. Press Play, and slide the felt knob to set the volume. Tap the little line at the top right, or anywhere outside the player, to close it.',
    'The sounds keep playing while you browse and read.',
  ] },
  { section: 'Music and sounds', title: 'The Music and Sounds page', text: [
    'Choose Music and Sounds in Settings. Tap a sound or a piece of music to hear it, and tap it again to turn it off. A sound and a piece of music can play together.',
    'You can also set the volume, the playback speed, and a sleep timer that slowly fades the sound away.',
  ] },
  { section: 'Music and sounds', title: 'Your own music', text: [
    'Grown-ups can tap Upload or record music (it asks the grown-up question first). Upload a song saved on the phone, or record one right there, like a parent or grandparent singing a lullaby. Give it a name and it joins the music list.',
    'Press and hold your own music to remove it.',
  ] },
  { section: 'Music and sounds', title: 'Playlists', text: [
    'Open Reading Options and choose Playlists to line up several books that play one after another. Turn on Loop to start again from the beginning, and share a playlist with family.',
  ] },
  { section: 'Bedtime', title: 'Listen Only and the nightlight', text: [
    'Tap the moon on the black bar while a book is open. The book reads by itself and the screen slowly fades to a soft, glowing sunset sun.',
    'Slide the fine line under the sun to dim it: the moon moves across until only a warm glow is left.',
    'Tap the sleep timer to stop the story after 15, 30 or 60 minutes. The music fades out and the moon covers the sun.',
    'Tap the lock beside the moon so little hands can’t change anything. To unlock, tap the lock again and answer the grown-up question.',
    'The screen stays on while the nightlight shows, so keep the phone plugged in at night. Grown-ups can switch the nightlight off in Settings.',
  ] },
  { section: 'Bedtime', title: 'The wake-up alarm', text: [
    'Tap the alarm clock beside the lock. Turn the wheel with a finger in its little dimple to set the time (one turn is the whole day), then choose what to wake up to: a nature sound or music.',
    'At that time the sun rises slowly and the sound fades in very gently. Tap Snooze for nine more minutes, or Good morning! to end it.',
    'The alarm works while the nightlight is showing and the app stays open.',
  ] },
  { section: 'Your voice', title: 'Recording yourself reading', text: [
    'A grown-up can record their own voice reading each page, so the book plays in a familiar voice. Up to three people can record each book (Mom, Opa…).',
    'Open a book, tap the red button, then Start Recording. Pick who’s reading, or add a new reader with their name and a photo. Read the page, then turn it to keep going: each page saves on its own. Tap the red button to stop.',
    'Your Recordings lists every page by reader: play it, trim the start and end, or delete it.',
  ] },
  { section: 'Your voice', title: 'Choosing a voice', text: [
    'The round face on the reading bar shows who reads the book. Tap it to choose Fatima, Henry or anyone in the family who recorded this book. Pages they didn’t record are read by the narrator.',
    'A grown-up can tap the scissors in that box to change a reader’s photo, add a reader or remove one (with their recordings).',
  ] },
  { section: 'Your voice', title: 'Sharing a book in your voice', text: [
    'Share Book on the last page sends an invitation to the app. When the book has recordings, a file with your voice goes along with it.',
    'Whoever gets it taps the file and opens it in Coro to add your voice to the same book on their phone.',
  ] },
  { section: 'Making books', title: 'Making your own book', text: [
    'Choose Make a Book from the menu (or the + tile in My Library).',
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
  { section: 'Making books', title: 'How long can a book be?', text: [
    'A book can have up to 40 pages, each with a picture and words. A few sentences a page reads best; longer text gets smaller to fit.',
    'Pictures are kept sharp but small, so a whole book is usually 15 to 25 MB. Recordings take about 1 MB a minute.',
    'My Notebook has room for 60 pages.',
  ] },
  { section: 'My Notebook', title: 'Your notebook', text: [
    'My Notebook is always at the top of My Library. Tap it to open it.',
    'The first page is the inside cover with “My Notes”. Turn the page to see your badges, then your own pages.',
    'Turn the pages by tapping the bottom-right corner or swiping left or up; tap the bottom-left corner or swipe right or down to go back. On the last page, the bottom-right corner adds a page: a Notes page (a picture or drawing with your notes below) or a Sketch page (two squares to draw on).',
  ] },
  { section: 'My Notebook', title: 'Drawing and notes', text: [
    'Tap a picture square to make a drawing, choose a photo or take one. You can also draw on top of a photo.',
    'The drawing tools lie in the tray at the bottom: the eraser, a pencil, an ink pen, a watercolour brush, the smudge tool and the paint roller. Tap a tool to pick it up, and tap it again to choose a thin, medium or thick line.',
    'Pick a colour from the paint splotches. The + has every colour, bright and earthy, and Mix, Shapes and Mirror. The paint roller fills a shape: tap inside it. The smudge tool softly blurs what you’ve drawn.',
    'Undo and Redo are at the top, beside the green tick for Done. The bin clears the page.',
    'Tap the lined square to write notes.',
  ] },
  { section: 'My Notebook', title: 'Printing and sharing pages', text: [
    'Tap the envelope to share pages as a PDF, or the printer to print them. Pick the pages (or All pages); a grown-up is asked first.',
    'In Pages, each page also has its own printer and a trash can.',
  ] },
  { section: 'My Notebook', title: 'Badges', text: [
    'Badges are earned by reading: finishing books, reading several days in a row, reading at bedtime, and firsts like your first recording, first drawing and first book made.',
    'Badges you haven’t earned yet are grey. Tap any badge to see how to earn it.',
  ] },
  { section: 'Books', title: 'My Library', text: [
    'All your books are here: the books you made, then the books that come with the app.',
    'Tap Select to choose books to share or delete. Books that came with the app can be brought back with “Show removed books”.',
  ] },
  { section: 'Books', title: 'My Folder and the corkboard', text: [
    'My Folder is in My Library, under your books. It holds a note from us, the Abc sheet (tap a letter to hear it) and sheets other families send you.',
    'The corkboard at the very bottom of My Library is for sticky notes and photos. Tap the pin to add one, and tap a note or photo to see it big or take it down.',
  ] },
  { section: 'Books', title: 'The Book Store', store: true, text: [
    'The Book Store has new books to discover. Tap a cover to see what it’s about, then Read now.',
  ] },
  { section: 'Books', title: 'Membership and buying books', store: true, text: [
    'Some books are free. The membership unlocks every book in the Book Store, and each new one as it arrives: $4.99 a month or $39.99 a year, and the first 7 days are free.',
    'Some books can also be bought on their own, to keep, for $2.99. Members can read those too.',
    'Buying is for grown-ups: the app asks a grown-up question first, and payment goes through your Apple ID. Cancel the membership any time in your App Store account settings. On a new phone, use Restore Purchases on the membership screen.',
  ] },
  { section: 'Grown-ups', title: 'Settings and parental controls', text: [
    'Settings is the last item in the menu. It always asks the grown-up question first.',
    'Language: choose English, Deutsch, Français, Español or 日本語 for the app. Members can also read books in a different language from the app’s. The languages are also listed at the top of the start page: tap one to switch.',
    'Parental controls: choose exactly what your child can see and do. Hide My Notebook, Make a Book or Ideas and Support; switch off recording, sharing and printing; keep the language fixed; and make every book play one way (for example, always Page by Page).',
    'Quick and Safe Kid is the recommended setup for a child reading alone: only My Library and My Notebook, every book read aloud a page at a time, and nothing to buy, share, print, record or change.',
    'Your child’s age: every book has an age rating, and books rated for older children are hidden.',
    'Lock everything leaves only My Library and its books, read the way you chose. Unlock everything brings it all back.',
    'Nightlight mode: switch the bedtime nightlight on or off. Haptic feedback: feel soft clicks on dials, knobs and buttons, or switch them off.',
    'The Garden (a beta that may change): a quiet garden to visit, with birdsong. Turn it on in Settings, then pull up past the bottom of My Library to go in. Tap the garden to change the light, and tap a gate to leave.',
  ] },
  { section: 'Grown-ups', title: 'The grown-up check', text: [
    'Some things, like taking photos, printing, sharing and deleting, first ask a quick question only a grown-up can answer.',
  ] },
  { section: 'Grown-ups', title: 'AI and authenticity', text: [
    'Authenticity is a top priority at Coro.',
    'Any use of AI in created content, such as the books in the Book Store, is clearly documented and described in each book’s Process description. Parents and kids have full transparency, so they can decide for themselves.',
  ] },
  { section: 'Teachers and Educators', title: 'Classroom folders', text: [
    'A classroom folder holds up to 30 student profiles. Set it up in Settings, under Teachers and Educators: give your class a name, then add each student in Profiles.',
    'Students tap their name to start. Each one keeps their own notebook, badges and settings.',
    'Books are shared by the whole class, so students can make a book together, or each make their own.',
    'To end classroom mode, open Settings again. The students’ profiles stay.',
  ] },
  { section: 'Grown-ups', title: 'Sending us your book', store: true, text: [
    'Authors and illustrators young and old can send their books to the Coro Book Store. Visit oomlaut.com for more information.',
  ] },
];
// the Book Store's topics only while the store is on (see STORE_ON)
export const HELP = ALL_HELP.filter((h) => STORE_ON || !h.store);

const IDEAS_FELT = require('../../assets/ideas-felt.png');

export default function Help({ u, openMenu, onAbout, onIdeas, onWelcome }) {
  const searchRef = useRef(null);
  const { width: winWf } = useWindowDimensions();
  const feltW = Math.min(520, winWf - 48); // the felt patch, as wide as the column
  const t = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  // the felt strip: the column's width (its picture has a little room around it for the shadow)
  const stripW = Math.min(520, winW - 48) + 16, stripH = stripW * 366 / 1260;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null); // the open topic's title (when not searching)
  // the overview: just the section headings at first; a tapped heading opens its topics (one section at a time)
  const [openSec, setOpenSec] = useState(null);
  const found = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return HELP;
    // match the chosen language's words, with the English as a fallback
    return HELP.filter((h) => {
      const en = [h.section, h.title, ...h.text];
      const all = `${en.join(' ')} ${en.map((s) => t(s)).join(' ')}`.toLowerCase();
      return words.every((w) => all.includes(w));
    });
  }, [q, lang]);
  const searching = !!q.trim();
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        {!IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><TitleIcon kind="support" /><Text style={[styles.title, { flexShrink: 1 }]}>{t('Support')}</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.col}>
          {/* (a short video tour will go here later) */}
          {/* the search window: a white pill the width of the topics, with a soft inner shadow along its top edge */}
          <Pressable onPress={() => searchRef.current && searchRef.current.focus()} accessible={false} style={styles.searchWrap}>
            <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0)']} locations={[0, 0.35, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 14 }} />
            <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0)']} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 16 }} />
            {/* a text box (multiline, one line only) with its line placed exactly in the middle by padding: the
                one-line iPhone field centres its words its own way and kept putting them low */}
            <TextInput ref={searchRef} value={q} onChangeText={(v) => setQ(v.replace(/\n/g, ''))} placeholder={t('Search ideas and support')} placeholderTextColor="#666"
              style={styles.search} allowFontScaling={false} multiline scrollEnabled={false} submitBehavior="blurAndSubmit" returnKeyType="search" accessibilityLabel={t('Search ideas and support')} />
          </Pressable>
          {/* About lives here now (it left the main menu) */}
          <Pressable onPress={onAbout} accessibilityRole="button" style={styles.aboutPill}><Text style={styles.aboutText}>{t('About Coro')}</Text></Pressable>
          {onWelcome ? <Pressable onPress={onWelcome} accessibilityRole="button" style={[styles.aboutPill, { marginTop: 10 }]}><Text style={styles.aboutText}>{t('Watch the welcome again')}</Text></Pressable> : null}
          <View style={{ height: 18 }} />
          {!found.length ? <Text style={[styles.p, { color: colors.white }]}>{t('Nothing found for “{q}”. Try another word.', { q: q.trim() })}</Text> : null}
          {/* each section in its own black glass box: its heading, and its topics when it's open (searching opens all) */}
          {found.reduce((secs, h) => { const last = secs[secs.length - 1]; if (last && last.section === h.section) last.items.push(h); else secs.push({ section: h.section, items: [h] }); return secs; }, []).map(({ section, items }) => {
            const secOpen = searching || openSec === section;
            return (
              <View key={section} style={styles.box}>
                <Pressable disabled={searching} onPress={() => { setOpenSec((o) => (o === section ? null : section)); setOpen(null); }} accessibilityRole="button" accessibilityState={{ expanded: secOpen }}
                  style={[styles.secHead, !secOpen && { marginBottom: 0 }]}>
                  {HEADING_ICONS[section] ? <Image source={HEADING_ICONS[section]} style={styles.secIcon} accessibilityIgnoresInvertColors /> : null}
                  <Text style={[styles.section, { flex: 1 }]}>{t(section)}</Text>
                  {!searching ? <Text style={styles.secChev}>{secOpen ? '−' : '+'}</Text> : null}
                </Pressable>
                {secOpen ? items.map((h) => {
                  const shown = searching || open === h.title;
                  return (
                    <View key={h.title} style={styles.card}>
                      <Pressable onPress={() => setOpen((o) => (o === h.title ? null : h.title))} accessibilityRole="button" accessibilityState={{ expanded: shown }} style={styles.cardHead}>
                        <Text style={styles.cardTitle}>{t(h.title)}</Text>
                        <Text style={styles.chev}>{shown ? '−' : '+'}</Text>
                      </Pressable>
                      {shown ? (
                        <View style={{ gap: 10, paddingTop: 14 }}>{/* a clear gap under the topic's title */}
                          {h.text.map((p, k) => <Text key={k} style={styles.p}>{t(p)}</Text>)}
                        </View>
                      ) : null}
                    </View>
                  );
                }) : null}
              </View>
            );
          })}
          <View style={{ height: 18 }} />
          {/* the Idea Room, at the bottom now (Ideas has its own place in the menu: Jörg, 26 Oct 2026) */}
          {/* in Jörg's green felt patch, the words inside its stitching */}
          <Pressable onPress={onIdeas} accessibilityRole="button" style={[styles.ideas, { width: feltW, height: Math.round(feltW * 805 / 1100), borderRadius: feltW * 98 / 1100 /* the felt's own corners, so the shadow matches */ }]}>
            <Image source={IDEAS_FELT} style={{ position: 'absolute', left: 0, top: 0, width: feltW, height: Math.round(feltW * 805 / 1100) }} resizeMode="stretch" />
            <View style={{ flex: 1, gap: 6, justifyContent: 'center', paddingLeft: '12%', paddingRight: '8%', paddingVertical: '8%' }}>
              <Text style={styles.ideasTitle}>{t('Ideas Room')}</Text>
              <Text style={styles.ideasText}>{t('Many ideas for books you can make together: your photos and drawings, your words, your voice.')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <Text style={styles.ideasGo}>{t('Visit the Ideas Room')}</Text>
                {/* a small arrow in a circle, like the Back buttons */}
                <View style={styles.goCircle}><View style={styles.goChevron} /></View>
              </View>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG }, // the dark felt, as everywhere else
  band: { backgroundColor: colors.orange, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 34, paddingBottom: 40, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 12 },
  video: { aspectRatio: 16 / 9, backgroundColor: '#2b2b2b', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  videoPlay: { color: 'rgba(255,255,255,0.85)', fontSize: 34 },
  videoText: { color: '#cfcfcf', fontFamily: fonts.ui, fontSize: 14 },
  searchWrap: { height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: '#d6d6d6', justifyContent: 'center' }, // light grey
  // the pill is 44 tall; the line is 20 tall (fontSize 16, lineHeight 20), so 12 above it puts it in the middle
  search: { alignSelf: 'stretch', height: 44, backgroundColor: 'transparent', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 0, includeFontPadding: false,
    fontFamily: fonts.ui, fontSize: 16, lineHeight: 20, color: colors.ink, outlineWidth: 0 },
  goCircle: { width: 21, height: 21, borderRadius: 10.5, borderWidth: 1.5, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  goChevron: { width: 6, height: 6, borderRightWidth: 1.6, borderTopWidth: 1.6, borderColor: colors.white, transform: [{ translateX: -1.3 }, { rotate: '45deg' }] },
  ideas: { borderRadius: 26, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.45, shadowRadius: 8, elevation: 5 },
  ideasTitle: { fontFamily: fonts.uiBold, fontSize: 22, color: colors.white },
  ideasText: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: colors.white, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  ideasGo: { fontFamily: fonts.uiBold, fontSize: 15, color: colors.white, marginTop: 4 },
  aboutPill: { alignSelf: 'flex-start', backgroundColor: '#4b5330', // a dark, muted moss green, like the felt
    height: 44, borderRadius: 22, paddingHorizontal: 26, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  aboutText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  section: { ...boxTitle },
  box: { ...sectionBox, gap: 10 },
  // a section heading in the overview: the heading with a + / − at the far right; closed ones sit close together
  secIcon: { width: 28, height: 28 }, // the section's little line icon
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SECTION_GAP - 10 },
  secChev: { fontFamily: fonts.ui, fontSize: 30, lineHeight: 34, color: 'rgba(255,255,255,0.75)', width: 30, textAlign: 'center' }, // the standard section heading (as My Books in the library)
  card: { backgroundColor: '#3a3a3a', // dark grey, with white writing
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 28 },
  cardTitle: { flex: 1, fontFamily: fonts.uiBold, fontSize: 17, color: colors.white },
  chev: { fontFamily: fonts.ui, fontSize: 22, color: 'rgba(255,255,255,0.75)', width: 22, textAlign: 'center' },
  p: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, color: colors.white },
});
