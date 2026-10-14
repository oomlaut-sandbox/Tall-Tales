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

// Sizes for the book on this screen. barMin: the menu bar's own thickness (without safe areas).
// Upright: black strip at the top (camera), menu bar at the bottom, squares stacked.
// Sideways (iPad): black strip on the left, menu bar down the right side, squares side by side.
// Either way the bars take whatever room is left after the book and its 30-point grey border.
export function bookLayout(winW, winH, insets, barMin) {
  const G = BOOK_GAP;
  const wide = winW > winH * 1.1;
  if (wide) {
    const minLeft = Math.max(insets.left, 20), minRight = barMin + insets.right;
    const roomW = winW - minLeft - minRight - 2 * G, roomH = winH - Math.max(insets.top, 0) - insets.bottom - 2 * G;
    const side = Math.floor(Math.max(120, Math.min(roomW / 2, roomH)));
    const spare = Math.max(0, roomW - 2 * side);
    return { side, wide, bookW: side * 2, bookH: side, leftW: minLeft + spare / 2, rightW: minRight + spare / 2, topH: 0, barH: 0, spare };
  }
  const minTop = insets.top, minBar = barMin + insets.bottom;
  const room = winH - minTop - minBar - 2 * G;
  const side = Math.floor(Math.max(120, Math.min(winW - 2 * G, room / 2)));
  const spare = Math.max(0, room - side * 2);
  return { side, wide, bookW: side, bookH: side * 2, topH: minTop + spare / 2, barH: minBar + spare / 2, leftW: 0, rightW: 0, spare };
}

// children: a function given the layout ({ side, wide, ... }) that draws the two squares.
// bar: the menu bar, or a function given the layout (so it can run down the side when wide).
// bare: no shared paper and shadow behind the two squares (the caller draws each square itself).
export default function BookFrame({ barMin, bar, children, deskProps, bookProps, under, bare }) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const L = bookLayout(winW, winH, insets, barMin);
  const barEl = typeof bar === 'function' ? bar(L) : bar;
  const book = (
    <View style={styles.desk} {...deskProps}>
      {bare ? (
        <View style={{ width: L.bookW, height: L.bookH }} {...bookProps}>{children(L)}</View>
      ) : (
        <View style={[styles.shadow, { width: L.bookW, height: L.bookH }]}>
          <View style={[styles.book, { flexDirection: L.wide ? 'row' : 'column' }]} {...bookProps}>
            {children(L)}
          </View>
        </View>
      )}
      {under}
    </View>
  );
  if (L.wide) {
    return (
      <View style={[styles.screen, { flexDirection: 'row' }]}>
        <View style={{ width: L.leftW, backgroundColor: colors.bar }} />
        {book}
        <View style={{ width: L.rightW, backgroundColor: colors.bar, flexDirection: 'row', justifyContent: 'flex-end' }}>{barEl}</View>
      </View>
    );
  }
  return (
    <View style={styles.screen}>
      <View style={{ height: L.topH, backgroundColor: colors.bar }} />
      {book}
      <View style={{ backgroundColor: colors.bar, paddingTop: L.spare / 2 }}>{barEl}</View>
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
