// The letter from Coro: an old airmail envelope beside the featured book in the Book Store, with the reader's
// name typed on it. A tap lifts the letter out: Coro's note on how the books are made, typed on old paper
// (Jörg, 8 Nov 2026). The paper stretches to fit the words (Jörg: "stretch paper").
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme';
import { useLang, useT } from '../i18n';
import { activeProfile, onProfiles } from '../profiles';
import { playSound } from '../sound';

const ENVELOPE = require('../../assets/letter-envelope.png'); // Jörg's envelope, cut out (720 × 542)
const PAPER = require('../../assets/letter-paper.png'); // Jörg's old sheet of paper, cut out (800 × 1111)
const ENV_RATIO = 720 / 542;
const TYPE = 'SpecialElite_400Regular'; // the Typewriter font (theme.js)
const INK = '#2b2622';

const HELLO_NAME = 'Hi {name}. Thank you for supporting Coro. We so hope you love making books as much as we do.';
const PARAS = [
  'Hello, and thank you for supporting Coro. We so hope you love making books as much as we do.',
  'We look forward to seeing the stories that you dream up and create. The book store will grow in time with quality books, made by real people. Until then, please stay on this exciting journey of discovery with us.',
  'Coro is about the books you make together, so the most important ones in your Library will be yours.',
  'We’re dedicated to transparency and honesty around every process, so you can choose what’s best for you.',
  'In the Book Store you’ll find some examples of books made with Coro.',
  'Some books are made entirely by hand, while others can be made with the help of AI tools. Regardless, the exact process is documented and shared in the Book Store listings.',
  'Every book is translated with the help of AI. A person then reads each translation and approves it before anyone hears it. The read-aloud voices are made with ElevenLabs, a voice tool. They are not recordings of real people reading.',
  'Books from artists in the store are made without AI, except for their translations.',
  'We hope you love making and reading books as much as we do.', // the last words before Coro signs (Jörg, 13 Nov 2026)
];

// The reader's name, kept up to date when the profile changes
function useReaderName() {
  const [name, setName] = useState((activeProfile() || {}).name || '');
  useEffect(() => onProfiles(() => setName((activeProfile() || {}).name || '')), []);
  return name;
}

// The envelope, sized like a book tile: it sits in a square the size of the cover beside it, a little tilted
export function LetterTile({ width }) {
  const t = useT();
  const name = useReaderName();
  const [open, setOpen] = useState(false);
  const [boxW, setBoxW] = useState(0);
  const envW = boxW * 0.82, envH = envW / ENV_RATIO;
  return (
    <>
      <Pressable onPress={() => { playSound('cardLift'); setOpen(true); }} style={{ width, gap: 8 }} accessibilityRole="button" accessibilityLabel={t('Open the letter from Coro')}
        onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
        <View style={{ aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
          {boxW ? (
            <View style={[styles.envShadow, { width: envW, height: envH, transform: [{ rotate: '-3deg' }] }]}>
              <Image source={ENVELOPE} style={{ width: envW, height: envH }} resizeMode="contain" />
              {/* the reader's name, typed where an address would go */}
              {name ? (
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false}
                  style={{ position: 'absolute', left: envW * 0.15, width: envW * 0.7, top: envH * 0.52 - Math.round(envW * 0.085) * 0.6 + 4, textAlign: 'center', fontFamily: TYPE, fontSize: Math.round(envW * 0.085), color: INK, opacity: 0.85, transform: [{ rotate: '-2deg' }] /* typed a little askew (Jörg, 9 Nov 2026; was 4°) */ }}>{name}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
        <Text numberOfLines={2} style={styles.tileTitle}>{t('A letter from Coro')}</Text>
      </Pressable>
      {/* it greets the reader by their profile name (Jörg, 9 Nov 2026) */}
      {open ? <PaperLetter title="A letter from Coro" paras={name ? [[HELLO_NAME, { name }], ...PARAS.slice(1)] : PARAS} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// A letter from Coro: it slides up out of the dark, typed on the old paper and signed by Coro.
// title and paras are the English words (translated here); also the Mancala letter (Jörg, 9 Nov 2026)
export function PaperLetter({ title, paras, onClose }) {
  const t = useT();
  const lang = useLang();
  const rtl = lang === 'ar';
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const sheetW = Math.min(winW - 32, 560);
  const [sheetH, setSheetH] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  const close = () => Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => onClose());
  const rise = fade.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const fs = sheetW > 480 ? 17 : 15;
  const para = { fontFamily: TYPE, fontSize: fs, lineHeight: Math.round(fs * 1.6), color: INK }, dir = rtl ? { textAlign: 'right', writingDirection: 'rtl' } : null;
  return (
    <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent visible animationType="none" onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)', opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('Put the letter back')} />
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: insets.top + 30, paddingBottom: insets.bottom + 40 }}>
          <Animated.View onLayout={(e) => setSheetH(e.nativeEvent.layout.height)} style={[styles.sheetShadow, { width: sheetW, transform: [{ translateY: rise }] }]}>
            {/* its exact size, measured (an image pinned only by its edges can be drawn at its own size on the phone) */}
            {sheetH ? <Image source={PAPER} style={{ position: 'absolute', left: 0, top: 0, width: sheetW, height: sheetH }} resizeMode="stretch" /> : null}
            <View style={{ paddingHorizontal: Math.round(sheetW * 0.09), paddingTop: Math.round(sheetW * 0.11), paddingBottom: Math.round(sheetW * 0.09), gap: Math.round(fs * 0.9) }}>
              <Text style={[para, { fontSize: fs + 5, lineHeight: Math.round((fs + 5) * 1.4), marginBottom: 4 }, dir]} accessibilityRole="header">{t(title)}</Text>
              {paras.map((p) => (Array.isArray(p) ? <Text key={p[0]} style={[para, dir]}>{t(p[0], p[1])}</Text> : <Text key={p} style={[para, dir]}>{t(p)}</Text>))}
              <Text style={[para, { marginTop: 8 }, dir]}>{t('With love,')}{'\n'}Coro</Text>
              <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={styles.back}>
                <Text style={{ fontFamily: fonts.uiSemiBold, fontSize: 14, color: '#5d554c' }}>{t('Put the letter back')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  envShadow: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 5 } },
  sheetShadow: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  tileTitle: { fontFamily: 'EBGaramond_700Bold', fontSize: 19, lineHeight: 23, color: '#ffffff' },
  back: { alignSelf: 'center', marginTop: 14, borderWidth: 1, borderColor: 'rgba(43,38,34,0.3)', borderRadius: 99, paddingVertical: 8, paddingHorizontal: 18 },
});
