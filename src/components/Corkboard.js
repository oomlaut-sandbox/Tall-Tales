// The corkboard: always at the very bottom of My Library, as wide as two books. Anyone can pin a yellow sticky
// note or a photo to it with the pin button (taking a photo asks a grown-up first, as everywhere). Tap a pin to
// see it big, or to take it down.
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import ParentGate from './ParentGate';
import { CameraIcon, ChoiceLabel } from './Chrome';

// the icons before the words, the same line icons as the app's other pop-ups (Jörg, 28 Oct 2026)
const PIN_ICONS = { note: require('../../assets/heading-icons/my-notebook.png'), photo: require('../../assets/heading-icons/family-and-memories.png') };
const PinIcon = ({ src }) => (src ? <Image source={src} style={{ width: 22, height: 22, tintColor: colors.white }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <View style={{ width: 22, alignItems: 'center' }}><CameraIcon size={19} color={colors.white} weight={1.6} /></View>);
import { loadPins, pinNote, pinPhoto, unpin } from '../corkboard';
import { onScopeChange } from '../scope';

const CORK = require('../../assets/cork.jpg');
const PIN_ICON = require('../../assets/icon-pin.png');
const PIN_HEAD = require('../../assets/pin-head.png');
const NOTE_YELLOW = '#e9da92'; // a softer, less saturated yellow
const HAND = 'SpecialElite_400Regular'; // the typewriter, like My Notebook

function Pin({ p, W }) {
  const s = Math.round(W * (p.kind === 'note' ? 0.26 : 0.28));
  const head = <Image source={PIN_HEAD} style={{ position: 'absolute', top: -s * 0.02, left: s / 2 - 4, width: 8, height: 8, zIndex: 2 }} />;
  return p.kind === 'note' ? (
    <View style={[styles.note, { width: s, height: s }]}>
      {head}
      <Text numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.5} style={[styles.noteText, { fontSize: s * 0.11, lineHeight: s * 0.155 }]}>{p.text}</Text>
    </View>
  ) : (
    <View style={[styles.polaroid, { width: s, height: s * 1.12, padding: s * 0.06, paddingBottom: s * 0.18 }]}>
      {head}
      <Image source={{ uri: p.uri }} style={{ flex: 1, alignSelf: 'stretch' }} resizeMode="cover" />
    </View>
  );
}

