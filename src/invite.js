// Sharing a book sends an invitation to the app (not the book itself).
// The wording is a draft to finish with Jörg.
import { Share } from 'react-native';

export const APP_LINK = 'https://apps.apple.com/app/id6822165068';

export function inviteMessage(title) {
  return `We’ve been reading “${title}” together in Coro: books we make together. Come and read with us! ${APP_LINK}`;
}

export function shareInvite(title) {
  return Share.share({ message: inviteMessage(title) }).catch(() => {});
}

// a playlist: its name and its books, with the app link
export function sharePlaylist(name, titles, t) {
  const list = titles.map((x, i) => `${i + 1}. ${x}`).join('\n');
  const message = `${t('Our playlist “{name}” in Coro:', { name })}\n${list}\n\n${APP_LINK}`;
  return Share.share({ message }).catch(() => {});
}
