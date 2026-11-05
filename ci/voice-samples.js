// Takes to listen to before choosing (not used by the app). Writes samples/<name>.mp3 and samples/report.txt.
// Run by .github/workflows/voice-samples.yml.
// (5 Nov 2026) Jörg: "The End" happier, its tone going down at the end of the line, in Fatima's and Mo's voices
// (English); and the letter A for Otter Alphabet ("should sound like Eh"), written three ways to hear which is right.
const https = require('https');
const fs = require('fs');
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = [['fatima', ['lily'], 'pFZP5JQG7iQjIQuC4Bku'], ['mo', ['spuds oxley', 'spuds'], null]];
const SPEED = 0.85; // (Mo's speed; the same for Fatima so they match)
const TAKES = [
  // name, model, text, settings, voices (default both)
  // Mo, "The End" again (Fatima's take 3 is the one)
  ['the-end-4-cheerful', 'eleven_v3', '[cheerfully] The End.', { stability: 0.5, similarity_boost: 0.8 }, ['mo']],
  ['the-end-5-warmly', 'eleven_v3', '[warmly, with a smile] The End.', { stability: 0.5, similarity_boost: 0.8 }, ['mo']],
  ['the-end-6-smile', 'eleven_multilingual_v2', 'The End.', { stability: 0.6, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true }, ['mo']],
  ['the-end-7-glad', 'eleven_v3', '[happily, softly] And that is... the end.', { stability: 0.5, similarity_boost: 0.8 }, ['mo']],
  // the letter A, the way it's said in the alphabet ("ay", like the start of "acorn")
  ['letter-a-1-ipa', 'eleven_flash_v2', '<phoneme alphabet="ipa" ph="eɪ">A</phoneme>.', { stability: 0.9, similarity_boost: 0.8 }],
  ['letter-a-2-cmu', 'eleven_flash_v2', '<phoneme alphabet="cmu-arpabet" ph="EY1">A</phoneme>.', { stability: 0.9, similarity_boost: 0.8 }],
  ['letter-a-3-letter', 'eleven_multilingual_v2', 'The letter A.', { stability: 0.9, similarity_boost: 0.8, style: 0 }],
  ['letter-a-4-aay', 'eleven_multilingual_v2', 'Aay.', { stability: 0.9, similarity_boost: 0.8, style: 0 }],
  ['letter-a-5-v3', 'eleven_v3', 'A. (the letter, said "ay")', { stability: 0.5, similarity_boost: 0.8 }],
];
const call = (method, p, body) => new Promise((res) => {
  const data = body ? JSON.stringify(body) : null;
  const req = https.request({ host: 'api.elevenlabs.io', path: p, method, headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } }, (r) => {
    const chunks = []; r.on('data', (c) => chunks.push(c)); r.on('end', () => res({ status: r.statusCode, buf: Buffer.concat(chunks) }));
  });
  req.on('error', (e) => res({ status: 0, buf: Buffer.from(String(e)) }));
  if (data) req.write(data); req.end();
});
(async () => {
  fs.mkdirSync('samples', { recursive: true });
  const log = [];
  const list = await call('GET', '/v1/voices?show_legacy=true');
  let voices = [];
  try { voices = JSON.parse(list.buf.toString()).voices || []; } catch (e) {}
  for (const [name, find, fallback] of VOICES) {
    const hit = voices.find((v) => find.some((f) => (v.name || '').toLowerCase().startsWith(f)));
    const id = hit ? hit.voice_id : fallback;
    if (!id) { log.push(`${name}: voice not found`); continue; }
    for (const [take, model, text, settings, who] of TAKES) {
      if (who && !who.includes(name)) continue;
      const body = { text, model_id: model, voice_settings: { ...settings, ...(model === 'eleven_v3' ? {} : { speed: SPEED }) } };
      const r = await call('POST', `/v1/text-to-speech/${id}?output_format=mp3_44100_128`, body);
      if (r.status === 200) { fs.writeFileSync(`samples/${name}-${take}.mp3`, r.buf); log.push(`${name} ${take}: ok`); }
      else log.push(`${name} ${take}: HTTP ${r.status} ${r.buf.toString().slice(0, 200)}`);
    }
  }
  fs.writeFileSync('samples/report.txt', log.join('\n') + '\n');
  console.log(log.join('\n'));
})();
