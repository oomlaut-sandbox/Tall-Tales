import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, EBGaramond_400Regular } from '@expo-google-fonts/eb-garamond';
import { colors, MAX_WIDTH } from './src/theme';
import Start from './src/screens/Start';
import { Library, Store } from './src/screens/Shelf';
import About from './src/screens/About';
import Profile from './src/screens/Profile';
import ParentGate from './src/components/ParentGate';
import Reader from './src/screens/Reader';
import Publisher, { draftFrom } from './src/screens/Publisher';
import { STORIES } from './src/story';
import { shareInvite } from './src/invite';
import { deleteUserStory, loadUserStories } from './src/userStories';
import { shareStoryPdf } from './src/pdf';
import { loadJSON, saveJSON } from './src/storage';
import { LibraryIcon, Option, Panel, Toast } from './src/components/Chrome';
import { stopSpeech } from './src/speech';
import { stopVoice } from './src/voice';

function Root() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState('start');
  const [coverOpen, setCoverOpen] = useState(false); // the book's cover is shut each time the app opens
  const [peek, setPeek] = useState(false); // start screen's page turning to reveal My Library
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
      // Page sound is now off by default: switch it off once for anyone who had the old default.
      if (p && !p.soundOffDefault) p = { ...p, sound: false, soundOffDefault: true };
      // Interactive mode was removed: anyone who had it gets Page by Page instead.
      if (p && p.mode === 'interactive') p = { ...p, mode: 'page' };
      // No playback option chosen yet: Page by Page narration.
      if (p && !p.mode) p = { ...p, mode: 'page' };
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
    toastTimer.current = setTimeout(() => setMessage(''), 3200);
  }, []);

  const go = (s) => { stopSpeech(); stopVoice(); setDrawer(false); setPeek(false); setScreen(s); };
  const openStory = (s) => { setStory(s); go('reader'); };
  const openMenu = () => setDrawer(true);
  const openPublisher = (story) => { setDraft(draftFrom(story)); go('publisher'); };

  const barH = u * 17 + insets.bottom;
  return (
    <View style={styles.outer}>
      <StatusBar style={screen === 'profile' ? 'dark' : 'light'} />
      <View style={[styles.app, { width: W }]}>
        {screen === 'start' && (
          // while the menu page is being turned, My Library is drawn underneath and shows through
          <View style={peek ? [StyleSheet.absoluteFill, { zIndex: 10 }] : { flex: 1 }}>
            <Start u={u} go={go} openMenu={openMenu} closed={!coverOpen} onOpened={() => setCoverOpen(true)} onPeek={() => setPeek(true)} />
          </View>
        )}
        {(screen === 'library' || (screen === 'start' && peek)) && (
          <Library u={u} stories={[...STORIES.filter((s) => !removed.includes(s.id)), ...userStories]} openStory={openStory} openMenu={openMenu}
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
        )}
        {screen === 'publisher' && draft && (
          <Publisher key={draft.id} u={u} initial={draft} fontKey={prefs.font} openMenu={openMenu} toast={toast} onChange={setUserStories} onDone={(list) => { setUserStories(list); go('library'); }} />
        )}
        {screen === 'store' && <Store u={u} openStory={openStory} openMenu={openMenu} />}
        {screen === 'about' && <About u={u} openMenu={openMenu} />}
        {screen === 'profile' && <Profile u={u} openMenu={openMenu} toast={toast} />}
        {screen === 'reader' && story && (
          <Reader u={u} story={story} prefs={prefs} setPrefs={setPrefs} openMenu={openMenu} goLibrary={() => go('library')} toast={toast} menuRequest={playMenu} landscape={landscape} />
        )}
        <Panel open={drawer} side="left" title="Settings" bottom={landscape || width > height * 1.1 ? 0 : barH} onClose={() => setDrawer(false)}>
          <Option glyph={<LibraryIcon size={20} />} title="My Library" sub="View purchased stories" onPress={() => go('library')} />
          <Option glyph="◫" title="Book Store" sub="Buy more stories" onPress={() => go('store')} />
          <Option glyph="▸" title="Playback Settings" sub="Reader controls" onPress={() => {
            setDrawer(false);
            if (screen === 'reader') setPlayMenu((x) => x + 1); else toast('Open a story first, then choose how it plays.');
          }} />
          <Option glyph="+" title="Create a Story" sub="Add your own pictures and words" onPress={() => openPublisher(null)} />
          <Option glyph="○" title="Profile" sub="Manage your oomlaut account" onPress={() => { setDrawer(false); setProfileGate(true); }} />
          <Option glyph="i" title="About" sub="Learn more about the app" onPress={() => go('about')} />
        </Panel>
        <ParentGate visible={profileGate} reason="Your profile is for grown-ups." onPass={() => { setProfileGate(false); go('profile'); }} onCancel={() => setProfileGate(false)} />
        <Toast message={message} />
      </View>
    </View>
  );
}

// While the app gets ready (fonts, and the home picture so it appears in one go), show plain dark grey
// to match the launch screen and the logo animation, instead of a flash of colour.
const HOME_PICTURE = require('./assets/home-pebbles.jpg');
// Phones and tablets both turn: sideways, the book goes side by side with the menu bar on the right.
if (Platform.OS !== 'web') ScreenOrientation.unlockAsync().catch(() => {});

export default function App() {
  const [loaded] = useFonts({ EBGaramond_400Regular });
  const [pictureReady, setPictureReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setPictureReady(true); } };
    Asset.loadAsync(HOME_PICTURE).then(finish, finish);
    const t = setTimeout(finish, 1500); // never wait longer than this
    return () => clearTimeout(t);
  }, []);
  if (!loaded || !pictureReady) return <View style={{ flex: 1, backgroundColor: '#3a3a3a' }} />;
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#2a2a2a', alignItems: 'center' },
  app: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
});
