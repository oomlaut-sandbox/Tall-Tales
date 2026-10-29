// Coro's prices (Jörg, 18 Oct 2026), in US dollars; Apple sets the matching price in other countries.
// The real prices always come from the App Store once purchases are switched on; these are only shown
// until then (and in the web preview).
//   Membership (Coro Family): $3.99 a month, or $29.99 a year, both with a 7-day free trial. Unlimited books to make, and every book to read.
//   (No single books since 29 Oct 2026: membership only. A book marked 'paid' is shown as a members' book.)
//   Free: three books, marked 'free' in the Store Manager.
// Coro is a book maker first (Jörg, 25 Oct 2026): making and sharing are free up to FREE_BOOKS made books;
// the membership, Coro Family, is for making more (unlimited books, voices, the drawing set, a print PDF, and
// every picture book too). Sharing, and adding a voice to a book someone sent, are always free.
export const FREE_BOOKS = 3;
export const PRICES = { monthly: '$3.99', yearly: '$29.99', book: '$2.99', trialDays: 7 }; // (29 Oct 2026: $3.99 a month, $29.99 a year; single books are gone, 'book' is unused)

// The App Store product IDs (the same IDs go into App Store Connect and RevenueCat):
//   membership: oomlaut.member.monthly and oomlaut.member.yearly, in one subscription group,
//               both giving the RevenueCat entitlement "member"
//   a single book: oomlaut.book.<the book's id, with - turned into _>, e.g. oomlaut.book.rough_lives
export const ENTITLEMENT = 'member';
export const bookProductId = (bookId) => `oomlaut.book.${String(bookId).replace(/[^A-Za-z0-9]/g, '_')}`;

// Apple's standard terms of use for subscriptions; the privacy policy page is still to be made (docs/store-plan.md)
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://corobooks.com/privacy'; // (Apple wants it on the membership screen: 28 Oct 2026)
