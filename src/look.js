// Looks ("skins"). Classic: the plain dark grey and black. Felt: the same colours, but every surface
// (desk, bars, menus, pages, title bands) gets a soft felt texture, and menus and buttons get
// stitched edges, like the felt objects Jörg uses as inspiration.
import React, { createContext, useContext } from 'react';
import { Dimensions, Image, Platform, StyleSheet, View } from 'react-native';

export const LOOKS = [['classic', 'Classic'], ['felt', 'Felt']];
export const LookContext = createContext('classic');
export const useLook = () => useContext(LookContext);

const GRAIN = require('../assets/felt-grain.png'); // a see-through felt grain, tiled over any colour

// Felt texture over the surface it sits in (put it first, so the content draws on top).
export function Felt({ opacity = 1, style }) {
  const look = useLook();
  if (look !== 'felt') return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity }, style]}>
      <Image source={GRAIN} resizeMode="repeat" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

// A stitched edge just inside the surface it sits in.
export function Stitch({ inset = 5, radius = 0, color = 'rgba(255,255,255,0.5)', width = 1.5 }) {
  const look = useLook();
  if (look !== 'felt') return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: inset, top: inset, right: inset, bottom: inset,
      borderWidth: width, borderStyle: 'dashed', borderColor: color, borderRadius: radius ? Math.max(0, radius - inset) : 0 }} />
  );
}

// Jörg's charcoal felt, being tried as the background (start page, My Library, Book Store, Create a Story).
// To go back to the plain dark grey (colors.desk, #3b3b3b), stop passing it / remove the Image that uses it.
// Phones only: the iPad (and other tablet-sized screens) keeps the 'classic' look with the plain dark grey,
// because the felt photo is phone-shaped and looks blotchy when enlarged that much.
const { width: W0, height: H0 } = Dimensions.get('screen');
export const IS_TABLET = Platform.isPad || Math.min(W0, H0) >= 600;
export const DESK_FELT = IS_TABLET ? null : require('../assets/desk-felt.jpg');
