import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Dimensions, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_500Medium, EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { colors, fonts, MAX_WIDTH } from './src/theme';
import Start from './src/screens/Start';
import { bookLayout, startRoom } from './src/components/BookFrame';
import BookOpen from './src/components/BookOpen';
import { Library, Store } from './src/screens/Shelf';
import About from './src/screens/About';
import Profile from './src/screens/Profile';
import StoreManager from './src/screens/StoreManager';
import { isStoreAdmin } from './src/storeAdmin';
import { onUserChange } from './src/account';
import ParentGate from './src/components/ParentGate';
import Reader from './src/screens/Reader';
import Publisher, { draftFrom } from './src/screens/Publisher';
import CoverTest from './src/screens/CoverTest';
import Help from './src/screens/Help';
import IdeaRoom from './src/screens/IdeaRoom';
import Settings from './src/screens/Settings';
import MusicSounds from './src/screens/MusicSounds';
import Membership from './src/components/Membership';
import TapePlayer from './src/components/TapePlayer';
import { LangContext, deviceLang, translate } from './src/i18n';
import { ControlsContext, DEFAULT_CONTROLS } from './src/controls';
import Notebook, { NOTEBOOK_COVER, R_EDGE, R_SPINE } from './src/screens/Notebook';
import { onNewBadge } from './src/badges';
import { SHOWN_BOOKS, STORIES, localizeStory } from './src/story';
import { usePurchases } from './src/purchases';
import { shareInvite } from './src/invite';
import { deleteUserStory, loadUserStories } from './src/userStories';
import { shareStoryPdf } from './src/pdf';
import { loadJSON, saveJSON } from './src/storage';
import { CircleIcon, GearIcon, InfoIcon, LibraryIcon, MusicIcon, MENU_ICON, Option, Panel, PlayGlyph, PlusIcon, StoreIcon, Toast } from './src/components/Chrome';
import { DESK_FELT, DeskFelt, Felt, LookContext } from './src/look';
import { hideSplash } from './src/launch';
import Profiles from './src/screens/Profiles';
import PlaybackPanel from './src/components/PlaybackPanel';
import Playlists from './src/screens/Playlists';
import { playOrder } from './src/playlists';
import { fadeOutAmbient, setAmbientPlayer } from './src/ambient';
import { ageAllowed, ageOf } from './src/catalog';
import { loadProfiles, onProfiles } from './src/profiles';
import { playSound, setEffects, setEffectsVolume } from './src/sound';
import { stopSpeech } from './src/speech';
import { stopVoice } from './src/voice';

