import { Platform } from 'react-native';

export const colors = {
  red: '#bd1212',
  highlight: '#e3000f', // the record button (and its dot in the speech bubbles)
  deepRed: '#a5121d', // red pill buttons and menu marks: a deeper, darker red
  wordRed: '#b0000c', // the word being read: a deeper red
  paper: '#c9c9c9',
  ink: '#111111',
  bar: '#000000',
  desk: '#3b3b3b', // the dark grey the book floats on in the reader. KEEP: start page, My Library, Book Store and
  // Create a Story are trying Jörg's charcoal felt (DESK_FELT in look.js) over it; remove that to go back to this grey
  earUnder: '#a3a3a3', // the page showing under the dog-ear in books (a little lighter than before)
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
  typewriter: { label: 'Typewriter', family: 'SpecialElite_400Regular', css: '"Special Elite", "Courier New", monospace', width: 0.58, size: 0.9 },
};
export const bookFont = (key) => BOOK_FONTS[key] || BOOK_FONTS.serif;

// The phone column never grows past this width (matters on tablets and the web preview).
export const MAX_WIDTH = 460;
