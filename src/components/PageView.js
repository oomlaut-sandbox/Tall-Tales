// One story page: illustration on top, words below (or, sideways, picture left and words right).
// Each word can be tapped.
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { bookFont, colors, fonts } from '../theme';
import { Felt } from '../look';
import { tokenize } from '../story';
import { useT } from '../i18n';
import ZoomArt from './ZoomArt';
// the end of a book: fine grey line-art icons
const END_AGAIN = require('../../assets/icon-again-line.png');
const END_LIBRARY = require('../../assets/icon-home.png'); // My Library: the same house as on the bars
const END_SHARE = require('../../assets/icon-share-line.png'); // a straight arrow to the right, drawn like the Read Again arrow

// The picture area is a perfect square (as wide as the screen). Only on unusually short
// screens is it capped, so the words always keep at least a third of the page.
export const artHeight = (width, height) => Math.min(width, height * 0.68);

// Text sizes the reader can choose (Playback Options → Text size).

export const TEXT_SIZES = [['Small', 0.85], ['Medium', 1], ['Large', 1.25]];

// Where the picture and the words go. Upright: square picture on top, words below.
// Sideways (much wider than tall): square picture on the left, words on the right.
export function pageLayout(width, height) {
  if (width > height * 1.25) {
    const S = Math.min(height, width / 2), textW = width - S;
    return { wide: true, artW: S, artH: S, textW, textH: height, padX: textW * 0.1, padY: height * 0.08, base: height };
  }
  const artH = artHeight(width, height);
  return { wide: false, artW: width, artH, textW: width, textH: height - artH, padX: width * 0.09, padY: width * 0.06, base: width };
}

// Starts at the chosen size and only shrinks if the words wouldn't fit in their space.
function fitFontSize(text, L, scale = 1, font = bookFont()) {
  let fs = Math.min(30, Math.max(19, L.base * 0.066)) * scale * font.size;
  const tw = L.textW - 2 * L.padX, th = L.textH - 2 * L.padY;
  for (let i = 0; i < 60 && fs > 13; i++) {
    const perLine = Math.max(4, Math.floor(tw / (fs * font.width)));
    const lines = Math.ceil(text.length / perLine) + (scale > 1 ? 0.5 : 1);
    if (lines * fs * 1.62 <= th) break;
    fs -= 1;
  }
  return fs;
}

// A soft shadow made of thin bands that fade out, so it works everywhere without extra libraries.
// Used along the seam between picture and words, so the page seems to curve into a book's spine.
export function Fade({ edge, size, max }) {
  // One smooth gradient (no steps): darkest at the edge, easing out to nothing.
  const N = 12;
  const stops = Array.from({ length: N + 1 }, (_, i) => i / N);
  const cols = stops.map((t) => `rgba(0,0,0,${(max * Math.pow(1 - t, 2)).toFixed(4)})`);
  const toEdge = edge === 'bottom' || edge === 'right';
  // sideways books: the same shading, running across (towards the right or left edge) instead of up and down
  const across = edge === 'left' || edge === 'right';
  return (
    <LinearGradient pointerEvents="none" colors={toEdge ? cols.slice().reverse() : cols} locations={stops}
      start={across ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 }} end={across ? { x: 1, y: 0.5 } : { x: 0.5, y: 1 }}
      style={across ? { position: 'absolute', top: 0, bottom: 0, [edge]: 0, width: size } : { position: 'absolute', left: 0, right: 0, [edge]: 0, height: size }} />
  );
}