export default function Corkboard({ width, toast, onPlaylists }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [pins, setPins] = useState([]);
  const [ask, setAsk] = useState(false); // 'what to pin?'
  const [writing, setWriting] = useState(null); // the sticky note being written
  const [open, setOpen] = useState(null); // a pin shown big
  const [camGate, setCamGate] = useState(false);
  useEffect(() => {
    loadPins().then(setPins);
    return onScopeChange(() => loadPins().then(setPins)); // another child's board
  }, []);
  const H = Math.round(width * 0.56);

  const getPhoto = async (source) => {
    try {
      let r;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return toast && toast(t('Coro isn’t allowed to use the camera. You can turn it on in Settings.'));
        r = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.85 });
      } else r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      const a = r.assets[0];
      let uri = a.uri;
      try { // a small square from the middle (quick to show, small to keep)
        const w = a.width || 0, h = a.height || 0, side = Math.min(w, h);
        const acts = side ? [{ crop: { originX: Math.round((w - side) / 2), originY: Math.round((h - side) / 2), width: side, height: side } }, { resize: { width: Math.min(700, side) } }] : [{ resize: { width: 700 } }];
        uri = (await ImageManipulator.manipulateAsync(uri, acts, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG })).uri;
      } catch (e) {}
      setPins(await pinPhoto(uri));
    } catch (e) {
      toast && toast(source === 'camera' ? t('Couldn’t open the camera.') : t('Couldn’t open your photos. Check that Coro is allowed to use Photos in Settings.'));
    }
  };

  return (
    <View style={{ width, marginTop: 6 }}>
      <View style={[styles.board, { width, height: H }]}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: 10, overflow: 'hidden' }]}>
          <Image source={CORK} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
        {pins.map((p) => {
          const s = width * (p.kind === 'note' ? 0.26 : 0.28);
          return (
            <Pressable key={p.id} onPress={withTap(() => setOpen(p))} accessibilityRole="button" accessibilityLabel={p.kind === 'note' ? p.text : t('Photo')}
              style={{ position: 'absolute', left: p.x * width - s / 2, top: p.y * H - s / 2, transform: [{ rotate: `${p.rot || 0}deg` }] }}>
              <Pin p={p} W={width} />
            </Pressable>
          );
        })}
        {/* Book Playlists: a white sheet always pinned in the lower left corner, like a list on the board (Jörg, 29 Oct 2026) */}
        {onPlaylists ? (() => {
          const sw = Math.round(width * 0.25), sh = Math.round(sw * 1.3);
          return (
            <Pressable onPress={withTap(onPlaylists)} accessibilityRole="button" accessibilityLabel={t('Book Playlists')}
              style={[styles.sheet, { position: 'absolute', left: width * 0.05, top: H - sh - H * 0.07, width: sw, height: sh, padding: sw * 0.1, transform: [{ rotate: '-3deg' }] }]}>
              <Image source={PIN_HEAD} style={{ position: 'absolute', top: 3, left: sw / 2 - 4, width: 8, height: 8, zIndex: 2 }} />
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: HAND, color: '#2b2b2b', fontSize: sw * 0.12, lineHeight: sw * 0.15, marginTop: sw * 0.06 }}>{t('Book Playlists')}</Text>
              {/* a few list lines, like a reading list */}
              {[0.78, 0.6, 0.7, 0.45].map((f, k) => <View key={k} style={{ height: 1.5, width: `${f * 100}%`, backgroundColor: '#b9b9b9', marginTop: sw * 0.09 }} />)}
            </Pressable>
          );
        })() : null}
        {/* the pin button: pin something new */}
        <Pressable onPress={withTap(() => setAsk(true))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Pin something')} style={styles.pinBtn}>
          <Image source={PIN_ICON} style={{ width: 16, height: 16, tintColor: colors.white }} resizeMode="contain" />
        </Pressable>
      </View>

      {/* underneath the board, in light grey */}
      <Text style={styles.caption}>{t('Pin notes and photos here')}</Text>

      {/* what to pin */}
      {ask ? (
        <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setAsk(false)}>
          <Pressable style={styles.back} onPress={() => setAsk(false)}>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>{t('Pin something')}</Text>
              <Pressable onPress={withTap(() => { setAsk(false); setWriting(''); })} style={styles.choice} accessibilityRole="button">
                <PinIcon src={PIN_ICONS.note} /><Text style={styles.choiceText}>{t('A sticky note')}</Text>
              </Pressable>
              <Pressable onPress={withTap(() => { setAsk(false); setTimeout(() => getPhoto('library'), 250); })} style={styles.choice} accessibilityRole="button">
                <PinIcon src={PIN_ICONS.photo} /><Text style={styles.choiceText}>{t('Choose a photo')}</Text>
              </Pressable>
              <Pressable onPress={withTap(() => { setAsk(false); setCamGate(true); })} style={styles.choice} accessibilityRole="button">
                <PinIcon /><Text style={styles.choiceText}>{t('Take a photo')}</Text>
              </Pressable>
              <Pressable onPress={() => setAsk(false)} hitSlop={8} style={{ alignSelf: 'center', marginTop: 10 }}><ChoiceLabel icon="cancel" text={t('Cancel')} style={styles.cancel} /></Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}

      {/* writing a sticky note */}
      {writing != null ? (
        <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setWriting(null)}>
          {/* the note stays put near the top, above the keyboard (no jump when the keyboard comes or goes), and a tap
              on Pin it or Cancel counts the first time, keyboard up or not */}
          <ScrollView scrollEnabled={false} keyboardShouldPersistTaps="always" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: Math.max(70, insets.top + 30), paddingHorizontal: 24 }}>
            <View style={[styles.note, { width: 240, height: 240, padding: 22 }]}>
              <TextInput value={writing} onChangeText={setWriting} autoFocus multiline maxLength={80} placeholder={t('Write a note')} placeholderTextColor="rgba(0,0,0,0.35)"
                style={[styles.noteText, { flex: 1, alignSelf: 'stretch', fontSize: 22, lineHeight: 32, textAlignVertical: 'center' }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
              <Pressable onPress={() => setWriting(null)} style={[styles.pill, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Cancel')}</Text></Pressable>
              <Pressable disabled={!writing.trim()} onPress={withTap(async () => { const txt = writing; setWriting(null); setPins(await pinNote(txt)); })}
                style={[styles.pill, { backgroundColor: colors.green }, !writing.trim() && { opacity: 0.45 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Pin it')}</Text></Pressable>
            </View>
          </ScrollView>
        </Modal>
      ) : null}

      {/* a pin, big: take it down, or close */}
      {open ? (
        <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent animationType="fade" visible onRequestClose={() => setOpen(null)}>
          <Pressable style={styles.back} onPress={() => setOpen(null)}>
            <View style={{ transform: [{ rotate: `${(open.rot || 0) / 2}deg` }] }}><Pin p={open} W={Math.min(width * 2.6, 900)} /></View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 34 }}>
              <Pressable onPress={withTap(async () => { const id = open.id; setOpen(null); setPins(await unpin(id)); })} style={[styles.pill, { backgroundColor: colors.deepRed }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Take it down')}</Text></Pressable>
              <Pressable onPress={() => setOpen(null)} style={[styles.pill, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Close')}</Text></Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}
      <ParentGate visible={camGate} reason={t('Taking a photo opens the camera.')} onCancel={() => setCamGate(false)} onPass={() => { setCamGate(false); setTimeout(() => getPhoto('camera'), 250); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  board: { borderRadius: 10, backgroundColor: '#b07a4f', shadowColor: '#000', shadowOffset: { width: 3, height: 10 }, shadowOpacity: 0.6, shadowRadius: 13, elevation: 10 },
  pinBtn: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  caption: { color: '#b4b4b4', fontFamily: fonts.ui, fontSize: 15, marginTop: 12 },
  empty: { position: 'absolute', left: 0, right: 0, top: '44%', textAlign: 'center', color: 'rgba(60,35,15,0.6)', fontFamily: HAND, fontSize: 16 },
  sheet: { backgroundColor: '#fbfbf8', shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 4 },
  note: { backgroundColor: NOTE_YELLOW, alignItems: 'center', justifyContent: 'center', padding: 10, shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 4 },
  noteText: { color: '#3b3214', fontFamily: HAND, textAlign: 'center' },
  polaroid: { backgroundColor: '#fbfaf6', shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 4 },
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 360, backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 24, padding: 22, gap: 6 },
  boxTitle: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 20, marginBottom: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  choiceIcon: { width: 30, height: 30, borderRadius: 4, transform: [{ rotate: '-4deg' }] },
  choiceText: { color: colors.white, fontFamily: fonts.uiSemiBold, fontSize: 17 },
  cancel: { color: '#8a8a8a', fontFamily: fonts.ui, fontSize: 15 },
  pill: { height: 46, borderRadius: 23, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
});
