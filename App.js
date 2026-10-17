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
import Notebook, { NOTEBOOK_COVER, R_EDGE, R_SPINE } from './src/screens/Notebook';
import { onNewBadge } from './src/badges';
import { SHOWN_BOOKS, STORIES } from './src/story';
import { shareInvite } from './src/invite';
import { deleteUserStory, loadUserStories } from './src/userStories';
import { shareStoryPdf } from './src/pdf';
import { loadJSON, saveJSON } from './src/storage';
import { CircleIcon, InfoIcon, LibraryIcon, MENU_ICON, Option, Panel, PlayGlyph, PlusIcon, StoreIcon, Toast } from './src/components/Chrome';
import { DESK_FELT, Felt, LookContext } from './src/look';
import { hideSplash } from './src/launch';
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
  const [playMenu, setPlayMenu] = useState(0);
  const toastTimer = useRef(null);

  const toast = useCallback((m) => {
    setMessage(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(''), 5500); // a little longer; tap the bubble to close it sooner
  }, []);
  // a new reading badge: a little speech bubble (the badges are on the first page of My Notebook)
  useEffect(() => onNewBadge((fresh) => {
    const b = fresh[0];
    const name = b.kind === 'book' ? `you finished “${b.title}”` : b.title;
    setTimeout(() => toast(fresh.length > 1 ? `New badges! ${b.kind === 'book' ? 'You finished a book' : b.title} and more. See them in My Notebook.` : `New badge: ${name}! See it in My Notebook.`), 900);
  }), [toast]);

  // From the start page to My Library: the closed notebook flies onto the shelf as the library fades in.
  const [flyer, setFlyer] = useState(null); // { from, to } screen rectangles
  const libFade = useRef(new Animated.Value(1)).current;
  const flyP = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flyer) return undefined;
    if (!flyer.to) { const t = setTimeout(() => { setFlyer(null); libFade.setValue(1); }, 1500); return () => clearTimeout(t); }
    flyP.setValue(0);
    Animated.parallel([
      Animated.timing(flyP, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(libFade, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]).start(() => setFlyer(null));
    return undefined;
  }, [flyer && flyer.to]);
  const [nbFrom, setNbFrom] = useState(null); // where the little notebook was on the shelf when it was opened
  const go = (s) => { stopSpeech(); stopVoice(); setDrawer(false); setPeek(null); setScreen(s); };
  // A book with a title page opens onto its title page with a blank white page above it (the
  // inside of the cover); its cover picture is the cover. From My Library, the cover animates open.
  const prepared = (s) => (s.pages[0] && s.pages[0].titlePage ? { ...s, pages: [{ ...s.pages[0], image: null, whiteArt: true }, ...s.pages.slice(1)] } : s);
  const [opening, setOpening] = useState(null); // { story, cover, rect } while a book opens from the library
  const openStory = (s, rect) => {
    const ready = prepared(s);
    if (rect && (screen === 'library' || screen === 'store')) { setOpening({ story: ready, cover: s.cover && s.cover.uri ? { uri: s.cover.uri } : s.pages[0] && s.pages[0].image, rect }); return; }
    setStory(ready); go('reader');
  };
  const openMenu = () => { setDrawer((d) => !d); };
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
      <View style={[styles.app, { width: W }]}>
        {screen === 'start' && (
          // while the menu page is being turned, My Library is drawn underneath and shows through
          <View style={peek ? [StyleSheet.absoluteFill, { zIndex: 10 }] : { flex: 1 }}>
            <Start u={u} go={(t, rect) => { if (t === 'library' && rect) { libFade.setValue(0); setFlyer({ from: rect }); } go(t); }} openMenu={coverOpen ? openMenu : () => toast('Start by opening your notebook.')} closed={!coverOpen} onOpened={() => setCoverOpen(true)} onClosed={() => setCoverOpen(false)} onPeek={(t) => setPeek(t || 'library')} />
          </View>
        )}
        {flyer && screen === 'library' && DESK_FELT ? <Image source={DESK_FELT} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} /> : null}
        {(screen === 'library' || (screen === 'start' && peek === 'library')) && (
          <Animated.View style={{ flex: 1, opacity: screen === 'library' ? libFade : 1 }}>
          <Library u={u} stories={[...STORIES.filter((s) => SHOWN_BOOKS.includes(s.id) && !removed.includes(s.id)), ...userStories]} openStory={openStory} openMenu={openMenu}
            onNotebook={(rect) => { setNbFrom(rect); go('notebook'); }}
            notebookHidden={!!flyer} onNotebookRect={(r) => setFlyer((f) => (f && !f.to && r ? { ...f, to: r } : f))}
            onCreate={() => openPublisher(null)} onEdit={openPublisher}
            removedCount={removed.length} onRestore={() => setRemovedSaved([])}
            onShare={(s) => shareInvite(s.title)} // an invitation to the app, not the book
            onDelete={async (list) => {
              const builtIn = list.filter((s) => !s.mine).map((s) => s.id);
              if (builtIn.length) setRemovedSaved([...new Set([...removed, ...builtIn])]);
              let mine = null;
              for (const s of list.filter((x) => x.mine)) mine = await deleteUserStory(s.id);
              if (mine) setUserStories(mine);
              toast(list.length === 1 ? 'Book deleted.' : `${list.length} books deleted.`);
            }} />
          </Animated.View>
        )}
        {screen === 'notebook' && <Notebook u={u} from={nbFrom} openMenu={openMenu} toast={toast} onDone={() => go('library')} />}
        {screen === 'publisher' && draft && (
          <Publisher key={draft.id} u={u} storeAdmin={storeAdmin} initial={draft} fontKey={prefs.font} openMenu={openMenu} toast={toast} onChange={setUserStories} onDone={(list) => { setUserStories(list); go('library'); }} />
        )}
        {(screen === 'store' || (screen === 'start' && peek === 'store')) && <Store u={u} openStory={openStory} openMenu={openMenu} toast={toast} />}
        {screen === 'about' && <About u={u} openMenu={openMenu} />}
        {screen === 'storeManager' && <StoreManager u={u} openMenu={openMenu} toast={toast} demo={storeDemo} />}
        {screen === 'profile' && <Profile u={u} openMenu={openMenu} toast={toast} />}
        {screen === 'reader' && story && (
          <Reader u={u} story={story} prefs={prefs} setPrefs={setPrefs} openMenu={openMenu} goLibrary={() => { playSound('coverClose'); go('library'); }} toast={toast} menuRequest={playMenu} landscape={landscape} />
        )}
        <Panel open={drawer} title="Menu" bottom={drawerBottom} inset={drawerRight} onClose={() => setDrawer(false)}>
          <Option glyph={<LibraryIcon size={MENU_ICON} />} title="My Library" sub="View purchased stories" onPress={() => go('library')} />
          <Option glyph={<StoreIcon />} title="Book Store" sub="Discover and buy new books" onPress={() => go('store')} />
          <Option glyph={<PlayGlyph />} title="Playback Settings" sub="Reader controls" onPress={() => {
            setDrawer(false);
            if (screen === 'reader') setTimeout(() => setPlayMenu((x) => x + 1), 300); /* the menu goes back into the bar first */ else toast('Open a story first, then choose how it plays.');
          }} />
          <Option glyph={<PlusIcon />} title="Create a Story" sub="Add your own pictures and words" onPress={() => openPublisher(null)} />
          <Option glyph={<CircleIcon />} title="Profile" sub="Manage your Oomlaut account" onPress={() => { setDrawer(false); setProfileGate(true); }} />
          <Option glyph={<InfoIcon />} title="About" sub="Learn more about the app" onPress={() => go('about')} />
          {storeAdmin ? <Option glyph={<StoreIcon />} title="Store Manager" sub="Your Book Store's books" onPress={() => go('storeManager')} /> : null}
          <View style={{ height: 14 }} />
        </Panel>
        {opening ? (
          <BookOpen u={u} story={opening.story} cover={opening.cover} rect={opening.rect} textScale={prefs.textScale || 1} fontKey={prefs.font || 'serif'}
            onDone={() => { setStory(opening.story); go('reader'); setTimeout(() => setOpening(null), 60); }} />
        ) : null}
        {flyer && flyer.to ? (() => {
          const lerp = (a, b) => flyP.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
          const size = lerp(flyer.from.w, flyer.to.w);
          const c = (f) => flyP.interpolate({ inputRange: [0, 1], outputRange: [flyer.from.w * f, flyer.to.w * f] });
          const round = { borderTopLeftRadius: c(R_SPINE), borderTopRightRadius: c(R_SPINE), borderBottomLeftRadius: c(R_EDGE), borderBottomRightRadius: c(R_EDGE) };
          return (
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', zIndex: 150, left: lerp(flyer.from.x, flyer.to.x), top: lerp(flyer.from.y, flyer.to.y), width: size, height: size,
              backgroundColor: '#7c5438', shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 9 }, round]}>
              <Animated.View style={[{ flex: 1, overflow: 'hidden' }, round]}><Image source={NOTEBOOK_COVER} resizeMode="cover" style={{ width: '100%', height: '100%' }} /></Animated.View>
            </Animated.View>
          );
        })() : null}
        <ParentGate visible={profileGate} reason="Your profile is for grown-ups." onPass={() => { setProfileGate(false); go('profile'); }} onCancel={() => setProfileGate(false)} />
        <Toast message={message} area={toastArea} onDismiss={() => { clearTimeout(toastTimer.current); setMessage(''); }} />
        <View pointerEvents="none" style={sideways
          ? { position: 'absolute', left: 0, top: 0, bottom: 0, width: camBar, backgroundColor: colors.bar, zIndex: 200 }
          : { position: 'absolute', left: 0, right: 0, top: 0, height: camBar, backgroundColor: colors.bar, zIndex: 200 }}><Felt /></View>
      </View>
      </LookContext.Provider>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

// While the app gets ready (fonts, and the home picture so it appears in one go), show plain dark grey
// to match the launch screen and the logo animation, instead of a flash of colour.
const HOME_PICTURE = require('./assets/leather.jpg');
// Phones and tablets both turn: sideways, the book goes side by side with the menu bar on the right.
if (Platform.OS !== 'web') ScreenOrientation.unlockAsync().catch(() => {});

export default function App() {
  const [loaded] = useFonts({ EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_500Medium, EBGaramond_700Bold, SpecialElite_400Regular, DancingScript_700Bold });
  const [pictureReady, setPictureReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setPictureReady(true); } };
    // the leather and the charcoal felt are ready before the first screen, so the book's slide-in isn't lost to a slow first frame
    Asset.loadAsync([HOME_PICTURE, ...(DESK_FELT ? [DESK_FELT] : [])]).then(finish, finish);
    const t = setTimeout(finish, 1500); // never wait longer than this
    return () => clearTimeout(t);
  }, []);
  if (!loaded || !pictureReady) return <View style={{ flex: 1, backgroundColor: colors.desk }} />;
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={hideSplash}>
      <Root />
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
