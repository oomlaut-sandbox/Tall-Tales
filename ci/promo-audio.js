// Makes the promo videos' voiceovers (ci/promo-scripts.json) with ElevenLabs: one mp3 per video, into out/promo/.
const fs = require('fs');
const path = require('path');
const KEY = process.env.ELEVENLABS_API_KEY;
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'promo-scripts.json'), 'utf8'));
(async () => {
  if (!KEY) { console.log('no ELEVENLABS_API_KEY'); process.exit(1); }
  fs.mkdirSync('out/promo', { recursive: true });
  for (const [name, v] of Object.entries(cfg.videos)) {
    if (v.done) continue; // (made already)
    const text = v.lines.join(` <break time="${v.pause}" /> `);
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.voice}?output_format=mp3_44100_192`, {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: cfg.model, language_code: 'en', voice_settings: { ...(v.settings || { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true }), speed: v.speed } }),
    });
    if (!res.ok) { console.log(name, 'FAILED', res.status, await res.text()); process.exitCode = 1; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(`out/promo/${name}.mp3`, buf);
    console.log(name, 'ok', buf.length, 'bytes');
  }
})();
