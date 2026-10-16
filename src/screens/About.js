// About Oomlaut Reader (from the Settings menu).
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Felt, Stitch } from '../look';
import { Bar, BarMeta, Burger, WithBar } from '../components/Chrome';

const SKIPPY = require('../../assets/skippy/glasses-book.png'); // Skippy with his glasses and a book (449 × 600)

const VERSION = require('../../app.json').expo.version;

export default function About({ u, openMenu }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  // the words fit on one phone screen without scrolling (shorter phones get a slightly smaller size)
  const fs = winW >= 600 ? 19 : winH < 740 ? 13 : 15.5;
  const textStyle = { fontSize: fs, lineHeight: Math.round(fs * 1.38) };
  // the words sit in a column about half the page wide; Skippy stands in the white margin on the right, at the bottom
  // the words on the left, about half the page; the right half is Skippy's: a speech bubble about book
  // submissions above him, and him standing at the bottom right
  const colW = Math.round(winW * 0.5) - 30;
  const rightW = Math.min(320, winW - (colW + 24) - 18);
  const skW = Math.min(150, Math.round(rightW * 0.56));
  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        <Felt /><Stitch inset={7} />
        {/* the ® sits raised (superscript) after Oomlaut */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={styles.title}>Oomlaut</Text>
          <Text style={styles.reg}>®</Text>
          <Text style={styles.title}> Reader</Text>
        </View>
        <Text style={styles.tagline}>Picture books in your voice.</Text>
      </View>
      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.body, { width: colW + 24, gap: Math.round(fs * 0.7) }]}>
        <Text style={[styles.p, textStyle]}>
          Oomlaut Reader is a home for beautifully illustrated stories, made for children who are learning to read and the grown-ups who read with them.
        </Text>
        <Text style={[styles.p, textStyle]}>
          Every book can be read aloud by a warm narrator, with each word lighting up as it’s spoken. In Learn to Read mode, children tap any word to hear it sounded out, one part at a time. Parents can record themselves reading each page, so a favourite story can be heard in a familiar voice, any time. And families can make their own books, with their own pictures and words.
        </Text>
        <Text style={[styles.p, textStyle]}>Oomlaut Reader is made by Jörg Schmidt, an illustrator and author, and a parent.</Text>
        <Text style={styles.version}>Version {VERSION}</Text>
      </ScrollView>
      <View pointerEvents="box-none" style={{ position: 'absolute', right: 10, bottom: 12, width: rightW, alignItems: 'flex-end' }}>
        {/* Skippy's speech bubble: book submissions and the website */}
        <View style={[styles.bubble, { width: rightW }]}>
          <Text style={styles.bubbleText}>Oomlaut is always looking for new picture books. If you’ve written or illustrated a story, send it to us and join the Oomlaut author community. Visit oomlaut.com for more information.</Text>
          {/* the bubble's point, down towards Skippy */}
          <View style={[styles.bubbleTail, { right: skW * 0.42 }]} />
        </View>
        <Image source={SKIPPY} resizeMode="contain" accessibilityIgnoresInvertColors pointerEvents="none"
          style={{ width: skW, height: skW * 600 / 449, marginTop: 14 }} />
      </View>
      </View>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  band: { backgroundColor: colors.red, paddingBottom: 30, paddingHorizontal: 24 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32 },
  reg: { color: colors.white, fontFamily: fonts.ui, fontSize: 13, lineHeight: 15, marginTop: 4, marginLeft: 1 }, // small raised ®
  tagline: { color: colors.white, fontFamily: fonts.story, fontSize: 20, marginTop: 6, fontStyle: 'italic' },
  body: { paddingLeft: 24, paddingTop: 24, paddingBottom: 40, gap: 16 },
  p: { fontFamily: fonts.story, fontSize: 19, lineHeight: 28, color: colors.ink },
  bubble: { backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  bubbleText: { fontFamily: fonts.story, fontSize: 15, lineHeight: 20, color: colors.ink },
  bubbleTail: { position: 'absolute', bottom: -9, width: 18, height: 18, backgroundColor: '#ffffff', transform: [{ rotate: '45deg' }] },
  version: { fontFamily: fonts.ui, fontSize: 13, color: '#555', marginTop: 8 },
});
