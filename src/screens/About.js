// About Oomlaut Reader (from the Settings menu).
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Felt, Stitch } from '../look';
import { Bar, BarMeta, Burger, WithBar } from '../components/Chrome';

const VERSION = require('../../app.json').expo.version;

export default function About({ u, openMenu }) {
  const insets = useSafeAreaInsets();
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
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.p}>
          Oomlaut Reader is a home for beautifully illustrated stories, made for children who are learning to read and the grown-ups who read with them.
        </Text>
        <Text style={styles.p}>
          Every book can be read aloud by a warm narrator, with each word lighting up as it’s spoken. In Learn to Read mode, children tap any word to hear it sounded out, one part at a time. Parents can record themselves reading each page, so a favourite story can be heard in a familiar voice, any time. And families can make their own books, with their own pictures and words.
        </Text>
        <Text style={styles.p}>Oomlaut Reader is made by Jörg Schmidt, an illustrator and author, and a parent.</Text>
        <Text style={styles.version}>Version {VERSION}</Text>
      </ScrollView>
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  band: { backgroundColor: colors.red, paddingBottom: 30, paddingHorizontal: 24 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32 },
  reg: { color: colors.white, fontFamily: fonts.ui, fontSize: 13, lineHeight: 15, marginTop: 4, marginLeft: 1 }, // small raised ®
  tagline: { color: colors.white, fontFamily: fonts.story, fontSize: 20, marginTop: 6, fontStyle: 'italic' },
  body: { padding: 24, paddingBottom: 40, gap: 16 },
  p: { fontFamily: fonts.story, fontSize: 19, lineHeight: 28, color: colors.ink },
  version: { fontFamily: fonts.ui, fontSize: 13, color: '#555', marginTop: 8 },
});
