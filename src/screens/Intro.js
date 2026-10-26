// The intro (being worked on separately: off in the app until it's ready, INTRO_ON in App.js; the web preview
// shows it at #intro). Jörg, 26 Oct 2026: words only, on the dark felt, in light grey boxes (no mascot, no
// screen grabs). The notebook asks "Are you a kid or a grown-up?"; each then gets its own short journey here,
// and ends on the start page (Make a book, Read a book). Every page has a small Skip beside Next.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_BG, DeskFelt } from '../look';
import { useT } from '../i18n';

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// the pages of each journey
const PAGES = {
  kid: ['kidHello', 'kidAge'],
  grownup: ['grownHello', 'grownProfile'],
};

function Box({ title, text }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxTitle}>{title}</Text>
      <Text style={styles.boxText}>{text}</Text>
    </View>
  );
}

function Chip({ label, on, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export default function Intro({ who, onDone }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const pages = PAGES[who] || PAGES.kid;
  const [i, setI] = useState(0);
  const [age, setAge] = useState(null);
  const [name, setName] = useState('');
  // each page slides in from the right, like turning a page
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [i]);
  const finish = () => onDone({ who, age, name: name.trim() });
  const next = () => (i < pages.length - 1 ? setI(i + 1) : finish());
  const page = pages[i];

  let body = null;
  if (page === 'kidHello') body = (
    <>
      <Text style={styles.title}>{t('Let’s make books!')}</Text>
      <Text style={styles.lead}>{t('Coro is where you make your own books, and share them with the people you love.')}</Text>
      <Box title={t('Make beautiful books')} text={t('Your words, your drawings, your photos and your own voice, on real-looking pages.')} />
      <Box title={t('Share them easily')} text={t('Send your books to your family, and they can read them with you.')} />
      <Box title={t('Read together')} text={t('Listen, read along or read by yourself.')} />
    </>
  );
  if (page === 'kidAge') body = (
    <>
      <Text style={styles.title}>{t('How old are you?')}</Text>
      <Text style={styles.lead}>{t('So Coro can show you the right books.')}</Text>
      <View style={[styles.box, { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }]}>
        {AGES.map((a) => <Chip key={a} label={String(a)} on={age === a} onPress={() => setAge(a)} />)}
      </View>
    </>
  );
  if (page === 'grownHello') body = (
    <>
      <Text style={styles.title}>{t('Welcome to Coro')}</Text>
      <Text style={styles.lead}>{t('Books you make together, and a safe place to share them.')}</Text>
      <Box title={t('Safe spaces')} text={t('Parental controls decide exactly what your child can see and do: what they read, what they can share, and what stays for grown-ups.')} />
      <Box title={t('Meaningful connections')} text={t('Make books with your child, record your voice reading them, and share them with the family.')} />
      <Box title={t('Grown-ups decide')} text={t('Buying, sharing and settings always ask a grown-up question first.')} />
    </>
  );
  if (page === 'grownProfile') body = (
    <>
      <Text style={styles.title}>{t('What age are your readers?')}</Text>
      <Text style={styles.lead}>{t('This changes what they can see and do with Coro. Let’s start by creating a profile.')}</Text>
      <View style={[styles.box, { gap: 14 }]}>
        <Text style={styles.boxTitle}>{t('Your child’s name')}</Text>
        <TextInput value={name} onChangeText={setName} placeholder={t('Name')} placeholderTextColor="#8a8a8a" maxLength={20} autoCapitalize="words" autoCorrect={false}
          allowFontScaling={false} style={styles.input} accessibilityLabel={t('Name')} />
        <Text style={[styles.boxTitle, { marginTop: 4 }]}>{t('Age')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {AGES.map((a) => <Chip key={a} label={String(a)} on={age === a} onPress={() => setAge(a)} />)}
        </View>
        <Text style={styles.small}>{t('Books rated for older children are hidden. You can add more children later in Settings.')}</Text>
      </View>
    </>
  );

  return (
    <View style={[StyleSheet.absoluteFill, styles.screen]}>
      <DeskFelt spot="intro" />
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + 48, paddingBottom: 30 }]} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.col, { opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) }] }]}>
          {body}
        </Animated.View>
      </ScrollView>
      {/* Next, with a small Skip beside it; and how far along you are */}
      <View style={[styles.foot, { paddingBottom: insets.bottom + 22 }]}>
        <View style={styles.dots}>{pages.map((p, k) => <View key={p} style={[styles.dot, k === i && styles.dotOn]} />)}</View>
        <View style={{ flex: 1 }} />
        <Pressable onPress={finish} hitSlop={10} accessibilityRole="button"><Text style={styles.skip}>{t('Skip')}</Text></Pressable>
        <Pressable onPress={next} accessibilityRole="button" style={styles.next}><Text style={styles.nextText}>{i < pages.length - 1 ? t('Next') : t('Let’s go!')}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: DESK_BG === 'transparent' ? '#2b2b2b' : DESK_BG, zIndex: 190 },
  body: { paddingHorizontal: 24, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 16 },
  title: { fontFamily: fonts.uiBold, fontSize: 30, lineHeight: 36, color: colors.white },
  lead: { fontFamily: fonts.ui, fontSize: 17, lineHeight: 24, color: '#d8d8d8', marginBottom: 12 },
  // the light grey boxes, with dark words
  box: { backgroundColor: '#d6d6d6', borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18, gap: 6 },
  boxTitle: { fontFamily: fonts.uiBold, fontSize: 18, color: '#222' },
  boxText: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 22, color: '#333' },
  small: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: '#555' },
  chip: { minWidth: 46, height: 40, borderRadius: 20, paddingHorizontal: 14, backgroundColor: '#bdbdbd', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.green },
  chipText: { fontFamily: fonts.uiBold, fontSize: 17, color: '#222' },
  input: { height: 48, borderRadius: 12, backgroundColor: '#f2f2f2', paddingHorizontal: 14, paddingVertical: 0, includeFontPadding: false, fontFamily: fonts.ui, fontSize: 19, color: '#222' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 24, paddingTop: 14 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotOn: { backgroundColor: colors.white },
  skip: { fontFamily: fonts.ui, fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  next: { height: 50, borderRadius: 25, paddingHorizontal: 30, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontFamily: fonts.uiBold, fontSize: 18, color: colors.white },
});
