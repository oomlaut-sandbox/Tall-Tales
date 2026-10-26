// "Make a book": add a picture and words page by page (Jörg's Publisher design).
// Everything saves automatically. "Pages" opens a list to reorder or delete pages,
// or to delete the whole story.
import { Asset } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Keyboard, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { BOOK_FONTS, bookFont, colors, fonts } from '../theme';
import { Bar, Burger, CoverIcon, DogEar, DoneTick, Panel, PageShape, PagesIcon, Toast } from '../components/Chrome';
import { Fade } from '../components/PageView';
import { Spine, bookLayout } from '../components/BookFrame';
import { DESK_FELT, DeskFelt, DESK_BG } from '../look';
import { COVER_COLORS, bylineLook, bylineStyle, coverBoxes, coverTitleLook, titleStyle } from '../components/CoverArt';
import { creditsLine } from '../userStories';
import { playKey } from '../sound';
import { deleteUserStory, dropPicture, keepPicture, newPageId, saveUserStory } from '../userStories';
import StoryGuide from '../components/StoryGuide';
import ParentGate from '../components/ParentGate';
import { useT } from '../i18n';
import { printStory, shareStoryPdf } from '../pdf';
import { publishToStore } from '../storeAdmin';
import { keepFile, loadJSON, saveJSON } from '../storage';
import { DrawEditor } from './Notebook';
import { HEADING_ICONS } from '../headingIcons';
import { TITLE_ICONS } from '../titleIcons';

// The first page of a new book (Jörg, 25 Oct 2026): what's it about? A few big choices, or your own words.
// A choice (or the words) also names the book to start with; it can be changed on the cover.
const ABOUT = [
  ['me', 'Me', 'All About Me', () => TITLE_ICONS.settings],
  ['family', 'My family', 'Our Family', () => HEADING_ICONS['Together with others']],
  ['trip', 'A trip', 'Our Big Trip', () => HEADING_ICONS['Adventures and imagination']],
  ['feeling', 'A feeling', 'How I Feel', () => HEADING_ICONS.Feelings],
  ['pet', 'A pet', 'My Pet', () => HEADING_ICONS['Your favourite books']],
  ['else', 'Something else', null, () => HEADING_ICONS['Making books']],
];
const CORO_LYING = require('../../assets/coro-lying.png'); // Jörg's Coro lying down, cut out (dark backgrounds only)
function AboutPage({ tr, insets, onNext, onSkip }) {
  const [pick, setPick] = useState(null);
  const [words, setWords] = useState('');
  const inputRef = useRef(null);
  const { width: winW } = useWindowDimensions();
  const colW = Math.min(winW - insets.left - insets.right - 48, 520);
  const chipW = (colW - 12) / 2;
  const ready = pick && (pick !== 'else' || words.trim());
  const go = () => {
    const a = ABOUT.find(([k]) => k === pick);
    const title = words.trim() ? words.trim().replace(/^./, (c) => c.toUpperCase()) : a && a[2] ? tr(a[2]) : '';
    onNext({ about: pick, aboutWords: words.trim() || null, title });
  };
  return (
    <>
    <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: insets.top + 56, paddingBottom: 40, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: colW, gap: 18 }}>
        <Text style={styles.aboutTitle}>{tr('What’s your book about?')}</Text>
        <Text style={styles.aboutLead}>{tr('Pick one, or say it in your own words. You can change everything later.')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>{/* a clear gap under the words */}
          {ABOUT.map(([k, name, , icon]) => (
            <Pressable key={k} onPress={() => { setPick(k); if (k === 'else') setTimeout(() => inputRef.current && inputRef.current.focus(), 50); }}
              accessibilityRole="radio" accessibilityState={{ selected: pick === k }} style={[styles.aboutChip, { width: chipW }, pick === k && styles.aboutChipOn]}>
              <Image source={icon()} style={{ width: 30, height: 30 }} accessibilityIgnoresInvertColors />
              <Text style={styles.aboutChipText}>{tr(name)}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput ref={inputRef} value={words} onChangeText={(v) => { setWords(v); if (v.trim() && !pick) setPick('else'); }} placeholder={tr('Or tell us: a book about…')} placeholderTextColor="#8a8a8a"
          style={styles.aboutInput} returnKeyType="next" onSubmitEditing={() => ready && go()} accessibilityLabel={tr('What’s your book about?')} />
        <Pressable onPress={go} disabled={!ready} accessibilityRole="button" style={[styles.choiceBtn, { backgroundColor: colors.green, marginTop: 34 }, !ready && { opacity: 0.4 }]}>{/* well apart from the choices */}
          <Text style={styles.choiceBtnText}>{tr('Next, let’s make a cover')}</Text>
        </Pressable>
        <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 6 }}><Text style={styles.aboutSkip}>{tr('Skip')}</Text></Pressable>
      </View>
    </ScrollView>
    {/* (Coro lying in the corner was tried here and taken away again: Jörg, 26 Oct 2026) */}
    </>
  );
}
import { strokesToImage } from '../components/Strokes';

const MAX_PX = 1600;
const TOOLBOX_H = 92; // the cover editor's black glass tools box (two rows of buttons)
const MAX_PAGES = 40; // a soft limit, so books stay quick to open, print and share
const FULL = 'Books can have up to {n} pages. That’s a long story!'; // shown with tr(FULL, { n: MAX_PAGES })

const blank = () => ({ pid: newPageId(), text: '', uri: null, w: 1, h: 1 });

export function draftFrom(story) {
  if (!story) return { id: `s${Date.now()}`, title: '', writer: '', artist: '', pages: [blank()] }; // no title yet: the bar invites tr('Tap to add title')
  return {
    id: story.id,
    title: story.title,
    writer: story.writer || '',
    artist: story.artist || '',
    pages: story.pages.filter((p) => !p.titlePage).map((p) => ({ pid: p.pid, text: p.text, uri: p.image ? p.image.uri : null, w: p.w, h: p.h, uri2: p.image2 ? p.image2.uri : null, w2: p.w2 || 1, h2: p.h2 || 1 })),
    cover: story.cover || null,
  };
}

// The empty picture square: Jörg's light grey Polaroid with "Add Image" in white in the middle of its blue
// square (measured from the picture: the blue runs 28.3%–71.1% across and 24.3%–68.4% down).
const POLAROID = require('../../assets/polaroid.jpg');
// the hardcover looks for a text only cover: [key, picture, name] (Jörg will send the pictures)
const HARDCOVERS = [
  ['blue', require('../../assets/hardcovers/blue.jpg'), 'Blue cloth'],
  ['red', require('../../assets/hardcovers/red.jpg'), 'Red cloth'],
  ['brown', require('../../assets/hardcovers/brown.jpg'), 'Brown cloth'],
  ['green', require('../../assets/hardcovers/green.jpg'), 'Green cloth'],
  ['black', require('../../assets/hardcovers/black.jpg'), 'Black cloth'],
];
const BLUE_CLOTH = require('../../assets/make-cover-cloth.jpg'); // the blue cloth book cover (as on Let's make a book)
const BLUE = { l: 0.283, r: 0.711, t: 0.243, b: 0.684 };
// A text field whose words always sit in the middle, top to bottom: the box centres a one-line field that is exactly
// one line tall (no padding, no lineHeight, not scaled with the phone's text size). A taller field put the words low on iOS.
// Tapping anywhere on the box types in it.
export function CenteredField({ value, onChangeText, placeholder, onFocus, onBlur, box, text }) {
  const ref = useRef(null);
  const fs = (StyleSheet.flatten(text) || {}).fontSize || 17;
  const H = (StyleSheet.flatten(box) || {}).height || 48;
  const lh = Math.round(fs * 1.25);
  // a one-line text box as tall as the box, its line placed in the middle by padding (the one-line iPhone field
  // centred its words its own way and put them low, even cut them off)
  return (
    <Pressable onPress={() => ref.current && ref.current.focus()} style={box} accessible={false}>
      <TextInput ref={ref} value={value} onChangeText={(v) => onChangeText(v.replace(/\n/g, ''))} placeholder={placeholder} placeholderTextColor="#8a8a8a"
        onFocus={onFocus} onBlur={onBlur} returnKeyType="done" multiline scrollEnabled={false} submitBehavior="blurAndSubmit"
        allowFontScaling={false} style={[{ alignSelf: 'stretch', paddingHorizontal: 0, includeFontPadding: false, outlineWidth: 0 }, text, { height: H, lineHeight: lh, paddingTop: Math.round((H - lh) / 2), paddingBottom: 0 }]} accessibilityLabel={placeholder} />
    </Pressable>
  );
}

function EmptyPicture({ side, plain }) {
  const tr = useT();
  // the cover editor: no Polaroid; the blue cloth book cover fills the square, 'Add Image' in white (Jörg, 26 Oct 2026)
  if (plain) {
    const f = Math.max(16, Math.round(side * 0.055));
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#2f5f9e', alignItems: 'center', justifyContent: 'center', padding: side * 0.12 }]}>
        <Image source={BLUE_CLOTH} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="cover" />
        <Text style={{ textAlign: 'center', color: colors.white, fontFamily: fonts.uiBold, fontSize: f, lineHeight: f * 1.24 }}>{tr('Add Image')}</Text>
      </View>
    );
  }
  // the words sit well inside the blue (a good margin all round), wrap onto more lines when they're long
  // (in any language), and are always centred across and top to bottom
  const fs = Math.max(14, Math.round(side * 0.048));
  const bw = (BLUE.r - BLUE.l) * side, bh = (BLUE.b - BLUE.t) * side, m = bw * 0.16;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={POLAROID} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="cover" />
      <View style={{ position: 'absolute', left: BLUE.l * side + m, top: BLUE.t * side + m, width: bw - 2 * m, height: bh - 2 * m, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ width: '100%', textAlign: 'center', color: colors.white, fontFamily: fonts.uiBold, fontSize: fs, lineHeight: fs * 1.24 }}
          textBreakStrategy="balanced" lineBreakStrategyIOS="standard">{tr('Add Image')}</Text>
      </View>
    </View>
  );
}

