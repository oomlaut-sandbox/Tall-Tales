// Takes to listen to before choosing (not used by the app). Writes samples/<name>.mp3 and samples/report.txt.
// Run by .github/workflows/voice-samples.yml.
// (7 Nov 2026) Goodnight, Garden, every page in both voices. (5 Nov 2026) Jörg: "The End" happier, its tone going down at the end of the line, in Fatima's and Mo's voices
// (English); and the letter A for Otter Alphabet ("should sound like Eh"), written three ways to hear which is right.
const https = require('https');
const fs = require('fs');
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = [['fatima', ['lily'], 'pFZP5JQG7iQjIQuC4Bku'], ['mo', ['spuds oxley', 'spuds'], null]];
const SPEED = 0.85; // (Mo's speed; the same for Fatima so they match)
const TAKES = [
  // name, model, text, settings, voices (default both)
  // (7 Nov 2026) Goodnight, Garden: every page, soft and sleepy, for Jörg to hear first
  ['goodnight-garden-p01', 'eleven_multilingual_v2', 'The sun is going down in the garden.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p02', 'eleven_multilingual_v2', 'Goodnight, flowers. Fold up your petals.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p03', 'eleven_multilingual_v2', 'Goodnight, bees. Buzz home to bed.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p04', 'eleven_multilingual_v2', 'Goodnight, snail. Tuck in your head.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p05', 'eleven_multilingual_v2', 'Goodnight, birds, snug in your nest.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p06', 'eleven_multilingual_v2', 'Goodnight, stones, cool and still.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p07', 'eleven_multilingual_v2', 'Up comes the moon, round and bright.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p08', 'eleven_multilingual_v2', 'The crickets sing a sleepy song.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p09', 'eleven_multilingual_v2', 'The fireflies blink. Blink... blink... blink.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p10', 'eleven_multilingual_v2', 'Shh... the whole garden is sleeping now.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p11', 'eleven_multilingual_v2', 'Goodnight, garden.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
  ['goodnight-garden-p12', 'eleven_multilingual_v2', 'Goodnight, little one. Sleep tight.', { stability: 0.65, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true }],
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
