// Oomlaut Reader's prices (Jörg, 18 Oct 2026), in US dollars; Apple sets the matching price in other countries.
// The real prices always come from the App Store once purchases are switched on; these are only shown
// until then (and in the web preview).
//   Membership: $4.99 a month, or $39.99 a year, both with a 7-day free trial. Unlocks every book.
//   Single books: $2.99 each, to keep (books marked 'paid' in the Store Manager; members get them too).
//   Free: three books, marked 'free' in the Store Manager.
export const PRICES = { monthly: '$4.99', yearly: '$39.99', book: '$2.99', trialDays: 7 };

// The App Store product IDs (the same IDs go into App Store Connect and RevenueCat):
//   membership: oomlaut.member.monthly and oomlaut.member.yearly, in one subscription group,
//               both giving the RevenueCat entitlement "member"
//   a single book: oomlaut.book.<the book's id, with - turned into _>, e.g. oomlaut.book.rough_lives
export const ENTITLEMENT = 'member';
export const bookProductId = (bookId) => `oomlaut.book.${String(bookId).replace(/[^A-Za-z0-9]/g, '_')}`;

// Apple's standard terms of use for subscriptions; the privacy policy page is still to be made (docs/store-plan.md)
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = null;
