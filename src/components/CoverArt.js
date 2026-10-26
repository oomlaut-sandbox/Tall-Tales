// A book cover made in the Cover Editor: the cover picture with the title laid on top
// (where the maker dragged it, at the size they chose). Fills its parent square.
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { bookFont } from '../theme';

export const COVER_FONT = 'EBGaramond_700Bold';

// The cover title's colours: a small natural palette, plus white, greys and black.
export const COVER_COLORS = [
  ['#ffffff', 'White'], ['#f4f1ea', 'Soft white'], ['#a8a39a', 'Stone grey'], ['#5b6670', 'Slate grey'], ['#36393b', 'Charcoal'], ['#1e1a17', 'Warm black'],
  ['#2f5d3a', 'Forest green'], ['#c9a227', 'Mustard'], ['#c4683f', 'Terracotta'], ['#6b8cae', 'Dusty blue'], ['#1f3a5f', 'Dark blue'], ['#6e3f63', 'Plum'], ['#7a5230', 'Warm brown'],
];
// the title's chosen font and colour (any of the reading fonts; bold where there is one).
// Dark colours get a light glow instead of a dark shadow, so they still read on a dark picture.
export function coverTitleLook(t, byline) {
  const f = bookFont((t && t.font) || 'serif');
  const color = (t && t.color) || '#ffffff';
  const dark = parseInt(color.slice(1, 3), 16) * 0.3 + parseInt(color.slice(3, 5), 16) * 0.59 + parseInt(color.slice(5, 7), 16) * 0.11 < 110;
  return { fontFamily: byline ? f.family : f.bold || f.family, fontWeight: !byline && !f.bold ? '700' : undefined, color,
    textShadowColor: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.55)' };
}
// the 'written by / illustrated by' line under a cover title (optional)
export const bylineStyle = { fontFamily: 'EBGaramond_500Medium', marginTop: 2 };
export const titleStyle = { fontFamily: COVER_FONT, color: '#ffffff', textAlign: 'center',
  textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 };

// cover: { uri, title: { text, x, y, size } | null }; x and y are the title's centre as a share of the
// square (0..1), size is the letter size as a share of the square's width.
// (Jörg, 26 Oct 2026) the title's text box can be narrower (w, a share of the width; 1 = the whole width) and aligned
// left, centre or right (align); the author line can be placed on its own (bx, by, bs: its centre and size), with
// its own colour and font (bColor, bFont). Older covers without these keep the author line under the title.
export const bylineLook = (t) => ({ color: t.bColor || t.color, font: t.bFont || t.font });
// where the title and the author line go, for a square W wide
export function coverBoxes(t, W) {
  const w = t.w || 1, align = t.align || 'center';
  const title = { position: 'absolute', left: (t.x - w / 2) * W, width: w * W, top: t.y * W, transform: [{ translateY: -t.size * W * 0.65 }],
    alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' };
  const own = t.byline && t.bx != null;
  const bs = own ? t.bs || t.size * 0.42 : t.size * 0.42;
  const bw = t.bw || 1;
  const byline = own ? { position: 'absolute', left: (t.bx - bw / 2) * W, width: bw * W, top: t.by * W, transform: [{ translateY: -bs * W * 0.65 }],
    alignItems: (t.balign || align) === 'left' ? 'flex-start' : (t.balign || align) === 'right' ? 'flex-end' : 'center' } : null;
  return { title, byline, bs, align, balign: t.balign || align };
}
export default function CoverArt({ cover }) {
  const [w, setW] = useState(0);
  if (!cover || !cover.uri) return null;
  const t = cover.title;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Image source={{ uri: cover.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {t && t.text && w ? (() => {
        const B = coverBoxes(t, w);
        const by = <Text style={[titleStyle, bylineStyle, coverTitleLook(bylineLook(t), true), { fontSize: B.bs * w, lineHeight: B.bs * w * 1.4, paddingHorizontal: w * 0.04, textAlign: B.balign }]}>{t.byline}</Text>;
        return (
          <>
            <View style={B.title}>
              <Text style={[titleStyle, coverTitleLook(t), { fontSize: t.size * w, lineHeight: t.size * w * 1.2, paddingHorizontal: w * 0.04, textAlign: B.align }]}>{t.text}</Text>
              {t.byline && !B.byline ? by : null}
            </View>
            {B.byline ? <View style={B.byline}>{by}</View> : null}
          </>
        );
      })() : null}
    </View>
  );
}
