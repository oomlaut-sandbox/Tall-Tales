// Looks ("skins"). Classic: the plain dark grey and black. Felt: the same colours, but every surface
// (desk, bars, menus, pages, title bands) gets a soft felt texture, and menus and buttons get
// stitched edges, like the felt objects Jörg uses as inspiration.
import React, { createContext, useContext } from 'react';
import { Dimensions, Image, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

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

// Jörg's charcoal felt, being tried as the background (start page, My Library, Book Store, Make a Book).
// To go back to the plain dark grey (colors.desk, #3b3b3b), stop passing it / remove the Image that uses it.
// Phones only: the iPad (and other tablet-sized screens) keeps the 'classic' look with the plain dark grey,
// because the felt photo is phone-shaped and looks blotchy when enlarged that much.
const { width: W0, height: H0 } = Dimensions.get('screen');
export const IS_TABLET = Platform.isPad || Math.min(W0, H0) >= 600;
export const DESK_FELT = require('../assets/desk-felt.jpg'); // (on iPad it's drawn as a seamless tile instead: DESK_TILE)
// iPad (Jörg, 27 Oct 2026): the felt is back, as a seamless tile cut from the same photo, repeated at the phone's
// scale, so it stays sharp and even however big the screen is. Phones are unchanged.
export const DESK_TILE = require('../assets/desk-felt-tile.jpg');
// Jörg's own iPad felt (27 Oct 2026): one big photo for upright, the same turned for sideways
const DESK_IPAD = require('../assets/desk-felt-ipad.jpg');
const DESK_IPAD_WIDE = require('../assets/desk-felt-ipad-wide.jpg');
export const DESK_IPAD_NOW = (w, h) => (w > h ? DESK_IPAD_WIDE : DESK_IPAD);

// The felt background, locked in place. Every screen draws the same picture at the same size and in the
// same spot on the screen (the whole window), and only shows the part that falls inside its own area, so
// when one screen gives way to another the felt never shifts, scales or jumps.
const feltSpots = {}; // where each felt area was last time (so it's right from the very first frame next time)
// The whole app has one felt underneath everything (App.js); a screen's own felt only shows once it knows
// exactly where it is, so until then the one underneath shows through and nothing ever jumps.
// overlay: a full-screen layer on top (starts at the screen's corner, so it can show straight away).
export const DESK_BG = DESK_FELT ? 'transparent' : '#3b3b3b';
// iPad: the felt tile laid edge to edge, 420 points a side (the phone's scale), each one turned or mirrored
// a different way so the pattern never visibly repeats (a mirrored join always lines up)
const TILE_PT = 420;
const FLIPS = [[1, 1], [-1, 1], [1, -1], [-1, -1], [-1, 1], [1, 1], [-1, -1], [1, -1], [1, -1]];
function TileFelt({ left, top, w, h }) {
  const cols = Math.ceil(w / TILE_PT) + 1, rows = Math.ceil(h / TILE_PT) + 1;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const [sx, sy] = FLIPS[(r * 5 + c * 3) % FLIPS.length];
    out.push(<Image key={r + '-' + c} source={DESK_TILE} resizeMode="cover" fadeDuration={0}
      style={{ position: 'absolute', left: left + c * TILE_PT, top: top + r * TILE_PT, width: TILE_PT, height: TILE_PT, transform: [{ scaleX: sx }, { scaleY: sy }] }} />);
  }
  return <>{out}</>;
}
export function DeskFelt({ spot = 'any', overlay }) {
  const win = useWindowDimensions();
  const ref = React.useRef(null);
  const [at, setAt] = React.useState(feltSpots[spot] || null);
  const measure = () => ref.current && ref.current.measureInWindow && ref.current.measureInWindow((x, y) => {
    if (x == null || y == null) return;
    const n = { x, y };
    feltSpots[spot] = n;
    setAt((o) => (o && o.x === x && o.y === y ? o : n));
  });
  if (!DESK_FELT) return null;
  if (!at && !overlay) return <View ref={ref} collapsable={false} onLayout={measure} pointerEvents="none" style={StyleSheet.absoluteFill} />;
  const o = at || { x: 0, y: 0 };
  return (
    <View ref={ref} collapsable={false} onLayout={measure} pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {IS_TABLET
        ? <Image source={DESK_IPAD_NOW(win.width, win.height)} resizeMode="cover" style={{ position: 'absolute', left: -o.x, top: -o.y, width: win.width, height: win.height }} />
        : <Image source={DESK_FELT} resizeMode="cover" style={{ position: 'absolute', left: -o.x, top: -o.y, width: win.width, height: win.height }} />}
    </View>
  );
}

// A title band's felt picture. Phone: stretched across, as before. iPad: the band's own picture kept at its own
// shape and repeated across the wide screen, every other copy mirrored so the joins don't show (Jörg, 27 Oct 2026).
export function BandFill({ source }) {
  const [box, setBox] = React.useState(null);
  if (!IS_TABLET) return <Image source={source} resizeMode="stretch" style={{ width: '100%', height: '100%' }} />;
  const r = (Image.resolveAssetSource && Image.resolveAssetSource(source)) || { width: 1400, height: 344 };
  const w1 = box ? box.h * (r.width || 1400) / (r.height || 344) : 0;
  const n = box && w1 ? Math.ceil(box.w / w1) + 1 : 0;
  return (
    <View style={{ width: '100%', height: '100%', flexDirection: 'row', overflow: 'hidden' }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {Array.from({ length: n }, (_, k) => <Image key={k} source={source} resizeMode="stretch" style={{ width: w1, height: '100%', transform: k % 2 ? [{ scaleX: -1 }] : [] }} />)}
    </View>
  );
}
