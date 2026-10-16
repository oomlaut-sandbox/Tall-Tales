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
        body: JSON.stringify({ text, duration_seconds: dur, prompt_influence: 0.6 }),
      });
      if (!res.ok) { console.log(`FAIL ${name}-${n} ${res.status} ${(await res.text()).slice(0, 300)}`); continue; }
      fs.writeFileSync(`sfx-out/${name}-${n}.mp3`, Buffer.from(await res.arrayBuffer()));
      list.push({ name, n, dur, text });
      console.log(`OK ${name}-${n}`);
    }
  }
  fs.writeFileSync('sfx-out/list.json', JSON.stringify(list, null, 2));
})();
