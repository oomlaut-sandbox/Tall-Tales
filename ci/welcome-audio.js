// The welcome's voices: Fatima (ElevenLabs Lily) and Coro (the designed voice), every line in five languages.
// Writes assets/welcome/<lang>/<id>.mp3, src/welcome/audio.js (the require map) and src/welcome/timing.json (word
// times for the line that lights up word by word). A line already made with the same text is kept (FORCE=1 remakes).
const fs = require('fs');
const crypto = require('crypto');
const KEY = process.env.ELEVENLABS_API_KEY;
const V = JSON.parse(fs.readFileSync('ci/welcome-voices.json', 'utf8'));
const LINES = JSON.parse(fs.readFileSync('src/welcome/lines.json', 'utf8'));
const LANGS = ['en', 'de', 'fr', 'es', 'ja'];
const OUT = 'assets/welcome';
const fpFile = `${OUT}/made.json`;
const made = fs.existsSync(fpFile) ? JSON.parse(fs.readFileSync(fpFile, 'utf8')) : {};
const timing = fs.existsSync('src/welcome/timing.json') ? JSON.parse(fs.readFileSync('src/welcome/timing.json', 'utf8')) : {};
async function speak(who, text, lang, timed) {
  const coro = who === 'C';
  const voice = coro ? V.coro.id : V.narrator.id;
  const model = coro ? 'eleven_v3' : 'eleven_multilingual_v2';
  const settings = coro ? { stability: 0.5, similarity_boost: 0.8 } : { stability: 0.6, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: 0.85 };
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}${timed ? '/with-timestamps' : ''}?output_format=mp3_44100_128`;
  const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: timed ? 'application/json' : 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, language_code: lang, voice_settings: settings }) });
  if (!res.ok) { console.log(`FAIL ${lang} ${who} ${res.status} ${(await res.text()).slice(0, 300)}`); return null; }
  if (!timed) return { audio: Buffer.from(await res.arrayBuffer()) };
  const j = await res.json();
  return { audio: Buffer.from(j.audio_base64, 'base64'), align: j.alignment };
}
(async () => {
  let n = 0;
  for (const lang of LANGS) {
    fs.mkdirSync(`${OUT}/${lang}`, { recursive: true });
    for (const [id, L] of Object.entries(LINES)) {
      if (id === '_' || !L[lang]) continue;
      const file = `${OUT}/${lang}/${id}.mp3`;
      const fp = crypto.createHash('sha1').update(`${L.who}|${L[lang]}|${L.who === 'C' ? V.coro.id : V.narrator.id}`).digest('hex').slice(0, 12);
      if (!process.env.FORCE && made[`${lang}/${id}`] === fp && fs.existsSync(file)) continue;
      const r = await speak(L.who, L[lang], lang, id === 'k3read');
      if (!r) continue;
      fs.writeFileSync(file, r.audio); made[`${lang}/${id}`] = fp; n++;
      if (r.align) timing[lang] = { chars: r.align.characters, starts: r.align.character_start_times_seconds, ends: r.align.character_end_times_seconds };
      console.log(`OK ${lang}/${id}`);
    }
  }
  fs.writeFileSync(fpFile, JSON.stringify(made, null, 1));
  fs.writeFileSync('src/welcome/timing.json', JSON.stringify(timing));
  // the require map (only the files that exist)
  let js = '// Made by ci/welcome-audio.js: the welcome\'s spoken lines, by language.\nexport default {\n';
  for (const lang of LANGS) {
    js += `  ${lang}: {\n`;
    for (const id of Object.keys(LINES)) if (id !== '_' && fs.existsSync(`${OUT}/${lang}/${id}.mp3`)) js += `    ${id}: require('../../${OUT}/${lang}/${id}.mp3'),\n`;
    js += '  },\n';
  }
  fs.writeFileSync('src/welcome/audio.js', js + '};\n');
  console.log(`made ${n}`);
})();
