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
  // Make a Book are trying Jörg's charcoal felt (DESK_FELT in look.js) over it; remove that to go back to this grey
  earUnder: '#a3a3a3', // the page showing under the dog-ear in books (a little lighter than before)
  panel: '#1c1c1c',
  glass: 'rgba(0,0,0,0.86)', // black glass: the see-through black of every pop-up box
  panelHead: 'rgba(0,0,0,0.78)',
  tile: '#5f5f5f',
  orange: '#f28a00',
  green: '#487d49', // My Library green (Jörg's swatch)
  blue: '#006aea',
  white: '#ffffff',
  muted: '#bdbdbd',
  // (31 Oct 2026) one of each, everywhere:
  danger: '#a5121d', // deleting, removing, throwing away (the same deep red as deepRed)
  pillGrey: '#3a3a3a', // grey pills: Cancel, Keep, Close
  chipGrey: '#4a4a4a', // small choice chips and icon buttons
  scrim: 'rgba(0,0,0,0.6)', // behind every pop-up box
  textSoft: '#d6d6d6', // secondary words on dark
  textFaint: '#bdbdbd', // small notes on dark
};
// a pop-up box (black glass), its title, and its buttons (31 Oct 2026: one look for all of them)
export const POPUP = { backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 24, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 30 };
export const POPUP_TITLE = { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, lineHeight: 26, color: '#ffffff' };
export const PILL_H = 46; // buttons in pop-up boxes
export const SCREEN_TITLE = { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32, color: '#ffffff', transform: [{ translateY: -3 }] };

// Coro's type (Jörg, 24 Oct 2026): Plus Jakarta Sans everywhere in the app, each weight its own font
// (a custom font can't be made bold with fontWeight, so a bold style uses uiBold, and so on)
const HELVETICA = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: '"Helvetica Neue", Helvetica, Arial, sans-serif' });
export const fonts = {
  ui: 'PlusJakartaSans_500Medium',
  uiRegular: 'PlusJakartaSans_400Regular',
  uiMedium: 'PlusJakartaSans_500Medium',
  uiSemiBold: 'PlusJakartaSans_600SemiBold',
  uiBold: 'PlusJakartaSans_700Bold',
  uiExtraBold: 'PlusJakartaSans_800ExtraBold',
  helvetica: HELVETICA,
  story: 'EBGaramond_400Regular',
};

// the standard section heading on the felt (My Books, Let's Create!, the Help sections): 28pt Coro bold, white
export const sectionTitle = { fontFamily: fonts.uiBold, fontSize: 28, lineHeight: 34, color: colors.white };
// a section's own box: black glass on the felt, rounded, with a faint light edge (Help, Ideas Room)
export const sectionBox = { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 18, paddingVertical: 16,
  shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 };
// the same heading a little smaller, inside the black glass boxes (Help, Ideas Room)
export const boxTitle = { ...sectionTitle, fontSize: 23, lineHeight: 29 };
export const SECTION_GAP = 26; // room between a section heading's words and what comes under it (same on every screen)


// Fonts for the words in a book (Playback Options → Book font). Serif is the default.
// width: how wide the letters run (for fitting text); size: fine-tunes how big each font looks.
// (A third, cursive font was tried and dropped; any saved "cursive" choice falls back to Serif.)
export const BOOK_FONTS = {
  sans: { label: 'Helvetica', family: HELVETICA, css: 'Helvetica, Arial, sans-serif', width: 0.52, size: 0.92 },
  coro: { label: 'Coro', family: 'PlusJakartaSans_500Medium', bold: 'PlusJakartaSans_700Bold', css: '"Plus Jakarta Sans", Helvetica, Arial, sans-serif', width: 0.54, size: 0.92 },
  serif: { label: 'Serif', family: 'EBGaramond_400Regular', bold: 'EBGaramond_700Bold', css: 'Story, Georgia, serif', width: 0.47, size: 1 },
  typewriter: { label: 'Typewriter', family: 'SpecialElite_400Regular', css: '"Special Elite", "Courier New", monospace', width: 0.58, size: 0.9 },
};
export const bookFont = (key) => BOOK_FONTS[key] || BOOK_FONTS.serif;

// The phone column never grows past this width (matters on tablets and the web preview).
export const MAX_WIDTH = 460;