// Amber light (Reading Options): warm, lower-contrast pages for evenings: amber paper, warm brown words, and the
// pictures tinted amber and a little dimmer. Off by default (white pages show the pictures best by day).
export const AMBER = { paper: '#dcbd8c', ink: '#3a2618', title: '#4a3322', tint: '#ffe0b0', dim: 0.08, flap: '#e8cfa3', under: '#a8895c' }; // the dog-ear: flap (the back of the amber page, a little lighter) and the corner under it (darker amber)
export function AmberTint() {
  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: AMBER.tint, mixBlendMode: 'multiply' }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(40,20,0,${AMBER.dim})` }]} />
    </>
  );
}

export const PageView = forwardRef(function PageView(
  { page, width, height, bottomInset = 0, textScale = 1, fontKey = 'serif', highlight = -1, onWord, showHotspots, onHotspot, bubble, end, onReadAgain, onLibrary, onShare, zoomable, amber },
  ref,
) {
  const t = useT();
  const words = useMemo(() => (page && page.text ? tokenize(page.text) : []), [page]);
  // bottomInset: room kept clear at the bottom for the reader's see-through control bar
  const L = useMemo(() => { const l = pageLayout(width, height); return { ...l, textH: l.textH - bottomInset }; }, [width, height, bottomInset]);
  const { artW, artH } = L;
  const font = bookFont(fontKey);
  const fs = useMemo(() => fitFontSize(page?.text || '', L, textScale, font), [page, L, textScale, font]);
  const storyStyle = [styles.story, { fontFamily: font.family, fontSize: fs, lineHeight: fs * 1.62 }, amber && { color: AMBER.ink }];

  // Map hotspot fractions onto the image as drawn with "cover".
  const spots = useMemo(() => {
    if (!page || !page.hotspots) return [];
    const s = Math.max(artW / page.w, artH / page.h);
    const ox = (artW - page.w * s) / 2, oy = (artH - page.h * s) / 2;
    return page.hotspots.map((h) => ({
      ...h,
      left: Math.min(artW - 26, Math.max(26, ox + h.x * page.w * s)),
      top: Math.min(artH - 26, Math.max(26, oy + h.y * page.h * s)),
    }));
  }, [page, artW, artH]);

  // A page that doesn't exist (shouldn't happen) is drawn as blank paper instead of crashing.
  if (!page && !end) return <View ref={ref} collapsable={false} style={[styles.page, { width, height }, amber && { backgroundColor: AMBER.paper }]} />;

  return (
    <View ref={ref} collapsable={false} style={[styles.page, { width, height }, L.wide && styles.row, amber && { backgroundColor: AMBER.paper }]}>
      {/* The picture square, with a very soft shadow falling below it. */}
      <View style={[L.wide ? { width: artW, height, justifyContent: 'center' } : styles.artShadow, { zIndex: 1 }]}>
      <View style={[styles.art, { width: artW, height: artH }, page?.whiteArt && { backgroundColor: colors.white }, page?.blankArt && { backgroundColor: '#d9d9d9' }]}>{/* blankArt: a light grey placeholder until a picture is added */}
        {end ? (
          // "The End" on a plain white page, in the book's own font and size, like a page of words
          <View style={[styles.fill, styles.endArt]} accessibilityLabel={t('The End')}>
            <Text style={[storyStyle, styles.endTitle]}>{t('The End')}</Text>
          </View>
        ) : (
          page?.image ? (zoomable ? <ZoomArt source={page.image} width={artW} height={artH} /> : <Image source={page.image} style={styles.fill} resizeMode="cover" />) : null
        )}
        {showHotspots
          ? spots.map((h, i) => (
              <Pressable key={i} onPress={() => onHotspot && onHotspot(h)} accessibilityLabel={h.say} hitSlop={10}
                style={[styles.hot, { left: h.left - 23, top: h.top - 23 }]} />
            ))
          : null}
        {bubble ? (
          <View pointerEvents="none" style={[styles.bubble, { left: Math.max(8, Math.min(artW - 220, bubble.left - 110)), top: Math.max(8, bubble.top - 70) }]}>
            <Text style={styles.bubbleText}>{bubble.say}</Text>
          </View>
        ) : null}
        {/* Amber light: the picture warmed (a soft amber laid over it, multiplied) and a little dimmer */}
        {amber ? <AmberTint /> : null}
        {/* the spine shading: on the picture's edge where it meets the words (bottom upright, right when sideways) */}
        {L.wide ? <Fade edge="right" size={Math.round(artW * 0.1)} max={0.22} /> : <Fade edge="bottom" size={Math.round(artH * 0.1)} max={0.22} />}
      </View>
      </View>
      <View style={[styles.textBox, { paddingHorizontal: L.padX, paddingTop: L.padY, paddingBottom: L.padY + bottomInset }]}>
        <Felt opacity={0.7} />
        {/* a page of two pictures: the second fills the words square */}
        {!end && page?.image2 && !(page.text || '').trim() ? <Image source={page.image2} style={styles.fill} resizeMode="cover" /> : null}
        {L.wide ? <Fade edge="left" size={Math.round(L.textW * 0.09)} max={0.13} /> : <Fade edge="top" size={Math.round(L.textH * 0.09)} max={0.13} />}
        {/* the spine: a thin dark grey line where the two squares meet */}
        <View pointerEvents="none" style={L.wide ? styles.spineV : styles.spine} />
        {end ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={storyStyle}>{t('Thank you for reading.')}</Text>
            {/* stacked: a fine grey line-art icon (no box) and the words beside it */}
            <View style={{ gap: 12, marginTop: 20, alignSelf: 'center' }}>
              {[[END_AGAIN, 'Read Again', onReadAgain], [END_SHARE, 'Share Book', onShare], [END_LIBRARY, 'My Library', onLibrary]].filter(([, , fn]) => !!fn).map(([g, label, fn]) => (
                <Pressable key={label} onPress={fn} style={styles.endBtn} accessibilityRole="button">
                  <Image source={g} style={styles.endIc} resizeMode="contain" />
                  <Text style={styles.endBtnText}>{t(label)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          (() => {
            const word = (w, i, last, shown) => (
              <Text key={i} onPress={onWord ? () => onWord(i, w.word) : undefined} style={i === highlight ? styles.hl : null}>
                {shown ?? w.word}{i < last ? (page && page.text && /\n/.test(page.text.slice(w.end, words[i + 1] ? words[i + 1].start : w.end)) ? '\n' : ' ') : ''}{/* poems keep their line breaks */}
              </Text>
            );
            // A title page ("Title. Written and illustrated by …"): the title in bold on its own
            // line(s), a space, then the author line in small regular type. Word positions stay the same,
            // so narration highlighting still lines up.
            const k = page?.titlePage ? words.findIndex((w) => /\.$/.test(w.word)) : -1;
            if (k >= 0 && k < words.length - 1) {
              return (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[storyStyle, font.bold ? { fontFamily: font.bold } : styles.titleWords, { fontSize: Math.round(fs * 1.45), lineHeight: Math.round(fs * 1.45 * 1.2), color: amber ? AMBER.title : '#454545', textAlign: 'center' }]}>
                    {words.slice(0, k + 1).map((w, i) => word(w, i, k, i === k ? w.word.replace(/\.$/, '') : undefined))}
                  </Text>
                  <View style={{ height: fs * 0.7 }} />
                  {/* the author and illustrator credits in small type, like the cover's byline */}
                  <Text style={[storyStyle, { fontSize: Math.round(fs * 0.65), lineHeight: Math.round(fs * 0.65 * 1.5) }]}>
                    {words.slice(k + 1).map((w, j) => word(w, k + 1 + j, words.length - 1))}
                  </Text>
                </View>
              );
            }
            return <Text style={storyStyle}>{words.map((w, i) => word(w, i, words.length - 1))}</Text>;
          })()
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  page: { backgroundColor: colors.paper, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  art: { backgroundColor: '#7d7d7d', overflow: 'hidden' },
  artShadow: { backgroundColor: '#7d7d7d', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  row: { flexDirection: 'row' },
  spineV: { position: 'absolute', top: 0, bottom: 0, left: 0, width: StyleSheet.hairlineWidth * 2, backgroundColor: '#4a4a4a' },
  spine: { position: 'absolute', left: 0, right: 0, top: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: '#4a4a4a' },
  theEnd: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  theEndText: { color: colors.white, fontFamily: fonts.story, fontSize: 52 },
  textBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  story: { fontFamily: fonts.story, color: colors.ink, textAlign: 'center' },
  titleWords: { fontWeight: '700' },
  hl: { color: colors.wordRed },
  hot: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.12)' },
  bubble: { position: 'absolute', width: 220, alignItems: 'center' },
  bubbleText: { backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.story, fontSize: 22, paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden' },
  endArt: { backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  endTitle: { textAlign: 'center' },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  endIc: { width: 21, height: 21, tintColor: '#5c5c5c' },
  endGlyph: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 18 },
  endBtnText: { color: '#2e2e2e', fontFamily: fonts.ui, fontWeight: '500', fontSize: 16 },
});
