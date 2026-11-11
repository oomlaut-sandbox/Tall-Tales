// Find the pairs: choosing the pictures to play with, and making your own sets (Jörg, 11 Nov 2026). A black glass
// box over the game: Coro's pictures first, then the family's own sets by name. A set is a name and fifteen square
// photos from the phone; it can be played once it has all fifteen.
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { liveUri } from '../storage';
import { ConfirmBox } from './Chrome';
import { SET_SIZE, dropPairPicture, keepPairPicture, newSetId } from '../pairSets';

const PENCIL = require('../../assets/heading-icons/making-books.png');

function Thumbs({ sources, size }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {sources.slice(0, 4).map((s, i) => <Image key={i} source={s} style={{ width: size, height: size, borderRadius: 3, backgroundColor: '#3a3a3a' }} resizeMode="cover" />)}
    </View>
  );
}

// data: { sets, chosen }; coroFaces: Coro's own pictures; onChange(data): save and play; toast: for trouble with Photos
export default function PairSets({ data, coroFaces, width, onChange, onClose, toast }) {
  const t = useT();
  const [edit, setEdit] = useState(null); // the set being made or changed: { id, name, pics, isNew }
  const [added, setAdded] = useState([]); // pictures kept during this edit (thrown away again on Cancel)
  const [removed, setRemoved] = useState([]); // pictures taken out during this edit (deleted on Save)
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxW = Math.min(width - 28, 460);
  const cell = Math.floor((boxW - 44 - 4 * 8) / 5);

  const start = (s) => { setAdded([]); setRemoved([]); setEdit(s ? { ...s, pics: s.pics.slice() } : { id: newSetId(), name: '', pics: [], isNew: true }); };
  const cancel = () => { added.forEach(dropPairPicture); setEdit(null); };
  const choose = async () => {
    const left = SET_SIZE - edit.pics.length;
    if (left <= 0 || busy) return;
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsMultipleSelection: true, selectionLimit: left, orderedSelection: true, quality: 1 });
      if (r.canceled || !r.assets || !r.assets.length) return;
      setBusy(true);
      const got = [];
      for (const a of r.assets.slice(0, left)) {
        try { // a small square from the middle
          const w = a.width || 0, h = a.height || 0, side = Math.min(w, h);
          const acts = side ? [{ crop: { originX: Math.round((w - side) / 2), originY: Math.round((h - side) / 2), width: side, height: side } }, { resize: { width: Math.min(500, side) } }] : [{ resize: { width: 500 } }];
          const out = await ImageManipulator.manipulateAsync(a.uri, acts, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
          got.push(await keepPairPicture(out.uri));
        } catch (e) {}
      }
      setAdded((x) => [...x, ...got]);
      setEdit((e) => (e ? { ...e, pics: [...e.pics, ...got].slice(0, SET_SIZE) } : e));
    } catch (e) {
      toast && toast(t('Couldn’t open your photos. Check that Coro is allowed to use Photos in Settings.'));
    } finally { setBusy(false); }
  };
  const takeOut = (uri) => {
    setEdit((e) => ({ ...e, pics: e.pics.filter((p) => p !== uri) }));
    if (added.includes(uri)) { dropPairPicture(uri); setAdded((x) => x.filter((p) => p !== uri)); } else setRemoved((x) => [...x, uri]);
  };
  const save = () => {
    const s = { id: edit.id, name: edit.name.trim(), pics: edit.pics };
    removed.forEach(dropPairPicture);
    const sets = edit.isNew ? [...data.sets, s] : data.sets.map((x) => (x.id === s.id ? s : x));
    const full = s.pics.length === SET_SIZE;
    // a finished set is played straight away; an unfinished one can't be the one in play
    onChange({ sets, chosen: full ? s.id : data.chosen === s.id ? null : data.chosen }, full);
    setEdit(null);
  };
  const remove = () => {
    [...edit.pics, ...removed].forEach(dropPairPicture);
    onChange({ sets: data.sets.filter((x) => x.id !== edit.id), chosen: data.chosen === edit.id ? null : data.chosen }, data.chosen === edit.id);
    setSure(false); setEdit(null);
  };
  const pick = (id) => { onChange({ ...data, chosen: id }, true); onClose(); };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', zIndex: 20 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={edit ? undefined : onClose} accessible={false} />
      <View style={[styles.box, { width: boxW }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22 }}>
          {!edit ? (
            <>
              <Text style={styles.title} accessibilityRole="header">{t('Pictures')}</Text>
              <Pressable onPress={withTap(() => pick(null))} style={[styles.row, !data.chosen && styles.rowOn]} accessibilityRole="radio" accessibilityState={{ selected: !data.chosen }}>
                <Text style={styles.rowName} numberOfLines={1}>{t('Coro’s pictures')}</Text>
                <Thumbs sources={coroFaces} size={30} />
              </Pressable>
              {data.sets.map((s) => {
                const full = s.pics.length === SET_SIZE;
                return (
                  <View key={s.id} style={[styles.row, data.chosen === s.id && styles.rowOn, { paddingRight: 6 }]}>
                    <Pressable onPress={withTap(() => (full ? pick(s.id) : start(s)))} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="radio" accessibilityState={{ selected: data.chosen === s.id }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName} numberOfLines={1}>{s.name || t('New picture set')}</Text>
                        {!full ? <Text style={styles.rowNote}>{t('{n} of {m} pictures', { n: s.pics.length, m: SET_SIZE })}</Text> : null}
                      </View>
                      <Thumbs sources={s.pics.map((u) => ({ uri: liveUri(u) }))} size={30} />
                    </Pressable>
                    <Pressable onPress={withTap(() => start(s))} hitSlop={8} style={styles.pencil} accessibilityRole="button" accessibilityLabel={t('Change {name}', { name: s.name })}>
                      <Image source={PENCIL} style={{ width: 18, height: 18, tintColor: colors.white }} resizeMode="contain" />
                    </Pressable>
                  </View>
                );
              })}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Pressable onPress={withTap(onClose)} style={[styles.pill, { backgroundColor: colors.pillGrey }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Close')}</Text></Pressable>
                <Pressable onPress={withTap(() => start(null))} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Make a set')}</Text></Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title} accessibilityRole="header">{edit.isNew ? t('New picture set') : t('Change the set')}</Text>
              <TextInput value={edit.name} onChangeText={(v) => setEdit((e) => ({ ...e, name: v }))} placeholder={t('Name of the set')} placeholderTextColor="#8a8a8a"
                maxLength={30} returnKeyType="done" style={styles.input} accessibilityLabel={t('Name of the set')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                {Array.from({ length: SET_SIZE }, (_, i) => {
                  const uri = edit.pics[i];
                  return uri ? (
                    <View key={i} style={{ width: cell, height: cell }}>
                      <Image source={{ uri: liveUri(uri) }} style={{ width: cell, height: cell, borderRadius: 4 }} resizeMode="cover" />
                      <Pressable onPress={withTap(() => takeOut(uri))} hitSlop={6} style={styles.x} accessibilityRole="button" accessibilityLabel={t('Take this picture out')}>
                        <View style={[styles.xBar, { transform: [{ rotate: '45deg' }] }]} /><View style={[styles.xBar, { transform: [{ rotate: '-45deg' }] }]} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable key={i} onPress={withTap(choose)} style={[styles.slot, { width: cell, height: cell }]} accessibilityRole="button" accessibilityLabel={t('Choose photos')}>
                      <Text style={styles.plus}>+</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.note}>
                {edit.pics.length === SET_SIZE ? t('{n} of {m} pictures', { n: SET_SIZE, m: SET_SIZE }) : t('{n} of {m} pictures. A set needs all {m} before you can play with it.', { n: edit.pics.length, m: SET_SIZE })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {!edit.isNew ? <Pressable onPress={withTap(() => setSure(true))} style={[styles.pill, { backgroundColor: colors.pillGrey, marginRight: 'auto' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Delete')}</Text></Pressable> : null}
                <Pressable onPress={withTap(cancel)} style={[styles.pill, { backgroundColor: colors.pillGrey }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Cancel')}</Text></Pressable>
                {edit.pics.length < SET_SIZE ? <Pressable onPress={withTap(choose)} disabled={busy} style={[styles.pill, { backgroundColor: '#3a3a3a', opacity: busy ? 0.5 : 1 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Choose photos')}</Text></Pressable> : null}
                <Pressable onPress={withTap(save)} disabled={!edit.name.trim() || busy} style={[styles.pill, { backgroundColor: colors.green, opacity: !edit.name.trim() || busy ? 0.4 : 1 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Save')}</Text></Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
      {sure ? <ConfirmBox modal title={t('Delete this set?')} message={t('Its pictures are taken out of Coro. The photos on your phone stay where they are.')} confirm={t('Delete')} onCancel={() => setSure(false)} onConfirm={remove} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.glass, borderRadius: 24, maxHeight: '88%' },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 22, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 8, borderWidth: 2, borderColor: 'transparent' },
  rowOn: { borderColor: colors.green },
  rowName: { flex: 1, color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  rowNote: { color: '#bdbdbd', fontFamily: fonts.ui, fontSize: 13, marginTop: 2 },
  pencil: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 6 },
  input: { height: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#1c1c1c', color: colors.white, fontFamily: fonts.ui, fontSize: 17 },
  slot: { borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  plus: { color: '#d0d0d0', fontFamily: fonts.ui, fontSize: 24, lineHeight: 28 },
  x: { position: 'absolute', right: -5, top: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  xBar: { position: 'absolute', width: 10, height: 2, borderRadius: 1, backgroundColor: colors.white },
  note: { color: '#d8d3c8', fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 14 },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
});
