import { Platform } from 'react-native';

export const colors = {
  red: '#bd1212',
  highlight: '#e3000f',
  paper: '#c9c9c9',
  ink: '#111111',
  bar: '#000000',
  desk: '#3b3b3b', // the dark grey the book floats on in the reader
  earUnder: '#878787', // rgb(135,135,135): the page showing under the dog-ear in books
  panel: '#1c1c1c',
  panelHead: 'rgba(0,0,0,0.78)',
  tile: '#5f5f5f',
  orange: '#f28a00',
  green: '#487d49', // My Library green (Jörg's swatch)
  blue: '#006aea',
  white: '#ffffff',
  muted: '#bdbdbd',
};

export const fonts = {
  ui: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' }),
  story: 'EBGaramond_400Regular',
};

// Fonts for the words in a book (Playback Options → Book font). Serif is the default.
// width: how wide the letters run (for fitting text); size: fine-tunes how big each font looks.
// (A third, cursive font was tried and dropped; any saved "cursive" choice falls back to Serif.)
export const BOOK_FONTS = {
  sans: { label: 'Helvetica', family: fonts.ui, css: 'Helvetica, Arial, sans-serif', width: 0.52, size: 0.92 },
  serif: { label: 'Serif', family: 'EBGaramond_400Regular', bold: 'EBGaramond_700Bold', css: 'Story, Georgia, serif', width: 0.47, size: 1 },
};
export const bookFont = (key) => BOOK_FONTS[key] || BOOK_FONTS.serif;

// The phone column never grows past this width (matters on tablets and the web preview).
export const MAX_WIDTH = 460;
