// Parental controls (Settings → Parental controls, behind the grown-up question). A parent can shape the app
// down to one exact experience: e.g. only My Library, every book read Page by Page, no Book Store, no recording.
// Kept on the phone. Every screen reads them with useControls().
import { createContext, useContext } from 'react';

// The Book Store switch (Jörg turned it off 25 Oct 2026 and back on 26 Oct). While this is
// false the store isn't shown anywhere (start page, menu, settings, help) and can't be reached.
export const STORE_ON = true;

export const DEFAULT_CONTROLS = {
  store: true,      // the Book Store (menu, start page, buying)
  notebook: true,   // My Notes in My Library
  create: true,     // Make a Book (menu, the + in My Library)
  help: true,       // Help and About in the menu
  playback: true,   // the child may change how books play (the Playback menu)
  playMode: null,   // null: as chosen in the Playback menu; or always 'self' | 'learn' | 'auto' | 'page'
  recording: true,  // recording your own voice
  familyVoices: true, // a book the family recorded opens in their voice (the narrator reads the pages they didn't)
  sharing: true,    // sharing and printing books
  language: true,   // the child may change the language (the list on the start page)
  childAge: null,   // the child's age: books rated for older children are hidden (null: show every book)
  profiles: true,   // the child may switch to another child's profile (Start page → Profiles)
  nightlight: true, // Listen Only can become the nightlight (the moon on the reading bar)
  clock: false,     // (no longer offered)
  alarm: false,     // the nightlight shows the alarm time (set there) and wakes the child: the sun rises, a gentle sound plays
  advancedPages: false, // the Advanced page editor: words over a picture, their look, size and place (off: the book maker stays simple for kids; Jörg, 30 Oct 2026)
  garden: false,    // the Garden: a secret place below My Library, locked until a grown-up unlocks it (a surprise, a reward)
};
// settings that add something rather than limit the child (not counted as restricted)
const EXTRAS = ['nightlight', 'clock', 'alarm', 'familyVoices', 'garden', 'advancedPages'];

// everything off: only My Library and its books, played the way they're set now
export const lockedControls = (mode, childAge = null) => ({ store: false, notebook: false, create: false, help: false, playback: false, playMode: mode || 'page', recording: false, sharing: false, language: false, profiles: false, childAge });

// Quick and Safe Kid: the simplest, most foolproof way for a child to read alone. Only My Library and
// My Notes; every book reads itself aloud one page at a time (the child turns the page when ready, and
// can't get lost in menus); nothing can be bought, shared, printed, recorded or changed; and, when the
// child's age is set, only books rated for that age.
export const quickSafeControls = (childAge = null) => ({ store: false, notebook: true, create: false, help: false, playback: false, playMode: 'page', recording: false, sharing: false, language: false, profiles: false, childAge });

// restricted kid mode: a grown-up has switched something off or fixed how books play
export const isRestricted = (c) => !!c && (!!c.playMode || Object.keys(DEFAULT_CONTROLS).some((k) => !EXTRAS.includes(k) && typeof DEFAULT_CONTROLS[k] === 'boolean' && c[k] === false));

export const ControlsContext = createContext(DEFAULT_CONTROLS);
export const useControls = () => useContext(ControlsContext);
