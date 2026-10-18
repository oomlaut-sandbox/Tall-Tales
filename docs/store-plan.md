# Store build plan

Things agreed with Jörg for when we build the store publishing pipeline. Not started yet.

## Publishing pipeline
- Needs a SUPABASE_SERVICE_ROLE_KEY GitHub secret (never pasted in chat).
- Upload a book's pages, make the ElevenLabs narration with word timings, add it to the catalog.
- Download books that aren't bundled in the app.

## Sound effects and music (Jörg, 14 Oct 2026: "Yes. Wait till the store build.")
- One extra step after narration, made once per store book with ElevenLabs sound effects and music.
- Sound effects: a few per book, timed to the word they belong to (from the word timings),
  quieter than the narrator. They can also play when a child taps something in the picture
  (the dog barks).
- Music: a short, soft theme on the cover/title page and on The End page; none under the story.
- Off in Learn to Read mode. A "Sound effects" switch in settings.
- Moments chosen by hand, or suggested and approved by Jörg; every clip listened to before it ships.
- Check ElevenLabs' commercial-use terms for the plan before shipping.

## Memberships and purchases (prices decided by Jörg, 18 Oct 2026)
- Free to download, with three free books (marked 'free' in the Store Manager).
- Membership: $4.99 a month or $39.99 a year (USD; Apple sets other countries), 7-day free trial on both.
  Unlocks every book. Raise for new members later as the library grows (e.g. $6.99 / $49.99 at 30+ books);
  existing members keep their price.
- Single books: $2.99 each, to keep (books marked 'paid'; members can read them too).
- Launch target (Jörg, 18 Oct 2026): 12 books — 3 free + 9 for members — then a steady 1–2 new books a month,
  with a few ready before launch. (Now: Different, The Rough Lives of Animals, Two Snakes Walk into a Bar;
  pictures saved for a third in book-art/third-book.)
- Built in the app (src/purchases*.js, src/prices.js, src/components/Membership.js, Book Store card):
  Join to read / Buy $2.99 / Restore Purchases, all behind the grown-up question. Switched off until the
  REVENUECAT_IOS_KEY GitHub secret exists (RevenueCat's public iOS SDK key; the TestFlight build writes it in).

### Setting it up (Jörg; never paste keys or secrets in chat)
1. App Store Connect → Business: accept the Paid Apps Agreement, add banking and tax. Apply for the
   App Store Small Business Program (15% instead of 30%).
2. App Store Connect → the app → Subscriptions: a group "Oomlaut Reader Membership" with
   - oomlaut.member.monthly — $4.99, 1 month, introductory offer: free for 1 week
   - oomlaut.member.yearly — $39.99, 1 year, introductory offer: free for 1 week
3. App Store Connect → In-App Purchases (non-consumable), one per paid book:
   oomlaut.book.<book id with - turned into _>, $2.99 (e.g. oomlaut.book.rough_lives)
4. RevenueCat (free account): add the iOS app (bundle id com.oomlaut.reader) with an App Store Connect
   in-app purchase key; import the products; make an entitlement "member" with both subscriptions; make the
   default offering with the monthly and annual packages.
5. GitHub → repository secrets: REVENUECAT_IOS_KEY = RevenueCat's public iOS API key (starts with appl_).
6. Then build; test with a Sandbox tester (App Store Connect → Users and Access → Sandbox).
- Still to do before launch: a privacy policy page (its link goes on the membership screen and in the App
  Store listing), and making sure paid books that aren't inside the app can only be downloaded by members or
  buyers (the download check on the server).
- Possible members-only extra: storyteller (ElevenLabs) narration for books parents make, with a monthly limit.

## Later: the felt pebble mascot (Jörg, 14 Oct 2026)
- A googly-eyed felt pebble, in the same family as the book characters.
- Pops up now and then to help (at the start, when a child seems stuck, to celebrate finishing a book), speaking through the speech bubbles; can be tapped away.
- At the very start it can sit in the foreground doing funny things.
- Never on the story pages themselves, so it doesn't compete with the pictures.
- Jörg draws the poses (idle, wave, peek, celebrate); then it gets animated. After the store and the interface font are settled.

## Later: interface font and backgrounds
- A friendly rounded sans serif for the interface (menus, titles, buttons); story text stays EB Garamond. Candidates mocked up: Nunito, Quicksand, Fredoka, Baloo 2.
- "Skins" would mostly be background choices (desk colour or texture, cover), driven from the theme colours.
