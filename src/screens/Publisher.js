// "Create a story": add a picture and words page by page (Jörg's Publisher design).
// Everything saves automatically. "Pages" opens a list to reorder or delete pages,
// or to delete the whole story.
import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { bookFont, colors, fonts } from '../theme';
import { Bar, Burger, DogEar, Panel } from '../components/Chrome';
import { deleteUserStory, dropPicture, keepPicture, newPageId, saveUserStory } from '../userStories';
import StoryGuide from '../components/StoryGuide';
import ParentGate from '../components/ParentGate';
import { printStory, shareStoryPdf } from '../pdf';
import { loadJSON, saveJSON } from '../storage';

const blank = () => ({ pid: newPageId(), text: '', uri: null, w: 1, h: 1 });

export function draftFrom(story) {
  if (!story) return { id: `s${Date.now()}`, title: 'My New Story', pages: [blank()] };
  return {
    id: story.id,
    title: story.title,
    pages: story.pages.map((p) => ({ pid: p.pid, text: p.text, uri: p.image ? p.image.uri : null, w: p.w, h: p.h })),
  };
}

export default function Publisher({ u, initial, fontKey, openMenu, toast, onChange, onDone }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);
  const [i, setI] = useState(0);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pdfChoice, setPdfChoice] = useState(null); // 'share' | 'print' | null: choosing a layout
  const [gateFor, setGateFor] = useState(null); // {mode, layout} waiting for the grown-up check
  const [making, setMaking] = useState(false);

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
      toast(e && e.message ? e.message : mode === 'print' ? 'Couldn’t print. Try again.' : 'Couldn’t make the PDF. Try again.');
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

  const pickImage = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9, allowsEditing: true, aspect: [1, 1] });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      const uri = await keepPicture(draft.id, a.uri);
      if (page.uri) dropPicture(page.uri);
      update({ uri, w: a.width || 1, h: a.height || 1 });
    } catch (e) {
      toast('Couldn’t open your photos. Check that oomlaut Reader is allowed to use Photos in Settings.');
    }
  };

  const removeImage = () => {
    if (page.uri) dropPicture(page.uri);
    update({ uri: null, w: 1, h: 1 });
  };

  const next = () => {
    if (i === draft.pages.length - 1) {
      if (!page.text.trim() && !page.uri) return toast('Add a picture or some words before the next page.');
      setDraft((d) => ({ ...d, pages: [...d.pages, blank()] }));
    }
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
    toast(`“${draft.title}” deleted.`);
    onDone(list);
  };

  const barH = u * 17 + insets.bottom;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.page}>
        <Pressable onPress={pickImage} style={styles.art} accessibilityRole="button" accessibilityLabel={page.uri ? 'Change image' : 'Add image'}>
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
        </Pressable>
        <View style={[styles.textBox, { paddingHorizontal: u * 9, paddingTop: u * 6 }]}>
          <Text style={styles.addText}>Add Text</Text>
          <TextInput
            value={page.text}
            onChangeText={(text) => update({ text })}
            placeholder="Type the words for this page. Two or three sentences reads best."
            placeholderTextColor="#666"
            multiline
            style={[styles.input, { fontFamily: bookFont(fontKey).family }]}
            accessibilityLabel={`Words for page ${i + 1}`}
          />
        </View>
        <DogEar u={u} onPress={next} label="Next page" />
        <Pressable onPress={() => setGuide(true)} style={[styles.help, { top: insets.top + 10 }]} hitSlop={8} accessibilityLabel="How to make a story">
          <Text style={styles.helpText}>?</Text>
        </Pressable>
      </View>
      <Bar u={u}>
        <Burger u={u} onPress={openMenu} />
        <View style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
          <TextInput value={draft.title} onChangeText={(title) => setDraft((d) => ({ ...d, title }))} style={styles.title} accessibilityLabel="Story title" selectTextOnFocus />
          <Text style={styles.sub}>Page {i + 1} of {draft.pages.length} · {saved ? 'Saved' : 'Saving…'}</Text>
        </View>
        <Pressable onPress={() => setI(Math.max(0, i - 1))} disabled={i === 0} hitSlop={8} style={{ opacity: i === 0 ? 0.35 : 1 }} accessibilityLabel="Previous page">
          <Text style={[styles.btn, { fontSize: 22 }]}>‹</Text>
        </Pressable>
        <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice(null); setPagesOpen(true); }} hitSlop={8}><Text style={styles.btn}>Pages</Text></Pressable>
        <Pressable onPress={finish} hitSlop={8}><Text style={[styles.btn, { color: colors.highlight }]}>Done</Text></Pressable>
      </Bar>

      <Panel open={pagesOpen} side="right" title="Pages" bottom={barH} onClose={() => setPagesOpen(false)}>
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }}>
          {draft.pages.map((p, k) => (
            <View key={p.pid} style={[styles.prow, k === i && { borderColor: colors.highlight }]}>
              <Pressable onPress={() => { setI(k); setPagesOpen(false); }} style={styles.thumb} accessibilityLabel={`Go to page ${k + 1}`}>
                {p.uri ? <Image source={{ uri: p.uri }} style={styles.fill} resizeMode="cover" /> : <Text style={styles.thumbNum}>{k + 1}</Text>}
              </Pressable>
              <Pressable onPress={() => { setI(k); setPagesOpen(false); }} style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.prowTitle}>Page {k + 1}</Text>
                <Text numberOfLines={1} style={styles.prowSub}>{p.text.trim() || (p.uri ? 'Picture only' : 'Empty')}</Text>
              </Pressable>
              <Pressable onPress={() => move(k, -1)} disabled={k === 0} hitSlop={6} style={[styles.pbtn, k === 0 && { opacity: 0.3 }]} accessibilityLabel={`Move page ${k + 1} up`}><Text style={styles.pbtnText}>↑</Text></Pressable>
              <Pressable onPress={() => move(k, 1)} disabled={k === draft.pages.length - 1} hitSlop={6} style={[styles.pbtn, k === draft.pages.length - 1 && { opacity: 0.3 }]} accessibilityLabel={`Move page ${k + 1} down`}><Text style={styles.pbtnText}>↓</Text></Pressable>
              <Pressable onPress={() => removePage(k)} hitSlop={6} style={styles.pbtn} accessibilityLabel={`Delete page ${k + 1}`}><Text style={styles.pbtnText}>✕</Text></Pressable>
            </View>
          ))}
        </ScrollView>
        {pdfChoice ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.warn}>{pdfChoice === 'print' ? 'Choose a layout to print:' : 'Choose a layout for your PDF:'}</Text>
            <Pressable onPress={() => { setGateFor({ mode: pdfChoice, layout: 'stacked' }); setPdfChoice(null); setPagesOpen(false); }} style={styles.wide}>
              <Text style={styles.wideText}>Picture above the words</Text>
            </Pressable>
            <Pressable onPress={() => { setGateFor({ mode: pdfChoice, layout: 'spreads' }); setPdfChoice(null); setPagesOpen(false); }} style={styles.wide}>
              <Text style={styles.wideText}>Book spreads (picture, then words)</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice('share'); }} disabled={making} style={[styles.wide, { flex: 1, backgroundColor: colors.bar }]}>
              <Text style={styles.wideText}>{making ? 'Working…' : 'Share as PDF…'}</Text>
            </Pressable>
            <Pressable onPress={() => { setConfirmDelete(false); setPdfChoice('print'); }} disabled={making} style={[styles.wide, { flex: 1, backgroundColor: colors.bar }]}>
              <Text style={styles.wideText}>Print…</Text>
            </Pressable>
          </View>
        )}
        {confirmDelete ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.warn}>Delete “{draft.title}”, its pictures and any voice recordings? This can’t be undone.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={deleteStory} style={[styles.wide, { backgroundColor: colors.highlight }]}><Text style={styles.wideText}>Delete story</Text></Pressable>
              <Pressable onPress={() => setConfirmDelete(false)} style={styles.wide}><Text style={styles.wideText}>Keep it</Text></Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => { setPdfChoice(null); setConfirmDelete(true); }} hitSlop={6}><Text style={styles.deleteLink}>Delete this story…</Text></Pressable>
        )}
      </Panel>
      <StoryGuide visible={guide} onClose={closeGuide} />
      <ParentGate visible={!!gateFor} reason={gateFor?.mode === 'print' ? 'Printing opens your phone’s print options.' : 'Sharing sends this story outside the app.'} onPass={() => makePdf(gateFor)} onCancel={() => setGateFor(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  help: { position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  helpText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 18 },
  page: { flex: 1, backgroundColor: colors.paper },
  art: { width: '100%', aspectRatio: 1, maxHeight: '68%', backgroundColor: '#808080', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  plus: { color: colors.white, fontWeight: '200', fontFamily: fonts.ui },
  addImage: { color: colors.white, fontWeight: '700', fontSize: 22, fontFamily: fonts.ui, marginTop: 4 },
  artBtns: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: 'rgba(0,0,0,0.6)', color: colors.white, fontWeight: '700', fontSize: 15, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden', fontFamily: fonts.ui },
  textBox: { flex: 1, paddingBottom: 24 },
  addText: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 22, color: colors.ink, marginBottom: 6, textAlign: 'center' },
  input: { flex: 1, fontFamily: fonts.story, fontSize: 21, lineHeight: 34, color: colors.ink, textAlign: 'center', textAlignVertical: 'top', padding: 0 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16, padding: 0 },
  sub: { color: colors.muted, fontFamily: fonts.ui, fontSize: 12, marginTop: 2 },
  btn: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15, paddingHorizontal: 3 },
  prow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2a2a2a', padding: 8, borderWidth: 2, borderColor: 'transparent' },
  thumb: { width: 44, height: 44, backgroundColor: '#666', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbNum: { color: colors.white, fontWeight: '700', fontFamily: fonts.ui },
  prowTitle: { color: colors.white, fontWeight: '700', fontSize: 15, fontFamily: fonts.ui },
  prowSub: { color: '#bbb', fontSize: 13, fontFamily: fonts.ui },
  pbtn: { width: 32, height: 32, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center' },
  pbtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  deleteLink: { color: '#ff6b6b', fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
  warn: { color: '#e6e6e6', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  wide: { flex: 1, backgroundColor: colors.tile, paddingVertical: 12, alignItems: 'center' },
  wideText: { color: colors.white, fontWeight: '700', fontSize: 15, fontFamily: fonts.ui },
});
