// Designs candidate voices for Coro (the grey felt mascot) with ElevenLabs Voice Design, for Jörg to pick from.
// Output: voice-out/<set>-<n>.mp3 and voice-out/list.json (each with its generated_voice_id, to save the chosen one).
const fs = require('fs');
const KEY = process.env.ELEVENLABS_API_KEY;
const TEXT = "Hi! I'm Coro. I love stories. Tap me! [giggles] Hee hee, that tickles! Now you tap a word... You did it! [softly] Shhh... night night. [happily] But not yet! Time to read!";
const ADULT = ' An adult voice, not a child.';
const SETS = [
  ['woodland', 'A small, warm, whimsical woodland creature with a soft, slightly breathy voice and a gentle smile in every line. Curious, kind and unhurried, like a friendly character in a bedtime picture book. Clear, close and cosy.' + ADULT],
  ['bubbly', 'A cheerful, bubbly little storybook character with a light, bright, playful voice. Delighted by everything, quick to giggle, warm and encouraging, never loud or shrill. Friendly animated-film sidekick energy, gentle enough for bedtime.' + ADULT],
  ['cosy', 'A gentle, cosy, softly husky voice with a cheeky twinkle, like a wise but silly little pebble that lives in a picture book. Calm, warm, low-key and kind, speaking slowly with a smile.' + ADULT],
];
(async () => {
  fs.mkdirSync('voice-out', { recursive: true });
  // SAVE=<generated_voice_id>: keep that candidate as a voice in the account (prints its voice_id)
  if (process.env.SAVE) {
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-voice', {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_name: process.env.SAVE_NAME || 'Coro', voice_description: SETS[2][1], generated_voice_id: process.env.SAVE }),
    });
    const t = await res.text();
    if (!res.ok) { console.log(`FAIL save ${res.status} ${t.slice(0, 400)}`); return; }
    const j = JSON.parse(t);
    console.log(`SAVED voice_id ${j.voice_id}`);
    fs.writeFileSync('voice-out/saved.json', JSON.stringify({ voice_id: j.voice_id, name: j.name }, null, 2));
    return;
  }
  const list = [];
  for (const [name, desc] of SETS) {
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-voice/design?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_description: desc, model_id: 'eleven_ttv_v3', text: TEXT, guidance_scale: 4 }),
    });
    if (!res.ok) { console.log(`FAIL ${name} ${res.status} ${(await res.text()).slice(0, 400)}`); continue; }
    const j = await res.json();
    (j.previews || []).forEach((p, i) => {
      const f = `${name}-${i + 1}.mp3`;
      fs.writeFileSync(`voice-out/${f}`, Buffer.from(p.audio_base_64, 'base64'));
      list.push({ file: f, set: name, generated_voice_id: p.generated_voice_id, secs: p.duration_secs, description: desc });
      console.log(`OK ${f} ${p.duration_secs}s`);
    });
  }
  fs.writeFileSync('voice-out/list.json', JSON.stringify({ text: TEXT, voices: list }, null, 2));
})();
