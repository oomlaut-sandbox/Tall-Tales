// One sample sentence in a few ElevenLabs voices, to listen to before choosing (not used by the app).
// Writes samples/<name>.mp3 and samples/report.txt. Run by .github/workflows/voice-samples.yml.
const https = require('https');
const fs = require('fs');
const KEY = process.env.ELEVENLABS_API_KEY;
const TEXT = 'When she opened her eyes, she was part of a puddle, full of drops just like her. She felt different. But it felt good.';
const VOICES = [['matilda', 'XrExE9yKIg1WjnnlVkGX'], ['charlie', 'IKne3meq5aSn9XLyUdCD']];
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
  const list = await call('GET', '/v1/voices');
  let voices = [];
  try { voices = JSON.parse(list.buf.toString()).voices || []; } catch (e) {}
  for (const [name, fallback] of VOICES) {
    const hit = voices.find((v) => (v.name || '').toLowerCase().startsWith(name));
    const id = hit ? hit.voice_id : fallback;
    const r = await call('POST', `/v1/text-to-speech/${id}?output_format=mp3_44100_128`, { text: TEXT, model_id: 'eleven_multilingual_v2' });
    if (r.status === 200) { fs.writeFileSync(`samples/${name}.mp3`, r.buf); log.push(`${name}: ok (${hit ? hit.name : 'standard id'})`); }
    else log.push(`${name}: HTTP ${r.status} ${r.buf.toString().slice(0, 200)}`);
  }
  fs.writeFileSync('samples/report.txt', log.join('\n') + '\n');
  console.log(log.join('\n'));
})();
