// Words over a picture (Jörg, 30 Oct 2026): a page's own words, drawn on top of one of its pictures instead of
// on the words square. They stay the page's words, so narration, word highlighting, Learn to Read, recordings,
// translations and VoiceOver all work as before; only where they're drawn changes.
//
// On a page (saved with the book):
//   textOn    'top' | 'bottom'   which picture the words sit on (none = the words square, as always: the default)
//   textAt    { x, y }           the middle of the words, as a share of the picture's width and height
//   textLook  'light' | 'dark' | 'shadow' | 'plain'   a light panel, a dark panel, white words with a soft shadow,
//                                or the words alone (no shadow), dark or white (textInk)
//   textInk   'dark' | 'white'   (plain only)
//   textSize  0.8 | 1 | 1.25     smaller, as is, larger
//   both      true               words on both pictures (Jörg, 31 Oct 2026): the page's words on the top (left)
//                                picture, and text2 on the bottom (right) one, with their own textAt2, textLook2,
//                                textInk2 and textSize2. They read aloud top, then bottom, as one page.
import React, { useState } from 'react';
import { View } from 'react-native';

export const WORD_LOOKS = [['light', 'Light panel'], ['dark', 'Dark panel'], ['shadow', 'Shadow'], ['plain', 'No shadow']];
export const WORD_SIZES = [[0.8, 'Small'], [1, 'Medium'], [1.25, 'Large']];
export const DEFAULT_AT = { x: 0.5, y: 0.66 }; // (clear of the book maker's picture buttons along the bottom)

// words on the second picture too (both): its words, or ''
export function secondWords(page) {
  if (!page || !page.both || page.textOn !== 'top' || !(page.uri2 || page.image2)) return '';
  return (page.text2 || '').trim();
}
// the page's words as they're read aloud (and highlighted): the top words, then the bottom ones
export function readText(page) {
  const t2 = secondWords(page);
  if (!t2) return (page && page.text) || '';
  const t1 = ((page.text || '').trim());
  return t1 ? `${t1}\n${t2}` : t2;
}
// the second words' own settings, as a page of their own (to draw or edit them like the first)
export const secondOf = (p) => ({ ...p, text: p.text2 || '', textOn: 'bottom', textAt: p.textAt2, textLook: p.textLook2, textInk: p.textInk2, textSize: p.textSize2 });
export const SECOND_KEYS = { text: 'text2', textAt: 'textAt2', textLook: 'textLook2', textInk: 'textInk2', textSize: 'textSize2' };

// does this page draw its words over a picture? (only with words, and only on a picture that's there)
export function wordsOverOn(page) {
  if (!page || !(page.text || '').trim()) return null;
  if (page.textOn === 'top') return 'top';
  if (page.textOn === 'bottom' && (page.uri2 || page.image2)) return 'bottom';
  return null;
}

// the words' colour, and anything behind them, for a look
export function wordsLook(look, ink) {
  switch (look) {
    // hl: the word being read. The deep red of the pages on light; a lighter, brighter red on dark, so it still shows
    case 'dark': return { color: '#f7f4ee', panel: 'rgba(16,16,16,0.72)', hl: '#ff7070' };
    case 'shadow': return { color: '#ffffff', shadow: true, hl: '#ff7070' };
    case 'plain': return ink === 'white' ? { color: '#ffffff', hl: '#ff7070' } : { color: '#1c1c1c', hl: '#b0000c' };
    default: return { color: '#1c1c1c', panel: 'rgba(250,248,242,0.88)', hl: '#b0000c' };
  }
}

// the words' size over a picture (a little smaller than on the words square: they share it with the picture)
export const wordsOverSize = (side, size = 1, fontScale = 1) => Math.round(Math.min(30, Math.max(15, side * 0.056)) * size * fontScale);

// Places its child (the words, as Text) over a picture of boxW × boxH, centred on `at`, at most 84% of the width.
export default function WordsOver({ boxW, boxH, at = DEFAULT_AT, look = 'light', children, style, handlers }) {
  const [h0, setH] = useState(0);
  // big words (a large text size, or iPhone's larger text) never run off the picture: they shrink just enough to fit
  const fit = h0 > boxH * 0.92 ? (boxH * 0.92) / h0 : 1;
  const h = h0 * fit;
  const L = wordsLook(look);
  const maxW = boxW * 0.84;
  const pad = L.panel ? Math.round(boxW * 0.035) : 0;
  const y = Math.min(boxH - h / 2 - 6, Math.max(h / 2 + 6, (at.y ?? DEFAULT_AT.y) * boxH));
  const x = Math.min(boxW - maxW / 2, Math.max(maxW / 2, (at.x ?? DEFAULT_AT.x) * boxW));
  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', left: x - maxW / 2, width: maxW, top: y - h0 / 2 /* (scaled about its middle) */, alignItems: 'center', opacity: h ? 1 : 0 }, style]}>
      <View {...(handlers || {})} onLayout={(e) => setH(e.nativeEvent.layout.height)}
        style={{ transform: fit < 1 ? [{ scale: fit }] : undefined, backgroundColor: L.panel || 'transparent', borderRadius: Math.round(boxW * 0.03), paddingHorizontal: pad * 1.4, paddingVertical: pad }}>
        {children}
      </View>
    </View>
  );
}

// the style for the words Text inside WordsOver
export function wordsOverText(look, ink) {
  const L = wordsLook(look, ink);
  return { color: L.color, textAlign: 'center', ...(L.shadow ? { textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 } : null) };
}
