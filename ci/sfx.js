// Makes sound-effect candidates with ElevenLabs for Jörg to review (not used by the app yet).
// Each effect is made twice so there is a choice. Output: sfx-out/<name>-<n>.mp3 + list.json
const fs = require('fs');
const KEY = process.env.ELEVENLABS_API_KEY;
const FX = [
  ['cover-open', 1.6, 'A thick hardcover picture book cover being opened slowly by hand: a faint creak of the cloth spine, the stiff board swinging over, a soft papery thump as it lands flat on a wooden table. Quiet room, close and natural, no music.'],
  ['cover-close', 1.2, 'Closing a small hardcover picture book gently: the board cover swings shut with a soft muted clap of paper and cardboard. Quiet room, close, natural, no music.'],
  ['page-peel', 1.4, 'Lifting the corner of one thick matte paper page with a fingertip and turning it slowly: a soft dry paper rustle and gentle swish as it settles. Quiet room, close, natural, no music.'],
  ['page-flick', 0.8, 'A single thick paper page of a picture book turned quickly: one short soft papery flick and swish. Quiet room, close, natural, no music.'],
  ['book-slide', 1.0, 'A small square hardcover book pushed across a smooth wooden table: a short soft sliding friction sound. Quiet room, close, natural, no music.'],
  ['book-set-down', 0.6, 'A small hardcover book set down gently on a wooden table: one soft muted wooden thud. Close, natural, no music.'],
  ['card-lift', 0.7, 'A sheet of heavy card paper lifted lightly off a table: a tiny airy paper whoosh. Close, soft, natural, no music.'],
  ['tap', 0.5, 'A fingertip tapping once on a cardboard book cover: a tiny soft dull tap. Close, natural, no music.'],
  ['typewriter-key', 0.5, 'A single key strike on an old mechanical typewriter: one crisp metallic clack of the typebar hitting paper on the platen, short and dry, no bell, no carriage return. Close, natural, no music.'],
  ['page-swish', 0.9, 'A soft, quiet paper swish of one picture book page being turned: a gentle airy sweep of paper, no crinkle, no thump, smooth and short. Quiet room, close, natural, no music.'],
  ['pebble-land', 0.9, 'A small smooth river stone tossed gently onto a beach of rounded pebbles: one soft natural clack of stone on stone and a brief rattle of pebbles settling. Calm outdoors, close, natural, no music.'],
  ['pebble-soft', 0.8, 'A small round pebble dropped onto other pebbles from a little height: a soft hollow stony knock and a tiny rolling clatter that settles. Quiet outdoors, close, natural, no music.'],
  ['stick-down', 0.6, 'A small piece of dry, light driftwood set down on a thick wool felt mat: one soft, short, hollow wooden knock, muffled by the felt. Close, quiet, natural, no music.'],
  ['stick-click', 0.5, 'Two small pieces of dry driftwood gently tapped together once: a light, hollow, woody click. Close, quiet, natural, no music.'],
  ['pinwheel', 3.0, 'A colourful paper pinwheel spinning steadily in a gentle breeze outdoors: a soft, even fluttering whirr of paper blades, light wind, calm. Close, natural, no music, no voices.'],
  ['egg-tap', 0.5, 'A hen egg set down gently into a straw nest: one tiny soft tap with a faint rustle of straw. Close, quiet, natural, no music.'],
  ['hen-cluck', 1.0, 'A contented farm hen clucking softly two or three times, calm and gentle, close by, in a quiet barn. Natural, no music.'],
  ['chalk-line', 1.4, 'Drawing a long smooth line with a piece of chalk on an old school blackboard: a soft, gentle scratchy chalk sound, not squeaky. Close, quiet room, natural, no music.'],
  ['domino-down', 0.5, 'A single old ivory domino tile set down flat on a thick wool felt mat: one short, soft, muted clack of bone, muffled by the felt. Close, quiet, natural, no music.'],
  ['domino-click', 0.5, 'Two old ivory domino tiles nudged together edge to edge on a table: one small crisp clack, light and bony. Close, quiet, natural, no music.'],
  // the opening mascot film (3 seconds): four simple, organic sound bites to choose from (Jörg, 2 Nov 2026)
  ['splash-a', 3.0, 'A tiny, warm wooden xylophone motif: three soft notes rising gently, played with soft felt mallets, then a short natural ring-out. Simple, playful, organic, very quiet room, no other instruments, no voices.'],
  ['splash-b', 3.0, 'A kalimba thumb piano plucked softly: a short happy little four-note phrase going up, warm wooden tone with a gentle natural decay. Simple and organic, close, no other instruments, no voices.'],
  ['splash-c', 3.0, 'A soft wooden marimba playing two bright gentle notes, followed by one tiny hollow woodblock knock like something small popping into view. Warm, simple, organic, close, no other instruments, no voices.'],
  ['splash-d', 3.0, 'A wooden tongue drum struck softly with a felt mallet: two calm round notes, the second lower, ringing out warmly. Very simple, organic and soothing, close, no other instruments, no voices.'],
  // more like sound bite A: three notes, five ways (Jörg, 2 Nov 2026)
  ['xy-1', 3.0, 'Three soft notes going up step by step on a small wooden xylophone played with soft felt mallets, warm and organic, a short natural ring-out, very quiet room, no other instruments, no voices.'],
  ['xy-2', 3.0, 'Three soft notes going down, high to low, on a small wooden xylophone played with soft felt mallets, warm and organic, a short natural ring-out, very quiet room, no other instruments, no voices.'],
  ['xy-3', 3.0, 'Three soft notes: low, then high, then the middle note, gentle and friendly, on a small wooden xylophone played with soft felt mallets, warm and organic, a short natural ring-out, very quiet room, no other instruments, no voices.'],
  ['xy-4', 3.0, 'Three soft notes going up, the last one held a little longer, played slowly and calmly on a deeper wooden xylophone played with soft felt mallets, warm and organic, a short natural ring-out, very quiet room, no other instruments, no voices.'],
  ['xy-5', 3.0, 'Two quick soft notes and then a third, higher note after a tiny pause, like a little hello, on a small wooden xylophone played with soft felt mallets, warm and organic, a short natural ring-out, very quiet room, no other instruments, no voices.'],
  ['xy-low', 1.5, 'One single low note on a wooden xylophone, struck once softly with a felt mallet, warm and round, with a short natural ring-out. Nothing before or after it, very quiet room, no other instruments, no voices.'], // the mascot's blink (Jörg, 2 Nov 2026)
  ['chalk-wipe', 1.0, 'Wiping an old school blackboard with a felt eraser: one soft, papery swish. Close, quiet room, natural, no music.'],
];
// ONLY=name1,name2 makes just those (each three times)
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
(async () => {
  fs.mkdirSync('sfx-out', { recursive: true });
  const list = [];
  for (const [name, dur, text] of FX.filter(([n]) => !ONLY.length || ONLY.includes(n))) {
    for (const n of ONLY.length ? [1, 2, 3] : [1, 2]) {
      const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, duration_seconds: dur, prompt_influence: 0.6, model_id: 'eleven_text_to_sound_v3' }), // (v2 retires 1 Feb 2027)
      });
      if (!res.ok) { console.log(`FAIL ${name}-${n} ${res.status} ${(await res.text()).slice(0, 300)}`); continue; }
      fs.writeFileSync(`sfx-out/${name}-${n}.mp3`, Buffer.from(await res.arrayBuffer()));
      list.push({ name, n, dur, text });
      console.log(`OK ${name}-${n}`);
    }
  }
  fs.writeFileSync('sfx-out/list.json', JSON.stringify(list, null, 2));
})();
