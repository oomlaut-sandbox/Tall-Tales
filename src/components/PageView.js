// One story page: illustration on top, words below. Each word can be tapped.
import React, { forwardRef, useMemo } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { tokenize } from '../story';

function fitFontSize(text, width, height) {
  let fs = Math.min(30, Math.max(19, width * 0.066));
  const tw = width * 0.82, th = height * 0.5 - width * 0.12;
  for (let i = 0; i < 30 && fs > 13; i++) {
    const perLine = Math.max(8, Math.floor(tw / (fs * 0.47)));
    const lines = Math.ceil(text.length / perLine) + 1;
    if (lines * fs * 1.62 <= th) break;
    fs -= 1;
  }
  return fs;
}

export const PageView = forwardRef(function PageView(
  { page, width, height, highlight = -1, onWord, showHotspots, onHotspot, bubble, end, onReadAgain, onLibrary },
  ref,
) {
  const words = useMemo(() => (page && page.text ? tokenize(page.text) : []), [page]);
  const artH = height * 0.5;
  const fs = useMemo(() => fitFontSize(page?.text || '', width, height), [page, width, height]);

  // Map hotspot fractions onto the image as drawn with "cover".
  const spots = useMemo(() => {
    if (!page || !page.hotspots) return [];
    const s = Math.max(width / page.w, artH / page.h);
    const ox = (width - page.w * s) / 2, oy = (artH - page.h * s) / 2;
    return page.hotspots.map((h) => ({
      ...h,
      left: Math.min(width - 26, Math.max(26, ox + h.x * page.w * s)),
      top: Math.min(artH - 26, Math.max(26, oy + h.y * page.h * s)),
    }));
  }, [page, width, artH]);

  return (
    <View ref={ref} collapsable={false} style={[styles.page, { width, height }]}>
      <View style={[styles.art, { height: artH }]}>
        {end ? (
          <View style={styles.theEnd}><Text style={styles.theEndText}>The End</Text></View>
        ) : (
          <Image source={page.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        {showHotspots
          ? spots.map((h, i) => (
              <Pressable key={i} onPress={() => onHotspot && onHotspot(h)} accessibilityLabel={h.say} hitSlop={10}
                style={[styles.hot, { left: h.left - 23, top: h.top - 23 }]} />
            ))
          : null}
        {bubble ? (
          <View pointerEvents="none" style={[styles.bubble, { left: Math.max(8, Math.min(width - 220, bubble.left - 110)), top: Math.max(8, bubble.top - 70) }]}>
            <Text style={styles.bubbleText}>{bubble.say}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.textBox, { paddingHorizontal: width * 0.09, paddingTop: width * 0.06, paddingBottom: width * 0.06 }]}>
        {end ? (
          <View>
            <Text style={[styles.story, { fontSize: fs, lineHeight: fs * 1.62 }]}>Thank you for reading.</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
              <Pressable onPress={onReadAgain} style={styles.endBtn}><Text style={styles.endBtnText}>Read again</Text></Pressable>
              <Pressable onPress={onLibrary} style={styles.endBtn}><Text style={styles.endBtnText}>My Library</Text></Pressable>
            </View>
          </View>
        ) : (
          <Text style={[styles.story, { fontSize: fs, lineHeight: fs * 1.62 }]}>
            {words.map((w, i) => (
              <Text key={i} onPress={onWord ? () => onWord(i, w.word) : undefined} style={i === highlight ? styles.hl : null}>
                {w.word}{i < words.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  page: { backgroundColor: colors.paper, overflow: 'hidden' },
  art: { width: '100%', backgroundColor: '#7d7d7d', overflow: 'hidden' },
  theEnd: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  theEndText: { color: colors.white, fontFamily: fonts.story, fontSize: 52 },
  textBox: { flex: 1 },
  story: { fontFamily: fonts.story, color: colors.ink },
  hl: { color: colors.highlight },
  hot: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.12)' },
  bubble: { position: 'absolute', width: 220, alignItems: 'center' },
  bubbleText: { backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.story, fontSize: 22, paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden' },
  endBtn: { backgroundColor: colors.bar, paddingHorizontal: 18, paddingVertical: 12 },
  endBtnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15 },
});
