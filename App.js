import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, EBGaramond_400Regular, EBGaramond_500Medium, EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond';
import { colors, fonts, MAX_WIDTH } from './src/theme';
import Start from './src/screens/Start';
import { bookLayout } from './src/components/BookFrame';
import BookOpen from './src/components/BookOpen';
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
import { GearIcon, LibraryIcon, Option, Panel, Toast } from './src/components/Chrome';
import { Felt, LOOKS, LookContext, Stitch } from './src/look';
import { playSound, setEffects } from './src/sound';
import { stopSpeech } from './src/speech';
import { stopVoice } from './src/voice';

function Root() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState('start');
  const [coverOpen, setCoverOpen] = useState(false); // the book's cover is shut each time the app opens
  const [peek, setPeek] = useState(null); // 'library' | 'store': drawn under the start screen as its book slides away
  // Phones and iPads can turn: the book goes side by side when sideways.
  const landscape = false; // (the old sideways layout with the bar down the side stays off)
  // The app fills the screen; controls are sized from a phone-sized width so they don't balloon on an iPad.
  const W = width;
  const u = Math.min(width, MAX_WIDTH) / 100;
  const [story, setStory] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [settings, setSettings] = useState(false); // the Settings panel (Looks, About)
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

  const go = (s) => { stopSpeech(); stopVoice(); setDrawer(false); setSettings(false); setPeek(null); setScreen(s); };
  // A book with a title page opens onto its title page with a blank white page above it (the
  // inside of the cover); its cover picture is the cover. From My Library, the cover animates open.
  const prepared = (s) => (s.pages[0] && s.pages[0].titlePage ? { ...s, pages: [{ ...s.pages[0], image: null, whiteArt: true }, ...s.pages.slice(1)] } : s);
  const [opening, setOpening] = useState(null); // { story, cover, rect } while a book opens from the library
  const openStory = (s, rect) => {
    const ready = prepared(s);
    if (rect && screen === 'library') { setOpening({ story: ready, cover: s.pages[0] && s.pages[0].image, rect }); return; }
    setStory(ready); go('reader');
  };
  const openMenu = () => { setSettings(false); setDrawer((d) => !d); };
  const look = 'classic'; // the Felt look is switched off for now (it shows a message instead)
  const openPublisher = (story) => { setDraft(draftFrom(story)); go('publisher'); };

  const barH = u * 17 + insets.bottom;
  // The permanent black bar over the front camera: across the top when upright, down the left
  // side when sideways. The screens are told the bar is part of the safe area, so they keep clear of it.
  useEffect(() => setEffects(prefs.sound === true), [prefs.sound]); // sound effects: Playback menu, off by default
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
    : screen === 'start' ? bookLayout(width, height, { ...insets, top: camBar }, u * 17).barH : barH;
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
            <Start u={u} go={go} openMenu={openMenu} closed={!coverOpen} onOpened={() => setCoverOpen(true)} onPeek={(t) => setPeek(t || 'library')} />
          </View>
        )}
        {(screen === 'library' || (screen === 'start' && peek === 'library')) && (
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
        {(screen === 'store' || (screen === 'start' && peek === 'store')) && <Store u={u} openStory={openStory} openMenu={openMenu} />}
        {screen === 'about' && <About u={u} openMenu={openMenu} />}
        {screen === 'profile' && <Profile u={u} openMenu={openMenu} toast={toast} />}
        {screen === 'reader' && story && (
          <Reader u={u} story={story} prefs={prefs} setPrefs={setPrefs} openMenu={openMenu} goLibrary={() => { playSound('coverClose'); go('library'); }} toast={toast} menuRequest={playMenu} landscape={landscape} />
        )}
        <Panel open={drawer} title="Menu" bottom={drawerBottom} inset={drawerRight} onClose={() => setDrawer(false)}>
          <Option glyph={<LibraryIcon size={18} />} title="My Library" sub="View purchased stories" onPress={() => go('library')} />
          <Option glyph="◫" title="Book Store" sub="Buy more stories" onPress={() => go('store')} />
          <Option glyph="▸" title="Playback Settings" sub="Reader controls" onPress={() => {
            setDrawer(false);
            if (screen === 'reader') setTimeout(() => setPlayMenu((x) => x + 1), 300); /* the menu goes back into the bar first */ else toast('Open a story first, then choose how it plays.');
          }} />
          <Option glyph="+" title="Create a Story" sub="Add your own pictures and words" onPress={() => openPublisher(null)} />
          <Option glyph="○" title="Profile" sub="Manage your oomlaut account" onPress={() => { setDrawer(false); setProfileGate(true); }} />
          <Option glyph={<GearIcon size={20} />} title="Settings" sub="Looks, and about the app" onPress={() => {
            setDrawer(false);
            setTimeout(() => setSettings(true), 300); // the menu goes back into the bar first
          }} />
        </Panel>
        {/* Settings: comes out in the same spot as the menu, like Playback Options */}
        <Panel open={settings} title="Settings" bottom={drawerBottom} inset={drawerRight} onClose={() => setSettings(false)}>
          <View style={styles.setting}>
            <Text style={styles.help}>Looks</Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {LOOKS.map(([k, label]) => (
                <Pressable key={k} onPress={() => (k === 'felt' ? toast('The Felt look is coming soon. For now, oomlaut uses the Classic look.') : setPrefs((p) => ({ ...p, look: k })))} accessibilityRole="button" accessibilityState={{ selected: look === k }} accessibilityLabel={`${label} look`} style={{ alignItems: 'center', gap: 6 }}>
                  <LookContext.Provider value={k}>
                    <View style={[styles.lookTile, look === k && styles.lookOn, k === 'felt' && { borderRadius: 12 }]}>
                      <Felt />
                      <View style={[styles.lookPage, k === 'felt' && { borderRadius: 3 }]}><Felt opacity={0.7} /></View>
                      <Stitch inset={4} radius={12} />
                    </View>
                  </LookContext.Provider>
                  <Text style={styles.lookLabel}>{label}{k === 'felt' ? ' (soon)' : ''}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Option glyph="i" title="About" sub="Learn more about the app" onPress={() => { setSettings(false); go('about'); }} />
        </Panel>
        {opening ? (
          <BookOpen u={u} story={opening.story} cover={opening.cover} rect={opening.rect} textScale={prefs.textScale || 1} fontKey={prefs.font || 'serif'}
            onDone={() => { setStory(opening.story); go('reader'); setTimeout(() => setOpening(null), 60); }} />
        ) : null}
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
  const [loaded] = useFonts({ EBGaramond_400Regular, EBGaramond_500Medium, EBGaramond_700Bold });
  const [pictureReady, setPictureReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setPictureReady(true); } };
    Asset.loadAsync(HOME_PICTURE).then(finish, finish);
    const t = setTimeout(finish, 1500); // never wait longer than this
    return () => clearTimeout(t);
  }, []);
  if (!loaded || !pictureReady) return <View style={{ flex: 1, backgroundColor: colors.desk }} />;
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  setting: { gap: 10, paddingTop: 4, paddingBottom: 8 },
  help: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  lookTile: { width: 64, height: 64, backgroundColor: colors.desk, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  lookOn: { borderColor: colors.highlight },
  lookPage: { width: 26, height: 34, backgroundColor: colors.paper, overflow: 'hidden' },
  lookLabel: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 14 },
  outer: { flex: 1, backgroundColor: colors.desk, alignItems: 'center' },
  app: { flex: 1, backgroundColor: colors.desk, overflow: 'hidden' }, // dark grey underneath everything: no light flash
});
