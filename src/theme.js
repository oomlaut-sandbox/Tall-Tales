import { Platform } from 'react-native';

export const colors = {
  red: '#bd1212',
  highlight: '#e3000f',
  paper: '#c9c9c9',
  ink: '#111111',
  bar: '#000000',
  panel: '#1c1c1c',
  panelHead: 'rgba(0,0,0,0.78)',
  tile: '#5f5f5f',
  orange: '#ffa500',
  blue: '#006aea',
  white: '#ffffff',
  muted: '#bdbdbd',
};

export const fonts = {
  ui: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' }),
  story: 'EBGaramond_400Regular',
};

// Fonts for the words in a book (Playback Options → Book font). Serif is the default.
// width: how wide the letters run (for fitting text); size: nudges the cursive up a little so it reads as easily.
export const BOOK_FONTS = {
  sans: { label: 'Helvetica', family: fonts.ui, css: 'Helvetica, Arial, sans-serif', width: 0.52, size: 0.92 },
  serif: { label: 'Serif', family: 'EBGaramond_400Regular', css: 'Story, Georgia, serif', width: 0.47, size: 1 },
  cursive: { label: 'Cursive', family: 'DancingScript_400Regular', css: 'Story, cursive', width: 0.44, size: 1.12 },
};
export const bookFont = (key) => BOOK_FONTS[key] || BOOK_FONTS.serif;

// The phone column never grows past this width (matters on tablets and the web preview).
export const MAX_WIDTH = 460;
