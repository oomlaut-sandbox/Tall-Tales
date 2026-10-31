import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Dimensions, Linking, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { importVoices, readVoicesFile } from './src/voiceShare';
import { SHEET_KIND, sheetPhotoFile, unpackSheetPage } from './src/sheetShare';
import { addSheet } from './src/folder';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_500Medium, EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_700Bold_Italic, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { colors, fonts, MAX_WIDTH } from './src/theme';
import Start from './src/screens/Start';
import { bookLayout, startRoom } from './src/components/BookFrame';
import BookOpen from './src/components/BookOpen';
import { Library, Store } from './src/screens/Shelf';
import About from './src/screens/About';
import Garden from './src/screens/Garden';
import Profile from './src/screens/Profile';
import StoreManager from './src/screens/StoreManager';
import { isStoreAdmin } from './src/storeAdmin';
import { onUserChange } from './src/account';
import ParentGate from './src/components/ParentGate';
import Reader from './src/screens/Reader';
import Publisher, { draftFrom } from './src/screens/Publisher';
import CoverTest from './src/screens/CoverTest';
import Help from './src/screens/Help';
import Welcome from './src/screens/Welcome';
import Intro from './src/screens/Intro';
import Splash from './src/components/Splash';
const INTRO_ON = true; // the new intro (Kid or Grown-up, Jörg 26 Oct 2026): on (Jörg, 26 Oct); shown once, on the first launch. The web preview shows it at #intro
const BADGE_BUBBLES = false; // the 'A new badge!' speech bubbles (off for now)
const WELCOME_ON = false; // the welcome intro: hidden from builds until it's finished (web preview #welcome still shows it)
import IdeaRoom from './src/screens/IdeaRoom';
import Settings from './src/screens/Settings';
import MusicSounds from './src/screens/MusicSounds';
import Membership from './src/components/Membership';
import { purchasesReady, usePurchases } from './src/purchases';
import { FREE_BOOKS } from './src/prices';
import TapePlayer from './src/components/TapePlayer';
import './src/myMusic'; // the family's own music joins the list at start
import { LangContext, deviceLang, translate } from './src/i18n';
import { ControlsContext, DEFAULT_CONTROLS, STORE_ON } from './src/controls';
import Notebook, { NOTEBOOK_COVER, R_EDGE, R_SPINE } from './src/screens/Notebook';
import { onNewBadge } from './src/badges';
import { SHOWN_BOOKS, STORIES, localizeStory } from './src/story';
import { shareInvite } from './src/invite';
import { deleteUserStory, loadUserStories } from './src/userStories';
import TeacherDesk from './src/screens/TeacherDesk';
import { shareStoryPdf } from './src/pdf';
import { loadJSON, loadJSONFor, saveJSON, saveJSONFor } from './src/storage';
import { TITLE_ICONS } from './src/titleIcons';
import { BulbIcon, CircleIcon, GearIcon, InfoIcon, LibraryIcon, MusicIcon, PersonIcon, MENU_ICON, Option, Panel, PlayGlyph, PlusIcon, StoreIcon, Toast, BubbleHost, setGoHome, setGoSettings, HomeIcon, BackRing } from './src/components/Chrome';
import { setVolumeBubble } from './src/volume';
import { DESK_FELT, DESK_IPAD_NOW, DeskFelt, Felt, IS_TABLET, LookContext } from './src/look';
import { hideSplash } from './src/launch';
import Profiles from './src/screens/Profiles';
import PlaybackPanel from './src/components/PlaybackPanel';
import Playlists from './src/screens/Playlists';
import { playOrder } from './src/playlists';
import { fadeOutAmbient, getAmbient, onAmbient, setAmbientPlayer } from './src/ambient';
import { ageAllowed, ageOf } from './src/catalog';
import { addProfile, loadProfiles, onProfiles, switchProfile } from './src/profiles';
import { loadGrownupCode } from './src/grownupCode';
import { playSound, setEffects, setEffectsVolume } from './src/sound';
import { stopSpeech } from './src/speech';
import { stopVoice } from './src/voice';
import { backHidden, clearBack, hasStep, markBack, markBackInto, onStepsChange, takeStep, useBackStep } from './src/nav';

