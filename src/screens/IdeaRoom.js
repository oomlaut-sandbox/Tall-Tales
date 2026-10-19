// The Idea Room: ideas for every kind of book a family can make (Help → Idea Room, and the story guide's
// last step). Sections of idea cards; tap a card to see how to make it. A button to start making one.
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { DESK_FELT, IS_TABLET, DESK_BG } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { IDEA_SECTIONS, IDEA_COUNT } from '../ideas';
import { useT } from '../i18n';
import { useControls } from '../controls';

const BAND_FELT = require('../../assets/band-ideas.jpg'); // Jörg's pink felt banner
const SKIPPY = require('../../assets/ideas-skippy.png'); // Skippy, daydreaming against his book (at the end of the ideas)
const WRITER = require('../../assets/ideas-writer.png'); // writing in his notebook, under the words at the top

export default function IdeaRoom({ u, openMenu, onMake, onHelp }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const controls = useControls();
  const [open, setOpen] = useState(null);
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        {!IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : null}
        <Text style={styles.title}>{t('Ideas Room')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.col}>
          {/* the title and words across the full width, then the writer sitting centred underneath with lots of room */}
          <Text style={styles.heading}>{t('Let’s create!')}</Text>
          <Text style={styles.lead}>{t('Here are some examples of books you can make together… {n} to be exact ;) Your photos and drawings, your words, your voice.', { n: IDEA_COUNT })}</Text>
          <Image source={WRITER} style={{ width: 150, height: 150, alignSelf: 'center', marginTop: 26, marginBottom: 30 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          {IDEA_SECTIONS.map((sec) => (
            <View key={sec.title} style={{ gap: 10 }}>
              <Text style={styles.section}>{t(sec.title)}</Text>
              <Text style={styles.intro}>{t(sec.intro)}</Text>
              {sec.ideas.map((idea) => {
                const key = `${sec.title}/${idea.title}`, shown = open === key;
                return (
                  <Pressable key={key} onPress={() => setOpen(shown ? null : key)} style={styles.card} accessibilityRole="button" accessibilityState={{ expanded: shown }}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardTitle}>{t(idea.title)}</Text>
                      <Text style={styles.chev}>{shown ? '−' : '+'}</Text>
                    </View>
                    <Text style={styles.p}>{t(idea.text)}</Text>
                    {shown ? <Text style={styles.how}>{t(idea.how)}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
          {/* the end of the ideas: Skippy daydreaming */}
          <View style={{ alignItems: 'center', marginTop: 30 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Image source={SKIPPY} style={{ width: 150, height: 97, marginTop: 2 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
        </View>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  band: { backgroundColor: colors.green, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 28, paddingBottom: 40, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 14 },
  heading: { fontFamily: fonts.ui, fontWeight: '700', fontSize: 26, color: colors.white },
  lead: { fontFamily: fonts.ui, fontSize: 17, lineHeight: 24, color: colors.white },
  section: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '700', color: '#d0d0d0', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18 },
  intro: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#cfcfcf' },
  card: { backgroundColor: '#3a3a3a', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontFamily: fonts.ui, fontWeight: '700', fontSize: 17, color: colors.white },
  chev: { fontFamily: fonts.ui, fontSize: 22, color: 'rgba(255,255,255,0.75)', width: 22, textAlign: 'center' },
  p: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#e6e6e6' },
  how: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: colors.white, fontStyle: 'italic', marginTop: 4 },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
});
