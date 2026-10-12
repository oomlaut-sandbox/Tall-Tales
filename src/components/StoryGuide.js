// Quick guide for making a story. Shown the first time, and from the "?" button.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export const GUIDE_STEPS = [
  { title: 'Add a picture', body: 'Tap the grey area to choose a picture from your photos. Square pictures work best: they fill the page and show in full. For a sharp result, use at least 1500 × 1500 pixels. You can crop a photo to a square right after picking it.' },
  { title: 'Write the words', body: 'Type below the picture. Two or three short sentences per page is easiest for young readers to follow.' },
  { title: 'Turn the page', body: 'Tap the folded corner at the bottom right to add the next page. Tap ‹ in the bottom bar to go back a page.' },
  { title: 'Arrange your pages', body: 'Tap Pages to jump to any page, move it up or down, or delete it.' },
  { title: 'Name it and finish', body: 'Tap the title in the bottom bar to rename your story. Everything saves as you go. Tap Done when you’re finished. To change it later, hold its cover in My Library.' },
  { title: 'Read it in your voice', body: 'Open your story and tap the red button to record yourself reading each page. Your child will hear your voice every time.' },
];

export default function StoryGuide({ visible, onClose }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (visible) setStep(0); }, [visible]);
  if (!visible) return null;
  const s = GUIDE_STEPS[step];
  const last = step === GUIDE_STEPS.length - 1;
  return (
    <View style={styles.scrim}>
      <View style={styles.card} accessibilityRole="summary">
        <Text style={styles.kicker}>How to make a story · {step + 1} of {GUIDE_STEPS.length}</Text>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.body}>{s.body}</Text>
        <View style={styles.dots}>
          {GUIDE_STEPS.map((_, k) => <View key={k} style={[styles.dot, k === step && styles.dotOn]} />)}
        </View>
        <View style={styles.row}>
          <Pressable onPress={onClose} hitSlop={8}><Text style={styles.skip}>{last ? '' : 'Skip'}</Text></Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {step > 0 ? <Pressable onPress={() => setStep(step - 1)} style={styles.btn}><Text style={styles.btnText}>Back</Text></Pressable> : null}
            <Pressable onPress={() => (last ? onClose() : setStep(step + 1))} style={[styles.btn, styles.btnMain]}>
              <Text style={styles.btnText}>{last ? 'Start making' : 'Next'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 70 },
  card: { backgroundColor: colors.panel, padding: 24, gap: 12 },
  kicker: { color: colors.muted, fontFamily: fonts.ui, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 26 },
  body: { color: '#e2e2e2', fontFamily: fonts.ui, fontSize: 17, lineHeight: 25 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#555' },
  dotOn: { backgroundColor: colors.highlight },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  skip: { color: colors.muted, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
  btn: { backgroundColor: colors.tile, paddingHorizontal: 18, paddingVertical: 12 },
  btnMain: { backgroundColor: colors.highlight },
  btnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
});