function Root() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState(() => takeNextScreen() || 'start'); // (after picking a child in Profiles: My Library)
  // the store owner gets a Store Manager in the menu (checked at launch and whenever someone signs in or out)
  const [storeAdmin, setStoreAdmin] = useState(false);
  // web preview only: #store-demo shows the Store Manager with sample books
  const storeDemo = Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash === '#store-demo';
  useEffect(() => { if (storeDemo) { setStoreAdmin(true); return undefined; } isStoreAdmin().then(setStoreAdmin); return onUserChange(() => isStoreAdmin().then(setStoreAdmin)); }, []);
  // the welcome: the first time the app opens (kid or grown-up?), and again from Help. Web preview: #welcome shows it.
  const [welcome, setWelcome] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && /welcome/.test(window.location.hash)) { setWelcome(true); return; }
    // the intro is being worked on separately: off in the app until it's ready (WELCOME_ON = true brings it back)
    if (WELCOME_ON) loadJSONFor('app', 'welcome', null).then((w) => { if (!w) setWelcome(true); }, () => {});
  }, []);
  const welcomeDone = () => { setWelcome(false); saveJSONFor('app', 'welcome', { done: Date.now() }); go('library'); };
  const [coverOpen, setCoverOpen] = useState(false); // the book's cover is shut each time the app opens
  // the intro: the notebook first asks "Are you a kid or a grown-up?", then that one's own short journey
  const [splash, setSplash] = useState(!(Platform.OS === 'web' && typeof window !== 'undefined' && /nosplash|intro/.test(window.location.hash))); // the opening film, every session
  const [introAsk, setIntroAsk] = useState(false);
  const [introWho, setIntroWho] = useState(null);
  const [startKey, setStartKey] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && /intro/.test(window.location.hash)) { setIntroAsk(true); return; }
    if (INTRO_ON) loadJSONFor('app', 'intro', null).then((w) => { if (!w) setIntroAsk(true); }, () => {});
  }, []);
  const [peek, setPeek] = useState(null); // 'library' | 'store': drawn under the start screen as its book slides away
  // Phones and iPads can turn: the book goes side by side when sideways.
  const landscape = false; // (the old sideways layout with the bar down the side stays off)
  // The app fills the screen; controls are sized from a phone-sized width so they don't balloon on an iPad.
  const W = width;
  const u = Math.min(width, MAX_WIDTH) / 100;
  const [story, setStory] = useState(null);
  const [drawer, setDrawer] = useState(false);
  // the Audio Player opening (the music note on a bar) always comes out in front: the menus step aside
  useEffect(() => { let was = getAmbient().showPlayer; return onAmbient((st) => { if (st.showPlayer && !was) { setDrawer(false); setPlayOpen(false); } was = st.showPlayer; }); }, []);
  const [profileGate, setProfileGate] = useState(false); // the profile is for grown-ups
  const [prefs, setPrefs] = useState({ mode: 'page', sound: false, speed: 'normal', voice: 'narrator' }) // Page by Page narration by default;
  const [userStories, setUserStories] = useState([]);
  const [removed, setRemoved] = useState([]); // built-in books taken off the shelf (can be restored)
  useEffect(() => { loadJSON('removedBooks', []).then((r) => Array.isArray(r) && setRemoved(r)); }, []);
  const setRemovedSaved = (r) => { setRemoved(r); saveJSON('removedBooks', r); };
  const [draft, setDraft] = useState(null);
  const prefsLoaded = useRef(false);
  // the language (the phone's own at first, then whatever is chosen in Settings or on the start page)
  const [lang, setLangState] = useState(deviceLang());
  const [bookLang, setBookLangState] = useState(null); // members: books in another language (null: same as the app)
  const [controls, setControlsState] = useState(DEFAULT_CONTROLS); // parental controls (Settings)
  useEffect(() => {
    loadJSON('lang', null).then((l) => l && setLangState(l));
    loadJSON('bookLang', null).then((l) => l && setBookLangState(l));
    loadJSON('controls', null).then((c) => c && setControlsState({ ...DEFAULT_CONTROLS, ...c }));
  }, []);
  const setLang = (l) => { setLangState(l); saveJSON('lang', l); };
  const setBookLang = (l) => { setBookLangState(l); saveJSON('bookLang', l); };
  const setControls = (c) => { setControlsState(c); saveJSON('controls', c); };
  const t = (str, vars) => translate(lang, str, vars);
  const langRef = useRef(lang);
  langRef.current = lang;
  const [settingsGate, setSettingsGate] = useState(false); // Settings is for grown-ups
  // the books' language: members can choose one in Settings; otherwise the app's language
  const purchases = usePurchases();
  const readLang = (purchases.member && bookLang) || lang;
  const [memberOpen, setMemberOpen] = useState(false);

  useEffect(() => {
    loadUserStories().then(setUserStories).catch(() => {});
    loadJSON('prefs', null).then((p) => {
      // Sound effects start off every time the app opens (they can be switched on in the Playback menu).
      if (p) p = { ...p, sound: false, soundOffDefault: true };
      // Every time the app opens, playback starts as Page by Page (it can be changed in Playback Options).
      if (p) p = { ...p, mode: 'page' };
      // Huge text was removed: Large is the biggest now.
      if (p && p.textScale > 1.25) p = { ...p, textScale: 1.25 };
      if (p) setPrefs((x) => ({ ...x, ...p }));
      else setPrefs((x) => ({ ...x, soundOffDefault: true }));
      prefsLoaded.current = true;
    });
  }, []);
  useEffect(() => { if (prefsLoaded.current) saveJSON('prefs', prefs); }, [prefs]);
  const [message, setMessage] = useState('');
  const [toastSpot, setToastSpot] = useState(null); // while recording: bubbles sit in the middle of the picture page, clear of the words
  const [playMenu, setPlayMenu] = useState(0);
  const [playOpen, setPlayOpen] = useState(false); // Playback Options away from a book
  const toastTimer = useRef(null);
  // a book in someone's voice, sent as a file (Messages, Mail…) and opened in Coro: "Add Opa's voice?"
  const [incoming, setIncoming] = useState(null);
  useEffect(() => {
    const handle = async (url) => {
      if (!url || !/\.oomlaut$/i.test(decodeURIComponent(url))) return;
      const data = await readVoicesFile(url);
      if (data) setIncoming(data);
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => { try { sub.remove(); } catch (e) {} };
  }, []);

  const [toastMs, setToastMs] = useState(3000);
  // ms: how long it stays (3 seconds unless asked for longer)
  const toast = useCallback((m, ms = 3000) => {
    setMessage(m); setToastMs(ms);
    clearTimeout(toastTimer.current);
    if (ms > 0) toastTimer.current = setTimeout(() => setMessage(''), ms + 500); // the bubble itself closes after ms (or sooner with a tap); ms 0: it stays until it's tapped
  }, []);
  // a new reading badge: a little speech bubble (the badges are on the first page of My Notes)
  // (off for now: the bubbles were distracting. Badges are still earned and shown in My Notes: Jörg, 27 Oct 2026)
  useEffect(() => onNewBadge((fresh) => {
    if (!BADGE_BUBBLES) return;
    const b = fresh[0];
    const tr = (str, v) => translate(langRef.current, str, v);
    setTimeout(() => toast(fresh.length > 1 ? tr('New badges! {name} and more. See them in My Notes.', { name: tr(b.title) }) : tr('A new badge, {name}! See it in My Notes.', { name: tr(b.title) })), 900);
  }), [toast]);

  // From the start page to My Library: the closed notebook flies onto the shelf as the library fades in.
  const [toWip, setToWip] = useState(0); // Save and Exit in the book maker: My Library opens at Work in Progress
  const [toBooks, setToBooks] = useState(0); // Read a book on the start page: My Library opens scrolled down to My Books
  const [flyer, setFlyer] = useState(null); // { from, to } screen rectangles
  const libFade = useRef(new Animated.Value(1)).current;
  const flyP = useRef(new Animated.Value(0)).current;
  // (made once, so redraws during the flight never swap them for new ones)
  const flyShadowOut = useRef(flyP.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' })).current;
  const flyShadowIn = useRef(flyP.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' })).current;
  // The closed notebook is drawn where it was from the very first frame (so it never vanishes), waits there
  // until the shelf spot is known, then moves and shrinks onto it (native driver, smooth). The shelf's own
  // notebook shows first, and the flying one is taken away a moment later, so there's no blink at the end.
  useEffect(() => {
    if (!flyer) return undefined;
    if (flyer.hold) return undefined;
    if (!flyer.to) { const t = setTimeout(() => { setFlyer(null); libFade.setValue(1); }, 1500); return () => clearTimeout(t); }
    if (flyer.landed) return undefined;
    // first the notebook settles onto the shelf over the plain felt, then My Library dissolves in around it
    Animated.sequence([
      Animated.timing(flyP, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(libFade, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => { setFlyer((f) => (f ? { ...f, landed: true } : f)); setTimeout(() => setFlyer(null), 90); });
    return undefined;
  }, [flyer && flyer.to, flyer && flyer.landed]);
  const [nbFrom, setNbFrom] = useState(null); // where the little notebook was on the shelf when it was opened
  // (anything the parental controls hide can't be reached either)
  const go = (s) => {
    if (s !== 'reader') setQueue(null); // leaving the reader ends a playlist
    if ((s === 'store' && (!STORE_ON || !controls.store)) || (s === 'notebook' && !controls.notebook) || ((s === 'help' || s === 'about' || s === 'ideas') && !controls.help)) s = 'library';
    // the back button's list of where you've been (each with the book that was open, in the reader or the book maker)
    if (!backing.current) { clearBack(); if (s !== screen) { hist.current.push({ screen, story, draft }); if (hist.current.length > 40) hist.current.shift(); } }
    if (s !== 'library') setToBooks(0); // (only Read a book on the start page opens My Library at My Books)
    stopSpeech(); stopVoice(); setDrawer(false); setPeek(null); setScreen(s);
  };
  // Back (Jörg, 27 Oct 2026): to exactly what was on screen before: the same screen scrolled to the same spot,
  // the same book open on the same page, the book maker on the same book and page
  const hist = useRef([]);
  const backing = useRef(false);
  const [, stepBump] = useState(0);
  useEffect(() => onStepsChange(() => stepBump((n) => n + 1)), []);
  useBackStep(drawer, () => setDrawer(false)); // the menu open: Back closes it
  // from a book: back to My Library, scrolled to My Books (Jörg, 28 Oct 2026)
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.__go = (s) => go(s); // (web preview only: lets the screenshot scripts open a screen)
  const readFrom = useRef(null); // a book opened from the Teacher's Desk goes back there when it's closed
  const backToBooks = () => { playSound('coverClose'); if (readFrom.current === 'teacherDesk') { readFrom.current = null; go('teacherDesk'); return; } setToBooks((n) => n + 1); go('library'); };
  const goBack = () => {
    if (takeStep()) return; // the last step inside this screen first
    let e = hist.current.pop();
    while (e && e.screen === screen) e = hist.current.pop();
    if (!e) return;
    clearBack(); markBack(e.screen);
    if (e.screen === 'start') { setCoverOpen(true); setStartKey((n) => n + 1); } // the start page as it was: the notebook open
    if (e.screen === 'reader') { if (!e.story) { go('library'); return; } markBackInto('reader', e.story.id); setStory(e.story); }
    if (e.screen === 'publisher') {
      if (!e.draft) { go('library'); return; }
      const fresh = userStories.find((x) => x.id === e.draft.id); // what was saved since, if anything
      markBackInto('maker', e.draft.id); setDraft(fresh ? draftFrom(fresh) : e.draft);
    }
    backing.current = true; go(e.screen); backing.current = false;
  };
  const canBack = () => hasStep() || hist.current.some((e) => e.screen !== screen);
  // the home button on every black bar: back to My Library
  useEffect(() => { setGoHome(() => go('library')); });
  useEffect(() => { setGoSettings(() => { setDrawer(false); setSettingsGate(true); }); }); // the bar's lock (kid mode): Settings, behind the grown-up question
  // "Your volume is turned down" (the phone's volume all the way down when something starts to play)
  useEffect(() => { setVolumeBubble((m) => toast(t(m))); });
  // A book with a title page opens onto its title page with a blank white page above it (the
  // inside of the cover); its cover picture is the cover. From My Library, the cover animates open.
  const prepared = (s) => (s.pages[0] && s.pages[0].titlePage ? { ...s, pages: [{ ...s.pages[0], image: null, whiteArt: true }, ...s.pages.slice(1)] } : s);
  const [opening, setOpening] = useState(null); // { story, cover, rect } while a book opens from the library
  const openingRef = useRef(null); // the fallback timer that removes the opening cover if the reader never says it's ready
  // closing a book from its first spread: the cover swings shut; swipe up and it goes back to its place on the shelf
  const [closingBook, setClosingBook] = useState(null); // { story, cover, rect }
  const [coverOpenReq, setCoverOpenReq] = useState(0); // the reader asks the shut book to open again (the moon)
  const coverLeaving = useRef(false); // the shut book is gliding back to the shelf (swipe up)
  // going anywhere else (the menu, the house…) while the book is shut: the shut book goes away at once
  useEffect(() => { if (screen !== 'reader' && closingBook && !coverLeaving.current) setClosingBook(null); }, [screen]);
  const [recordOnOpen, setRecordOnOpen] = useState(false); // the book just made opens ready to be recorded
  useEffect(() => { if (screen !== 'reader') setRecordOnOpen(false); }, [screen]);
  const lastOpen = useRef({ cover: null, rect: null }); // the book's cover and where its tile was in the library
  const openStory = (s0, rect) => {
    const s = s0 && s0.langs ? localizeStory(s0, readLang) : s0; // a translated book opens in the reading language
    const ready = prepared(s);
    lastOpen.current = { cover: s.cover && s.cover.uri ? { uri: s.cover.uri } : s.pages[0] && s.pages[0].image, rect: rect || null };
    // the cover picture ready in memory before anything moves
    if (s.cover && s.cover.uri) Image.prefetch(s.cover.uri).catch(() => {});
    if (rect && (screen === 'library' || screen === 'store')) { setOpening({ story: ready, cover: s.cover && s.cover.uri ? { uri: s.cover.uri } : s.pages[0] && s.pages[0].image, rect }); return; }
    setStory(ready); go('reader');
  };
  const openMenu = () => { setDrawer((d) => !d); };
  // the books on this child's shelf (My Library's books, without those rated for older children)
  const shelf = [...STORIES.filter((s) => SHOWN_BOOKS.includes(s.id) && !removed.includes(s.id)).map((s) => localizeStory(s, readLang)), ...userStories];
  const childShelf = shelf.filter((s) => ageAllowed(ageOf(null, s), controls.childAge));
  // a playlist playing: its books one after another, each reading itself (Auto Play) and the next opening
  // a moment after The End
  const [queue, setQueue] = useState(null); // { ids, i }
  const queueRef = useRef(null);
  queueRef.current = queue;
  const openQueued = (q) => { const s = childShelf.find((x) => x.id === q.ids[q.i]); if (!s) return; const s2 = s.langs ? localizeStory(s, readLang) : s; lastOpen.current = { cover: s2.cover && s2.cover.uri ? { uri: s2.cover.uri } : s2.pages[0] && s2.pages[0].image, rect: null }; /* its own cover when it closes */ setStory(prepared(s2)); stopSpeech(); stopVoice(); setDrawer(false); setPeek(null); setScreen('reader'); };
  const playPlaylist = (pl) => {
    const ids = playOrder(pl, childShelf);
    if (!ids.length) return;
    const q = { ids, i: 0, key: Date.now(), listen: !!pl.listen, loop: !!pl.loop, pl };
    setQueue(q); openQueued(q);
  };
  // what the reader plays with: a playlist reads by itself (Auto Play), or Listen Only when it was set up that way;
  // the moon on the bar switches a playing playlist into (and out of) the nightlight, for this book and the next ones
  const readerPrefs = queue ? { ...prefs, mode: queue.listen ? 'listen' : 'auto' } : controls.playMode ? { ...prefs, mode: controls.playMode } : prefs;
  const setReaderPrefs = (fn) => {
    if (!queue) { setPrefs(fn); return; }
    const next = typeof fn === 'function' ? fn(readerPrefs) : fn;
    if (next.mode !== readerPrefs.mode) setQueue((q) => (q ? { ...q, listen: next.mode === 'listen' } : q));
    setPrefs((p) => ({ ...next, mode: p.mode, prevMode: p.prevMode })); // the reader's own choice of mode stays as it was
  };
  const queueNext = useRef(null);
  const onBookFinished = () => {
    const q = queueRef.current;
    // Listen Only, after the last book: the music fades away slowly
    const listening = q ? q.listen : (controls.playMode || prefs.mode) === 'listen';
    if (listening && (!q || (q.i + 1 >= q.ids.length && !q.loop))) fadeOutAmbient(30000);
    if (!q) return;
    clearTimeout(queueNext.current);
    // the last one stays on The End (the playlist ends when the reader is left), unless it loops back to the first
    if (q.i + 1 >= q.ids.length && !q.loop) return;
    queueNext.current = setTimeout(() => {
      if (queueRef.current !== q) return; // stopped meanwhile
      const again = q.i + 1 >= q.ids.length; // looping: start over (shuffled again if it shuffles)
      const n = again ? { ...q, ids: playOrder(q.pl, childShelf), i: 0, key: Date.now() } : { ...q, i: q.i + 1 };
      if (!n.ids.length) return;
      setQueue(n); openQueued(n);
      const nx = childShelf.find((x) => x.id === n.ids[n.i]);
      if (nx) toast(t('Up next, {title} ({a} of {b})', { title: nx.title, a: n.i + 1, b: n.ids.length }));
    }, 3500);
  };
  useEffect(() => () => clearTimeout(queueNext.current), []);
  const look = 'classic'; // one look for now (the Looks setting was dropped)
  // where the book maker was opened from: it goes back there when done (My Library when the book was opened from there or from reading it; My Workspace otherwise) (Jörg, 29 Oct 2026)
  const makerFrom = useRef('workspace');
  const openPublisher = (story) => { makerFrom.current = screen === 'library' || screen === 'reader' ? 'library' : 'workspace'; setDraft(draftFrom(story)); go('publisher'); };
  // a new book: free up to FREE_BOOKS made books; after that it's Coro Family (asked of a grown-up). Only once
  // purchases are switched on: until then everyone can keep making books.
  const [moreGate, setMoreGate] = useState(false);
  // Reading Options (modes, voices, fonts and sounds), from My Library, the Book Store and Settings
  const readingOptions = controls.playback && !controls.playMode ? () => setPlayOpen(true) : null;
  // the collapsible Reading Options box under the books: what it needs to show the choices in place
  const readingBox = controls.playback && !controls.playMode ? { prefs, setPrefs, toast, onPlaylists: () => go('playlists') } : null;
  const newBook = () => {
    if (purchasesReady && !purchases.member && userStories.length >= FREE_BOOKS) { setMoreGate(true); return; }
    openPublisher(null);
  };

  const barH = u * 17 + insets.bottom;
  // The permanent black bar over the front camera: across the top when upright, down the left
  // side when sideways. The screens are told the bar is part of the safe area, so they keep clear of it.
  useEffect(() => setEffects(prefs.sound === true), [prefs.sound]); // sound effects: Playback menu, off by default
  useEffect(() => setEffectsVolume(prefs.soundVol == null ? 0.5 : prefs.soundVol), [prefs.soundVol]); // and how loud they are
  const sideways = width > height * 1.1;
  const camBar = sideways ? Math.max(insets.left, 44) : Math.max(insets.top, 44);
  // the speech bubble sits in the middle of the space between the bars
  const toastArea = useMemo(() => {
    const reader = screen === 'reader';
    if (sideways) {
      const barW = reader ? bookLayout(width, height, { ...insets, left: camBar }, u * 17).rightW : Math.round(u * 17 * 1.15);
      return { left: camBar, right: barW, top: 0, bottom: 0 };
    }
    const ins = { ...insets, top: camBar };
    const bottom = reader ? bookLayout(width, height, ins, u * 17).barH : u * 17 + insets.bottom;
    return { left: 0, right: 0, top: camBar, bottom };
  }, [screen, sideways, width, height, insets, camBar, u]);
  // upright the menu comes up out of the bottom bar, whose height depends on the screen
  const drawerBottom = sideways ? 0 : screen === 'reader' ? bookLayout(width, height, { ...insets, top: camBar }, u * 17).barH
    : screen === 'start' ? bookLayout(width, height, { ...insets, top: camBar }, u * 17, startRoom(width, height)).barH : barH;
  const drawerRight = sideways ? (screen === 'reader' ? bookLayout(width, height, { ...insets, left: camBar }, u * 17).rightW : Math.round(u * 17 * 1.15)) : 0;
  const screenInsets = useMemo(() => (sideways ? { ...insets, left: camBar } : { ...insets, top: camBar }), [insets, sideways, camBar]);
  // the book maker sideways (no banner): the back button in the felt's bottom left corner, centred in the left and
  // bottom margins like the reader's, where the opening menu can't cover it (Jörg, 28 Oct 2026)
  const makerCorner = (() => {
    if (!(width > height * 1.1)) return null;
    // sideways the top right corner belongs to the menu: the back button always lives bottom left (Jörg, 28 Oct 2026)
    if (screen !== 'publisher' && screen !== 'notebook') return { left: screenInsets.left + 14, bottom: Math.max(14, insets.bottom + 6) };
    const ML = bookLayout(width, height, screenInsets, u * 17);
    if (!ML.wide) return null;
    const deskW = width - ML.leftW - ML.rightW;
    return { left: ML.leftW + Math.max(2, (deskW - ML.bookW) / 4 - 10), bottom: Math.max(6, (height - ML.bookH) / 4 - 10) };
  })();
  return (
    <View style={styles.outer}>
      <StatusBar style="light" />
      <SafeAreaInsetsContext.Provider value={screenInsets}>
      <LookContext.Provider value={look}>
      <LangContext.Provider value={{ lang, setLang }}>
      <ControlsContext.Provider value={STORE_ON ? controls : { ...controls, store: false }}>{/* (the Book Store is off for now: see STORE_ON) */}
      <View style={[styles.app, { width: W }]}>
        {/* the one felt underneath everything, locked to the screen */}
        <DeskFelt spot="root" overlay />
        {screen === 'start' && (
          // while the menu page is being turned, My Library is drawn underneath and shows through
          <View style={peek ? [StyleSheet.absoluteFill, { zIndex: 10 }] : { flex: 1 }}>
            <Start key={startKey} ask={introAsk} onIntro={() => { setSplash(true); setIntroWho(null); setIntroAsk(true); setCoverOpen(false); setStartKey((n) => n + 1); }} u={u} go={(t, rect) => { /* Read a book: the top of My Library (just My Book Collection now: Jörg, 29 Oct 2026); My Workspace: the notebook flies onto its shelf */ if (t === 'workspace' && rect) {
              // the flying notebook is drawn over the start page's one first; only once it's surely on screen
              // does the start page go, so there's never a frame without a notebook
              libFade.setValue(0); flyP.setValue(0); setFlyer({ from: rect });
              setTimeout(() => go(t), 90);
              return;
            }
            if (t.startsWith('intro-')) { setIntroWho(t.slice(6)); return; } // the intro's answer: its journey takes over
            if (t === 'make') { if (purchasesReady && !purchases.member && userStories.length >= FREE_BOOKS) { go('library'); setMoreGate(true); } else openPublisher(null); return; } // Make a book: straight to the book maker
            go(t); }} openMenu={coverOpen ? openMenu : () => toast(t('Start by opening the book.'))} onHome={coverOpen ? undefined : () => toast(t('Start by opening the book.'))} closed={!coverOpen} onOpened={() => setCoverOpen(true)} onClosed={() => setCoverOpen(false)} onPeek={(t) => setPeek(t || 'library')} />
          </View>
        )}
        {flyer && screen === 'workspace' ? (
          // while the notebook lands: the felt, and the black bar already in My Library's place, so it doesn't blink away
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <DeskFelt spot="app1" />
            {!sideways ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: barH, backgroundColor: colors.bar }}><Felt /></View> : null}
          </View>
        ) : null}
        {(screen === 'library' || (screen === 'start' && peek === 'library')) && (
          <View style={{ flex: 1 }}>
          <Library toBooks={toBooks} toWip={toWip} onReadingOptions={readingBox} u={u} narrator={prefs.narrator === 'gregory' ? 'gregory' : 'lily'} toast={toast} stories={shelf} openStory={openStory} openMenu={openMenu} onProfiles={() => go('profiles')}
            onNotebookOff={(rect) => {
              // the notebook stays where it is while the shelf dissolves away to plain felt; then the notebook
              // screen takes over (its own notebook is already in the same spot) and the held one is taken away
              setNbFrom(rect);
              if (!rect) { go('notebook'); return; }
              flyP.setValue(0); setFlyer({ from: rect, hold: true });
              Animated.timing(libFade, { toValue: 0, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
                // the notebook screen draws its own notebook in exactly this spot from its first frame, so the held
                // one goes in the same moment (left on top any longer, it sat over the growing one: a glitch)
                go('notebook');
                setFlyer((f) => (f && f.hold ? null : f));
                setTimeout(() => libFade.setValue(1), 160);
              });
            }}
            notebookHidden={!!flyer && !flyer.landed} onNotebookRect={(r) => {
              // the notebook sits further down the shelf now: if its spot is off the screen, no flight, My Library just fades in
              if (r && r.y + r.h > height - barH) { setFlyer((f) => (f && !f.to && !f.hold ? null : f)); Animated.timing(libFade, { toValue: 1, duration: 250, useNativeDriver: true }).start(); return; }
              setFlyer((f) => (f && !f.to && !f.hold && r ? { ...f, to: r } : f));
            }}
            onCreate={newBook} onEdit={openPublisher} onPlaylists={() => go('playlists')}
            removedCount={removed.length} onRestore={() => setRemovedSaved([])}
            onShare={(s) => shareInvite(s.title)} // an invitation to the app, not the book
            onDelete={async (list) => {
              const builtIn = list.filter((s) => !s.mine).map((s) => s.id);
              if (builtIn.length) setRemovedSaved([...new Set([...removed, ...builtIn])]);
              let mine = null;
              for (const s of list.filter((x) => x.mine)) mine = await deleteUserStory(s.id);
              if (mine) setUserStories(mine);
              toast(list.length === 1 ? t('Book deleted.') : t('{n} books deleted.', { n: list.length }));
            }} />
          </View>
        )}
        {/* My Workspace (Jörg, 29 Oct 2026): who is reading, Let's make a book, Work in Progress, My Notes, Things to share, the corkboard */}
        {screen === 'workspace' && (
          <Animated.View style={{ flex: 1, opacity: libFade }}>
          <Library mode="workspace" onPrompt={(prompt, me) => openPublisher({ prompt, owner: me && me.id, writer: (me && me.name) || '' }) /* a book prompt from the teacher (classroom.js) */} toWip={toWip} onGarden={controls.garden ? () => go('garden') : undefined} /* the Garden lies below My Workspace now (Jörg, 29 Oct 2026) */ u={u} narrator={prefs.narrator === 'gregory' ? 'gregory' : 'lily'} toast={toast} stories={shelf} openStory={openStory} openMenu={openMenu} onProfiles={() => go('profiles')}
            onNotebook={(rect) => {
              // the notebook stays where it is while the shelf dissolves away to plain felt; then the notebook
              // screen takes over (its own notebook is already in the same spot) and the held one is taken away
              setNbFrom(rect);
              if (!rect) { go('notebook'); return; }
              flyP.setValue(0); setFlyer({ from: rect, hold: true });
              Animated.timing(libFade, { toValue: 0, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
                // the notebook screen draws its own notebook in exactly this spot from its first frame, so the held
                // one goes in the same moment (left on top any longer, it sat over the growing one: a glitch)
                go('notebook');
                setFlyer((f) => (f && f.hold ? null : f));
                setTimeout(() => libFade.setValue(1), 160);
              });
            }}
            notebookHidden={!!flyer && !flyer.landed} onNotebookRect={(r) => {
              // the notebook sits further down the shelf now: if its spot is off the screen, no flight, My Library just fades in
              if (r && r.y + r.h > height - barH) { setFlyer((f) => (f && !f.to && !f.hold ? null : f)); Animated.timing(libFade, { toValue: 1, duration: 250, useNativeDriver: true }).start(); return; }
              setFlyer((f) => (f && !f.to && !f.hold && r ? { ...f, to: r } : f));
            }}
            onCreate={newBook} onEdit={openPublisher} onPlaylists={() => go('playlists')}
            removedCount={removed.length} onRestore={() => setRemovedSaved([])}
            onShare={(s) => shareInvite(s.title)} // an invitation to the app, not the book
            onDelete={async (list) => {
              const builtIn = list.filter((s) => !s.mine).map((s) => s.id);
              if (builtIn.length) setRemovedSaved([...new Set([...removed, ...builtIn])]);
              let mine = null;
              for (const s of list.filter((x) => x.mine)) mine = await deleteUserStory(s.id);
              if (mine) setUserStories(mine);
              toast(list.length === 1 ? t('Book deleted.') : t('{n} books deleted.', { n: list.length }));
            }} />
          </Animated.View>
        )}
        {screen === 'notebook' && <Notebook u={u} from={nbFrom} openMenu={openMenu} toast={toast} onDone={() => { const last = hist.current[hist.current.length - 1]; if (last && last.screen === 'workspace') goBack(); else go('workspace'); }} /* back to the same spot in My Workspace (Jörg, 29 Oct 2026) */ />}
        {screen === 'publisher' && draft && (
          <Publisher key={draft.id} u={u} storeAdmin={storeAdmin} initial={draft} fontKey={prefs.font} openMenu={openMenu} toast={toast} onChange={setUserStories} onDone={(list, recId, where) => { setUserStories(list); const rs = recId && list.find((x) => x.id === recId); if (rs) { setRecordOnOpen(true); openStory(rs); return; } if (where === 'published') { go('library'); return; } /* Finish and publish: always My Library (Jörg, 29 Oct 2026) */ const back = makerFrom.current; if (where === 'wip' && back === 'workspace') setToWip((n) => n + 1); /* Save and Exit: at the books still being made */ go(back); /* done: back where it was opened from */ }} onIdeas={() => go('ideas')} />
        )}
        {(screen === 'store' || (screen === 'start' && peek === 'store')) && <Store u={u} openStory={openStory} openMenu={openMenu} toast={toast} onReadingOptions={readingBox} />}
        {screen === 'music' && <MusicSounds u={u} openMenu={openMenu} prefs={prefs} setPrefs={setPrefs} />}
        {screen === 'profiles' && <Profiles u={u} openMenu={openMenu} setControls={setControls} onPicked={(id) => { setNextScreen('library'); switchProfile(id); }} onBack={(to) => go(to === 'workspace' ? 'workspace' : 'library')} />}
        {screen === 'playlists' && <Playlists u={u} openMenu={openMenu} shelf={childShelf} onPlay={playPlaylist} onDone={() => { const last = hist.current[hist.current.length - 1]; if (last && (last.screen === 'library' || last.screen === 'workspace')) goBack(); else go('workspace'); }} /* from My Library: back to the same spot (the corkboard), like the back button (Jörg, 29 Oct 2026) */ />}
        {screen === 'settings' && <Settings u={u} openMenu={openMenu} lang={lang} setLang={setLang} bookLang={bookLang} setBookLang={setBookLang}
          controls={controls} setControls={setControls} mode={prefs.mode} onDone={() => go('library')} onJoin={() => setMemberOpen(true)} onProfiles={() => go('profiles')} onPlaylists={() => go('playlists')} onReadingOptions={readingOptions} onMusic={() => go('music')} onTeacherDesk={() => go('teacherDesk')} prefs={prefs} setPrefs={setPrefs} toast={toast} />}
        {screen === 'teacherDesk' && <TeacherDesk u={u} openMenu={openMenu} toast={toast} stories={userStories} onList={setUserStories} openStory={(s) => { readFrom.current = 'teacherDesk'; openStory(s); }} controls={controls} setControls={setControls} fontKey={prefs.font} />}
        {screen === 'garden' && <Garden u={u} openMenu={openMenu} toast={toast} onHome={() => go('workspace')} />}
        {screen === 'help' && <Help u={u} openMenu={openMenu} onAbout={() => go('about')} onIdeas={() => go('ideas')} onWelcome={WELCOME_ON ? () => setWelcome(true) : null}
          onIntro={() => { setSplash(true); setIntroWho(null); setIntroAsk(true); setCoverOpen(false); setStartKey((n) => n + 1); go('start'); }} />}
        {screen === 'ideas' && <IdeaRoom u={u} openMenu={openMenu} onMake={() => openPublisher(null)} onHelp={() => go('help')} />}
        {screen === 'covertest' && <CoverTest u={u} openMenu={openMenu} />}
        {screen === 'about' && <About u={u} openMenu={openMenu} onBack={() => go('help')} onSecret={() => {
          // the store owner: straight to the Store Manager when signed in, otherwise to the sign-in first
          if (storeAdmin) go('storeManager');
          else { go('profile'); toast('Sign in as the store owner to open the Store Manager.'); }
        }} />}
        {screen === 'storeManager' && <StoreManager u={u} openMenu={openMenu} toast={toast} demo={storeDemo} />}
        {screen === 'profile' && <Profile u={u} openMenu={openMenu} toast={toast} />}
        {screen === 'reader' && story && (
          <Reader key={queue ? `${queue.key}:${queue.i}` : 'one'} u={u} story={story} setToastSpot={setToastSpot} prefs={readerPrefs}
            autoStart={!!queue} startRecording={recordOnOpen} onFinished={onBookFinished} onSettings={() => setSettingsGate(true)} onBackToBooks={backToBooks} onEdit={story && story.mine && controls.create ? () => openPublisher(userStories.find((x) => x.id === story.id) || story) : undefined} onPlaylists={() => go('playlists')} setPrefs={setReaderPrefs} openMenu={openMenu} goLibrary={() => { playSound('coverClose'); go('library'); }} onCover={() => { stopSpeech(); stopVoice(); setClosingBook({ story, cover: lastOpen.current.cover || (story.cover && story.cover.uri ? { uri: story.cover.uri } : null), rect: lastOpen.current.rect }); }} toast={toast} menuRequest={playMenu} landscape={landscape} coverShut={!!closingBook} onOpenCover={() => setCoverOpenReq((n) => n + 1)} onShown={() => { if (openingRef.current) { clearTimeout(openingRef.current); openingRef.current = null; setOpening(null); } }} />
        )}
        {closingBook ? (
          <BookOpen closing openSignal={coverOpenReq} u={u} story={closingBook.story} cover={closingBook.cover} rect={closingBook.rect} textScale={prefs.textScale || 1} fontKey={prefs.font || 'serif'} amber={!!prefs.amber}
            onDone={() => setClosingBook(null)} onLeave={() => { coverLeaving.current = true; go('library'); }} onGone={() => { coverLeaving.current = false; setClosingBook(null); }} />
        ) : null}
        {opening ? (
          <BookOpen u={u} story={opening.story} cover={opening.cover} rect={opening.rect} textScale={prefs.textScale || 1} fontKey={prefs.font || 'serif'} amber={!!prefs.amber}
            onDone={() => { setStory(opening.story); go('reader'); clearTimeout(openingRef.current); openingRef.current = setTimeout(() => { openingRef.current = null; setOpening(null); }, 900); /* (the reader normally says it's ready well before this) */ }} />
        ) : null}
        {/* while the notebook flies, the bottom bar stays put on top (it doesn't fade with the shelf) */}
        {flyer && !sideways ? <View pointerEvents="none" style={{ position: 'absolute', zIndex: 140, left: 0, right: 0, bottom: 0, height: barH, backgroundColor: colors.bar }}><Felt /></View> : null}
        {flyer ? (() => {
          // One view that never changes its place or size: it sits exactly where the closed notebook was on
          // the start page, and only moves (translate) and shrinks (scale) towards the shelf. Until the shelf
          // spot is known its movement is zero, so nothing jumps or blinks when it becomes known.
          const { from, to } = flyer;
          const tx = to ? to.x + to.w / 2 - (from.x + from.w / 2) : 0;
          const ty = to ? to.y + to.w / 2 - (from.y + from.w / 2) : 0;
          const k = to ? to.w / from.w : 1;
          const shadowOn = screen === 'workspace' && !flyer.landed;
          const round = { borderTopLeftRadius: from.w * R_SPINE, borderTopRightRadius: from.w * R_SPINE, borderBottomLeftRadius: from.w * R_EDGE, borderBottomRightRadius: from.w * R_EDGE };
          return (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', zIndex: 150, left: from.x, top: from.y, width: from.w, height: from.w,
              transform: [{ translateX: flyP.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) }, { translateY: flyP.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) }, { scale: flyP.interpolate({ inputRange: [0, 1], outputRange: [1, k] }) }] }}>
              {/* Its shadow: only one notebook casts one at any moment. While the page it came from is still on
                  screen (with its own notebook and shadow underneath), it has none; it takes over in the same
                  frame that page goes. Then two still shadows cross-fade as it shrinks: the big one it had where
                  it was, and the small shelf one, so the shadow never jumps or flares. Gone once it has landed. */}
              {shadowOn ? (
                <>
                  <Animated.View style={[StyleSheet.absoluteFill, round, { backgroundColor: '#7c5438', shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: flyer.hold ? 0.45 : 0.35, shadowRadius: flyer.hold ? 8 : 10, opacity: flyShadowOut }]} />
                  {to ? <Animated.View style={[StyleSheet.absoluteFill, round, { backgroundColor: '#7c5438', shadowColor: '#000', shadowOffset: { width: 2 / k, height: 5 / k }, shadowOpacity: 0.45, shadowRadius: 8 / k, opacity: flyShadowIn }]} /> : null}
                </>
              ) : null}
              <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: '#7c5438' }, round]}><Image source={NOTEBOOK_COVER} resizeMode="cover" style={{ width: '100%', height: '100%' }} /></View>
            </Animated.View>
          );
        })() : null}
        <ParentGate visible={settingsGate} reason={t('Changing settings is for grown-ups.')} onPass={() => { setSettingsGate(false); go('settings'); }} onCancel={() => setSettingsGate(false)} />
        <Membership visible={memberOpen} onClose={() => setMemberOpen(false)} toast={toast} />
        <ParentGate visible={moreGate} reason={t('Making more than {n} books is part of Coro Family.', { n: FREE_BOOKS })} onPass={() => { setMoreGate(false); setMemberOpen(true); }} onCancel={() => setMoreGate(false)} />
        {incoming && incoming.kind === SHEET_KIND ? (
          // a sheet someone sent: into Things to share
          <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setIncoming(null)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
              <View style={{ width: '100%', maxWidth: 400, backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 24, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 26 }}>
                <Text style={{ color: colors.white, fontFamily: fonts.uiBold, fontSize: 20 }}>{t('{name} sent you a sheet', { name: incoming.from || t('Someone') })}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, marginTop: 12 }}>{t('Put it in Things to share?')}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 26, justifyContent: 'flex-end' }}>
                  <Pressable onPress={() => setIncoming(null)} style={{ height: 44, borderRadius: 22, paddingHorizontal: 20, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button"><Text style={{ color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 }}>{t('Not now')}</Text></Pressable>
                  <Pressable onPress={async () => {
                    const d = incoming; setIncoming(null);
                    try {
                      await addSheet({ kind: 'page', from: typeof d.from === 'string' ? d.from.slice(0, 60) : '', page: await unpackSheetPage(d) }, typeof d.photo === 'string' ? sheetPhotoFile(d.photo) : null);
                      go('workspace'); toast(t('It’s in Things to share.'));
                    } catch (e) { toast(t('That file couldn’t be opened.')); }
                  }} style={{ height: 44, borderRadius: 22, paddingHorizontal: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button"><Text style={{ color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 }}>{t('Add')}</Text></Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : incoming ? (() => {
          const names = (incoming.readers || []).map((x) => x.name).join(', ');
          const title = incoming.title || '';
          return (
            <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setIncoming(null)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
                <View style={{ width: '100%', maxWidth: 400, backgroundColor: '#000', borderRadius: 24, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 26 }}>
                  <Text style={{ color: colors.white, fontFamily: fonts.uiBold, fontSize: 20 }}>{t('{names} read “{title}” for you', { names, title })}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, marginTop: 12 }}>{t('Add their voice to this book on this phone? Pages they didn’t record are read by the narrator.')}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 26, justifyContent: 'flex-end' }}>
                    <Pressable onPress={() => setIncoming(null)} style={{ height: 44, borderRadius: 22, paddingHorizontal: 20, backgroundColor: '#3a3a3a', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button"><Text style={{ color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 }}>{t('Not now')}</Text></Pressable>
                    <Pressable onPress={async () => {
                      const data = incoming; setIncoming(null);
                      const res = await importVoices(data);
                      if (res.ok) { go('library'); toast(t('{names}’s voice is ready in “{title}”.', { names, title }), 5000); }
                      else if (res.reason === 'full') toast(t('There’s room for three readers on this phone. Remove one first: tap the voice on the reading bar, then the scissors.'), 6000);
                      else toast(t('That file couldn’t be opened.'));
                    }} style={{ height: 44, borderRadius: 22, paddingHorizontal: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button"><Text style={{ color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 }}>{t('Add')}</Text></Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          );
        })() : null}
        <ParentGate visible={profileGate} reason={t('Your profile is for grown-ups.')} onPass={() => { setProfileGate(false); go('profile'); }} onCancel={() => setProfileGate(false)} />
        {splash ? <Splash onDone={() => setSplash(false)} /> : null}
        {introWho ? <Intro who={introWho} onBack={() => { setIntroWho(null); setCoverOpen(true); setStartKey((n) => n + 1); }} onDone={({ who, age, name }) => {
          // a kid's age goes into their parental controls; a grown-up's first profile is made with the name and age
          if (who === 'kid' && age != null) setControls({ ...controls, childAge: age });
          if (who === 'grownup' && (name || age != null)) addProfile({ name, age });
          saveJSONFor('app', 'intro', { done: Date.now(), who });
          setIntroAsk(false); setIntroWho(null); setCoverOpen(true); setStartKey((n) => n + 1); // back to the start page, the notebook open
        }} /> : null}
        {welcome ? <Welcome controls={controls} setControls={setControls} onDone={welcomeDone} /> : null}
        {/* Back: a small arrow in the top right corner of the banner */}
        {/* Back: on every page, always the same size and in the same spot, top right (Jörg, 27 Oct 2026). It goes
            back one step: whatever is open on top first, then the step before in this screen, then the screen before */}
        {screen !== 'reader' /* reading: the reader draws its own back to My Books, in the felt margin (Jörg, 28 Oct 2026) */ && screen !== 'start' /* nor on the start page, where there's nothing to go back to */ && !backHidden() /* nor over the drawing editor */ && !splash && !introWho && !welcome && !flyer && !opening && !closingBook ? (
          <BackRing onPress={screen === 'reader' ? backToBooks : goBack} label={screen === 'reader' ? t('My Book Collection') : t('Back')} style={{ position: 'absolute', zIndex: 200, ...(makerCorner || { top: screenInsets.top + 10, right: 12 + (sideways ? drawerRight : 0) }), opacity: screen === 'reader' || canBack() ? 1 : 0.35 }} />
        ) : null}
        <Toast message={message} ms={toastMs} center={!!toastSpot && screen === 'reader'} area={toastSpot && screen === 'reader' ? { left: toastSpot.x, top: toastSpot.y, right: width - toastSpot.x - toastSpot.w, bottom: height - toastSpot.y - toastSpot.h } : toastArea} onDismiss={() => { clearTimeout(toastTimer.current); setMessage(''); }} />
        {/* the Audio Player for music and nature sounds: in the middle of the screen over a dark layer until it's closed */}
        <TapePlayer area={{ left: 0, top: 0, right: drawerRight, bottom: drawerBottom }} onMenu={() => { setAmbientPlayer(false); go('music'); }} />{/* the black bar stays on top, uncovered */}
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 175 }]}>
          <PlaybackPanel open={playOpen && screen !== 'reader'} onClose={() => setPlayOpen(false)} onPlaylists={() => go('playlists')} prefs={prefs} setPrefs={setPrefs} toast={toast} bottom={drawerBottom} inset={drawerRight} />
        </View>
        {/* the main menu slides in over everything else on screen (pop-ups, pages boxes), except speech bubbles */}
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 180 }]}>
          <Panel open={drawer} title={t('Menu')} bottom={drawerBottom} inset={drawerRight} onClose={() => setDrawer(false)}>
            {/* Make a Book first: Coro is a book maker first (Jörg, 25 Oct 2026) */}
            <Option glyph={<Image source={TITLE_ICONS.make} style={{ width: 26, height: 26, tintColor: colors.white }} />} title={t('My Workspace')} sub={t('Make and share books and ideas')} onPress={() => go('workspace')} />{/* (was Make a Book: Jörg, 29 Oct 2026) */}
            <Option glyph={<HomeIcon size={MENU_ICON + 2} color={colors.white} />} title={t('My Library')} sub={t('Find and read your favorite books')} onPress={() => go('library')} />
            {STORE_ON && controls.store ? <Option glyph={<LibraryIcon size={MENU_ICON} />} title={t('Book Store')} sub={t('Discover and buy new books')} onPress={() => go('store')} /> : null}
            {/* Reading Options and Music and Sounds live in Settings now (and Reading Options under the books in My Library
                and the Book Store); Ideas has its own place; Support is the help pages (Jörg, 26 Oct 2026) */}
            {controls.help ? <Option glyph={<BulbIcon size={26} color={colors.white} weight={2} />} title={t('Ideas')} sub={t('Books you can make together')} onPress={() => go('ideas')} /> : null}
            {controls.help ? <Option glyph={<Image source={TITLE_ICONS.support} style={{ width: 26, height: 26 }} />} title={t('Help')} sub={t('Answers to all your questions')} onPress={() => go('help')} /> : null}
            {/* (Profiles now live at the bottom of Settings and Profiles; children still switch from the start page) */}
            {/* Settings: always last, always behind the grown-up question */}
            <Option glyph={<PersonIcon />} title={t('Settings')} sub={t('Language, parental and profiles')} onPress={() => { setDrawer(false); setSettingsGate(true); }} />
            {/* (About is reached from Help) */}
            <View style={{ height: 14 }} />
          </Panel>
        </View>
        <View pointerEvents="none" style={sideways
          ? { position: 'absolute', left: 0, top: 0, bottom: 0, width: camBar, backgroundColor: colors.bar, zIndex: 200 }
          : { position: 'absolute', left: 0, right: 0, top: 0, height: camBar, backgroundColor: colors.bar, zIndex: 200 }}><Felt /></View>
        {/* every speech bubble in the app is drawn here, on top of everything */}
        <BubbleHost defaultArea={toastArea} />
      </View>
      </ControlsContext.Provider>
      </LangContext.Provider>
      </LookContext.Provider>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

