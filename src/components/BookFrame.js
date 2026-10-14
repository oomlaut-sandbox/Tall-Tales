// The floating book: two equal squares on dark grey with about 30 points of grey all round and a
// soft drop shadow, a black strip over the camera and a black bar at the bottom. The bars take
// whatever height is left over.
//
// Upright (phones, and iPads held upright) the squares are stacked: picture above words. On a
// screen that is clearly wider than tall (an iPad held sideways) they sit side by side.
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export const BOOK_GAP = 30;

// Sizes for the book on this screen. barMin: the bottom bar's own height (without the home-indicator area).
export function bookLayout(winW, winH, insets, barMin) {
  const G = BOOK_GAP;
  const minTop = insets.top, minBar = barMin + insets.bottom;
  const room = winH - minTop - minBar - 2 * G;
  const wide = winW > winH * 1.1;
  const side = Math.floor(Math.max(120, wide ? Math.min((winW - 2 * G - insets.left - insets.right) / 2, room) : Math.min(winW - 2 * G, room / 2)));
  const bookW = wide ? side * 2 : side, bookH = wide ? side : side * 2;
  const spare = Math.max(0, room - bookH);
  return { side, wide, bookW, bookH, topH: minTop + spare / 2, barH: minBar + spare / 2, spare };
}

// children: a function given { side, wide } that draws the two squares.
export default function BookFrame({ barMin, bar, children, deskProps, bookProps, under }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const L = bookLayout(winW, winH, insets, barMin);
  return (
    <View style={styles.screen}>
      <View style={{ height: L.topH, backgroundColor: colors.bar }} />
      <View style={styles.desk} {...deskProps}>
        <View style={[styles.shadow, { width: L.bookW, height: L.bookH }]}>
          <View style={[styles.book, { flexDirection: L.wide ? 'row' : 'column' }]} {...bookProps}>
            {children(L)}
          </View>
        </View>
        {under}
      </View>
      <View style={{ backgroundColor: colors.bar, paddingTop: L.spare / 2 }}>{bar}</View>
    </View>
  );
}

// The thin dark spine line plus soft shading where the two squares meet.
export function Spine({ wide }) {
  return <View pointerEvents="none" style={wide ? styles.spineV : styles.spineH} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.desk },
  shadow: { backgroundColor: colors.paper, shadowColor: '#000', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  book: { flex: 1, overflow: 'hidden', backgroundColor: colors.paper },
  spineH: { position: 'absolute', left: 0, right: 0, top: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: '#4a4a4a' },
  spineV: { position: 'absolute', top: 0, bottom: 0, left: 0, width: StyleSheet.hairlineWidth * 2, backgroundColor: '#4a4a4a' },
});
