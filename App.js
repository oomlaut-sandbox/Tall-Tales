import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, EBGaramond_400Regular } from '@expo-google-fonts/eb-garamond';
import { colors, MAX_WIDTH } from './src/theme';
import Home from './src/screens/Home';
import { Library, Store } from './src/screens/Shelf';
import Reader from './src/screens/Reader';
import Publisher, { draftFrom } from './src/screens/Publisher';
import { STORIES } from './src/story';
import { deleteUserStory, loadUserStories } from './src/userStories';
import { shareStoryPdf } from './src/pdf';
import { loadJSON, saveJSON } from './src/storage';
import { Option, Panel, Toast } from './src/components/Chrome';
import { stopSpeech } from './src/speech';
import { stopVoice } from './src/voice';

function Root() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState('home');
  // The app stays upright (sideways reading was tried and turned off; the layout code remains).
  const landscape = false;
  const W = Math.min(width, MAX_WIDTH);
  const u = W / 100;
  const [story, setStory] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [prefs, setPrefs] = useState({ mode: null, sound: false, speed: 'normal', voice: 'narrator' });
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

  const go = (s) => { stopSpeech(); stopVoice(); setDrawer(false); setScreen(s); };
  const openStory = (s) => { setStory(s); go('reader'); };
  const openMenu = () => setDrawer(true);
  const openPublisher = (story) => { setDraft(draftFrom(story)); go('publisher'); };

  const barH = u * 17 + insets.bottom;
  return (
    <View style={styles.outer}>
      <StatusBar style={screen === 'library' ? 'dark' : 'light'} />
      <View style={[styles.app, { width: W }]}>
        {screen === 'home' && <Home u={u} go={go} openMenu={openMenu} />}
        {screen === 'library' && (
          <Library u={u} stories={[...STORIES.filter((s) => !removed.includes(s.id)), ...userStories]} openStory={openStory} openMenu={openMenu}
            onCreate={() => openPublisher(null)} onEdit={openPublisher}
            removedCount={removed.length} onRestore={() => setRemovedSaved([])}
            onShare={async (s) => {
              toast('Making the PDF…');
              try { await shareStoryPdf(s, 'stacked', prefs.font); } catch (e) { toast(e && e.message ? e.message : 'Couldn’t make the PDF. Try again.'); }
            }}
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
        {screen === 'reader' && story && (
          <Reader u={u} story={story} prefs={prefs} setPrefs={setPrefs} openMenu={openMenu} goLibrary={() => go('library')} toast={toast} menuRequest={playMenu} landscape={landscape} />
        )}
        <Panel open={drawer} side="left" title="Settings" bottom={landscape ? 0 : barH} onClose={() => setDrawer(false)}>
          <Option glyph="▤" title="My Library" sub="View purchased stories" onPress={() => go('library')} />
          <Option glyph="◫" title="Book Store" sub="Buy more stories" onPress={() => go('store')} />
          <Option glyph="▸" title="Playback Settings" sub="Reader controls" onPress={() => {
            setDrawer(false);
            if (screen === 'reader') setPlayMenu((x) => x + 1); else toast('Open a story first, then choose how it plays.');
          }} />
          <Option glyph="+" title="Create a Story" sub="Add your own pictures and words" onPress={() => openPublisher(null)} />
          <Option glyph="○" title="Profile" sub="Manage your oomlaut account" onPress={() => toast('Accounts arrive in a later build.')} />
          <Option glyph="i" title="About" sub="Learn more about the app" onPress={() => toast('oomlaut Reader: illustrated stories that read aloud and help children learn to read.')} />
        </Panel>
        <Toast message={message} />
      </View>
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({ EBGaramond_400Regular });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.red }} />;
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
