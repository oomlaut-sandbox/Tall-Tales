// "Create a story": add a picture and words page by page (Jörg's Publisher design).
// Everything saves automatically. "Pages" opens a list to reorder or delete pages,
// or to delete the whole story.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Keyboard, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { BOOK_FONTS, bookFont, colors, fonts } from '../theme';
import { Bar, Burger, DogEar, Panel, PageShape, Toast } from '../components/Chrome';
import { Fade } from '../components/PageView';
import { Spine, bookLayout } from '../components/BookFrame';
import { DESK_FELT, DeskFelt } from '../look';
import { COVER_COLORS, bylineStyle, coverTitleLook, titleStyle } from '../components/CoverArt';
import { creditsLine } from '../userStories';
import { playKey } from '../sound';
import { deleteUserStory, dropPicture, keepPicture, newPageId, saveUserStory } from '../userStories';
import StoryGuide from '../components/StoryGuide';
import ParentGate from '../components/ParentGate';
import { printStory, shareStoryPdf } from '../pdf';
import { publishToStore } from '../storeAdmin';
import { loadJSON, saveJSON } from '../storage';

const MAX_PX = 1600;
const MAX_PAGES = 40; // a soft limit, so books stay quick to open, print and share
const FULL = `Books can have up to ${MAX_PAGES} pages. That’s a long story!`;

const blank = () => ({ pid: newPageId(), text: '', uri: null, w: 1, h: 1 });

export function draftFrom(story) {
  if (!story) return { id: `s${Date.now()}`, title: '', writer: '', artist: '', pages: [blank()] }; // no title yet: the bar invites 'Tap to add title'
  return {
    id: story.id,
    title: story.title,
    writer: story.writer || '',
    artist: story.artist || '',
    pages: story.pages.filter((p) => !p.titlePage).map((p) => ({ pid: p.pid, text: p.text, uri: p.image ? p.image.uri : null, w: p.w, h: p.h })),
    cover: story.cover || null,
  };
}

