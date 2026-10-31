// The intro (being worked on separately: off in the app until it's ready, INTRO_ON in App.js; the web preview
// shows it at #intro). Jörg, 26 Oct 2026: words only, on the dark felt, in light grey boxes (no mascot, no
// screen grabs). The notebook asks "Are you a kid or a grown-up?"; each then gets its own short journey here,
// and ends on the start page (Make a book, Read a book). (No Skip: Jörg, 27 Oct 2026.)
import LineInput from '../components/LineInput';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_BG, DeskFelt } from '../look';
import { useT } from '../i18n';
import { useReduceMotion } from '../a11y';
import { PagePhone } from '../components/FilmPlayer';

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// the pages of each journey
const PAGES = {
  kid: ['kidMeet', 'kidHello', 'kidAge'], // (the video first, before anyone can skip past it: Jörg, 27 Oct 2026) // (Meet Coro: a simpler video page, Jörg 26 Oct 2026)
  grownup: ['grownHello', 'whatIs', 'access', 'grownProfile'], // (access: Made for every reader, Jörg 27 Oct 2026) // (What is Coro?: the tutorial videos, Jörg 26 Oct 2026)
};

// the little line icons beside each point (the heading icons, drawn dark on the light grey boxes)
const ICONS = {
  make: require('../../assets/heading-icons/making-books.png'),
  share: require('../../assets/heading-icons/together-with-others.png'),
  read: require('../../assets/heading-icons/reading.png'),
  safe: require('../../assets/heading-icons/grown-ups.png'),
  connect: require('../../assets/heading-icons/heart.png'), // a heart in Jörg's shape, at the other icons' stroke (28 Oct 2026)
  decide: require('../../assets/title-icons/person.png'),
  text: require('../../assets/heading-icons/learning.png'), // an A in a box (text size and fonts)
  speak: require('../../assets/heading-icons/communication-support.png'), // a speech bubble (VoiceOver)
  calm: require('../../assets/heading-icons/bedtime.png'), // the moon (Reduce Motion and the nightlight)
};

