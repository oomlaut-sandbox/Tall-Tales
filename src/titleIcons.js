// Line icons beside the big page titles (Jörg, 25 Oct 2026: they help children find their way). White line art,
// drawn in the menu's style, 192 px.
import React from 'react';
import { Image } from 'react-native';
export const TITLE_ICONS = {
  library: require('../assets/title-icons/home.png'),
  store: require('../assets/title-icons/store.png'),
  help: require('../assets/title-icons/bulb.png'),
  ideas: require('../assets/title-icons/ideas-room.png'),
  music: require('../assets/title-icons/music.png'),
  playlists: require('../assets/title-icons/playlist.png'),
  settings: require('../assets/title-icons/person.png'),
  profile: require('../assets/title-icons/person.png'),
  profiles: require('../assets/title-icons/people.png'),
  about: require('../assets/title-icons/info.png'),
  make: require('../assets/title-icons/make-a-book.png'),
};
// the icon at a title's size (32 pt titles: a 30 pt icon), lifted to sit with the letters
export function TitleIcon({ kind, size = 30, color, lift = -3 }) {
  const src = TITLE_ICONS[kind];
  if (!src) return null;
  return <Image source={src} style={{ width: size, height: size, marginRight: 12, transform: [{ translateY: lift }], ...(color ? { tintColor: color } : null) }} accessibilityIgnoresInvertColors />;
}
