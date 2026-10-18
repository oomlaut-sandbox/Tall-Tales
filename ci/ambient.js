// Makes the music and ambient sounds (Playback Options → Music and sounds) with ElevenLabs.
// Sounds: 30-second seamless loops (sound generation, looping). Music: gentle instrumental pieces (Eleven Music).
// Output: ambient-out/<id>.mp3 + report. ONLY=id1,id2 remakes just those.
const fs = require('fs');
const KEY = process.env.ELEVENLABS_API_KEY;
const SOUNDS = [
  ['crickets', 'Gentle crickets chirping softly on a warm summer night in a quiet meadow, calm and steady, far-off and peaceful, no other animals, no music, seamless loop.'],
  // three friendlier crickets to choose from (the first one sounded creepy)
  ['crickets-a', 'A cosy summer evening on a farm porch: just a few crickets chirping slowly and softly in the distance, warm and friendly, sparse and relaxed, a light breeze in the grass, no buzzing, no insects close up, no other animals, no music, seamless loop.'],
  ['crickets-b', 'Crickets heard from inside a cosy cabin through an open window at night: soft, muffled, slow and gentle chirping, warm and sleepy, very calm, no buzzing, no other animals, no music, seamless loop.'],
  ['crickets-c', 'A peaceful summer meadow at dusk: soft, slow crickets with a gentle trickling stream nearby and a warm breeze, friendly and soothing for a child falling asleep, no buzzing, no owls, no music, seamless loop.'],
  ['brook', 'A babbling brook: clear water trickling softly over smooth stones in a quiet forest, steady and soothing, no birds, no music, seamless loop.'],
  ['forest-birds', 'Birds singing softly in a peaceful forest in the early morning: gentle distant birdsong, leaves rustling lightly in a breeze, calm and relaxing, no music, seamless loop.'],
  ['rain', 'Soft steady rain falling on a roof and leaves, cosy and calm, no thunder, no wind gusts, no music, seamless loop.'],
  ['waves', 'Gentle ocean waves rolling slowly onto a sandy beach and washing back, calm and rhythmic, no seagulls, no music, seamless loop.'],
  ['campfire', 'A small campfire crackling softly at night, gentle pops and the warm hiss of burning wood, calm and quiet, no voices, no music, seamless loop.'],
  ['night-forest', 'A calm night forest: a soft breeze in the pine trees, a very distant owl hooting now and then, peaceful and quiet, no music, seamless loop.'],
  ['wind-chimes', 'Soft wooden and bamboo wind chimes tinkling gently in a light breeze on a quiet porch, slow and calming, no music, seamless loop.'],
];
const MUSIC = [
  ['music-box', 'A slow, gentle music box lullaby for a child falling asleep: soft tinkling melody, warm and calm, simple and tender, instrumental, no drums, no voices.'],
  ['soft-piano', 'Soft, slow solo piano for bedtime: a calm, warm and gentle melody with lots of space, peaceful and dreamy, instrumental, no drums, no voices.'],
  ['gentle-guitar', 'A quiet, gentle fingerpicked acoustic guitar for relaxing and drifting off to sleep: slow, warm and simple, instrumental, no drums, no voices.'],
  ['dreamy-harp', 'Dreamy, slow harp and soft warm pads for a peaceful bedtime: floating, calm and magical, instrumental, no drums, no voices.'],
];
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const want = (id) => !ONLY.length || ONLY.includes(id);
const save = async (id, res, kind) => {
  if (!res.ok) { console.log(`FAIL ${kind} ${id} ${res.status} ${(await res.text()).slice(0, 300)}`); return false; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`ambient-out/${id}.mp3`, buf);
  console.log(`OK ${kind} ${id} ${Math.round(buf.length / 1024)} KB`);
  return true;
};
(async () => {
  fs.mkdirSync('ambient-out', { recursive: true });
  for (const [id, text] of SOUNDS.filter(([i]) => want(i))) {
    const post = (body) => fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body),
    });
    // the looping sound model first; without looping if that isn't available
    let res = await post({ text, duration_seconds: 30, prompt_influence: 0.5, loop: true, model_id: 'eleven_text_to_sound_v2' });
    if (!res.ok) { console.log(`(retrying ${id} without loop: ${res.status})`); res = await post({ text, duration_seconds: 22, prompt_influence: 0.5 }); }
    await save(id, res, 'sound');
  }
  for (const [id, prompt] of MUSIC.filter(([i]) => want(i))) {
    const res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ prompt, music_length_ms: 120000, force_instrumental: true }),
    });
    await save(id, res, 'music');
  }
})();
