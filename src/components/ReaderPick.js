// Before recording: who's reading? Up to three people can record a book in their own voice (Mom, Grandpa,
// a child…). Pick who's reading now, or add a new reader; then Start recording.
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import * as ImagePicker from 'expo-image-picker';
import { MAX_READERS, addReader, getReaders, setReaderPhoto } from '../recordings';
import { VoiceFace } from './VoicePick';

export default function ReaderPick({ initial, onCancel, onStart }) {
  const tr = useT();
  const [list, setList] = useState(null);
  const [pick, setPick] = useState(initial || null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null); // the new reader's photo (so a child can tell who's who)
  const [photoErr, setPhotoErr] = useState(null);
  // a photo from the phone's photos or the camera: for the new reader, or for the reader picked
  const getPhoto = async (source) => {
    setPhotoErr(null);
    try {
      const opts = { mediaTypes: 'images', quality: 0.85, allowsEditing: true, aspect: [1, 1] };
      let r;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { setPhotoErr(tr('Oomlaut Reader isn’t allowed to use the camera. You can turn it on in Settings.')); return; }
        r = await ImagePicker.launchCameraAsync(opts);
      } else r = await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const uri = r.assets[0].uri;
      if (adding) setPhoto(uri);
      else if (pick) { await setReaderPhoto(pick, uri); setList(await getReaders()); }
    } catch (e) {
      setPhotoErr(source === 'camera' ? tr('Couldn’t open the camera.') : tr('Couldn’t open your photos. Check that Oomlaut Reader is allowed to use Photos in Settings.'));
    }
  };
  useEffect(() => {
    getReaders().then((l) => {
      setList(l);
      if (!l.length) setAdding(true); // nobody yet: straight to the name
      else if (!l.some((x) => x.id === pick)) setPick(l[0].id);
    });
  }, []);
  const start = async () => {
    if (adding) {
      if (!name.trim()) return;
      const id = await addReader(name, photo);
      if (id) onStart(id);
      return;
    }
    if (pick) onStart(pick);
  };
  if (!list) return null;
  const canAdd = list.length < MAX_READERS;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.back}>
        <View style={styles.box}>
          <Text style={styles.title}>{tr('Who’s reading?')}</Text>
          <Text style={styles.text}>{tr('Up to three people can record this book in their own voice. Pick who’s reading now, or add a new reader.')}</Text>
          <View style={styles.row}>
            {list.map((r) => (
              <Pressable key={r.id} onPress={withTap(() => { setAdding(false); setPick(r.id); })} accessibilityRole="radio" accessibilityState={{ selected: !adding && pick === r.id }}
                style={[styles.chip, !adding && pick === r.id && styles.chipOn]}>
                <Text style={styles.chipText}>{r.id === 'me' && r.name === 'Me' ? tr('Me') : r.name}</Text>
              </Pressable>
            ))}
            {canAdd ? (
              <Pressable onPress={withTap(() => setAdding(true))} accessibilityRole="button" style={[styles.chip, adding && styles.chipOn]}>
                <Text style={styles.chipText}>+ {tr('Add a reader')}</Text>
              </Pressable>
            ) : null}
          </View>
          {adding ? (
            <View style={styles.field}>
              <TextInput value={name} onChangeText={setName} placeholder={tr('Name, e.g. Grandpa')} placeholderTextColor="#7a7a7a" autoFocus maxLength={16}
                returnKeyType="done" onSubmitEditing={start} style={styles.input} accessibilityLabel={tr('Reader’s name')} />
            </View>
          ) : null}
          {/* the reader's photo: what a child sees on the bar when this voice reads */}
          {adding || pick ? (() => {
            const cur = adding ? { photo, name: name || '?' } : (list.find((x) => x.id === pick) || {});
            return (
              <View style={styles.photoRow}>
                <VoiceFace photo={cur.photo} name={cur.name} size={64} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Pressable onPress={withTap(() => getPhoto('library'))} style={styles.photoBtn} accessibilityRole="button"><Text numberOfLines={1} style={styles.photoText}>{tr('Choose a photo')}</Text></Pressable>
                  <Pressable onPress={withTap(() => getPhoto('camera'))} style={styles.photoBtn} accessibilityRole="button"><Text numberOfLines={1} style={styles.photoText}>{tr('Take a photo')}</Text></Pressable>
                </View>
              </View>
            );
          })() : null}
          {photoErr ? <Text style={[styles.text, { color: '#ff9b9b', marginTop: 10 }]}>{photoErr}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 36 }}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={withTap(onCancel)} style={[styles.pill, { backgroundColor: '#4a4a4a' }]} accessibilityRole="button"><Text style={styles.pillText}>{tr('Cancel')}</Text></Pressable>
            <Pressable onPress={withTap(start)} disabled={adding && !name.trim()} style={[styles.pill, { backgroundColor: colors.highlight, marginLeft: 10 }, adding && !name.trim() && { opacity: 0.45 }]} accessibilityRole="button">
              <Text style={styles.pillText}>{tr('Start recording')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  box: { width: '100%', maxWidth: 460, backgroundColor: '#2b2b2d', borderRadius: 28, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 22 },
  text: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, marginTop: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 },
  chip: { height: 42, borderRadius: 21, paddingHorizontal: 18, backgroundColor: '#3d3d40', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.green },
  chipText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '600', fontSize: 15 },
  field: { backgroundColor: '#161616', height: 52, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', marginTop: 20 },
  input: { color: colors.white, fontFamily: fonts.ui, fontSize: 17, paddingVertical: 0, paddingHorizontal: 0, includeFontPadding: false, outlineWidth: 0 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 },
  photoBtn: { height: 36, borderRadius: 18, paddingHorizontal: 14, backgroundColor: '#3d3d40', alignItems: 'center', justifyContent: 'center' },
  photoText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '600', fontSize: 14 },
  pill: { height: 46, borderRadius: 23, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
});
