// Picture passwords (Jörg, 6 Nov 2026): a profile can be kept for its child alone. A grown-up chooses three
// pictures, in order, in the profile's settings; tapping that name then asks for them. Young children can't
// manage typed passwords, but they remember "apple, star, boat". Forgotten? A grown-up opens it with the grown-up
// question instead.
//   mode 'enter': tap the three pictures to open the profile
//   mode 'set': choose three pictures, then Use these
import React, { useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { playKey } from '../sound';

// nine pictures every child knows, as Jörg's felt tiles (6 Nov 2026), the same place on the grid every time
export const PICS = [
  ['apple', require('../../assets/pics/apple.png'), 'Apple'], ['star', require('../../assets/pics/star.png'), 'Star'], ['fish', require('../../assets/pics/fish.png'), 'Fish'],
  ['moon', require('../../assets/pics/moon.png'), 'Moon'], ['rocket', require('../../assets/pics/rocket.png'), 'Rocket'], ['rainbow', require('../../assets/pics/rainbow.png'), 'Rainbow'],
  ['cat', require('../../assets/pics/cat.png'), 'Cat'], ['flower', require('../../assets/pics/flower.png'), 'Flower'], ['sun', require('../../assets/pics/sun.png'), 'Sun'],
];
// (the first set had a car and a ball where the rocket and the sun are now)
const OLD = { car: 'rocket', ball: 'sun' };
export const keyOf = (k) => OLD[k] || k;
export const picImage = (k) => (PICS.find((p) => p[0] === keyOf(k)) || [])[1] || null;
// a tile, any size
export function PicTile({ k, size = 40, style }) {
  const src = picImage(k);
  return src ? <Image source={src} style={[{ width: size, height: size, borderRadius: size * 0.14 }, style]} /> : null;
}
const LEN = 3;

export default function PicLock({ visible, mode = 'enter', name, pics, onDone, onCancel, onGrownUp }) {
  const t = useT();
  const [got, setGot] = useState([]);
  const [wrong, setWrong] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const reset = () => { setGot([]); setWrong(false); };
  const nope = () => {
    setWrong(true);
    Animated.sequence([10, -10, 8, -8, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true }))).start(() => setGot([]));
  };
  const tap = (k) => {
    if (got.length >= LEN) return;
    try { playKey(); } catch (e) {}
    const next = [...got, k];
    setWrong(false);
    setGot(next);
    if (mode === 'enter' && next.length === LEN) {
      if (pics && next.every((x, i) => x === keyOf(pics[i]))) setTimeout(() => { reset(); onDone && onDone(); }, 180);
      else setTimeout(nope, 180);
    }
  };
  const close = () => { reset(); onCancel && onCancel(); };
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={close} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.dim}>
        <Animated.View style={[styles.box, { transform: [{ translateX: shake }] }]}>
          <Text style={styles.title}>{mode === 'set' ? t('Choose 3 pictures') : t('Hi, {name}!', { name })}</Text>
          <Text style={styles.sub}>{mode === 'set' ? t('Tap them in order. {name} taps the same three to open their profile.', { name }) : wrong ? t('Not quite. Try again!') : t('Tap your 3 pictures.')}</Text>
          {/* the three spaces: the pictures chosen so far (in 'enter', just dots, so nobody sees them over a shoulder) */}
          <View style={styles.slots}>
            {Array.from({ length: LEN }, (_, i) => (
              <View key={i} style={[styles.slot, got[i] && styles.slotOn]}>
                {got[i] ? (mode === 'set' ? <PicTile k={got[i]} size={44} /> : <Text style={styles.slotDot}>●</Text>) : null}
              </View>
            ))}
          </View>
          <View style={styles.grid}>
            {PICS.map(([k, src, label]) => (
              <Pressable key={k} onPress={() => tap(k)} style={({ pressed }) => [styles.pic, pressed && { transform: [{ scale: 0.92 }] }]} accessibilityRole="button" accessibilityLabel={t(label)}>
                <Image source={src} style={styles.tile} />
              </Pressable>
            ))}
          </View>
          {mode === 'set' ? (
            <View style={styles.row}>
              <Pressable onPress={reset} style={[styles.pill, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Start again')}</Text></Pressable>
              <Pressable onPress={() => { const g = got; if (g.length === LEN) { reset(); onDone && onDone(g); } }} disabled={got.length < LEN} style={[styles.pill, { backgroundColor: colors.green }, got.length < LEN && { opacity: 0.4 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Use these')}</Text></Pressable>
            </View>
          ) : onGrownUp ? (
            <Pressable onPress={() => { reset(); onGrownUp(); }} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>{t('Forgot? Ask a grown-up')}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={{ marginTop: 4 }}>
            <Text style={styles.link}>{t('Cancel')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box: { width: '100%', maxWidth: 380, backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 26, paddingTop: 30, paddingBottom: 30, paddingHorizontal: 26, alignItems: 'center', gap: 14 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 24, textAlign: 'center' },
  sub: { color: '#cfcac0', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  slots: { flexDirection: 'row', gap: 12, marginVertical: 2 },
  slot: { width: 52, height: 52, borderRadius: 14, borderWidth: 2, borderColor: '#5a5a5a', alignItems: 'center', justifyContent: 'center' },
  slotOn: { borderColor: colors.white },
  slotDot: { color: colors.white, fontSize: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, width: 3 * 84 + 2 * 12 },
  pic: { width: 84, height: 84, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 3 } },
  tile: { width: 84, height: 84, borderRadius: 12 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pill: { height: 46, borderRadius: 23, paddingHorizontal: 22, justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  link: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 15, textDecorationLine: 'underline' },
});