function Root() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState('start');
  // the store owner gets a Store Manager in the menu (checked at launch and whenever someone signs in or out)
  const [storeAdmin, setStoreAdmin] = useState(false);
  // web preview only: #store-demo shows the Store Manager with sample books
  const storeDemo = Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash === '#store-demo';
  useEffect(() => { if (storeDemo) { setStoreAdmin(true); return undefined; } isStoreAdmin().then(setStoreAdmin); return onUserChange(() => isStoreAdmin().then(setStoreAdmin)); }, []);
  const [coverOpen, setCoverOpen] = useState(false); // the book's cover is shut each time the app opens
  const [peek, setPeek] = useState(null); // 'library' | 'store': drawn under the start screen as its book slides away
  // Phones and iPads can turn: the book goes side by side when sideways.
  const landscape = false; // (the old sideways layout with the bar down the side stays off)
  // The app fills the screen; controls are sized from a phone-sized width so they don't balloon on an iPad.
  const W = width;
  const u = Math.min(width, MAX_WIDTH) / 100;
  const [story, setStory] = useState(null);
  const [drawer, setDrawer] = useState(false);
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

  const toast = useCallback((m) => {
    setMessage(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(''), 5500); // a little longer; tap the bubble to close it sooner
  }, []);
  // a new reading badge: a little speech bubble (the badges are on the first page of My Notebook)
  useEffect(() => onNewBadge((fresh) => {
    const b = fresh[0];
    const tr = (str, v) => translate(langRef.current, str, v);
    setTimeout(() => toast(fresh.length > 1 ? tr('New badges! {name} and more. See them in My Notebook.', { name: tr(b.title) }) : tr('New badge: {name}! See it in My Notebook.', { name: tr(b.title) })), 900);
  }), [toast]);

  // From the start page to My Library: the closed notebook flies onto the shelf as the library fades in.
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
    if ((s === 'store' && !controls.store) || (s === 'notebook' && !controls.notebook) || ((s === 'help' || s === 'about' || s === 'ideas') && !controls.help)) s = 'library';
    stopSpeech(); stopVoice(); setDrawer(false); setPeek(null); setScreen(s);
  };
  // A book with a title page opens onto its title page with a blank white page above it (the
  // inside of the cover); its cover picture is the cover. From My Library, the cover animates open.
  const prepared = (s) => (s.pages[0] && s.pages[0].titlePage ? { ...s, pages: [{ ...s.pages[0], image: null, whiteArt: true }, ...s.pages.slice(1)] } : s);
  const [opening, setOpening] = useState(null); // { story, cover, rect } while a book opens from the library
  const openStory = (s0, rect) => {
    const s = s0 && s0.langs ? localizeStory(s0, readLang) : s0; // a translated book opens in the reading language
    const ready = prepared(s);
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
  const openQueued = (q) => { const s = childShelf.find((x) => x.id === q.ids[q.i]); if (!s) return; const s2 = s.langs ? localizeStory(s, readLang) : s; setStory(prepared(s2)); stopSpeech(); stopVoice(); setDrawer(false); setPeek(null); setScreen('reader'); };
  const playPlaylist = (pl) => {
    const ids = playOrder(pl, childShelf);
    if (!ids.length) return;
    const q = { ids, i: 0, key: Date.now(), listen: !!pl.listen };
    setQueue(q); openQueued(q);
  };
  const queueNext = useRef(null);
  const onBookFinished = () => {
    const q = queueRef.current;
    // Listen Only, after the last book: the music fades away slowly
    const listening = q ? q.listen : (controls.playMode || prefs.mode) === 'listen';
    if (listening && (!q || q.i + 1 >= q.ids.length)) fadeOutAmbient(30000);
    if (!q) return;
    clearTimeout(queueNext.current);
    if (q.i + 1 >= q.ids.length) return; // the last one stays on The End (the playlist ends when the reader is left)
    queueNext.current = setTimeout(() => {
      if (queueRef.current !== q) return; // stopped meanwhile
      const n = { ...q, i: q.i + 1 };
      setQueue(n); openQueued(n);
      const nx = childShelf.find((x) => x.id === n.ids[n.i]);
      if (nx) toast(t('Next: {title} ({a} of {b})', { title: nx.title, a: n.i + 1, b: n.ids.length }));
    }, 3500);
  };
  useEffect(() => () => clearTimeout(queueNext.current), []);
  const look = 'classic'; // one look for now (the Looks setting was dropped)
  const openPublisher = (story) => { setDraft(draftFrom(story)); go('publisher'); };

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
      const barW = reader ? bookLayout(width, height, { ...insets, left: camBar }, u * 13).rightW : Math.round(u * 17 * 1.15);
      return { left: camBar, right: barW, top: 0, bottom: 0 };
    }
    const ins = { ...insets, top: camBar };
    const bottom = reader ? bookLayout(width, height, ins, u * 13).barH : u * 17 + insets.bottom;
    return { left: 0, right: 0, top: camBar, bottom };
  }, [screen, sideways, width, height, insets, camBar, u]);
  // upright the menu comes up out of the bottom bar, whose height depends on the screen
  const drawerBottom = sideways ? 0 : screen === 'reader' ? bookLayout(width, height, { ...insets, top: camBar }, u * 13).barH
    : screen === 'start' ? bookLayout(width, height, { ...insets, top: camBar }, u * 17, startRoom(width, height)).barH : barH;
  const drawerRight = sideways ? (screen === 'reader' ? bookLayout(width, height, { ...insets, left: camBar }, u * 13).rightW : Math.round(u * 17 * 1.15)) : 0;
  const screenInsets = useMemo(() => (sideways ? { ...insets, left: camBar } : { ...insets, top: camBar }), [insets, sideways, camBar]);
  return (
    <View style={styles.outer}>
      <StatusBar style="light" />
      <SafeAreaInsetsContext.Provider value={screenInsets}>
      <LookContext.Provider value={look}>
      <LangContext.Provider value={{ lang, setLang }}>
      <ControlsContext.Provider value={controls}>
      <View style={[styles.app, { width: W }]}>
        {/* the one felt underneath everything, locked to the screen */}
        <DeskFelt spot="root" overlay />
        {screen === 'start' && (
          // while the menu page is being turned, My Library is drawn underneath and shows through
          <View style={peek ? [StyleSheet.absoluteFill, { zIndex: 10 }] : { flex: 1 }}>
            <Start u={u} go={(t, rect) => { if (t === 'library' && rect) {
              // the flying notebook is drawn over the start page's one first; only once it's surely on screen
              // does the start page go, so there's never a frame without a notebook
              libFade.setValue(0); flyP.setValue(0); setFlyer({ from: rect });
              setTimeout(() => go(t), 90);
              return;
            }
            go(t); }} openMenu={coverOpen ? openMenu : () => toast(t('Start by opening your notebook.'))} closed={!coverOpen} onOpened={() => setCoverOpen(true)} onClosed={() => setCoverOpen(false)} onPeek={(t) => setPeek(t || 'library')} />
          </View>
        )}
        {flyer && screen === 'library' ? (
          // while the notebook lands: the felt, and the black bar already in My Library's place, so it doesn't blink away
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <DeskFelt spot="app1" />
            {!sideways ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: barH, backgroundColor: colors.bar }}><Felt /></View> : null}
          </View>
        ) : null}
        {(screen === 'library' || (screen === 'start' && peek === 'library')) && (
          <Animated.View style={{ flex: 1, opacity: screen === 'library' ? libFade : 1 }}>
          <Library u={u} stories={shelf} openStory={openStory} openMenu={openMenu}
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
            notebookHidden={!!flyer && !flyer.landed} onNotebookRect={(r) => setFlyer((f) => (f && !f.to && !f.hold && r ? { ...f, to: r } : f))}
            onCreate={() => openPublisher(null)} onEdit={openPublisher} onPlaylists={() => go('playlists')}
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
        {screen === 'notebook' && <Notebook u={u} from={nbFrom} openMenu={openMenu} toast={toast} onDone={() => go('library')} />}
        {screen === 'publisher' && draft && (
          <Publisher key={draft.id} u={u} storeAdmin={storeAdmin} initial={draft} fontKey={prefs.font} openMenu={openMenu} toast={toast} onChange={setUserStories} onDone={(list) => { setUserStories(list); go('library'); }} onIdeas={() => go('ideas')} />
        )}
        {(screen === 'store' || (screen === 'start' && peek === 'store')) && <Store u={u} openStory={openStory} openMenu={openMenu} toast={toast} />}
        {screen === 'music' && <MusicSounds u={u} openMenu={openMenu} />}
        {screen === 'profiles' && <Profiles u={u} openMenu={openMenu} setControls={setControls} />}
        {screen === 'playlists' && <Playlists u={u} openMenu={openMenu} shelf={childShelf} onPlay={playPlaylist} />}
        {screen === 'settings' && <Settings u={u} openMenu={openMenu} lang={lang} setLang={setLang} bookLang={bookLang} setBookLang={setBookLang}
          controls={controls} setControls={setControls} mode={prefs.mode} onDone={() => go('library')} onJoin={() => setMemberOpen(true)} />}
        {screen === 'help' && <Help u={u} openMenu={openMenu} onAbout={() => go('about')} onIdeas={() => go('ideas')} />}
        {screen === 'ideas' && <IdeaRoom u={u} openMenu={openMenu} onMake={() => openPublisher(null)} onHelp={() => go('help')} />}
        {screen === 'covertest' && <CoverTest u={u} openMenu={openMenu} />}
        {screen === 'about' && <About u={u} openMenu={openMenu} onSecret={() => {
          // the store owner: straight to the Store Manager when signed in, otherwise to the sign-in first
          if (storeAdmin) go('storeManager');
          else { go('profile'); toast('Sign in as the store owner to open the Store Manager.'); }
        }} />}
        {screen === 'storeManager' && <StoreManager u={u} openMenu={openMenu} toast={toast} demo={storeDemo} />}
        {screen === 'profile' && <Profile u={u} openMenu={openMenu} toast={toast} />}
        {screen === 'reader' && story && (
          <Reader key={queue ? `${queue.key}:${queue.i}` : 'one'} u={u} story={story} setToastSpot={setToastSpot} prefs={queue ? { ...prefs, mode: queue.listen ? 'listen' : 'auto' } : controls.playMode ? { ...prefs, mode: controls.playMode } : prefs}
            autoStart={!!queue} onFinished={onBookFinished} onSettings={() => setSettingsGate(true)} setPrefs={setPrefs} openMenu={openMenu} goLibrary={() => { playSound('coverClose'); go('library'); }} toast={toast} menuRequest={playMenu} landscape={landscape} />
        )}
        {opening ? (
          <BookOpen u={u} story={opening.story} cover={opening.cover} rect={opening.rect} textScale={prefs.textScale || 1} fontKey={prefs.font || 'serif'}
            onDone={() => { setStory(opening.story); go('reader'); setTimeout(() => setOpening(null), 60); }} />
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
          const shadowOn = screen === 'library' && !flyer.landed;
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
        <ParentGate visible={profileGate} reason={t('Your profile is for grown-ups.')} onPass={() => { setProfileGate(false); go('profile'); }} onCancel={() => setProfileGate(false)} />
        <Toast message={message} center={!!toastSpot && screen === 'reader'} area={toastSpot && screen === 'reader' ? { left: toastSpot.x, top: toastSpot.y, right: width - toastSpot.x - toastSpot.w, bottom: height - toastSpot.y - toastSpot.h } : toastArea} onDismiss={() => { clearTimeout(toastTimer.current); setMessage(''); }} />
        {/* the Audio Player for music and nature sounds: in the middle of the screen over a dark layer until it's closed */}
        <TapePlayer onMenu={() => { setAmbientPlayer(false); go('music'); }} />
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 175 }]}>
          <PlaybackPanel open={playOpen && screen !== 'reader'} onClose={() => setPlayOpen(false)} prefs={prefs} setPrefs={setPrefs} toast={toast} bottom={drawerBottom} inset={drawerRight} />
        </View>
        {/* the main menu always slides in over everything else on screen (pop-ups, pages boxes, speech bubbles) */}
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 180 }]}>
          <Panel open={drawer} title={t('Menu')} bottom={drawerBottom} inset={drawerRight} onClose={() => setDrawer(false)}>
            <Option glyph={<LibraryIcon size={MENU_ICON} />} title={t('My Library')} sub={t('View purchased stories')} onPress={() => go('library')} />
            {controls.store ? <Option glyph={<StoreIcon />} title={t('Book Store')} sub={t('Discover and buy new books')} onPress={() => go('store')} /> : null}
            {controls.playback && !controls.playMode ? <Option glyph={<PlayGlyph />} title={t('Playback Settings')} sub={t('Reader controls')} onPress={() => {
              setDrawer(false);
              // in a book: the reader's own panel; anywhere else: the same choices in their own panel
              if (screen === 'reader') setTimeout(() => setPlayMenu((x) => x + 1), 300); /* the menu goes back into the bar first */ else setTimeout(() => setPlayOpen(true), 300);
            }} /> : null}
            <Option glyph={<MusicIcon size={24} weight={3.4} /* the same shape as the reading bar's note */ />} title={t('Music and Sounds')} sub={t('Relaxing sounds and gentle music')} onPress={() => go('music')} />
            {controls.create ? <Option glyph={<PlusIcon />} title={t('Create a Story')} sub={t('Make your own book')} onPress={() => openPublisher(null)} /> : null}
            {/* Help takes Profile's place (Profile is suspended for families; the store owner signs in from About: hold Skippy) */}
            {controls.help ? <Option glyph={<CircleIcon />} title={t('Ideas and Support')} sub={t('How everything works')} onPress={() => go('help')} /> : null}
            {/* Settings: always last, always behind the grown-up question */}
            <Option glyph={<GearIcon size={MENU_ICON} />} title={t('Settings')} sub={t('Language and parental controls')} onPress={() => { setDrawer(false); setSettingsGate(true); }} />
            {/* (About is reached from Help) */}
            <View style={{ height: 14 }} />
          </Panel>
        </View>
        <View pointerEvents="none" style={sideways
          ? { position: 'absolute', left: 0, top: 0, bottom: 0, width: camBar, backgroundColor: colors.bar, zIndex: 200 }
          : { position: 'absolute', left: 0, right: 0, top: 0, height: camBar, backgroundColor: colors.bar, zIndex: 200 }}><Felt /></View>
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
  require('./assets/tile-library.png'), require('./assets/tile-store.png'), require('./assets/logo-felt.png')];
// Phones and tablets both turn: sideways, the book goes side by side with the menu bar on the right.
if (Platform.OS !== 'web') ScreenOrientation.unlockAsync().catch(() => {});

export default function App() {
  const [loaded] = useFonts({ EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_500Medium, EBGaramond_700Bold, SpecialElite_400Regular, DancingScript_700Bold });
  const [pictureReady, setPictureReady] = useState(false);
  // the child whose things the app shows (Profiles): read before anything else; switching children starts
  // the app afresh with their notebook, badges, playlists and settings
  const [who, setWho] = useState(null);
  useEffect(() => {
    loadProfiles().then((s) => setWho(s.active), () => setWho('main'));
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
    Asset.loadAsync([HOME_PICTURE, ...WARM, ...(DESK_FELT ? [DESK_FELT] : [])]).then(() => { assetsIn.current = true; check(); }, finish);
    const t = setTimeout(finish, 1800); // never wait longer than this
    return () => clearTimeout(t);
  }, []);
  if (!loaded || !pictureReady || !who) return (
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
