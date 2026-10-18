// Parental controls (Settings → Parental controls, behind the grown-up question). A parent can shape the app
// down to one exact experience: e.g. only My Library, every book read Page by Page, no Book Store, no recording.
// Kept on the phone. Every screen reads them with useControls().
import { createContext, useContext } from 'react';

export const DEFAULT_CONTROLS = {
  store: true,      // the Book Store (menu, start page, buying)
  notebook: true,   // My Notebook in My Library
  create: true,     // Create a Story (menu, the + in My Library)
  help: true,       // Help and About in the menu
  playback: true,   // the child may change how books play (the Playback menu)
  playMode: null,   // null: as chosen in the Playback menu; or always 'self' | 'learn' | 'auto' | 'page'
  recording: true,  // recording your own voice
  sharing: true,    // sharing and printing books
  language: true,   // the child may change the language (the list on the start page)
};

// everything off: only My Library and its books, played the way they're set now
export const lockedControls = (mode) => ({ store: false, notebook: false, create: false, help: false, playback: false, playMode: mode || 'page', recording: false, sharing: false, language: false });

export const ControlsContext = createContext(DEFAULT_CONTROLS);
export const useControls = () => useContext(ControlsContext);