export default function Publisher({ u, initial, fontKey, openMenu, toast, onChange, onDone, storeAdmin, onIdeas }) {
  const tr = useT(); // everything a child or parent reads here, in the app's language (the store owner's Publish stays English)
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);
  const [i, setI] = useState(0);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pdfChoice, setPdfChoice] = useState(null); // 'share' | 'print' | null: choosing a layout
  // the store owner can send a finished book to the Book Store (see storeAdmin.js)
  const admin = !!storeAdmin; // the app checks this once, for the menu and here
  const [publishing, setPublishing] = useState(false);
  const publish = async () => {
    if (publishing) return;
    setPublishing(true); setPagesOpen(false);
    try {
      clearTimeout(timer.current);
      await saveUserStory(latest.current);
      const r = await publishToStore(latest.current, (step) => toast(step));
      toast(r.narration || 'Sent to the Book Store. It stays hidden until you show it in the Store Manager; the narration is being made now.');
    } catch (e) {
      toast(`Couldn’t publish. ${e.message}`);
    }
    setPublishing(false);
  };
  const [gateFor, setGateFor] = useState(null); // {mode, layout} waiting for the grown-up check
  const [making, setMaking] = useState(false);
  const [editing, setEditing] = useState(false); // the big words editor
  // Opening the words editor: the words square zooms from its place on the page up into the editing spot.
  const wordsRef = useRef(null);
  const editRef = useRef(null);
  const [writeFont, setWriteFont] = useState('typewriter'); // the font to write in (typewriter to start)
  const [fontsOpen, setFontsOpen] = useState(false);
  const fromRect = useRef(null);
  const zoom = useRef(new Animated.Value(1)).current; // 0 = where the square is on the page, 1 = in the editor
  const [zoomTo, setZoomTo] = useState(null); // the editor square's spot on screen
  const openWords = () => {
    const go = (r) => { fromRect.current = r; zoom.setValue(r ? 0 : 1); setZoomTo(null); setEditing(true); };
    if (wordsRef.current && wordsRef.current.measureInWindow) wordsRef.current.measureInWindow((x, y, w, h) => go(w ? { x, y, w, h } : null));
    else go(null);
  };
  const closeWords = () => {
    const done = () => { setEditing(false); setPageDone(true); };
    if (!fromRect.current || !zoomTo) return done();
    Animated.timing(zoom, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(done);
  };
  const [pageDone, setPageDone] = useState(false); // 'Add another page?' after the editor

  const makePdf = async ({ mode, layout }) => {
    setGateFor(null);
    const d = latest.current;
    const pages = d.pages.filter((p) => p.text.trim() || p.uri || p.uri2);
    if (!pages.length) return toast(tr('Add a page with a picture or words first.'));
    setMaking(true);
    toast(mode === 'print' ? tr('Getting your story ready to print…') : tr('Making your PDF…'));
    try {
      const st = { title: d.title.trim() || tr('My Story'), pages: pages.map((p) => ({ text: p.text.trim(), image: p.uri ? { uri: p.uri } : null, image2: p.uri2 && !p.text.trim() ? { uri: p.uri2 } : null })) };
      if (mode === 'print') await printStory(st, layout, fontKey);
      else await shareStoryPdf(st, layout, fontKey);
    } catch (e) {
      toast(mode === 'print' ? tr('Couldn’t print the book. Please try again.') : tr('Couldn’t make the PDF. Please try again.')); // plain words, never the phone's technical message
    }
    setMaking(false);
  };
  const [saved, setSaved] = useState(true);
  const [guide, setGuide] = useState(false);
  useEffect(() => {
    loadJSON('guide', {}).then((g) => { if (!g.seen) setGuide(true); });
  }, []);
  const closeGuide = () => { setGuide(false); saveJSON('guide', { seen: true }); };
  const timer = useRef(null);
  const first = useRef(true);
  const latest = useRef(draft);
  latest.current = draft;
  const page = draft.pages[Math.min(i, draft.pages.length - 1)];

  // Autosave shortly after every change.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { onChange(await saveUserStory(latest.current)); setSaved(true); } catch (e) {}
    }, 700);
  }, [draft]);
  useEffect(() => () => clearTimeout(timer.current), []);
  // 'Saved' fades in quietly after each save, then away again
  const savedFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!saved || first.current) return;
    Animated.sequence([
      Animated.timing(savedFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(savedFade, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [saved]);

  const update = (patch) => setDraft((d) => ({ ...d, pages: d.pages.map((p, k) => (k === i ? { ...p, ...patch } : p)) }));

  // Choose a square photo, keep a copy in the story's folder: { uri, w, h }, or null if cancelled.
  // source: 'library' (the phone's photos) or 'camera' (take a photo, e.g. of a drawing; only after the grown-up check)
  const choosePhoto = async (source = 'library') => {
    const opts = { mediaTypes: 'images', quality: 0.9, allowsEditing: true, aspect: [1, 1] };
    let r;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast(tr('Coro isn’t allowed to use the camera. You can turn it on in Settings.')); return null; }
      r = await ImagePicker.launchCameraAsync(opts);
    } else {
      r = await ImagePicker.launchImageLibraryAsync(opts);
    }
    if (r.canceled || !r.assets || !r.assets[0]) return null;
    const a = r.assets[0];
    let src = a.uri, w = a.width || 1, h = a.height || 1;
    if (Math.max(w, h) > MAX_PX) {
      try {
        const r2 = await ImageManipulator.manipulateAsync(a.uri, [{ resize: w >= h ? { width: MAX_PX } : { height: MAX_PX } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
        src = r2.uri; w = r2.width; h = r2.height;
      } catch (e) { /* keep the original if resizing fails */ }
    }
    return { uri: await keepPicture(draft.id, src), w, h };
  };

  // ---- The Cover Editor: a square like the words editor. Add a picture, then (if wanted) the title,
  // which can be typed, sized and dragged into place. ----
  const [recordAsk, setRecordAsk] = useState(null); // after Finish: 'Now read it aloud' ({ list, id })
  const [titleBox, setTitleBox] = useState(false); // Finish with no title yet: 'Give your book a title'
  // The book maker always starts on the cover (title, names, cover picture) for a brand-new book;
  // 'Start writing' goes on to page 1. The cover stays one tap away: 'Cover' on the black bar.
  const isNew = (d) => !d.title.trim() && !d.cover && !d.pages.some((p) => p.text.trim() || p.uri || p.uri2);
  const [coverOpen, setCoverOpen] = useState(() => isNew(draft));
  const [startMode, setStartMode] = useState(() => isNew(draft));
  const [aboutOpen, setAboutOpen] = useState(() => isNew(draft)); // 'What's your book about?', before the cover // the cover's button reads 'Start writing'
  const coverFromNext = useRef(false); // opened from 'What's next?': Done goes back there
  const [fieldOn, setFieldOn] = useState(false); // typing in the title / names fields (the square steps aside)
  const [coverAsk, setCoverAsk] = useState(false); // 'Add the title as text?'
  const [coverTitling, setCoverTitling] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const titleEditingRef = useRef(false);
  titleEditingRef.current = titleEditing;
  // While the title box is open, Pages and Finish fade into the black bar (so nobody taps Finish
  // thinking it confirms the title), and fade back in when the box closes.
  const barFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(barFade, { toValue: titleBox || coverOpen ? 0 : 1, duration: titleBox || coverOpen ? 450 : 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, [titleBox, coverOpen]); // and while the Cover Editor is open (its own Done is the way out)
  // While the Cover Editor is open the whole bar goes quiet: the menu, the title and the page count fade out too.
  const coverFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(coverFade, { toValue: coverOpen ? 0 : 1, duration: coverOpen ? 450 : 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, [coverOpen]);
  const [coverTip, setCoverTip] = useState(false); // the 'Tap the title…' bubble
  const [toolsTip, setToolsTip] = useState(true); // no title yet: a speech bubble says where the tools will be
  useEffect(() => {
    if (!(coverOpen && coverTitling)) { setCoverTip(false); return undefined; }
    setCoverTip(true); // stays until the title is first touched, or for 8 seconds
    const t = setTimeout(() => setCoverTip(false), 8000);
    return () => clearTimeout(t);
  }, [coverOpen, coverTitling]);
  const [hardAsk, setHardAsk] = useState(false); // Text only cover: choose a hardcover
  const [coverTool, setCoverTool] = useState(null); // 'color' | 'font' palette open under the tools
  // which words the tools change: the title or the author line (tap one on the cover to choose it)
  const [coverSel, setCoverSel] = useState('title');
  const [bylineEditing, setBylineEditing] = useState(false);
  const bylineEditingRef = useRef(false);
  bylineEditingRef.current = bylineEditing;
  const cover = draft.cover || null;
  const setCover = (c) => setDraft((d) => ({ ...d, cover: c }));
  const openCover = (fromNext) => { coverFromNext.current = fromNext === true; setPageDone(false); setCoverAsk(false); setCoverTitling(!!(cover && cover.title)); setCoverOpen(true); };
  const pickCover = async (source, given) => {
    try {
      const ph = given || await choosePhoto(source);
      if (!ph) return;
      if (cover && cover.uri) dropPicture(cover.uri);
      setCover({ ...ph, title: cover ? cover.title || null : null });
      if (!(cover && cover.title)) setCoverAsk(true);
    } catch (e) {
      toast(tr('Couldn’t open your photos. Check that Coro is allowed to use Photos in Settings.'));
    }
  };
  const finishCover = () => {
    // a title typed on the cover also names the book, if it has no name yet
    setDraft((d) => (!d.title.trim() && d.cover && d.cover.title && d.cover.title.text.trim() ? { ...d, title: d.cover.title.text.trim() } : d));
    Keyboard.dismiss(); setFieldOn(false);
    setCoverOpen(false); setCoverAsk(false); setCoverTitling(false);
    if (startMode) { setStartMode(false); setI(0); } // 'Start writing': straight to page 1
    else if (coverFromNext.current) setPageDone(true); // back to 'What's next?'
    coverFromNext.current = false;
  };
  const coverNo = () => { setCover({ ...cover, title: null }); setCoverAsk(false); }; // stay on the cover
  const coverYes = () => {
    setCoverAsk(false); setCoverTitling(true);
    setCover({ ...cover, title: { text: draft.title.trim() || tr('My Story'), x: 0.5, y: 0.2, size: 0.11, color: TITLE_BLUE, font: 'coro' } }); // dark blue, in Coro, to start with
  };
  const setCoverTitle = (patch) => setDraft((d) => ({ ...d, cover: { ...d.cover, title: { ...d.cover.title, ...patch } } }));
  // dragging the title around the square
  const coverSize = useRef(1);
  // The cover square fits the room it has: on a phone held sideways, and above the keyboard while typing
  // the title, it scales down and sits centred in the space that's left.
  const [coverArea, setCoverArea] = useState(null); // { w, h } of the space under the 'Cover' heading
  const [kbUp, setKbUp] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKbUp(true));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbUp(false));
    const c = Keyboard.addListener('keyboardDidHide', () => setKbUp(false)); // belt and braces
    return () => { a.remove(); b.remove(); c.remove(); };
  }, []);
  // web preview only (#kb-demo): typing in the title acts as if the keyboard were up, so the layout can be checked
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && /kb-demo/.test(window.location.hash)) setKbUp(!!titleEditing);
  }, [titleEditing]);
  const dragFrom = useRef(null);
  const titleDrag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !titleEditingRef.current, // the title takes the touch (unless it's being typed in)
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6, // win over the text box while dragging
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { setCoverTip(false); const t = latest.current.cover && latest.current.cover.title; dragFrom.current = t ? { x: t.x, y: t.y } : null; },
    onPanResponderRelease: (_, g) => { setCoverSel('title'); if (Math.abs(g.dx) + Math.abs(g.dy) < 6) setTitleEditing(true); }, // a tap: type in it
    onPanResponderMove: (_, g) => {
      if (!dragFrom.current) return;
      const W = coverSize.current;
      setCoverTitle({ x: Math.max(0.05, Math.min(0.95, dragFrom.current.x + g.dx / W)), y: Math.max(0.06, Math.min(0.94, dragFrom.current.y + g.dy / W)) });
    },
  })).current;
  // the author line, dragged and typed in on its own (once it has its own place on the cover)
  const bylineFrom = useRef(null);
  const bylineDrag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !bylineEditingRef.current,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { setCoverTip(false); setCoverSel('byline'); const t = latest.current.cover && latest.current.cover.title; bylineFrom.current = t && t.bx != null ? { x: t.bx, y: t.by } : null; },
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) + Math.abs(g.dy) < 6) setBylineEditing(true); },
    onPanResponderMove: (_, g) => {
      if (!bylineFrom.current) return;
      const W = coverSize.current;
      setCoverTitle({ bx: Math.max(0.05, Math.min(0.95, bylineFrom.current.x + g.dx / W)), by: Math.max(0.04, Math.min(0.96, bylineFrom.current.y + g.dy / W)) });
    },
  })).current;

  // Add Image asks first: choose a picture from the phone, or take a photo (a drawing, say).
  // Taking a photo opens the camera, so a grown-up answers a question before it opens.
  const [imgAsk, setImgAsk] = useState(null); // 'page' | 'page2' | 'cover': which square the picture is for
  // ('page2': a second picture in the words square, for a page of two pictures and no words)
  const [camGate, setCamGate] = useState(null); // 'page' | 'cover' waiting for the grown-up check
  const pickImage = () => setImgAsk('page');
  // Make a drawing: the notebook's drawing tool, full screen; Done turns the drawing into the square's picture
  const [drawFor, setDrawFor] = useState(null); // 'page' | 'page2' | 'cover'
  const placeDrawing = async (target, strokes) => {
    if (!strokes || !strokes.length) return;
    try {
      const tmp = await strokesToImage(strokes, 1600);
      const uri = await keepFile(tmp, `stories/${draft.id}`, `draw-${Date.now()}.png`);
      await placeImage(target, null, { uri, w: 1600, h: 1600 });
    } catch (e) { toast(tr('That drawing couldn’t be saved. Try again.')); }
  };
  // given: a picture already made (a drawing), instead of choosing one
  const placeImage = async (target, source, given) => {
    if (target === 'cover') return pickCover(source, given);
    try {
      const ph = given || await choosePhoto(source);
      if (!ph) return;
      if (target === 'page2') {
        if (page.uri2) dropPicture(page.uri2);
        update({ uri2: ph.uri, w2: ph.w, h2: ph.h });
        return;
      }
      if (page.uri) dropPicture(page.uri);
      update(ph);
    } catch (e) {
      toast(source === 'camera' ? tr('Couldn’t open the camera.') : tr('Couldn’t open your photos. Check that Coro is allowed to use Photos in Settings.'));
    }
  };


  // a hardcover look as the cover picture (Text only cover: the title goes on top as usual)
  const applyHardcover = async (src) => {
    try { const a = Asset.fromModule(src); await a.downloadAsync(); pickCover('library', { uri: a.localUri || a.uri, w: a.width || 1600, h: a.height || 1600 }); } catch (e) {}
  };
  const removeImage = () => {
    if (page.uri) dropPicture(page.uri);
    update({ uri: null, w: 1, h: 1 });
  };
  const removeImage2 = () => {
    if (page.uri2) dropPicture(page.uri2);
    update({ uri2: null, w2: 1, h2: 1 });
  };

  const next = () => {
    if (i === draft.pages.length - 1) {
      if (!page.text.trim() && !page.uri && !page.uri2) return toast(tr('Add a picture or some words before the next page.'));
      if (draft.pages.length >= MAX_PAGES) return toast(tr(FULL, { n: MAX_PAGES }));
      setDraft((d) => ({ ...d, pages: [...d.pages, blank()] }));
    }
    setI(i + 1);
  };

  // After the words editor: carry on with a new page, or finish the book.
  const addPage = () => {
    setPageDone(false);
    if (draft.pages.length >= MAX_PAGES) return toast(tr(FULL, { n: MAX_PAGES }));
    setDraft((d) => ({ ...d, pages: [...d.pages.slice(0, i + 1), blank(), ...d.pages.slice(i + 1)] }));
    setI(i + 1);
  };

  const move = (k, dir) => {
    const j = k + dir;
    if (j < 0 || j >= draft.pages.length) return;
    setDraft((d) => {
      const pages = [...d.pages];
      [pages[k], pages[j]] = [pages[j], pages[k]];
      return { ...d, pages };
    });
    if (i === k) setI(j); else if (i === j) setI(k);
  };

  const removePage = (k) => {
    const p = draft.pages[k];
    if (p.uri) dropPicture(p.uri);
    if (p.uri2) dropPicture(p.uri2);
    setDraft((d) => {
      const pages = d.pages.filter((_, n) => n !== k);
      return { ...d, pages: pages.length ? pages : [blank()] };
    });
    const newLen = Math.max(1, draft.pages.length - 1);
    setI((x) => (x > k ? x - 1 : Math.min(x, newLen - 1)));
    toast(tr('Page {n} deleted.', { n: k + 1 }));
  };

  const finish = async (named) => {
    const d0 = latest.current;
    if (named !== true && !d0.title.trim() && d0.pages.some((p) => p.text.trim() || p.uri || p.uri2)) { setTitleBox(true); return; } // a book needs a name
    setTitleBox(false);
    clearTimeout(timer.current);
    try {
      const list = await saveUserStory(latest.current);
      const hasPages = latest.current.pages.some((p) => p.text.trim() || p.uri || p.uri2);
      toast(hasPages ? tr('Saved to My Library.') : tr('Nothing to save yet, so no story was added.'));
      // a book you make is read in a real voice, never the phone's: invite the author to record it now (Jörg, 26 Oct 2026)
      if (hasPages && list.some((x) => x.id === latest.current.id)) { setRecordAsk({ list, id: latest.current.id }); return; }
      onDone(list);
    } catch (e) {
      toast(tr('Couldn’t save the story. Try again.'));
    }
  };

  const deleteStory = async () => {
    clearTimeout(timer.current);
    draft.pages.forEach((p) => { if (p.uri) dropPicture(p.uri); if (p.uri2) dropPicture(p.uri2); });
    const list = await deleteUserStory(draft.id);
    toast(tr('“{title}” deleted.', { title: draft.title.trim() || tr('Untitled story') }));
    onDone(list);
  };

  const barH = u * 17 + insets.bottom;
  // Same look as reading: the page floats on dark grey (two equal squares, about 30 points of grey
  // all round, a soft drop shadow, the spine line and shading). The bars take the spare height.
  // The book is sized from the space it actually has, so it shrinks while the keyboard is up.
  const GAP = 30;
  const { width: winW, height: winH } = useWindowDimensions();
  const BL = bookLayout(winW, winH, insets, u * 17);
  const wide = BL.wide, spare = BL.spare;
  const [desk, setDesk] = useState(null);
  const side = Math.floor(desk
    ? Math.max(80, Math.min(BL.side, wide ? Math.min((desk.w - 2 * GAP) / 2, desk.h - 2 * GAP) : Math.min(desk.w - 2 * GAP, (desk.h - 2 * GAP) / 2)))
    : BL.side);
  return (
    <KeyboardAvoidingView style={[styles.screen, wide && { flexDirection: 'row' }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={wide ? { width: BL.leftW, backgroundColor: colors.bar } : { height: insets.top + spare / 2, backgroundColor: colors.bar }} />
      <View style={styles.desk} onLayout={(e) => setDesk({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {/* trying the charcoal felt instead of the plain dark grey */}
        <DeskFelt spot="publisher1" />
      <View style={[styles.bookShadow, wide ? { width: side * 2, height: side } : { width: side, height: side * 2 }]}>
      <View style={[styles.page, wide && { flexDirection: 'row' }]}>
        <Pressable onPress={pickImage} style={[styles.art, { width: side, height: side }]} accessibilityRole="button" accessibilityLabel={page.uri ? tr('Change image') : tr('Add image')}>
          {page.uri ? (
            <>
              <Image source={{ uri: page.uri }} style={styles.fill} resizeMode="cover" />
              <View style={styles.artBtns}>
                <Text style={styles.chip}>{tr('Change image')}</Text>
                <Pressable onPress={removeImage} hitSlop={6} accessibilityLabel={tr('Remove image')}><Text style={styles.chip}>{tr('Remove')}</Text></Pressable>
              </View>
            </>
          ) : (
            <EmptyPicture side={side} />
          )}
          {!wide ? <Fade edge="bottom" size={Math.round(side * 0.1)} max={0.22} /> : null}
        </Pressable>
        <Pressable onPress={page.uri2 ? () => setImgAsk('page2') : openWords} accessibilityRole="button" accessibilityLabel={page.uri2 ? tr('Change the second image') : tr('Words for page {n}', { n: i + 1 })} ref={wordsRef} collapsable={false} style={[styles.textBox, { width: side, height: side, paddingHorizontal: side * 0.09, paddingVertical: side * 0.06 }]}>{/* the whole words square opens the editor */}
          {/* a second picture instead of words: a page of two pictures */}
          {page.uri2 ? <Image source={{ uri: page.uri2 }} style={{ position: 'absolute', left: 0, top: 0, width: side, height: side }} resizeMode="cover" /> : null}
          {!wide ? <Fade edge="top" size={Math.round(side * 0.09)} max={0.13} /> : null}
          <Spine wide={wide} />
          {page.uri2 ? (
            <View style={[styles.artBtns, { bottom: 12 }]}>
              <Text style={styles.chip}>{tr('Change image')}</Text>
              <Pressable onPress={removeImage2} hitSlop={6} accessibilityLabel={tr('Remove the second image')}><Text style={styles.chip}>{tr('Remove')}</Text></Pressable>
            </View>
          ) : (
            <>
              {/* Tapping the words opens a big editor (just the words page, above the keyboard). */}
              <View style={{ flex: 1, justifyContent: 'center', minHeight: 0 }}>
                <Text style={[styles.input, { fontFamily: 'SpecialElite_400Regular' }, !page.text && { color: '#666' }]} numberOfLines={7}>
                  {page.text || tr('To add text, tap here. Two or three sentences reads best.')}
                </Text>
              </View>
              {/* no words yet: a small grey plus in the bottom corner offers a second picture instead */}
              {!page.text.trim() ? (
                <Pressable onPress={() => setImgAsk('page2')} hitSlop={6} accessibilityRole="button" accessibilityLabel={tr('Add another image page')}
                  style={{ position: 'absolute', left: side * 0.07, bottom: side * 0.07, flexDirection: 'row', alignItems: 'center', gap: side * 0.02 }}>
                  {/* a small grey plus, then the words */}
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: Math.max(18, Math.round(side * 0.07)), lineHeight: Math.max(18, Math.round(side * 0.07)) * 1.05, color: '#777' }}>+</Text>
                  <Text numberOfLines={2} style={{ fontFamily: fonts.ui, fontSize: Math.max(12, Math.round(side * 0.04)), lineHeight: Math.max(12, Math.round(side * 0.04)) * 1.25, color: '#555', maxWidth: side * 0.56, flexShrink: 1 }}>{tr('Add another image page')}{/* two lines when the words are long (never cut short with …) */}</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </Pressable>
        <DogEar u={u} under={colors.earUnder} onPress={next} label={tr('Next page')} />
        {/* the page count in a small grey box, top left of the picture page ('Saved' takes its place for a moment after each change) */}
        <View pointerEvents="none" style={[styles.countBox, { top: 12, left: 12 }]}>
          <Animated.Text numberOfLines={1} style={[styles.countText, { opacity: savedFade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>{tr('Page {a} of {b}', { a: i + 1, b: draft.pages.length })}</Animated.Text>
          <Animated.Text numberOfLines={1} style={[styles.countText, { position: 'absolute', opacity: savedFade }]}>{tr('Saved')}</Animated.Text>
        </View>
        <Pressable onPress={() => setGuide(true)} style={[styles.help, { top: 10, right: 10 }]} hitSlop={8} accessibilityLabel={tr('How to make a story')}>
          <Text style={styles.helpText}>?</Text>
        </Pressable>
      </View>
      </View>
      </View>
      {wide ? (
        // sideways: the bar runs down the right side (the title can be edited when upright)
        <View style={{ width: BL.rightW, backgroundColor: colors.bar, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Bar u={u} vertical>
            <View style={{ alignItems: 'center', gap: 18 }}>
              <Burger u={u} onPress={openMenu} />{/* the menu, house and note stay, even on the cover */}
            </View>
            <View style={{ alignItems: 'center', gap: 18 }}>
              {/* the page count sits above Pages, with plenty of room between them */}
              <Animated.View pointerEvents={titleBox || coverOpen ? 'none' : 'auto'} style={{ alignItems: 'center', gap: 18, opacity: barFade, marginBottom: 26 }}>
              <Pressable onPress={() => openCover()} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Edit the cover')}><CoverIcon size={23} /></Pressable>
              <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice(null); setPagesOpen(true); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Pages')}><PagesIcon size={24} /></Pressable>
              <Pressable onPress={() => finish()} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Finish and save the book')}><DoneTick size={34} /></Pressable>
              </Animated.View>
            </View>
          </Bar>
        </View>
      ) : (
      <View style={{ backgroundColor: colors.bar, paddingTop: spare / 2 }}>
      <Bar u={u}>
        <Burger u={u} onPress={openMenu} />{/* the menu, house and note stay, even on the cover */}
        {/* Cover, Pages, Finish on the right (the page count floats on the page itself); they keep their size even
            with the phone's larger text setting, so they always fit beside the menu, house and note */}
        <Animated.View pointerEvents={titleBox || coverOpen ? 'none' : 'auto'} style={{ marginLeft: 'auto', flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 22, opacity: barFade }}>
        <Pressable onPress={() => openCover()} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Edit the cover')}><CoverIcon size={23} /></Pressable>
        <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice(null); setPagesOpen(true); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr('Pages')}><PagesIcon size={24} /></Pressable>
        <Pressable onPress={() => finish()} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Finish and save the book')}><DoneTick size={34} /></Pressable>
        </Animated.View>
      </Bar>
      </View>
      )}

      <Panel open={pagesOpen} side="right" title={tr('Pages')} portraitWidth="94%" bottom={wide ? 0 : barH} inset={wide ? BL.rightW : 0} onClose={() => setPagesOpen(false)}>
        <ScrollView style={{ maxHeight: Math.max(380, winH * 0.55) }} contentContainerStyle={{ gap: 14, paddingBottom: 6 }}>
          {draft.pages.map((p, k) => (
            <View key={p.pid} style={[styles.prow, k === i && { borderColor: colors.green }]}>
              <Pressable onPress={() => { setI(k); setPagesOpen(false); }} style={styles.thumb} accessibilityLabel={tr('Go to page {n}', { n: k + 1 })}>
                {p.uri ? <Image source={{ uri: p.uri }} style={styles.fill} resizeMode="cover" /> : <Text style={styles.thumbNum}>{k + 1}</Text>}
              </Pressable>
              {/* beside the picture: the page's name on top (level with the picture's top), its buttons at the bottom */}
              <View style={{ flex: 1, minWidth: 0, height: 64, justifyContent: 'space-between' }}>
              <Pressable onPress={() => { setI(k); setPagesOpen(false); }}>
                <Text numberOfLines={1} style={styles.prowTitle}>{tr('Page {n}', { n: k + 1 })}<Text style={styles.prowSub}>{'  ·  '}{p.text.trim() || (p.uri && p.uri2 ? tr('Two pictures') : p.uri || p.uri2 ? tr('Picture only') : tr('Empty'))}</Text></Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => move(k, -1)} disabled={k === 0} hitSlop={6} style={[styles.pbtn, k === 0 && { opacity: 0.3 }]} accessibilityLabel={tr('Move page {n} up', { n: k + 1 })}><Text style={styles.pbtnText}>↑</Text></Pressable>
              <Pressable onPress={() => move(k, 1)} disabled={k === draft.pages.length - 1} hitSlop={6} style={[styles.pbtn, k === draft.pages.length - 1 && { opacity: 0.3 }]} accessibilityLabel={tr('Move page {n} down', { n: k + 1 })}><Text style={styles.pbtnText}>↓</Text></Pressable>
              <Pressable onPress={() => removePage(k)} hitSlop={6} style={styles.pbtn} accessibilityLabel={tr('Delete page {n}', { n: k + 1 })}><Text style={styles.pbtnText}>✕</Text></Pressable>
              </View>
              </View>
            </View>
          ))}
        </ScrollView>
        {pdfChoice ? (
          <View style={{ gap: 10, marginTop: 30 }}>
            <Text style={styles.warn}>{pdfChoice === 'print' ? tr('Choose a layout to print:') : tr('Choose a layout for your PDF:')}</Text>
            {/* the same two choices, with the same little pictures, as Print in the Playback menu */}
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {[['stacked', tr('Portrait')], ['landscape', tr('Landscape')]].map(([lay, label]) => (
                <Pressable key={lay} onPress={() => { setGateFor({ mode: pdfChoice, layout: lay }); setPdfChoice(null); setPagesOpen(false); }}
                  accessibilityRole="button" accessibilityLabel={tr(lay === 'stacked' ? 'Portrait pages' : 'Landscape pages')} style={styles.layBtn}>
                  <View style={styles.layIc}><PageShape wide={lay === 'landscape'} /></View>
                  <Text style={styles.layLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : confirmDelete ? (
          <View style={{ gap: 10, marginTop: 44 }}>
            <Text style={styles.warn}>{tr('Delete “{title}”, its pictures and any voice recordings? This can’t be undone.', { title: draft.title.trim() || tr('Untitled story') })}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={deleteStory} style={[styles.wide, { backgroundColor: colors.deepRed }]}><Text style={styles.wideText}>{tr('Delete book')}</Text></Pressable>
              <Pressable onPress={() => setConfirmDelete(false)} style={styles.wide}><Text style={styles.wideText}>{tr('Keep it')}</Text></Pressable>
            </View>
          </View>
        ) : (
          // the pills stacked on the right, well clear of the pages list: Share as PDF, Print, (the owner's Publish), Delete Book
          <View style={{ alignItems: 'flex-end', gap: 12, marginTop: 30, marginBottom: 10 }}>
            <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice('share'); }} disabled={making} style={[styles.stackPill, { backgroundColor: '#6b6b6b' }]} accessibilityRole="button">
              <Text style={styles.wideText}>{making ? tr('Working…') : tr('Share as PDF')}</Text>
            </Pressable>
            <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice('print'); }} disabled={making} style={[styles.stackPill, { backgroundColor: '#6b6b6b' }]} accessibilityRole="button">
              <Text style={styles.wideText}>{tr('Print')}</Text>
            </Pressable>
            {admin ? (
              <Pressable onPress={publish} disabled={publishing} style={[styles.stackPill, { backgroundColor: colors.blue }]} accessibilityRole="button">
                <Text style={styles.wideText}>{publishing ? 'Publishing…' : 'Publish to Store'}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => { setPdfChoice(null); setConfirmDelete(true); }} style={[styles.stackPill, { backgroundColor: colors.deepRed }]} accessibilityRole="button">
              <Text style={styles.wideText}>{tr('Delete Book')}</Text>
            </Pressable>
          </View>
        )}
      </Panel>
      {editing ? (
        // The words editor: the words page, moved down a little from the top, with a green Done pill under it.
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.desk, opacity: zoom }]}>
            {/* the charcoal felt (phones only; DESK_FELT is empty on iPad) */}
            <DeskFelt spot="publisher2" overlay />
          </Animated.View>
          <View style={[styles.editor, { flex: 1, paddingTop: insets.top + 34 }]}>
          <Animated.View style={[styles.editorHead, { opacity: zoom }]}>
            {/* the words are the second page of each pair (the picture is the first): page 2, 4, 6 … */}
            <Text style={styles.editorTitle}>{tr('Page {n}', { n: i * 2 + 2 })}</Text>
          </Animated.View>
          {(() => {
            const W = winW - 2 * GAP;
            const f = fromRect.current, t = zoomTo;
            const move = f && t ? [
              { translateX: zoom.interpolate({ inputRange: [0, 1], outputRange: [f.x + f.w / 2 - (t.x + t.w / 2), 0] }) },
              { translateY: zoom.interpolate({ inputRange: [0, 1], outputRange: [f.y + f.h / 2 - (t.y + t.h / 2), 0] }) },
              { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [f.w / t.w, 1] }) },
            ] : [];
            return (
              <Animated.View
                ref={editRef} collapsable={false}
                onLayout={() => {
                  if (zoomTo) return;
                  const grow = (r) => {
                    setZoomTo(r || { x: 0, y: 0, w: 1, h: 1 });
                    if (r && fromRect.current) Animated.timing(zoom, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
                    else { fromRect.current = null; zoom.setValue(1); }
                  };
                  // measure where the editor's square sits, then zoom the page's square up into it
                  setTimeout(() => (editRef.current && editRef.current.measureInWindow
                    ? editRef.current.measureInWindow((x, y, w, h) => grow(w ? { x, y, w, h } : null)) : grow(null)), 0);
                }}
                style={[styles.editorPage, { width: W, maxHeight: W, opacity: f && !t ? 0 : 1, transform: move }]}>
                <TextInput
                  value={page.text}
                  onChangeText={(text) => { if (text.length > (page.text || '').length) playKey(); update({ text }); }}
                  placeholder={tr('Type the words for this page. Two or three sentences reads best.')}
                  placeholderTextColor="#666"
                  multiline
                  autoFocus
                  style={[styles.editorInput, { fontFamily: bookFont(writeFont).family, outlineWidth: 0 }]}
                  accessibilityLabel={tr('Words for page {n}', { n: i + 1 })}
                />
              </Animated.View>
            );
          })()}
          {/* under the page: the three fonts to write in (left), and a green Done pill (right) */}
          <Animated.View style={{ width: winW - 2 * GAP, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: zoom }}>
            <View />
            <Pressable onPress={closeWords} hitSlop={8} accessibilityRole="button" style={styles.donePill}><Text style={styles.donePillText}>{tr('Done')}</Text></Pressable>
          </Animated.View>
          </View>
        </KeyboardAvoidingView>      ) : null}
      {titleBox ? (
        // Finish, but the book has no name yet: ask for one (it can still be left out)
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>{tr('Give your book a title')}</Text>
            <TextInput value={draft.title} onChangeText={(title) => setDraft((d) => ({ ...d, title }))} placeholder={tr('Type the title')} placeholderTextColor="#8a8a8a" autoFocus style={styles.field} accessibilityLabel={tr('Book title')}
              returnKeyType="done" onSubmitEditing={() => finish(true)} />
            <Pressable onPress={() => finish(true)} style={[styles.choiceBtn, { backgroundColor: colors.green, marginTop: 10 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Finish and save book')}</Text></Pressable>
            <Pressable onPress={() => setTitleBox(false)} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Keep working')}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
      {recordAsk ? (
        // Finished: the book is read aloud by someone, in a recording (Coro has no computer voice)
        <View style={[StyleSheet.absoluteFill, styles.choiceBack, { zIndex: 80 }]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>{tr('Now read it aloud')}</Text>
            <Text style={[styles.choiceBtnText, { fontFamily: fonts.ui, textAlign: 'center', lineHeight: 22, marginBottom: 8 }]}>{tr('Books you make are read in a real voice: yours, or the voice of someone who loves the reader. Coro has no computer voice, so until someone records the pages, the book is silent. Record it now, one page at a time.')}</Text>
            <Pressable onPress={() => { const r = recordAsk; setRecordAsk(null); onDone(r.list, r.id); }} style={[styles.choiceBtn, { backgroundColor: colors.green, marginTop: 6 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Record now')}</Text></Pressable>
            <Pressable onPress={() => { const r = recordAsk; setRecordAsk(null); onDone(r.list); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Later')}</Text></Pressable>
          </View>
        </View>
      ) : null}
      {aboutOpen ? (
        // (it stops at the black bar, which stays in view, like the Cover Editor: Jörg, 26 Oct 2026)
        <View style={[StyleSheet.absoluteFill, { zIndex: 55, backgroundColor: colors.desk, overflow: 'hidden' }, wide ? { right: BL.rightW } : { bottom: BL.barH }]}>
          <DeskFelt spot="publisher-about" overlay />
          <AboutPage tr={tr} insets={insets} onSkip={() => setAboutOpen(false)}
            onNext={({ about, aboutWords, title }) => { setDraft((d) => ({ ...d, about, aboutWords, title: d.title.trim() ? d.title : title })); setAboutOpen(false); }} />
        </View>
      ) : null}
      {coverOpen ? (
        // the Cover Editor stops at the black bar, which stays in view (its Pages and Finish fade out meanwhile)
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { zIndex: 55, backgroundColor: colors.desk, overflow: 'hidden' }, wide ? { right: BL.rightW } : { bottom: BL.barH }]}>
          <DeskFelt spot="publisher3" overlay />
          <View style={[styles.editor, { flex: 1, paddingTop: kbUp ? insets.top + 8 : insets.top + (winW > winH ? 16 : 56), paddingLeft: insets.left, paddingRight: insets.right }]}>
            {/* the book's title and (optional) who wrote it and who drew the pictures: all on the cover page */}
            {/* (shown unless the cover's own title is being typed: the keyboard can come up before onFocus, and these
                 must never unmount mid-tap, or the keyboard opens and shuts straight away) */}
            {!titleEditing ? (
              <View style={{ width: Math.min(winW - insets.left - insets.right - 2 * GAP, 560), gap: 8, marginBottom: 26 }}>{/* a little more room above the picture */}
                {!kbUp ? <Text style={styles.coverHead}>{tr('Create a cover')}</Text> : null}
                <CenteredField value={draft.title} onChangeText={(title) => setDraft((d) => ({ ...d, title }))} placeholder={tr('Book title')}
                  onFocus={() => setFieldOn(true)} onBlur={() => setFieldOn(false)} box={styles.fieldBox} text={[styles.fieldText, { fontFamily: fonts.uiBold }]} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <CenteredField value={draft.writer || ''} onChangeText={(writer) => setDraft((d) => ({ ...d, writer }))} placeholder={tr('Written by')}
                    onFocus={() => setFieldOn(true)} onBlur={() => setFieldOn(false)} box={[styles.fieldBox, styles.fieldBoxSmall]} text={[styles.fieldText, { fontSize: 15 }]} />
                  <CenteredField value={draft.artist || ''} onChangeText={(artist) => setDraft((d) => ({ ...d, artist }))} placeholder={tr('Illustrated by')}
                    onFocus={() => setFieldOn(true)} onBlur={() => setFieldOn(false)} box={[styles.fieldBox, styles.fieldBoxSmall]} text={[styles.fieldText, { fontSize: 15 }]} />
                </View>
                {fieldOn ? (
                  <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
                    <Pressable onPress={() => { Keyboard.dismiss(); setFieldOn(false); }} hitSlop={8} accessibilityRole="button" style={[styles.donePill, { marginBottom: 0 }]}><Text style={styles.donePillText}>{tr('Done')}</Text></Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
            {fieldOn ? null : (
            <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: kbUp ? 'center' : 'flex-start' }}
              onLayout={(e) => setCoverArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {(() => {
              // room for the tools under the square (hidden while typing) and, upright, for Done at the bottom
              // (the square keeps one fixed size whatever is showing: room is always kept for the tools box and Done)
              const toolsH = kbUp ? 60 : TOOLBOX_H + 10;
              const doneH = kbUp || winW > winH ? 0 : 50;
              const fitH = coverArea ? coverArea.h - toolsH - doneH - 8 : winW;
              const W = Math.max(120, Math.floor(Math.min(winW - insets.left - insets.right - 2 * GAP, fitH)));
              coverSize.current = W;
              const t = cover && cover.title;
              return (
                <View style={[styles.coverShadow, { width: W, height: W }]}>{/* the drop shadow sits outside the clipped square (iOS hides a shadow on a view that clips) */}
                <View style={[styles.coverSquare, { width: W, height: W, marginBottom: 0 }]}>
                  {cover && cover.uri ? (
                    <Pressable onPress={() => setImgAsk('cover')} style={StyleSheet.absoluteFill} accessibilityLabel={tr('Change the cover picture')}>
                      <Image source={{ uri: cover.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setImgAsk('cover')} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} accessibilityRole="button">
                      <EmptyPicture side={W} plain />
                    </Pressable>
                  )}
                  {/* the title: type in it, drag it anywhere on the cover */}
                  {coverTitling && t ? (() => { const B = coverBoxes(t, W); const box = (on) => (on && !kbUp ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.8)', borderRadius: 6 } : null); return (
                    <>
                    <View {...titleDrag.panHandlers} style={[B.title, box(coverSel === 'title')]}>
                      {/* tap the title to type in it; otherwise it's plain text that can be dragged anywhere */}
                      {titleEditing ? (
                        <TextInput value={t.text} onChangeText={(text) => setCoverTitle({ text })} multiline autoFocus onBlur={() => setTitleEditing(false)}
                          blurOnSubmit returnKeyType="done" onSubmitEditing={() => { Keyboard.dismiss(); setTitleEditing(false); }}
                          style={[titleStyle, coverTitleLook(t), { fontSize: t.size * W, lineHeight: t.size * W * 1.2, paddingHorizontal: W * 0.04, width: (t.w || 1) * W, textAlign: B.align, outlineWidth: 0 }]}
                          accessibilityLabel={tr('Cover title')} />
                      ) : (
                        <Text style={[titleStyle, coverTitleLook(t), { fontSize: t.size * W, lineHeight: t.size * W * 1.2, paddingHorizontal: W * 0.04, textAlign: B.align }]} accessibilityLabel={tr('Cover title')}>{t.text}</Text>
                      )}
                      {t.byline && !B.byline ? <Text style={[titleStyle, bylineStyle, coverTitleLook(bylineLook(t), true), { fontSize: B.bs * W, lineHeight: B.bs * W * 1.4, paddingHorizontal: W * 0.04 }]}>{t.byline}</Text> : null}
                    </View>
                    {/* the author line on its own: drag it, tap to type in it */}
                    {B.byline ? (
                      <View {...bylineDrag.panHandlers} style={[B.byline, box(coverSel === 'byline')]}>
                        {bylineEditing ? (
                          <TextInput value={t.byline} onChangeText={(byline) => setCoverTitle({ byline })} multiline autoFocus onBlur={() => setBylineEditing(false)}
                            blurOnSubmit returnKeyType="done" onSubmitEditing={() => { Keyboard.dismiss(); setBylineEditing(false); }}
                            style={[titleStyle, bylineStyle, coverTitleLook(bylineLook(t), true), { fontSize: B.bs * W, lineHeight: B.bs * W * 1.4, paddingHorizontal: W * 0.04, width: (t.bw || 1) * W, textAlign: B.balign, outlineWidth: 0 }]}
                            accessibilityLabel={tr('Author')} />
                        ) : (
                          <Text style={[titleStyle, bylineStyle, coverTitleLook(bylineLook(t), true), { fontSize: B.bs * W, lineHeight: B.bs * W * 1.4, paddingHorizontal: W * 0.04, textAlign: B.balign }]} accessibilityLabel={tr('Author')}>{t.byline}</Text>
                        )}
                      </View>
                    ) : null}
                    </>
                  ); })() : null}
                </View>
                </View>
              );
            })()}
            {/* under the cover: the title tools (size, colour, font, author), centred, with the hint; then Done */}
            {/* while typing: a Done pill right under the cover puts the keyboard away (so does the return key) */}
            {kbUp ? (
              <View style={{ width: coverSize.current, alignItems: 'flex-end', marginTop: 10 }}>
                <Pressable onPress={() => { Keyboard.dismiss(); setTitleEditing(false); setBylineEditing(false); }} hitSlop={8} accessibilityRole="button" style={[styles.donePill, { marginBottom: 0 }]}>
                  <Text style={styles.donePillText}>{tr('Done')}</Text>
                </Pressable>
              </View>
            ) : null}
            {/* all the title tools in one black glass box under the cover (Jörg, 26 Oct 2026) */}
            {!kbUp ? (
              <View style={[coverTitling && cover && cover.title ? styles.toolBox : { height: TOOLBOX_H, marginTop: 10 }, { width: coverSize.current }]}>{/* (no title yet: no box, just its room, so the cover never moves) */}
              {coverTitling && cover && cover.title ? (() => {
                const T = cover.title; const by = coverSel === 'byline' && T.bx != null;
                const curColor = (by ? bylineLook(T).color : T.color) || '#ffffff';
                const w = (by ? T.bw : T.w) || 1; const setW = (v) => setCoverTitle(by ? { bw: v } : { w: v });
                const a = (by ? T.balign || T.align : T.align) || 'center'; const nextA = { left: 'center', center: 'right', right: 'left' }[a];
                return (
                  <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Pressable onPress={() => (by ? setCoverTitle({ bs: Math.max(0.025, (T.bs || T.size * 0.42) - 0.008) }) : setCoverTitle({ size: Math.max(0.05, T.size - 0.015) }))} style={styles.toolBtn} accessibilityLabel={tr('Smaller title')}><Text style={[styles.donePillText, { fontSize: 13 }]}>A</Text></Pressable>
                    <Pressable onPress={() => (by ? setCoverTitle({ bs: Math.min(0.12, (T.bs || T.size * 0.42) + 0.008) }) : setCoverTitle({ size: Math.min(0.24, T.size + 0.015) }))} style={styles.toolBtn} accessibilityLabel={tr('Bigger title')}><Text style={[styles.donePillText, { fontSize: 20 }]}>A</Text></Pressable>
                    {/* text colour: one button; the colours open in their own box */}
                    <Pressable onPress={() => setCoverTool('color')} style={styles.toolBtn} accessibilityRole="button" accessibilityLabel={tr('Text Color')}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: curColor, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' }} />
                    </Pressable>
                    <Pressable onPress={() => setCoverTool('font')} style={styles.toolBtn} accessibilityRole="button" accessibilityLabel={tr('Title font')}>
                      <Text style={[styles.donePillText, { fontSize: 15, fontFamily: bookFont((by ? bylineLook(T).font : T.font) || 'serif').bold || bookFont((by ? bylineLook(T).font : T.font) || 'serif').family }]}>Aa</Text>
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    {/* the author / illustrator on the cover too: only if they want it (and gave a name) */}
                    {creditsLine(draft.writer, draft.artist) ? (
                      <Pressable onPress={() => { if (T.byline) { setCoverTitle({ byline: '', bx: null, by: null }); setCoverSel('title'); } else { setCoverTitle({ byline: creditsLine(draft.writer, draft.artist).replace(/\.$/, ''), bx: 0.5, by: 0.9, bs: T.size * 0.42 }); setCoverSel('byline'); } }}
                        style={[styles.toolChip, T.byline ? { backgroundColor: colors.green } : null]} accessibilityRole="button" accessibilityState={{ selected: !!T.byline }}>
                        <Text numberOfLines={1} style={[styles.donePillText, { fontSize: 13 }]}>{tr('Add author')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    {/* which words the tools change: the title or the author line */}
                    {T.byline && T.bx != null ? [['title', tr('Title')], ['byline', tr('Author')]].map(([k, label]) => (
                      <Pressable key={k} onPress={() => setCoverSel(k)} accessibilityRole="radio" accessibilityState={{ selected: coverSel === k }} style={[styles.toolChip, coverSel === k && { backgroundColor: colors.green }]}>
                        <Text numberOfLines={1} style={[styles.donePillText, { fontSize: 13 }]}>{label}</Text>
                      </Pressable>
                    )) : null}
                    <View style={{ flex: 1 }} />
                    {/* the text box: narrower or wider (the words wrap inside it), then left / centre / right */}
                    <Pressable onPress={() => setW(Math.max(0.3, Math.round((w - 0.1) * 100) / 100))} style={styles.toolBtn} accessibilityLabel={tr('Narrower text box')}><Text style={[styles.donePillText, { fontSize: 13 }]}>{'›‹'}</Text></Pressable>
                    <Pressable onPress={() => setW(Math.min(1, Math.round((w + 0.1) * 100) / 100))} style={styles.toolBtn} accessibilityLabel={tr('Wider text box')}><Text style={[styles.donePillText, { fontSize: 13 }]}>{'‹›'}</Text></Pressable>
                    <Pressable onPress={() => setCoverTitle(by ? { balign: nextA } : { align: nextA })} style={[styles.toolBtn, { alignItems: a === 'left' ? 'flex-start' : a === 'right' ? 'flex-end' : 'center', paddingHorizontal: 10 }]} accessibilityLabel={tr('Text alignment')}>
                      {[16, 10, 14].map((len, i) => <View key={i} style={{ width: len, height: 2, borderRadius: 1, backgroundColor: colors.white, marginVertical: 1.5 }} />)}
                    </Pressable>
                  </View>
                  </>
                ); })() : null}
              </View>
            ) : null}
            {/* Done (or Start writing) right under the box, lined up with the cover's right edge */}
            {!kbUp && winW <= winH ? (
              <View style={{ width: coverSize.current, alignItems: 'flex-end', marginTop: 10 }}>
                <Pressable onPress={finishCover} hitSlop={8} accessibilityRole="button" style={[styles.donePill, { marginBottom: 0 }]}><Text style={styles.donePillText}>{startMode ? tr('Start writing') : tr('Done')}</Text></Pressable>
              </View>
            ) : null}
            </View>
            )}
          </View>
          {/* the hint is a speech bubble near the bottom that goes away after a while (tap it to close it sooner) */}
          {!coverTitling && toolsTip && !kbUp && !imgAsk && !hardAsk ? <Toast message={tr('The title and author tools appear here once your cover has a title.')} area={{ left: GAP - 6, right: GAP - 6, bottom: 74 }} onDismiss={() => setToolsTip(false)} /> : null}
          {coverTitling && coverTip && !kbUp ? <Toast message={tr('Tap the title or the author to type. Drag them anywhere on the cover.')} area={{ left: GAP - 6, right: GAP - 6, bottom: 74 }} onDismiss={() => setCoverTip(false)} /> : null}
          {/* Done: bottom right, lined up with the cover's right edge */}
          {/* a new book: 'Start writing' goes on to page 1 (nobody is stuck on the cover) */}
          {!kbUp && winW > winH ? <Pressable onPress={finishCover} hitSlop={8} accessibilityRole="button" style={[styles.donePill, { position: 'absolute', right: GAP + (wide ? 0 : insets.right), bottom: GAP + 40, marginBottom: 0 }]}>{/* as far from the bar as from the right edge */}<Text style={styles.donePillText}>{startMode ? tr('Start writing') : tr('Done')}</Text></Pressable> : null}
          {coverTool && cover && cover.title ? (() => {
            const T = cover.title; const by = coverSel === 'byline' && T.bx != null;
            const curColor = (by ? bylineLook(T).color : T.color) || '#ffffff';
            const curFont = (by ? bylineLook(T).font : T.font) || 'serif';
            return (
              // Text Color (or the fonts): a black glass box of its own over the editor; tap outside or Done to close
              <Pressable style={[StyleSheet.absoluteFill, styles.choiceBack, { zIndex: 70 }]} onPress={() => setCoverTool(null)}>
                <Pressable onPress={() => {}} style={[styles.choice, { backgroundColor: 'rgba(0,0,0,0.88)', maxWidth: 380 }]}>
                  <Text style={styles.choiceTitle}>{coverTool === 'color' ? tr('Text Color') : tr('Font')}</Text>
                  <ScrollView style={{ maxHeight: winH * 0.5 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: coverTool === 'color' ? 10 : 8, justifyContent: 'center', paddingVertical: 6 }}>
                    {coverTool === 'color' ? COVER_COLORS.map(([hex, name]) => (
                      <Pressable key={hex} onPress={() => setCoverTitle(by ? { bColor: hex } : { color: hex })} accessibilityLabel={name} accessibilityState={{ selected: curColor === hex }}
                        style={[styles.swatch, { width: 34, height: 34, borderRadius: 17, backgroundColor: hex }, curColor === hex && styles.swatchOn]} />
                    )) : Object.entries(BOOK_FONTS).map(([k, f]) => (
                      <Pressable key={k} onPress={() => setCoverTitle(by ? { bFont: k } : { font: k })} style={[styles.fontChip, curFont === k && { backgroundColor: colors.green }]}>
                        <Text style={[styles.donePillText, { fontFamily: f.bold || f.family, fontWeight: f.bold ? undefined : '700', fontSize: 15 }]}>{tr(f.label)}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Pressable onPress={() => setCoverTool(null)} style={[styles.donePill, { alignSelf: 'flex-end', marginTop: 16, marginBottom: 0 }]} accessibilityRole="button"><Text style={styles.donePillText}>{tr('Done')}</Text></Pressable>
                </Pressable>
              </Pressable>
            ); })() : null}
          {coverAsk ? (
            <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
              <View style={styles.choice}>
                <Text style={styles.choiceTitle}>{tr('Add the title as text?')}</Text>
                <Pressable onPress={coverYes} style={[styles.choiceBtn, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Yes please')}</Text></Pressable>
                <Pressable onPress={coverNo} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('No thanks')}</Text></Pressable>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      ) : null}
      {pageDone ? (
        <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>{tr('What’s next?')}</Text>
            <Pressable onPress={addPage} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Add another page')}</Text></Pressable>
            <Pressable onPress={() => setPageDone(false)} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Keep working on this page')}</Text></Pressable>
            <Pressable onPress={() => openCover(true)} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{cover && cover.uri ? tr('Edit the cover') : tr('Design a cover')}</Text></Pressable>
            {/* leave the book maker for now; what's been made so far stays saved */}
            <Pressable onPress={async () => { setPageDone(false); clearTimeout(timer.current); try { onDone(await saveUserStory(latest.current)); } catch (e) { toast(tr('Couldn’t save the story. Try again.')); } }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Cancel book editor')}</Text></Pressable>
            {/* Finish last, in green, with extra room around it */}
            <Pressable onPress={() => { setPageDone(false); finish(); }} style={[styles.choiceBtn, { backgroundColor: colors.green, marginTop: 18, marginBottom: 8 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Finish and save book')}</Text></Pressable>
          </View>
        </View>
      ) : null}
      {imgAsk ? (
        <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>{tr('Add a picture')}</Text>
            <Pressable onPress={() => { const t = imgAsk; setImgAsk(null); placeImage(t, 'library'); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Choose a picture')}</Text></Pressable>
            {/* a photo of a drawing, say; the camera only opens after the grown-up check */}
            <Pressable onPress={() => { const t = imgAsk; setImgAsk(null); setCamGate(t); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Take a photo')}</Text></Pressable>
            <Pressable onPress={() => { const t = imgAsk; setImgAsk(null); setDrawFor(t); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Make a drawing')}</Text></Pressable>
            {/* the cover only: just the title on a hardcover (cloth, leather…) of their choice */}
            {imgAsk === 'cover' ? <Pressable onPress={() => { setImgAsk(null); setHardAsk(true); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Text only cover')}</Text></Pressable> : null}
            <Pressable onPress={() => setImgAsk(null)} style={[styles.choiceBtn, { marginTop: 14 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Cancel')}</Text></Pressable>
          </View>
        </View>
      ) : null}
      {hardAsk ? (
        // Text only cover: a large black glass box of hardcover looks to choose from (Jörg's pictures are on the way)
        <Pressable style={[StyleSheet.absoluteFill, styles.choiceBack]} onPress={() => setHardAsk(false)}>
          <Pressable onPress={() => {}} style={[styles.choice, { backgroundColor: 'rgba(0,0,0,0.88)', maxWidth: 520, width: '100%' }]}>
            <Text style={styles.choiceTitle}>{tr('Choose a hardcover')}</Text>
            <ScrollView style={{ maxHeight: winH * 0.55 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingVertical: 6 }}>
              {HARDCOVERS.length ? HARDCOVERS.map(([k, src, label]) => (
                <Pressable key={k} onPress={() => { setHardAsk(false); applyHardcover(src); }} accessibilityRole="button" accessibilityLabel={tr(label)} style={{ alignItems: 'center', gap: 6 }}>
                  <Image source={src} style={{ width: 120, height: 120, borderRadius: 4 }} resizeMode="cover" />
                  <Text style={[styles.choiceBtnText, { fontSize: 13 }]}>{tr(label)}</Text>
                </Pressable>
              )) : [0, 1, 2, 3].map((n) => <View key={n} style={{ width: 120, height: 120, borderRadius: 6, backgroundColor: '#2e2e30' }} />)}
            </ScrollView>
            {!HARDCOVERS.length ? <Text style={[styles.choiceBtnText, { fontSize: 14, color: '#bdbdbd', textAlign: 'center', marginTop: 10 }]}>{tr('The hardcovers are coming soon.')}</Text> : null}
            <Pressable onPress={() => setHardAsk(false)} style={[styles.choiceBtn, { marginTop: 16 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>{tr('Cancel')}</Text></Pressable>
          </Pressable>
        </Pressable>
      ) : null}
      {drawFor ? (
        <DrawEditor insets={insets} title={drawFor === 'cover' ? tr('Drawing · Cover') : tr('Drawing · Page {n}', { n: i + 1 })}
          onDone={(strokes) => { const t = drawFor; setDrawFor(null); placeDrawing(t, strokes); }} />
      ) : null}
      <ParentGate visible={!!camGate} reason="Taking a photo opens the camera." onPass={() => { const t = camGate; setCamGate(null); setTimeout(() => placeImage(t, 'camera'), 250); }} onCancel={() => setCamGate(null)} />
      <StoryGuide visible={guide && !coverOpen} onClose={closeGuide} onIdeas={onIdeas ? () => { closeGuide(); onIdeas(); } : null} area={wide ? { left: BL.leftW, right: BL.rightW } : { top: BL.topH, bottom: BL.barH }} />
      <ParentGate visible={!!gateFor} reason={gateFor?.mode === 'print' ? tr('Printing opens your phone’s print options.') : tr('Sharing sends this story outside the app.')} onPass={() => makePdf(gateFor)} onCancel={() => setGateFor(null)} />
    </KeyboardAvoidingView>
  );
}

// A new cover title starts out yellow (the palette's mustard).
const TITLE_BLUE = '#1f3a5f'; // a new title starts dark blue in the Coro font (Jörg, 25 Oct 2026)

const styles = StyleSheet.create({
  aboutTitle: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 30, lineHeight: 36 },
  aboutLead: { color: '#cfcfcf', fontFamily: fonts.ui, fontSize: 16, lineHeight: 22, marginTop: -6 },
  aboutChip: { height: 64, borderRadius: 18, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: 12 },
  aboutChipOn: { backgroundColor: colors.green, borderColor: colors.green },
  aboutChipText: { flexShrink: 1, color: colors.white, fontFamily: fonts.uiSemiBold, fontSize: 16 },
  aboutInput: { backgroundColor: '#161616', height: 52, borderRadius: 14, paddingHorizontal: 16, color: colors.white, fontFamily: fonts.ui, fontSize: 17 },
  aboutSkip: { color: '#bdbdbd', fontFamily: fonts.ui, fontSize: 15, paddingVertical: 6 },
  editor: { alignItems: 'center' },
  editorHead: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30, paddingBottom: 12 },
  editorTitle: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 18 },
  coverShadow: { marginBottom: 14, backgroundColor: '#2f5f9e', shadowColor: '#000', shadowOffset: { width: 3, height: 8 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 10 },
  coverSquare: { backgroundColor: '#7d7d7d', overflow: 'hidden', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
  toolOn: { backgroundColor: colors.green },
  toolBox: { height: TOOLBOX_H, marginTop: 10, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 10, paddingVertical: 8 }, // the black glass box
  toolBtn: { width: 40, height: 34, borderRadius: 17, backgroundColor: '#4a4a4a', alignItems: 'center', justifyContent: 'center' },
  toolChip: { height: 34, borderRadius: 17, paddingHorizontal: 12, backgroundColor: '#4a4a4a', alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8, marginTop: 22 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  swatchOn: { borderColor: colors.white, borderWidth: 3, transform: [{ scale: 1.12 }] },
  fontChip: { height: 36, borderRadius: 18, paddingHorizontal: 14, backgroundColor: '#5f5f5f', alignItems: 'center', justifyContent: 'center' },
  authorBtn: { height: 40, borderRadius: 20, paddingHorizontal: 16, backgroundColor: '#5f5f5f', alignItems: 'center', justifyContent: 'center' },
  sizeBtn: { width: 44, height: 40, borderRadius: 20, backgroundColor: '#5f5f5f', alignItems: 'center', justifyContent: 'center' },
  coverHint: { color: '#cfcfcf', fontFamily: fonts.ui, fontSize: 13, marginLeft: 4 },
  countBox: { position: 'absolute', zIndex: 6, backgroundColor: '#4a4a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  countText: { color: colors.white, fontFamily: fonts.uiSemiBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  coverHead: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17, marginBottom: 4 },
  fieldBox: { backgroundColor: '#161616', height: 48, borderRadius: 14, paddingHorizontal: 14 },
  fieldBoxSmall: { flex: 1, minWidth: 0, height: 42 },
  fieldText: { color: colors.white, fontFamily: fonts.ui, fontSize: 17 },
  fieldSmall: { flex: 1, minWidth: 0, height: 42, fontSize: 15 },
  field: { backgroundColor: '#2e2e2e', color: colors.white, fontFamily: fonts.ui, fontSize: 17, height: 48, borderRadius: 14, paddingHorizontal: 14 },
  fieldHint: { color: '#a8a8a8', fontFamily: fonts.ui, fontSize: 13, marginTop: -8 },
  fontsBtn: { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 20, paddingHorizontal: 18, backgroundColor: '#5f5f5f' },
  fontMenu: { position: 'absolute', bottom: 48, left: 0, width: 170, backgroundColor: '#2a2a2a', borderRadius: 14, padding: 6, gap: 4, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  fontRow: { height: 40, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12 },
  fontRowOn: { backgroundColor: colors.green },
  fontPill: { height: 32, borderRadius: 16, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  fontPillOn: { backgroundColor: colors.green },
  fontPillText: { color: colors.white, fontSize: 14 },
  donePill: { backgroundColor: colors.green, height: 40, borderRadius: 20, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  donePillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  editorPage: { flex: 1, marginBottom: 14, backgroundColor: colors.paper, padding: 24, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
  editorInput: { flex: 1, fontSize: 24, lineHeight: 36, color: colors.ink, textAlign: 'center', textAlignVertical: 'top', padding: 0 },
  choiceBack: { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 30 },
  choice: { width: '100%', maxWidth: 380, backgroundColor: colors.glass, borderRadius: 24, paddingHorizontal: 26, paddingTop: 30, paddingBottom: 32, gap: 16 },
  choiceTitle: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 20, marginBottom: 10 },
  choiceBtn: { backgroundColor: colors.tile, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // pills
  choiceBtnText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  choiceLink: { color: '#d6d6d6', fontFamily: fonts.uiBold, fontSize: 15, textAlign: 'center', paddingVertical: 4 },
  screen: { flex: 1, backgroundColor: DESK_BG },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DESK_BG },
  bookShadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  spine: { position: 'absolute', left: 0, right: 0, top: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: '#4a4a4a' },
  help: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  helpText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 18 },
  page: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  art: { backgroundColor: '#808080', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  plus: { color: colors.white, fontFamily: fonts.uiMedium },
  addImage: { color: colors.white, fontSize: 22, fontFamily: fonts.uiBold, marginTop: 4 },
  artBtns: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: 'rgba(0,0,0,0.6)', color: colors.white, fontSize: 15, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden', fontFamily: fonts.uiBold },
  textBox: { justifyContent: 'flex-start' }, // the words (or 'To add text, tap here…') centred in the square
  addText: { fontFamily: fonts.uiBold, fontSize: 22, color: colors.ink, marginBottom: 6, textAlign: 'center' }, // always inside the words square
  input: { fontFamily: fonts.story, fontSize: 21, lineHeight: 34, color: colors.ink, textAlign: 'center', textAlignVertical: 'center', padding: 0, minHeight: 68 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17, padding: 0 }, // Helvetica, like the rest of the app's controls
  sub: { color: colors.muted, fontFamily: fonts.ui, fontSize: 12, marginTop: 2 },
  btn: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15, paddingHorizontal: 3 },
  finish: { backgroundColor: colors.green, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, overflow: 'hidden' }, // a solid green pill
  prow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#2a2a2a', padding: 12, borderWidth: 2, borderColor: 'transparent' },
  thumb: { width: 64, height: 64, backgroundColor: '#666', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbNum: { color: colors.white, fontFamily: fonts.uiBold },
  prowTitle: { color: colors.white, fontSize: 17, fontFamily: fonts.uiBold },
  prowSub: { color: '#bbb', fontSize: 14, fontFamily: fonts.uiRegular },
  pbtn: { width: 36, height: 36, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  pbtnText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 18 },
  deleteLink: { color: '#ff6b6b', fontFamily: fonts.uiBold, fontSize: 15 },
  warn: { color: '#e6e6e6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  layBtn: { alignItems: 'center', gap: 6 },
  layIc: { width: 64, height: 64, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  layLabel: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 14 },
  pill: { flex: 1, backgroundColor: '#6b6b6b', borderRadius: 22, height: 44, paddingVertical: 0, justifyContent: 'center' }, // Share as PDF / Print: medium grey pills
  wide: { flex: 1, backgroundColor: colors.tile, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // pills
  deletePill: { alignSelf: 'flex-start', height: 44, borderRadius: 22, paddingHorizontal: 26, backgroundColor: colors.deepRed, alignItems: 'center', justifyContent: 'center', marginTop: 44, marginBottom: 14 },
  stackPill: { width: 180, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, // the Pages box pills, stacked on the right
  wideText: { color: colors.white, fontSize: 15, fontFamily: fonts.uiBold },
});
