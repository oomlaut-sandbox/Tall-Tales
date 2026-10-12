// "Create a story": add a picture and words page by page (Jörg's Publisher design).
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts } from '../theme';
import { Bar, Burger, DogEar } from '../components/Chrome';
import { saveUserStory } from '../userStories';

const blank = () => ({ text: '', uri: null, w: 1, h: 1 });

export function draftFrom(story) {
  if (!story) return { id: `s${Date.now()}`, title: 'My New Story', pages: [blank()] };
  return {
    id: story.id,
    title: story.title,
    pages: story.pages.map((p) => ({ text: p.text, uri: p.image ? p.image.uri : null, w: p.w, h: p.h, kept: true })),
  };
}

export default function Publisher({ u, initial, openMenu, onSaved, toast }) {
  const [draft, setDraft] = useState(initial);
  const [i, setI] = useState(0);
  const [saving, setSaving] = useState(false);
  const page = draft.pages[i];

  const update = (patch) => setDraft((d) => ({ ...d, pages: d.pages.map((p, k) => (k === i ? { ...p, ...patch } : p)) }));

  const pickImage = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      update({ uri: a.uri, w: a.width || 1, h: a.height || 1, kept: false });
    } catch (e) {
      toast('Couldn’t open your photos. Check that oomlaut Reader is allowed to use Photos in Settings.');
    }
  };

  const next = () => {
    if (i === draft.pages.length - 1) {
      if (!page.text.trim() && !page.uri) return toast('Add a picture or some words before the next page.');
      setDraft((d) => ({ ...d, pages: [...d.pages, blank()] }));
    }
    setI(i + 1);
  };

  const save = async () => {
    if (!draft.pages.some((p) => p.text.trim() || p.uri)) return toast('Add at least one page with a picture or words.');
    setSaving(true);
    try {
      const list = await saveUserStory(draft);
      toast('Saved to My Library.');
      onSaved(list);
    } catch (e) {
      toast('Couldn’t save the story. Try again.');
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.page}>
        <Pressable onPress={pickImage} style={styles.art} accessibilityRole="button" accessibilityLabel={page.uri ? 'Change image' : 'Add image'}>
          {page.uri ? (
            <>
              <Image source={{ uri: page.uri }} style={styles.fill} resizeMode="cover" />
              <Text style={styles.change}>Change image</Text>
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
            style={styles.input}
            accessibilityLabel={`Words for page ${i + 1}`}
          />
        </View>
        <DogEar u={u} onPress={next} label="Next page" />
      </View>
      <Bar u={u}>
        <Burger u={u} onPress={openMenu} />
        <View style={{ flex: 1, minWidth: 0, paddingLeft: 18 }}>
          <TextInput
            value={draft.title}
            onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
            style={styles.title}
            accessibilityLabel="Story title"
            selectTextOnFocus
          />
          <Text style={styles.sub}>Page {i + 1} of {draft.pages.length}</Text>
        </View>
        <Pressable onPress={() => setI(Math.max(0, i - 1))} disabled={i === 0} hitSlop={8} style={{ opacity: i === 0 ? 0.35 : 1 }}>
          <Text style={styles.btn}>Back</Text>
        </Pressable>
        <Pressable onPress={save} disabled={saving} hitSlop={8}>
          <Text style={[styles.btn, { color: colors.highlight }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </Bar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { flex: 1, backgroundColor: colors.paper },
  art: { height: '50%', backgroundColor: '#808080', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  plus: { color: colors.white, fontWeight: '200', fontFamily: fonts.ui },
  addImage: { color: colors.white, fontWeight: '700', fontSize: 22, fontFamily: fonts.ui, marginTop: 4 },
  change: { position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.55)', color: colors.white, fontWeight: '700', fontSize: 15, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden' },
  textBox: { flex: 1, paddingBottom: 24 },
  addText: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 22, color: colors.ink, marginBottom: 6 },
  input: { flex: 1, fontFamily: fonts.story, fontSize: 21, lineHeight: 34, color: colors.ink, textAlignVertical: 'top', padding: 0 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16, padding: 0 },
  sub: { color: colors.muted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 },
  btn: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15, paddingHorizontal: 4 },
});
