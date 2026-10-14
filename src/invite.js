// Sharing a book sends an invitation to the app (not the book itself).
// The wording is a draft to finish with Jörg.
import { Share } from 'react-native';

export const APP_LINK = 'https://apps.apple.com/app/id6822165068';

export function inviteMessage(title) {
  return `We’ve been reading “${title}” together in oomlaut Reader: picture books in your voice. Come and read with us! ${APP_LINK}`;
}

export function shareInvite(title) {
  return Share.share({ message: inviteMessage(title) }).catch(() => {});
}