function Box({ title, text, icon }) {
  return (
    <View style={[styles.box, { flexDirection: 'row', gap: 16, alignItems: 'flex-start' }]}>
      {icon ? <Image source={ICONS[icon]} style={{ width: 30, height: 30, tintColor: '#333', marginTop: 2 }} accessibilityIgnoresInvertColors /> : null}
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.boxTitle}>{title}</Text>
        <Text style={styles.boxText}>{text}</Text>
      </View>
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

// the tutorial videos on the What is Coro? page (the films themselves are still being made)
export const VIDEOS = ['How Coro works']; // one film, here, in the kids' intro and in Help: assets/videos/coro-intro.mp4 (Jörg, 28 Oct 2026) // (Parental controls: the same words as in Settings)

export default function Intro({ who, onDone, onBack }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const pages = PAGES[who] || PAGES.kid;
  const [i, setI] = useState(0);
  const [age, setAge] = useState(null);
  const [name, setName] = useState('');
  // each page slides in from the right, like turning a page
  const slide = useRef(new Animated.Value(0)).current;
  const still = useReduceMotion(); // Reduce Motion: the page fades in, without sliding
  useEffect(() => {
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: still ? 250 : 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [i]);
  const finish = () => onDone({ who, age, name: name.trim() });
  const next = () => (i < pages.length - 1 ? setI(i + 1) : finish());
  // back: the page before, or (on the first page) the notebook's question again
  const back = () => (i > 0 ? setI(i - 1) : onBack && onBack());
  const page = pages[i];

  let body = null;
  if (page === 'kidHello') body = (
    <>
      <Text style={styles.title}>{t('Let’s make books!')}</Text>
      <Text style={styles.lead}>{t('Coro is where you make your own books, and share them with the people you love.')}</Text>
      <Box icon="make" title={t('Make beautiful books')} text={t('Your words, your drawings, your photos and your own voice, on real-looking pages.')} />
      <Box icon="share" title={t('Share them easily')} text={t('Send your books to your family, and they can read them with you.')} />
      <Box icon="read" title={t('Read together')} text={t('Listen, read along or read by yourself.')} />
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
      <Box icon="safe" title={t('Safe spaces')} text={t('Parental controls decide exactly what your child can see and do: what they read, what they can share, and what stays for grown-ups.')} />
      <Box icon="connect" title={t('Meaningful connections')} text={t('Make books with your child, record your voice reading them, and share them with the family.')} />
      <Box icon="decide" title={t('Grown-ups decide')} text={t('Buying, sharing and settings always ask a grown-up question first.')} />
    </>
  );
  if (page === 'kidMeet') body = (
    <>
      <Text style={styles.title}>{t('Meet Coro')}</Text>
      <PagePhone />{/* just the title and the phone, upright, solid black, the film on its screen (Jörg, 29 Oct 2026) */}
    </>
  );
  if (page === 'whatIs') body = (
    <>
      <Text style={styles.title}>{t('Meet Coro')}</Text>{/* one video, like the kids' page (Jörg, 28 Oct 2026) */}
      <PagePhone />{/* just the title and the phone, upright, solid black, the film on its screen (Jörg, 29 Oct 2026) */}
    </>
  );
  if (page === 'access') body = (
    <>
      <Text style={styles.title} accessibilityRole="header">{t('Made for every reader')}</Text>
      <Text style={styles.lead}>{t('Coro works with the accessibility settings on your iPhone and iPad, and has a few of its own.')}</Text>
      <Box icon="read" title={t('Listen, or read along')} text={t('Books can read themselves aloud, in a narrator’s voice or a family member’s. Words light up as they’re read, and any word can be tapped to hear it.')} />
      <Box icon="text" title={t('Text that’s easy to read')} text={t('Make the words bigger and choose a clear font in Reading Options. Menus and settings follow Larger Text on your device.')} />
      <Box icon="speak" title={t('VoiceOver')} text={t('Every button has a spoken name, and the words on each page are read out as it turns.')} />
      <Box icon="calm" title={t('Calm on the eyes')} text={t('With Reduce Motion on, Coro swaps sliding and bouncing for gentle fades. At bedtime, the nightlight dims the screen.')} />
    </>
  );
  if (page === 'grownProfile') body = (
    <>
      <Text style={styles.title}>{t('What age are your readers?')}</Text>
      <Text style={styles.lead}>{t('This changes what they can see and do with Coro. Let’s start by creating a profile.')}</Text>
      <View style={[styles.box, { gap: 14 }]}>
        <Text style={styles.boxTitle}>{t('Your child’s name')}</Text>
        <LineInput value={name} onChangeText={setName} placeholder={t('Name')} placeholderTextColor="#8a8a8a" maxLength={20} autoCapitalize="words" autoCorrect={false}
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
        <Animated.View style={[styles.col, { opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, still ? 0 : 60] }) }] }]}>
          {body}
        </Animated.View>
      </ScrollView>
      {/* back in the bottom left corner, forward in the bottom right; how far along between them */}
      <View style={[styles.foot, { paddingBottom: insets.bottom + 22 }]}>
        <Pressable onPress={back} disabled={i === 0 && !onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Back')} style={[styles.arrow, i === 0 && !onBack && { opacity: 0.3 }]}>
          <View style={[styles.chev, { transform: [{ translateX: 2 }, { rotate: '45deg' }], borderLeftWidth: 2.4, borderBottomWidth: 2.4 }]} />
        </Pressable>
        {/* between the arrows: how far along (no Skip intro: Jörg, 27 Oct 2026) */}
        <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
          <View style={styles.dots}>{pages.map((p, k) => <View key={p} style={[styles.dot, k === i && styles.dotOn]} />)}</View>
        </View>
        <Pressable onPress={next} hitSlop={10} accessibilityRole="button" accessibilityLabel={i < pages.length - 1 ? t('Next') : t('Let’s go!')} style={[styles.arrow, styles.arrowOn]}>
          <View style={[styles.chev, { transform: [{ translateX: -2 }, { rotate: '45deg' }], borderRightWidth: 2.4, borderTopWidth: 2.4 }]} />
        </Pressable>
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
  arrow: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  arrowOn: { backgroundColor: colors.green, borderColor: colors.green },
  chev: { width: 13, height: 13, borderColor: colors.white },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 24, paddingTop: 14 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotOn: { backgroundColor: colors.white },
  skip: { fontFamily: fonts.ui, fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  next: { height: 50, borderRadius: 25, paddingHorizontal: 30, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontFamily: fonts.uiBold, fontSize: 18, color: colors.white },
});
