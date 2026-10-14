// Looks ("skins"). Classic: the plain dark grey and black. Felt: the same colours, but every surface
// (desk, bars, menus, pages, title bands) gets a soft felt texture, and menus and buttons get
// stitched edges, like the felt objects Jörg uses as inspiration.
import React, { createContext, useContext } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export const LOOKS = [['classic', 'Classic'], ['felt', 'Felt']];
export const LookContext = createContext('classic');
export const useLook = () => useContext(LookContext);

const GRAIN = require('../assets/felt-grain.png'); // a see-through felt grain, tiled over any colour

// Felt texture over the surface it sits in (put it first, so the content draws on top).
export function Felt({ opacity = 1, style }) {
  const look = useLook();
  if (look !== 'felt') return null;
  return <Image pointerEvents="none" source={GRAIN} resizeMode="repeat" style={[StyleSheet.absoluteFill, { width: undefined, height: undefined, opacity }, style]} />;
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
