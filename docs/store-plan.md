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

## Memberships and purchases
- RevenueCat. Jörg must accept the Paid Apps Agreement and apply for the Small Business Program.
- Possible members-only extra: storyteller (ElevenLabs) narration for books parents make, with a monthly limit.