export default function Publisher({ u, initial, fontKey, openMenu, toast, onChange, onDone, storeAdmin }) {
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
      toast(`Couldn’t publish: ${e.message}`);
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
    const pages = d.pages.filter((p) => p.text.trim() || p.uri);
    if (!pages.length) return toast('Add a page with a picture or words first.');
    setMaking(true);
    toast(mode === 'print' ? 'Getting your story ready to print…' : 'Making your PDF…');
    try {
      const st = { title: d.title.trim() || 'My story', pages: pages.map((p) => ({ text: p.text.trim(), image: p.uri ? { uri: p.uri } : null })) };
      if (mode === 'print') await printStory(st, layout, fontKey);
      else await shareStoryPdf(st, layout, fontKey);
    } catch (e) {
      toast(mode === 'print' ? 'Couldn’t print the book. Please try again.' : 'Couldn’t make the PDF. Please try again.'); // plain words, never the phone's technical message
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

  const update = (patch) => setDraft((d) => ({ ...d, pages: d.pages.map((p, k) => (k === i ? { ...p, ...patch } : p)) }));

  // Choose a square photo, keep a copy in the story's folder: { uri, w, h }, or null if cancelled.
  // source: 'library' (the phone's photos) or 'camera' (take a photo, e.g. of a drawing; only after the grown-up check)
  const choosePhoto = async (source = 'library') => {
    const opts = { mediaTypes: 'images', quality: 0.9, allowsEditing: true, aspect: [1, 1] };
    let r;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast('Oomlaut Reader isn’t allowed to use the camera. You can turn it on in Settings.'); return null; }
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
  const [titleBox, setTitleBox] = useState(false); // the title (and author / illustrator) box
  const [coverOpen, setCoverOpen] = useState(false);
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
  useEffect(() => {
    if (!(coverOpen && coverTitling)) { setCoverTip(false); return undefined; }
    setCoverTip(true); // stays until the title is first touched, or for 8 seconds
    const t = setTimeout(() => setCoverTip(false), 8000);
    return () => clearTimeout(t);
  }, [coverOpen, coverTitling]);
  const [coverTool, setCoverTool] = useState(null); // 'color' | 'font' palette open under the tools
  const cover = draft.cover || null;
  const setCover = (c) => setDraft((d) => ({ ...d, cover: c }));
  const openCover = () => { setPageDone(false); setCoverAsk(false); setCoverTitling(!!(cover && cover.title)); setCoverOpen(true); };
  const pickCover = async (source) => {
    try {
      const ph = await choosePhoto(source);
      if (!ph) return;
      if (cover && cover.uri) dropPicture(cover.uri);
      setCover({ ...ph, title: cover ? cover.title || null : null });
      if (!(cover && cover.title)) setCoverAsk(true);
    } catch (e) {
      toast('Couldn’t open your photos. Check that Oomlaut Reader is allowed to use Photos in Settings.');
    }
  };
  const finishCover = () => {
    // a title typed on the cover also names the book, if it has no name yet
    setDraft((d) => (!d.title.trim() && d.cover && d.cover.title && d.cover.title.text.trim() ? { ...d, title: d.cover.title.text.trim() } : d));
    setCoverOpen(false); setCoverAsk(false); setCoverTitling(false); setPageDone(true);
  };
  const coverNo = () => { setCover({ ...cover, title: null }); finishCover(); };
  const coverYes = () => {
    setCoverAsk(false); setCoverTitling(true);
    setCover({ ...cover, title: { text: draft.title.trim() || 'My Story', x: 0.5, y: 0.2, size: 0.11, color: TITLE_YELLOW } }); // yellow to start with
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
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) + Math.abs(g.dy) < 6) setTitleEditing(true); }, // a tap: type in it
    onPanResponderMove: (_, g) => {
      if (!dragFrom.current) return;
      const W = coverSize.current;
      setCoverTitle({ x: Math.max(0.05, Math.min(0.95, dragFrom.current.x + g.dx / W)), y: Math.max(0.06, Math.min(0.94, dragFrom.current.y + g.dy / W)) });
    },
  })).current;

  // Add Image asks first: choose a picture from the phone, or take a photo (a drawing, say).
  // Taking a photo opens the camera, so a grown-up answers a question before it opens.
  const [imgAsk, setImgAsk] = useState(null); // 'page' | 'cover': which square the picture is for
  const [camGate, setCamGate] = useState(null); // 'page' | 'cover' waiting for the grown-up check
  const pickImage = () => setImgAsk('page');
  const placeImage = async (target, source) => {
    if (target === 'cover') return pickCover(source);
    try {
      const ph = await choosePhoto(source);
      if (!ph) return;
      if (page.uri) dropPicture(page.uri);
      update(ph);
    } catch (e) {
      toast(source === 'camera' ? 'Couldn’t open the camera.' : 'Couldn’t open your photos. Check that Oomlaut Reader is allowed to use Photos in Settings.');
    }
  };


  const removeImage = () => {
    if (page.uri) dropPicture(page.uri);
    update({ uri: null, w: 1, h: 1 });
  };

  const next = () => {
    if (i === draft.pages.length - 1) {
      if (!page.text.trim() && !page.uri) return toast('Add a picture or some words before the next page.');
      if (draft.pages.length >= MAX_PAGES) return toast(FULL);
      setDraft((d) => ({ ...d, pages: [...d.pages, blank()] }));
    }
    setI(i + 1);
  };

  // After the words editor: carry on with a new page, or finish the book.
  const addPage = () => {
    setPageDone(false);
    if (draft.pages.length >= MAX_PAGES) return toast(FULL);
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
    setDraft((d) => {
      const pages = d.pages.filter((_, n) => n !== k);
      return { ...d, pages: pages.length ? pages : [blank()] };
    });
    const newLen = Math.max(1, draft.pages.length - 1);
    setI((x) => (x > k ? x - 1 : Math.min(x, newLen - 1)));
    toast(`Page ${k + 1} deleted.`);
  };

  const finish = async () => {
    clearTimeout(timer.current);
    try {
      const list = await saveUserStory(latest.current);
      const hasPages = latest.current.pages.some((p) => p.text.trim() || p.uri);
      toast(hasPages ? 'Saved to My Library.' : 'Nothing to save yet, so no story was added.');
      onDone(list);
    } catch (e) {
      toast('Couldn’t save the story. Try again.');
    }
  };

  const deleteStory = async () => {
    clearTimeout(timer.current);
    draft.pages.forEach((p) => p.uri && dropPicture(p.uri));
    const list = await deleteUserStory(draft.id);
    toast(`“${draft.title.trim() || 'Untitled story'}” deleted.`);
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
        <Pressable onPress={pickImage} style={[styles.art, { width: side, height: side }]} accessibilityRole="button" accessibilityLabel={page.uri ? 'Change image' : 'Add image'}>
          {page.uri ? (
            <>
              <Image source={{ uri: page.uri }} style={styles.fill} resizeMode="cover" />
              <View style={styles.artBtns}>
                <Text style={styles.chip}>Change image</Text>
                <Pressable onPress={removeImage} hitSlop={6} accessibilityLabel="Remove image"><Text style={styles.chip}>Remove</Text></Pressable>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.plus, { fontSize: u * 30, lineHeight: u * 30 }]}>+</Text>
              <Text style={styles.addImage}>Add Image</Text>
            </View>
          )}
          {!wide ? <Fade edge="bottom" size={Math.round(side * 0.1)} max={0.22} /> : null}
        </Pressable>
        <Pressable onPress={openWords} accessibilityRole="button" accessibilityLabel={`Words for page ${i + 1}`} ref={wordsRef} collapsable={false} style={[styles.textBox, { width: side, height: side, paddingHorizontal: side * 0.09, paddingVertical: side * 0.06 }]}>{/* the whole words square opens the editor */}
          {!wide ? <Fade edge="top" size={Math.round(side * 0.09)} max={0.13} /> : null}
          <Spine wide={wide} />
          {/* Tapping the words opens a big editor (just the words page, above the keyboard). */}
          <View style={{ flex: 1, justifyContent: 'center', minHeight: 0 }}>
            <Text style={[styles.input, { fontFamily: 'SpecialElite_400Regular' }, !page.text && { color: '#666' }]} numberOfLines={7}>
              {page.text || 'To add text, tap here. Two or three sentences reads best.'}
            </Text>
          </View>
        </Pressable>
        <DogEar u={u} under={colors.earUnder} onPress={next} label="Next page" />
        <Pressable onPress={() => setGuide(true)} style={[styles.help, { top: 10, right: 10 }]} hitSlop={8} accessibilityLabel="How to make a story">
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
              <Animated.View pointerEvents={coverOpen ? 'none' : 'auto'} style={{ opacity: coverFade }}><Burger u={u} onPress={openMenu} /></Animated.View>
            </View>
            <View style={{ alignItems: 'center', gap: 18 }}>
              {/* the page count sits above Pages, with plenty of room between them */}
              <Animated.Text style={[styles.sub, { textAlign: 'center', marginBottom: 22, opacity: coverFade }]}>{i + 1}/{draft.pages.length}</Animated.Text>
              <Animated.View pointerEvents={titleBox || coverOpen ? 'none' : 'auto'} style={{ alignItems: 'center', gap: 18, opacity: barFade, marginBottom: 26 }}>
              <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice(null); setPagesOpen(true); }} hitSlop={8}><Text style={styles.btn}>Pages</Text></Pressable>
              <Pressable onPress={finish} hitSlop={8} accessibilityLabel="Finish and save the book"><View style={styles.finish}><Text style={styles.btn}>Finish</Text></View></Pressable>
              </Animated.View>
            </View>
          </Bar>
        </View>
      ) : (
      <View style={{ backgroundColor: colors.bar, paddingTop: spare / 2 }}>
      <Bar u={u}>
        <Animated.View pointerEvents={coverOpen ? 'none' : 'auto'} style={{ opacity: coverFade }}><Burger u={u} onPress={openMenu} /></Animated.View>
        <Animated.View pointerEvents={coverOpen ? 'none' : 'auto'} style={{ flex: 1, minWidth: 0, paddingLeft: 12, opacity: coverFade }}>
          <Pressable onPress={() => setTitleBox(true)} accessibilityRole="button" accessibilityLabel="Book title">
            <Text numberOfLines={1} style={[styles.title, !draft.title.trim() && { color: 'rgba(255,255,255,0.75)' }]}>{draft.title.trim() || 'Tap to add title'}</Text>
          </Pressable>
          <Text style={styles.sub}>Page {i + 1} of {draft.pages.length} · {saved ? 'Saved' : 'Saving…'}</Text>
        </Animated.View>
        <Animated.View pointerEvents={titleBox || coverOpen ? 'none' : 'auto'} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: barFade }}>
        <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice(null); setPagesOpen(true); }} hitSlop={8}><Text style={styles.btn}>Pages</Text></Pressable>
        <Pressable onPress={finish} hitSlop={8} accessibilityLabel="Finish and save the book"><View style={styles.finish}><Text style={styles.btn}>Finish</Text></View></Pressable>
        </Animated.View>
      </Bar>
      </View>
      )}

      <Panel open={pagesOpen} side="right" title="Pages" portraitWidth="94%" bottom={wide ? 0 : barH} inset={wide ? BL.rightW : 0} onClose={() => setPagesOpen(false)}>
        <ScrollView style={{ maxHeight: Math.max(380, winH * 0.55) }} contentContainerStyle={{ gap: 14, paddingBottom: 6 }}>
          {draft.pages.map((p, k) => (
            <View key={p.pid} style={[styles.prow, k === i && { borderColor: colors.green }]}>
              <Pressable onPress={() => { setI(k); setPagesOpen(false); }} style={styles.thumb} accessibilityLabel={`Go to page ${k + 1}`}>
                {p.uri ? <Image source={{ uri: p.uri }} style={styles.fill} resizeMode="cover" /> : <Text style={styles.thumbNum}>{k + 1}</Text>}
              </Pressable>
              {/* beside the picture: the page's name on top (level with the picture's top), its buttons at the bottom */}
              <View style={{ flex: 1, minWidth: 0, height: 64, justifyContent: 'space-between' }}>
              <Pressable onPress={() => { setI(k); setPagesOpen(false); }}>
                <Text numberOfLines={1} style={styles.prowTitle}>Page {k + 1}<Text style={styles.prowSub}>{'  ·  '}{p.text.trim() || (p.uri ? 'Picture only' : 'Empty')}</Text></Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => move(k, -1)} disabled={k === 0} hitSlop={6} style={[styles.pbtn, k === 0 && { opacity: 0.3 }]} accessibilityLabel={`Move page ${k + 1} up`}><Text style={styles.pbtnText}>↑</Text></Pressable>
              <Pressable onPress={() => move(k, 1)} disabled={k === draft.pages.length - 1} hitSlop={6} style={[styles.pbtn, k === draft.pages.length - 1 && { opacity: 0.3 }]} accessibilityLabel={`Move page ${k + 1} down`}><Text style={styles.pbtnText}>↓</Text></Pressable>
              <Pressable onPress={() => removePage(k)} hitSlop={6} style={styles.pbtn} accessibilityLabel={`Delete page ${k + 1}`}><Text style={styles.pbtnText}>✕</Text></Pressable>
              </View>
              </View>
            </View>
          ))}
        </ScrollView>
        {pdfChoice ? (
          <View style={{ gap: 10, marginTop: 30 }}>
            <Text style={styles.warn}>{pdfChoice === 'print' ? 'Choose a layout to print:' : 'Choose a layout for your PDF:'}</Text>
            {/* the same two choices, with the same little pictures, as Print in the Playback menu */}
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {[['stacked', 'Portrait'], ['landscape', 'Landscape']].map(([lay, label]) => (
                <Pressable key={lay} onPress={() => { setGateFor({ mode: pdfChoice, layout: lay }); setPdfChoice(null); setPagesOpen(false); }}
                  accessibilityRole="button" accessibilityLabel={`${label} pages`} style={styles.layBtn}>
                  <View style={styles.layIc}><PageShape wide={lay === 'landscape'} /></View>
                  <Text style={styles.layLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : confirmDelete ? (
          <View style={{ gap: 10, marginTop: 44 }}>
            <Text style={styles.warn}>Delete “{draft.title.trim() || 'Untitled story'}”, its pictures and any voice recordings? This can’t be undone.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={deleteStory} style={[styles.wide, { backgroundColor: colors.deepRed }]}><Text style={styles.wideText}>Delete book</Text></Pressable>
              <Pressable onPress={() => setConfirmDelete(false)} style={styles.wide}><Text style={styles.wideText}>Keep it</Text></Pressable>
            </View>
          </View>
        ) : (
          // the pills stacked on the right, well clear of the pages list: Share as PDF, Print, (the owner's Publish), Delete Book
          <View style={{ alignItems: 'flex-end', gap: 12, marginTop: 30, marginBottom: 10 }}>
            <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice('share'); }} disabled={making} style={[styles.stackPill, { backgroundColor: '#6b6b6b' }]} accessibilityRole="button">
              <Text style={styles.wideText}>{making ? 'Working…' : 'Share as PDF'}</Text>
            </Pressable>
            <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice('print'); }} disabled={making} style={[styles.stackPill, { backgroundColor: '#6b6b6b' }]} accessibilityRole="button">
              <Text style={styles.wideText}>Print</Text>
            </Pressable>
            {admin ? (
              <Pressable onPress={publish} disabled={publishing} style={[styles.stackPill, { backgroundColor: colors.blue }]} accessibilityRole="button">
                <Text style={styles.wideText}>{publishing ? 'Publishing…' : 'Publish to Store'}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => { setPdfChoice(null); setConfirmDelete(true); }} style={[styles.stackPill, { backgroundColor: colors.deepRed }]} accessibilityRole="button">
              <Text style={styles.wideText}>Delete Book</Text>
            </Pressable>
          </View>
        )}
      </Panel>
      {editing ? (
        // The words editor: the words page, moved down a little from the top, with a green Done pill under it.
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.desk, opacity: zoom }]}>
            {/* the charcoal felt (phones only; DESK_FELT is empty on iPad) */}
            <DeskFelt spot="publisher2" />
          </Animated.View>
          <View style={[styles.editor, { flex: 1, paddingTop: insets.top + 34 }]}>
          <Animated.View style={[styles.editorHead, { opacity: zoom }]}>
            {/* the words are the second page of each pair (the picture is the first): page 2, 4, 6 … */}
            <Text style={styles.editorTitle}>Page {i * 2 + 2}</Text>
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
                  placeholder="Type the words for this page. Two or three sentences reads best."
                  placeholderTextColor="#666"
                  multiline
                  autoFocus
                  style={[styles.editorInput, { fontFamily: bookFont(writeFont).family, outlineWidth: 0 }]}
                  accessibilityLabel={`Words for page ${i + 1}`}
                />
              </Animated.View>
            );
          })()}
          {/* under the page: the three fonts to write in (left), and a green Done pill (right) */}
          <Animated.View style={{ width: winW - 2 * GAP, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: zoom }}>
            <View />
            <Pressable onPress={closeWords} hitSlop={8} accessibilityRole="button" style={styles.donePill}><Text style={styles.donePillText}>Done</Text></Pressable>
          </Animated.View>
          </View>
        </KeyboardAvoidingView>      ) : null}
      {titleBox ? (
        // the book's title, then (optional) who wrote it and who drew the pictures, for the title page
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>Book title</Text>
            <TextInput value={draft.title} onChangeText={(title) => setDraft((d) => ({ ...d, title }))} placeholder="Type the title" placeholderTextColor="#8a8a8a" autoFocus style={styles.field} accessibilityLabel="Book title" />
            <Text style={[styles.choiceTitle, { fontSize: 16, marginTop: 6, marginBottom: 0 }]}>Add an author or illustrator?</Text>
            <Text style={styles.fieldHint}>Optional. They appear on the title page.</Text>
            <TextInput value={draft.writer || ''} onChangeText={(writer) => setDraft((d) => ({ ...d, writer }))} placeholder="Written by" placeholderTextColor="#8a8a8a" style={styles.field} accessibilityLabel="Written by" />
            <TextInput value={draft.artist || ''} onChangeText={(artist) => setDraft((d) => ({ ...d, artist }))} placeholder="Illustrated by" placeholderTextColor="#8a8a8a" style={styles.field} accessibilityLabel="Illustrated by" />
            <Pressable onPress={() => setTitleBox(false)} style={[styles.choiceBtn, { backgroundColor: colors.green, marginTop: 10 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>Done</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
      {coverOpen ? (
        // the Cover Editor stops at the black bar, which stays in view (its Pages and Finish fade out meanwhile)
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { zIndex: 55, backgroundColor: colors.desk, overflow: 'hidden' }, wide ? { right: BL.rightW } : { bottom: BL.barH }]}>
          <DeskFelt spot="publisher3" />
          <View style={[styles.editor, { flex: 1, paddingTop: kbUp ? insets.top + 8 : insets.top + (winW > winH ? 12 : 34), paddingLeft: insets.left, paddingRight: insets.right }]}>
            {!kbUp ? <View style={styles.editorHead}><Text style={styles.editorTitle}>Cover</Text></View> : null}
            <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: kbUp ? 'center' : 'flex-start' }}
              onLayout={(e) => setCoverArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {(() => {
              // room for the tools under the square (hidden while typing) and, upright, for Done at the bottom
              const toolsH = kbUp ? 60 : coverTitling ? 56 + (coverTool ? 96 : 0) : 0;
              const doneH = kbUp || winW > winH ? 0 : 76;
              const fitH = coverArea ? coverArea.h - toolsH - doneH - 8 : winW;
              const W = Math.max(120, Math.floor(Math.min(winW - insets.left - insets.right - 2 * GAP, fitH)));
              coverSize.current = W;
              const t = cover && cover.title;
              return (
                <View style={[styles.coverSquare, { width: W, height: W }]}>
                  {cover && cover.uri ? (
                    <Pressable onPress={() => setImgAsk('cover')} style={StyleSheet.absoluteFill} accessibilityLabel="Change the cover picture">
                      <Image source={{ uri: cover.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setImgAsk('cover')} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} accessibilityRole="button">
                      <Text style={[styles.plus, { fontSize: u * 30, lineHeight: u * 30 }]}>+</Text>
                      <Text style={styles.addImage}>Add Image</Text>
                    </Pressable>
                  )}
                  {/* the title: type in it, drag it anywhere on the cover */}
                  {coverTitling && t ? (
                    <View {...titleDrag.panHandlers} style={{ position: 'absolute', left: 0, right: 0, top: t.y * W, alignItems: 'center', transform: [{ translateX: (t.x - 0.5) * W }, { translateY: -t.size * W * 0.65 }] }}>
                      {/* tap the title to type in it; otherwise it's plain text that can be dragged anywhere */}
                      {titleEditing ? (
                        <TextInput value={t.text} onChangeText={(text) => setCoverTitle({ text })} multiline autoFocus onBlur={() => setTitleEditing(false)}
                          blurOnSubmit returnKeyType="done" onSubmitEditing={() => { Keyboard.dismiss(); setTitleEditing(false); }}
                          style={[titleStyle, coverTitleLook(t), { fontSize: t.size * W, lineHeight: t.size * W * 1.2, paddingHorizontal: W * 0.04, width: W, textAlign: 'center', outlineWidth: 0 }]}
                          accessibilityLabel="Cover title" />
                      ) : (
                        <Text style={[titleStyle, coverTitleLook(t), { fontSize: t.size * W, lineHeight: t.size * W * 1.2, paddingHorizontal: W * 0.04 }]} accessibilityLabel="Cover title">{t.text}</Text>
                      )}
                      {t.byline ? <Text style={[titleStyle, bylineStyle, coverTitleLook(t, true), { fontSize: t.size * W * 0.42, lineHeight: t.size * W * 0.6, paddingHorizontal: W * 0.12 }]}>{t.byline}</Text> : null}
                    </View>
                  ) : null}
                </View>
              );
            })()}
            {/* under the cover: the title tools (size, colour, font, author), centred, with the hint; then Done */}
            {/* while typing: a Done pill right under the cover puts the keyboard away (so does the return key) */}
            {kbUp ? (
              <View style={{ width: coverSize.current, alignItems: 'flex-end', marginTop: 10 }}>
                <Pressable onPress={() => { Keyboard.dismiss(); setTitleEditing(false); }} hitSlop={8} accessibilityRole="button" style={[styles.donePill, { marginBottom: 0 }]}>
                  <Text style={styles.donePillText}>Done</Text>
                </Pressable>
              </View>
            ) : null}
            {coverTitling && cover && cover.title && !kbUp ? (
              <View style={{ width: coverSize.current }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={() => setCoverTitle({ size: Math.max(0.05, cover.title.size - 0.015) })} style={styles.sizeBtn} accessibilityLabel="Smaller title"><Text style={[styles.donePillText, { fontSize: 14 }]}>A</Text></Pressable>
                  <Pressable onPress={() => setCoverTitle({ size: Math.min(0.24, cover.title.size + 0.015) })} style={styles.sizeBtn} accessibilityLabel="Bigger title"><Text style={[styles.donePillText, { fontSize: 22 }]}>A</Text></Pressable>
                  {/* colour: a solid circle in the title's colour (yellow to start with) */}
                  <Pressable onPress={() => { setCoverTool((x) => (x === 'color' ? null : 'color')); }} style={[styles.sizeBtn, coverTool === 'color' && styles.toolOn]} accessibilityLabel="Title colour">
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: cover.title.color || '#ffffff', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' }} />
                  </Pressable>
                  {/* font */}
                  <Pressable onPress={() => { setCoverTool((x) => (x === 'font' ? null : 'font')); }} style={[styles.sizeBtn, coverTool === 'font' && styles.toolOn]} accessibilityLabel="Title font">
                    <Text style={[styles.donePillText, { fontSize: 16, fontFamily: bookFont(cover.title.font || 'serif').bold || bookFont(cover.title.font || 'serif').family }]}>Aa</Text>
                  </Pressable>
                </View>
                  {/* the author / illustrator on the cover too: only if they want it (and gave a name); on the right edge, apart from the tools */}
                  {creditsLine(draft.writer, draft.artist) ? (
                    <Pressable onPress={() => setCoverTitle({ byline: cover.title.byline ? '' : creditsLine(draft.writer, draft.artist).replace(/\.$/, '') })}
                      style={[styles.authorBtn, cover.title.byline ? { backgroundColor: colors.green } : null]} accessibilityRole="button" accessibilityState={{ selected: !!cover.title.byline }}>
                      <Text style={[styles.donePillText, { fontSize: 14 }]}>Author</Text>
                    </Pressable>
                  ) : null}
                </View>
                {coverTool === 'color' ? (
                  <View style={styles.swatches}>
                    {COVER_COLORS.map(([hex, name]) => (
                      <Pressable key={hex} onPress={() => setCoverTitle({ color: hex })} accessibilityLabel={name}
                        style={[styles.swatch, { backgroundColor: hex }, (cover.title.color || '#ffffff') === hex && styles.swatchOn]} />
                    ))}
                  </View>
                ) : null}
                {coverTool === 'font' ? (
                  <View style={[styles.swatches, { gap: 6 }]}>
                    {Object.entries(BOOK_FONTS).map(([k, f]) => (
                      <Pressable key={k} onPress={() => setCoverTitle({ font: k })} style={[styles.fontChip, (cover.title.font || 'serif') === k && { backgroundColor: colors.green }]}>
                        <Text style={[styles.donePillText, { fontFamily: f.bold || f.family, fontWeight: f.bold ? undefined : '700', fontSize: 15 }]}>{f.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            </View>
          </View>
          {/* the hint is a speech bubble near the bottom that goes away after a while (tap it to close it sooner) */}
          {coverTitling && coverTip && !kbUp ? <Toast message="Tap the title to type. Drag it anywhere on the cover." area={{ left: GAP - 6, right: GAP - 6, bottom: 74 }} onDismiss={() => setCoverTip(false)} /> : null}
          {/* Done: bottom right, lined up with the cover's right edge */}
          {!kbUp ? <Pressable onPress={finishCover} hitSlop={8} accessibilityRole="button" style={[styles.donePill, { position: 'absolute', right: GAP + (wide ? 0 : insets.right), bottom: 18, marginBottom: 0 }]}><Text style={styles.donePillText}>Done</Text></Pressable> : null}
          {coverAsk ? (
            <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
              <View style={styles.choice}>
                <Text style={styles.choiceTitle}>Add the title as text?</Text>
                <Pressable onPress={coverYes} style={[styles.choiceBtn, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>Yes please</Text></Pressable>
                <Pressable onPress={coverNo} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>No thanks</Text></Pressable>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      ) : null}
      {pageDone ? (
        <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>What’s next?</Text>
            <Pressable onPress={addPage} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Add another page</Text></Pressable>
            <Pressable onPress={() => setPageDone(false)} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Keep working on this page</Text></Pressable>
            <Pressable onPress={openCover} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>{cover && cover.uri ? 'Edit the cover' : 'Design a cover'}</Text></Pressable>
            {/* leave the book maker for now; what's been made so far stays saved */}
            <Pressable onPress={async () => { setPageDone(false); clearTimeout(timer.current); try { onDone(await saveUserStory(latest.current)); } catch (e) { toast('Couldn’t save the story. Try again.'); } }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Cancel book editor</Text></Pressable>
            {/* Finish last, in green, with extra room around it */}
            <Pressable onPress={() => { setPageDone(false); finish(); }} style={[styles.choiceBtn, { backgroundColor: colors.green, marginTop: 18, marginBottom: 8 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>Finish and save book</Text></Pressable>
          </View>
        </View>
      ) : null}
      {imgAsk ? (
        <View style={[StyleSheet.absoluteFill, styles.choiceBack]}>
          <View style={styles.choice}>
            <Text style={styles.choiceTitle}>Add a picture</Text>
            <Pressable onPress={() => { const t = imgAsk; setImgAsk(null); placeImage(t, 'library'); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Choose a picture</Text></Pressable>
            {/* a photo of a drawing, say; the camera only opens after the grown-up check */}
            <Pressable onPress={() => { const t = imgAsk; setImgAsk(null); setCamGate(t); }} style={styles.choiceBtn} accessibilityRole="button"><Text style={styles.choiceBtnText}>Take a photo</Text></Pressable>
            <Pressable onPress={() => setImgAsk(null)} style={[styles.choiceBtn, { marginTop: 14 }]} accessibilityRole="button"><Text style={styles.choiceBtnText}>Cancel</Text></Pressable>
          </View>
        </View>
      ) : null}
      <ParentGate visible={!!camGate} reason="Taking a photo opens the camera." onPass={() => { const t = camGate; setCamGate(null); setTimeout(() => placeImage(t, 'camera'), 250); }} onCancel={() => setCamGate(null)} />
      <StoryGuide visible={guide} onClose={closeGuide} area={wide ? { left: BL.leftW, right: BL.rightW } : { top: BL.topH, bottom: BL.barH }} />
      <ParentGate visible={!!gateFor} reason={gateFor?.mode === 'print' ? 'Printing opens your phone’s print options.' : 'Sharing sends this story outside the app.'} onPass={() => makePdf(gateFor)} onCancel={() => setGateFor(null)} />
    </KeyboardAvoidingView>
  );
}

// A new cover title starts out yellow (the palette's mustard).
const TITLE_YELLOW = '#c9a227';

const styles = StyleSheet.create({
  editor: { alignItems: 'center' },
  editorHead: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30, paddingBottom: 12 },
  editorTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 18 },
  coverSquare: { backgroundColor: '#7d7d7d', overflow: 'hidden', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
  toolOn: { backgroundColor: colors.green },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8, marginTop: 22 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  swatchOn: { borderColor: colors.white, borderWidth: 3, transform: [{ scale: 1.12 }] },
  fontChip: { height: 36, borderRadius: 18, paddingHorizontal: 14, backgroundColor: '#5f5f5f', alignItems: 'center', justifyContent: 'center' },
  authorBtn: { height: 40, borderRadius: 20, paddingHorizontal: 16, backgroundColor: '#5f5f5f', alignItems: 'center', justifyContent: 'center' },
  sizeBtn: { width: 44, height: 40, borderRadius: 20, backgroundColor: '#5f5f5f', alignItems: 'center', justifyContent: 'center' },
  coverHint: { color: '#cfcfcf', fontFamily: fonts.ui, fontSize: 13, marginLeft: 4 },
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
  donePillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  editorPage: { flex: 1, marginBottom: 14, backgroundColor: colors.paper, padding: 24, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10 },
  editorInput: { flex: 1, fontSize: 24, lineHeight: 36, color: colors.ink, textAlign: 'center', textAlignVertical: 'top', padding: 0 },
  choiceBack: { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 30 },
  choice: { width: '100%', maxWidth: 380, backgroundColor: colors.panel, paddingHorizontal: 26, paddingTop: 30, paddingBottom: 32, gap: 16 },
  choiceTitle: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 20, marginBottom: 10 },
  choiceBtn: { backgroundColor: colors.tile, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // pills
  choiceBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  choiceLink: { color: '#d6d6d6', fontFamily: fonts.ui, fontWeight: '700', fontSize: 15, textAlign: 'center', paddingVertical: 4 },
  screen: { flex: 1, backgroundColor: colors.desk },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.desk },
  bookShadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  spine: { position: 'absolute', left: 0, right: 0, top: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: '#4a4a4a' },
  help: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  helpText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 18 },
  page: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  art: { backgroundColor: '#808080', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  plus: { color: colors.white, fontWeight: '200', fontFamily: fonts.ui },
  addImage: { color: colors.white, fontWeight: '700', fontSize: 22, fontFamily: fonts.ui, marginTop: 4 },
  artBtns: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: 'rgba(0,0,0,0.6)', color: colors.white, fontWeight: '700', fontSize: 15, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden', fontFamily: fonts.ui },
  textBox: { justifyContent: 'flex-start' }, // the words (or 'To add text, tap here…') centred in the square
  addText: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 22, color: colors.ink, marginBottom: 6, textAlign: 'center' }, // always inside the words square
  input: { fontFamily: fonts.story, fontSize: 21, lineHeight: 34, color: colors.ink, textAlign: 'center', textAlignVertical: 'center', padding: 0, minHeight: 68 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 17, padding: 0 }, // Helvetica, like the rest of the app's controls
  sub: { color: colors.muted, fontFamily: fonts.ui, fontSize: 12, marginTop: 2 },
  btn: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15, paddingHorizontal: 3 },
  finish: { backgroundColor: colors.green, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, overflow: 'hidden' }, // a solid green pill
  prow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#2a2a2a', padding: 12, borderWidth: 2, borderColor: 'transparent' },
  thumb: { width: 64, height: 64, backgroundColor: '#666', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbNum: { color: colors.white, fontWeight: '700', fontFamily: fonts.ui },
  prowTitle: { color: colors.white, fontWeight: '700', fontSize: 17, fontFamily: fonts.ui },
  prowSub: { color: '#bbb', fontSize: 14, fontWeight: '400', fontFamily: fonts.ui },
  pbtn: { width: 36, height: 36, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  pbtnText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  deleteLink: { color: '#ff6b6b', fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
  warn: { color: '#e6e6e6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  layBtn: { alignItems: 'center', gap: 6 },
  layIc: { width: 64, height: 64, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  layLabel: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  pill: { flex: 1, backgroundColor: '#6b6b6b', borderRadius: 22, height: 44, paddingVertical: 0, justifyContent: 'center' }, // Share as PDF / Print: medium grey pills
  wide: { flex: 1, backgroundColor: colors.tile, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, // pills
  deletePill: { alignSelf: 'flex-start', height: 44, borderRadius: 22, paddingHorizontal: 26, backgroundColor: colors.deepRed, alignItems: 'center', justifyContent: 'center', marginTop: 44, marginBottom: 14 },
  stackPill: { width: 180, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, // the Pages box pills, stacked on the right
  wideText: { color: colors.white, fontWeight: '700', fontSize: 15, fontFamily: fonts.ui },
});
