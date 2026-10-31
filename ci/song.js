// A sung lullaby for the music player (Jörg, 30 Oct 2026): an old AM radio being tuned, then an old, scratchy but
// beautiful country lullaby sung by a woman. Made with ElevenLabs (sound generation for the radio dial, Eleven
// Music for the song, with our own words). Mixed afterwards with ffmpeg. Output: song-out/*.mp3 + report.
const fs = require('fs');
const KEY = process.env.ELEVENLABS_API_KEY;
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const want = (id) => !ONLY.length || ONLY.includes(id);

const DIAL = [
  ['dial-a', 'An old vintage AM tube radio being tuned slowly by hand across the dial at night: soft crackling static, warbling whistles and squeals between stations, brief muffled fragments of faraway music and voices drifting in and out, no clear words, then the static thins out as a station is found. Warm, nostalgic, gentle, not harsh or loud.'],
  ['dial-b', 'Turning the tuning knob of a 1940s AM radio in a quiet farmhouse at night: gentle hiss and crackle, rising and falling heterodyne whistles, faint snatches of distant stations fading in and out, unclear and muffled, settling at the end on a quiet clear signal. Soft and cosy, not harsh.'],
];

const STYLE = ['1950s classic country', 'old-time country lullaby', 'solo female vocal, warm, tender, soft and close', 'gentle brushed acoustic guitar', 'soft pedal steel guitar', 'slow waltz in 3/4', 'quiet upright bass', 'vintage mono recording, warm tape', 'sleepy, tender, beautiful'];
const NO = ['drums', 'loud', 'fast', 'modern pop', 'autotune', 'male vocal', 'harsh', 'electric distortion'];
const VERSE1 = ['Hush now, the porch light’s low,', 'the whippoorwill is singing slow,', 'the moon’s a lantern on the hill,', 'close your eyes now, lie so still.'];
const CHORUS = ['Go to sleep, my little one,', 'the cows are home, the day is done,', 'I’ll hum you down the river wide,', 'and I’ll be right here by your side.'];
const VERSE2 = ['The wind is rocking the willow tree,', 'the stars are counting one, two, three,', 'the old dog’s dreaming by the door,', 'there’s nothing left to stay up for.'];
const OUTRO = ['Hush now, my darling, hush,', 'goodnight.'];
const plan = (seedStyle) => ({
  positive_global_styles: [...STYLE, ...seedStyle],
  negative_global_styles: NO,
  sections: [
    { section_name: 'Intro', positive_local_styles: ['soft guitar and pedal steel alone, gentle'], negative_local_styles: ['vocals'], duration_ms: 10000, lines: [] },
    { section_name: 'Verse 1', positive_local_styles: ['tender female vocal, close and soft'], negative_local_styles: [], duration_ms: 26000, lines: VERSE1 },
    { section_name: 'Chorus', positive_local_styles: ['warm, a little fuller, soft harmony'], negative_local_styles: [], duration_ms: 26000, lines: CHORUS },
    { section_name: 'Instrumental', positive_local_styles: ['pedal steel melody, very gentle'], negative_local_styles: ['vocals'], duration_ms: 14000, lines: [] },
    { section_name: 'Verse 2', positive_local_styles: ['softer, sleepier female vocal'], negative_local_styles: [], duration_ms: 26000, lines: VERSE2 },
    { section_name: 'Chorus', positive_local_styles: ['softest, slower, almost a whisper at the end'], negative_local_styles: [], duration_ms: 26000, lines: CHORUS },
    { section_name: 'Outro', positive_local_styles: ['fading, hummed, very slow, ritardando, the last guitar chord rings out'], negative_local_styles: ['drums'], duration_ms: 16000, lines: OUTRO },
  ],
});
const SONGS = [
  ['song-a', plan(['a tender 1950s country ballad, slow and dreamy'])],
  ['song-b', plan(['Appalachian front-porch folk, old-time string band feel'])],
];
const save = async (id, res, kind) => {
  if (!res.ok) { console.log(`FAIL ${kind} ${id} ${res.status} ${(await res.text()).slice(0, 400)}`); return false; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`song-out/${id}.mp3`, buf);
  console.log(`OK ${kind} ${id} ${Math.round(buf.length / 1024)} KB`);
  return true;
};
(async () => {
  fs.mkdirSync('song-out', { recursive: true });
  for (const [id, text] of DIAL.filter(([i]) => want(i))) {
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, duration_seconds: 16, prompt_influence: 0.55, model_id: 'eleven_text_to_sound_v2' }),
    });
    await save(id, res, 'sound');
  }
  for (const [id, composition_plan] of SONGS.filter(([i]) => want(i))) {
    let res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ composition_plan }),
    });
    if (!res.ok) { // the plain prompt (with the words) if the composition plan isn't accepted
      console.log(`(plan refused for ${id}: ${res.status} ${(await res.text()).slice(0, 300)})`);
      const prompt = `${composition_plan.positive_global_styles.join(', ')}. A lullaby sung by a woman, with these lyrics:\n${[...VERSE1, '', ...CHORUS, '', ...VERSE2, '', ...CHORUS, '', ...OUTRO].join('\n')}`;
      res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', {
        method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ prompt, music_length_ms: 150000 }),
      });
    }
    await save(id, res, 'music');
  }
})();
