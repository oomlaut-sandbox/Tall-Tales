// Generates ElevenLabs narration for the built-in books, with word timings for highlighting.
// Runs on GitHub Actions (needs the ELEVENLABS_API_KEY secret). Never prints the key.
//
//   node ci/narrate.js            find voices, generate any missing or changed pages
//
// Output:
//   assets/narration/<voice>/<story>/<page>.mp3
//   src/narration/data.json       word start times + text fingerprints (also used as a cache)
//   src/narration/index.js        the audio files the app can play (generated, don't edit)
//   ios-out/narration.txt         report
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const https = require('https');

const KEY = (process.env.ELEVENLABS_API_KEY || '').trim();
const MODEL = 'eleven_multilingual_v2';
// The voices Jörg picked. Lily is the default. `find` is what we look for by name.
const VOICES = [
  { key: 'lily', label: 'Lily', find: ['lily'] },
  { key: 'michael', label: 'Michael Caine', find: ['michael caine', 'michael cane', 'caine'] },
];

const log = [];
const say = (s) => { log.push(s); console.log(s); };
fs.mkdirSync('ios-out', { recursive: true });
const finish = () => fs.writeFileSync('ios-out/narration.txt', log.join('\n') + '\n');

function api(method, p, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      host: 'api.elevenlabs.io', path: p, method,
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    }, (res) => {
      const chunks = []; res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = JSON.parse(text); } catch (e) {}
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on('error', (e) => resolve({ status: 0, json: null, text: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

// Read the books straight from src/story.js (pictures are left out).
function loadStories() {
  let src = fs.readFileSync('src/story.js', 'utf8');
  src = src.replace(/require\([^)]*\)/g, 'null').replace(/^export /gm, '');
  const ctx = { module: { exports: {} } };
  vm.runInNewContext(src + '\nmodule.exports = { STORIES };', ctx);
  return ctx.module.exports.STORIES;
}

// Same word splitting as the app (src/story.js tokenize).
function tokenize(text) {
  const out = []; const re = /\S+/g; let m;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

async function findVoice(v) {
  const mine = await api('GET', '/v1/voices');
  if (mine.status !== 200) { say(`Could not list voices: HTTP ${mine.status} ${mine.text.slice(0, 200)}`); return null; }
  const list = mine.json.voices || [];
  const match = (name) => v.find.some((f) => (name || '').toLowerCase().includes(f));
  let hit = list.find((x) => match(x.name));
  if (hit) { say(`${v.label}: found in your voices as "${hit.name}" (${hit.category || 'voice'})`); return hit.voice_id; }
  // Not in the account yet: look in the shared voice library and add it.
  for (const q of v.find) {
    const shared = await api('GET', `/v1/shared-voices?search=${encodeURIComponent(q)}&page_size=20`);
    const cands = (shared.json && shared.json.voices) || [];
    if (cands.length) say(`${v.label}: library matches for "${q}": ${cands.slice(0, 6).map((c) => `"${c.name}"`).join(', ')}`);
    const c = cands.find((x) => match(x.name));
    if (c) {
      const add = await api('POST', `/v1/voices/add/${c.public_owner_id}/${c.voice_id}`, { new_name: c.name });
      if (add.status === 200 && add.json && add.json.voice_id) { say(`${v.label}: added "${c.name}" from the voice library`); return add.json.voice_id; }
      say(`${v.label}: could not add "${c.name}": HTTP ${add.status} ${add.text.slice(0, 300)}`);
    }
  }
  say(`${v.label}: NOT FOUND. Voices in the account: ${list.map((x) => x.name).join(', ')}`);
  return null;
}

(async () => {
  if (!KEY) { say('ELEVENLABS_API_KEY secret is missing'); return finish(); }
  const sub = await api('GET', '/v1/user/subscription');
  if (sub.status === 200) say(`Plan: ${sub.json.tier}, characters used ${sub.json.character_count} of ${sub.json.character_limit}`);
  else say(`Subscription check: HTTP ${sub.status} ${sub.text.slice(0, 200)}`);

  const stories = loadStories();
  const dataPath = 'src/narration/data.json';
  const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf8')) : {};
  let made = 0, kept = 0, failed = 0, chars = 0;

  for (const v of VOICES) {
    const voiceId = await findVoice(v);
    if (!voiceId) continue;
    data[v.key] = data[v.key] || {};
    for (const story of stories) {
      data[v.key][story.id] = data[v.key][story.id] || {};
      for (const page of story.pages) {
        if (!page.text || !page.text.trim()) continue;
        const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${page.text}`).digest('hex').slice(0, 12);
        const file = path.join('assets/narration', v.key, story.id, `${page.pid}.mp3`);
        const have = data[v.key][story.id][page.pid];
        if (have && have.fp === fp && fs.existsSync(file)) { kept++; continue; }
        const r = await api('POST', `/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
          text: page.text,
          model_id: MODEL,
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
        });
        if (r.status !== 200 || !r.json || !r.json.audio_base64) {
          failed++; say(`FAILED ${v.key}/${story.id}/${page.pid}: HTTP ${r.status} ${r.text.slice(0, 300)}`);
          if (r.status === 401 || r.status === 402 || r.status === 403) break;
          continue;
        }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(r.json.audio_base64, 'base64'));
        const al = r.json.alignment || r.json.normalized_alignment;
        // Each word starts when its first letter is spoken.
        const starts = al ? tokenize(page.text).map((t) => {
          const s = al.character_start_times_seconds[Math.min(t.start, al.character_start_times_seconds.length - 1)];
          return Math.round((s || 0) * 1000) / 1000;
        }) : [];
        const dur = al ? al.character_end_times_seconds[al.character_end_times_seconds.length - 1] : 0;
        data[v.key][story.id][page.pid] = { fp, words: starts, dur: Math.round(dur * 1000) / 1000 };
        made++; chars += page.text.length;
        say(`made ${v.key}/${story.id}/${page.pid} (${page.text.length} chars, ${dur.toFixed(1)}s)`);
      }
    }
  }

  fs.mkdirSync('src/narration', { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 1));
  // A static list of the audio files, so the app bundle includes them.
  const lines = ['// Generated by ci/narrate.js. Do not edit by hand.', "import data from './data.json';", '', 'export const AUDIO = {'];
  for (const vk of Object.keys(data)) {
    lines.push(`  ${vk}: {`);
    for (const sk of Object.keys(data[vk])) {
      lines.push(`    ${JSON.stringify(sk)}: {`);
      for (const pid of Object.keys(data[vk][sk])) {
        const f = `../../assets/narration/${vk}/${sk}/${pid}.mp3`;
        if (fs.existsSync(path.join('src/narration', f))) lines.push(`      ${JSON.stringify(pid)}: require(${JSON.stringify(f)}),`);
      }
      lines.push('    },');
    }
    lines.push('  },');
  }
  lines.push('};', '', 'export const TIMINGS = data;', '');
  fs.writeFileSync('src/narration/index.js', lines.join('\n'));
  say(`Done: ${made} new, ${kept} unchanged, ${failed} failed, ${chars} characters used this run`);
  finish();
})();
