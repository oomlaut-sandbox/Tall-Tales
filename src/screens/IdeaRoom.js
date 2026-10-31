// The Idea Room: ideas for every kind of book a family can make (Help → Idea Room, and the story guide's
// last step). Sections of idea cards; tap a card to see how to make it. A button to start making one.
import { TitleIcon } from '../titleIcons';
import { useScrollMemory } from '../nav';
import { HEADING_ICONS } from '../headingIcons';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, boxTitle, sectionBox, SECTION_GAP } from '../theme';
import { DESK_FELT, IS_TABLET, DESK_BG, BandFill } from '../look';
import { Bar, Burger, WithBar } from '../components/Chrome';
import { IDEA_SECTIONS, IDEA_COUNT } from '../ideas';
import { useT } from '../i18n';
import { useControls } from '../controls';

const BAND_FELT = require('../../assets/band-ideas.png'); // Jörg's moss green felt banner (cropped close under the stitching, with a soft felt edge)
const SPREAD = require('../../assets/ideas-spread.jpg'); // an open book: Jörg's felt cat stretching, and 'Make a book for yourself…' (under the words at the top)

export default function IdeaRoom({ u, openMenu, onMake, onHelp }) {
  const keep = useScrollMemory('ideas'); // Back returns to this spot
  const t = useT();
  const insets = useSafeAreaInsets();
  const controls = useControls();
  const [open, setOpen] = useState(null);
  const [openSec, setOpenSec] = useState(null); // the overview: just the section headings; a tapped one opens its ideas (one at a time)
  const { width: winW } = useWindowDimensions();
  const spreadW = Math.min(520, winW - 48); // the full width of the column
  return (
    <WithBar style={styles.screen} bg={DESK_FELT} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }, { backgroundColor: 'transparent' }]}>
        {/* phone: the felt's soft bottom edge shows the desk through it, so the band's own colour only fills the status bar strip */}
        {true ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 2, backgroundColor: '#3e4a2c' }} /> : null}
        {true ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: IS_TABLET ? 0 : insets.top, bottom: 0, overflow: 'hidden' }}><BandFill source={BAND_FELT} /></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><TitleIcon kind="help" /><Text style={[styles.title, { flexShrink: 1 }]}>{t('Ideas')}</Text></View>
      </View>
      <ScrollView {...keep} contentContainerStyle={styles.body}>
        <View style={styles.col}>
          {/* the title and words across the full width, then the book spread underneath with lots of room */}
          <Text style={styles.heading}>{t('Create and share stories')}</Text>
          <Text style={styles.lead}>{t('Here are some examples of books you can make together. Your photos and drawings, your words, your voice.', { n: IDEA_COUNT })}</Text>
          {/* the shadow sits on an outer box (iOS clips a shadow on a box that clips its picture) */}
          <View style={[styles.spreadShadow, { width: spreadW, height: Math.round(spreadW * 600 / 1200) }]}>
            <View style={styles.spread}><Image source={SPREAD} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors /></View>
          </View>
          <Text style={[styles.caption, { width: spreadW }]}>{t('Example of a Coro book. You make your own.')}</Text>
          {IDEA_SECTIONS.map((sec) => { const secOpen = openSec === sec.title; return (
            <View key={sec.title} style={styles.box}>
              <Pressable onPress={() => { setOpenSec(secOpen ? null : sec.title); setOpen(null); }} accessibilityRole="button" accessibilityState={{ expanded: secOpen }} style={[styles.secHead, !secOpen && { marginBottom: 0 }]}>
                {HEADING_ICONS[sec.title] ? <Image source={HEADING_ICONS[sec.title]} style={styles.secIcon} accessibilityIgnoresInvertColors /> : null}
                <Text style={styles.section}>{t(sec.title)}</Text>
                <Text style={styles.secChev}>{secOpen ? '−' : '+'}</Text>
              </Pressable>
              {secOpen ? <Text style={styles.intro}>{t(sec.intro)}</Text> : null}
              {secOpen && sec.ideas.map((idea) => {
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
          ); })}
          {/* (the end of the ideas had the felt mascot daydreaming: away until the new hand-drawn one arrives) */}
        </View>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DESK_BG },
  band: { backgroundColor: '#3e4a2c' /* the moss felt's colour */, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 32, transform: [{ translateY: -3 }] },
  body: { padding: 24, paddingTop: 28, paddingBottom: 40, alignItems: 'center' },
  col: { width: '100%', maxWidth: 520, gap: 14 },
  heading: { fontFamily: fonts.uiBold, fontSize: 26, color: colors.white },
  spreadShadow: { alignSelf: 'center', marginTop: 22, marginBottom: 32, backgroundColor: '#c9c9c9', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
  spread: { flex: 1, borderWidth: 1, borderColor: '#3c3c3c', overflow: 'hidden' }, // square corners, a thin dark grey line
  lead: { fontFamily: fonts.ui, fontSize: 17, lineHeight: 24, color: colors.white },
  // the standard section heading (as in the library and Help), with a + / − at the far right
  box: { ...sectionBox, gap: 10 }, // each section in its own black glass box
  secIcon: { width: 28, height: 28 }, // the section's little line icon
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SECTION_GAP - 10 },
  section: { ...boxTitle, flex: 1 },
  secChev: { fontFamily: fonts.ui, fontSize: 30, lineHeight: 34, color: 'rgba(255,255,255,0.75)', width: 30, textAlign: 'center' },
  caption: { alignSelf: 'center', marginTop: -36, marginBottom: 20, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: '#bdbdbd' }, // under the book picture
  intro: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#cfcfcf', marginBottom: 12 }, // a clear gap before the ideas
  card: { backgroundColor: '#3a3a3a', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontFamily: fonts.uiBold, fontSize: 17, color: colors.white },
  chev: { fontFamily: fonts.ui, fontSize: 22, color: 'rgba(255,255,255,0.75)', width: 22, textAlign: 'center' },
  p: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: '#e6e6e6' },
  how: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: colors.white, fontStyle: 'italic', marginTop: 4 },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
});
