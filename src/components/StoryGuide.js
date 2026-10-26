// Quick guide for making a story. Shown the first time, and from the "?" button.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';

export const GUIDE_STEPS = [
  { title: 'Add a picture', body: 'Tap the grey area to choose a picture from your photos. Square pictures work best: they fill the page and show in full. For a sharp result, use at least 1500 × 1500 pixels. You can crop a photo to a square right after picking it.' },
  { title: 'Write the words', body: 'Type below the picture. Two or three short sentences per page is easiest for young readers to follow.' },
  { title: 'Turn the page', body: 'Tap the folded corner at the bottom right to add the next page. To go back to an earlier page, tap Pages and choose it.' },
  { title: 'Arrange your pages', body: 'Tap Pages to jump to any page, move it up or down, or delete it.' },
  { title: 'Name it and finish', body: 'Tap the title in the bottom bar to rename your story. Everything saves as you go. Tap Done when you’re finished. To change it later, hold its cover in My Library.' },
  { title: 'Read it in your voice', body: 'Open your story and tap the red button to record yourself reading each page. Your child will hear your voice every time.', ideas: true },
];

// area: the space between the bars, so the card sits right in the middle of the book
export default function StoryGuide({ visible, onClose, area, onIdeas }) {
  const tr = useT();
  const [step, setStep] = useState(0);
  const [w, setW] = useState(0); // the width of the text area
  useEffect(() => { if (visible) setStep(0); }, [visible]);
  if (!visible) return null;
  const s = GUIDE_STEPS[step];
  const last = step === GUIDE_STEPS.length - 1;
  return (
    <View style={[styles.scrim, area]}>
      {/* solid near-black, like the menus' title bars and the Book Store cards */}
      <View style={{ width: '100%', maxWidth: 440 }}>
      <View style={styles.card} accessibilityRole="summary">
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#141414' }]} />
        <Text style={styles.kicker}>{tr('Guide: How to make a story · {a} of {b}', { a: step + 1, b: GUIDE_STEPS.length })}</Text>
        {/* every step in one row of equal-width slots: the row is as tall as the wordiest step, so the box
            keeps the same size for all six steps; only the current step is shown */}
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', width: w * GUIDE_STEPS.length, opacity: w ? 1 : 0, transform: [{ translateX: -step * w }] }}>
            {GUIDE_STEPS.map((g, k) => (
              <View key={k} style={{ width: w, gap: 12 }} accessibilityElementsHidden={k !== step} importantForAccessibility={k === step ? 'auto' : 'no-hide-descendants'}>
                <Text style={styles.title}>{tr(g.title)}</Text>
                <Text style={styles.body}>{tr(g.body)}</Text>
                {/* the last step points to the Idea Room for inspiration */}
                {g.ideas ? (
                  <Text style={styles.body}>{tr('Need ideas or inspiration?')}{' '}
                    {onIdeas ? <Text onPress={onIdeas} accessibilityRole="link" style={styles.link}>{tr('Visit Ideas')}</Text> : tr('Visit Ideas')}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
        <View style={styles.dots}>
          {GUIDE_STEPS.map((_, k) => <View key={k} style={[styles.dot, k === step && styles.dotOn]} />)}
        </View>
        <View style={styles.row}>
          <Pressable onPress={onClose} hitSlop={8}><Text style={styles.skip}>{last ? '' : tr('Skip')}</Text></Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {step > 0 ? <Pressable onPress={() => setStep(step - 1)} style={styles.btn}><Text style={styles.btnText}>{tr('Back')}</Text></Pressable> : null}
            <Pressable onPress={() => (last ? onClose() : setStep(step + 1))} style={[styles.btn, styles.btnMain]}>
              <Text style={styles.btnText}>{last ? tr('Start making') : tr('Next')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 70 },
  card: { padding: 24, gap: 12, overflow: 'hidden', width: '100%' },
  kicker: { color: colors.muted, fontFamily: fonts.uiBold, fontSize: 13, letterSpacing: 0.3 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 26 },
  body: { color: '#e2e2e2', fontFamily: fonts.ui, fontSize: 17, lineHeight: 25 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#555' },
  dotOn: { backgroundColor: colors.blue },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  skip: { color: colors.muted, fontFamily: fonts.uiBold, fontSize: 15 },
  btn: { backgroundColor: colors.tile, paddingHorizontal: 20, height: 44, borderRadius: 22, justifyContent: 'center', overflow: 'hidden' }, // pills
  btnMain: { backgroundColor: colors.blue }, // primary blue (the red is kept for recording)
  link: { color: '#6fb1ff', fontFamily: fonts.uiBold, textDecorationLine: 'underline' },
  btnText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
});