// While the app gets ready (fonts, and the home picture so it appears in one go), show plain dark grey
// to match the launch screen and the logo animation, instead of a flash of colour.
const HOME_PICTURE = require('./assets/leather.jpg');
// The start screen's pictures, drawn once (invisibly) while the app gets ready, so the closed notebook cover
// is already in memory when the start screen first shows: no see-through frame before its strips appear.
const WARM = [require('./assets/leather-cover-round.png'), require('./assets/leather-cover-wide-round.png'),
  require('./assets/tile-library.png'), require('./assets/tile-store.png'), require('./assets/logo-felt-colour.png')];
// Phones and tablets both turn: sideways, the book goes side by side with the menu bar on the right.
if (Platform.OS !== 'web') ScreenOrientation.unlockAsync().catch(() => {});

// the screen to start on the next time the app starts afresh (switching children in Profiles lands in My Library)
let nextScreen = null;
const setNextScreen = (s) => { nextScreen = s; };
const takeNextScreen = () => { const s = nextScreen; nextScreen = null; return s; };

export default function App() {
  const [loaded] = useFonts({ EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_500Medium, EBGaramond_700Bold, SpecialElite_400Regular, DancingScript_700Bold, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_700Bold_Italic, PlusJakartaSans_800ExtraBold });
  const [pictureReady, setPictureReady] = useState(false);
  // the child whose things the app shows (Profiles): read before anything else; switching children starts
  // the app afresh with their notebook, badges, playlists and settings
  const [who, setWho] = useState(null);
  useEffect(() => {
    loadProfiles().then((s) => setWho(s.active), () => setWho('main'));
    loadGrownupCode().catch(() => {}); // (the grown-up passcode, if one is set, is known before any grown-up question)
    return onProfiles((s) => setWho(s.active));
  }, []);
  const assetsIn = useRef(false);
  const shown = useRef(0); // how many of the warm-up pictures have been drawn
  const check = () => { if (assetsIn.current && shown.current >= WARM.length) finishRef.current(); };
  const finishRef = useRef(() => {});
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setPictureReady(true); } };
    finishRef.current = finish;
    // the leather and the charcoal felt are ready before the first screen, so the book's slide-in isn't lost to a slow first frame
    Asset.loadAsync([HOME_PICTURE, ...WARM, ...(IS_TABLET ? [DESK_IPAD_NOW(1, 2), DESK_IPAD_NOW(2, 1)] : DESK_FELT ? [DESK_FELT] : [])]).then(() => { assetsIn.current = true; check(); }, finish);
    const t = setTimeout(finish, 1800); // never wait longer than this
    return () => clearTimeout(t);
  }, []);
  // the opening film plays over the start page for its first seconds, so its pictures load behind the film: no
  // waiting for them first (that wait was a plain grey screen before the film: Jörg, 29 Oct 2026)
  const filmFirst = !(Platform.OS === 'web' && typeof window !== 'undefined' && /nosplash|intro/.test(window.location.hash));
  if (!loaded || (!pictureReady && !filmFirst) || !who) return (
    <View style={{ flex: 1, backgroundColor: colors.desk }}>
      {/* drawn tiny and invisible, only so they're decoded before the start screen shows */}
      {WARM.map((src, k) => <Image key={k} source={src} onLoadEnd={() => { shown.current += 1; check(); }} style={{ position: 'absolute', left: 0, top: 0, width: 4, height: 4, opacity: 0.01 }} />)}
    </View>
  );
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={hideSplash}>
      <Root key={who} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  setting: { gap: 10, paddingTop: 4, paddingBottom: 8 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  outer: { flex: 1, backgroundColor: colors.desk, alignItems: 'center' },
  app: { flex: 1, backgroundColor: colors.desk, overflow: 'hidden' }, // dark grey underneath everything: no light flash
});
