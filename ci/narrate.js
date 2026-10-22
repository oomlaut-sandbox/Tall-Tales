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
// Lily speaks at this pace (ElevenLabs allows 0.7–1.2). The app's default speed (0.75) plays it
// as-is, so the audio is never slowed down on the phone at the default setting.
const PACE = 0.75;
// books whose translations get ElevenLabs narration too (the rest use the phone's voice in other languages)
const TRANSLATED = ['different', 'tips'];
// The voices Jörg picked. `find` is what we look for by name. (Michael Caine was considered; Lily only for now.)
const VOICES = [
  // id: ElevenLabs' standard voice ID, used if the key isn't allowed to look voices up.
  // pace: how fast each voice speaks at the app's default speed (Lily a little slower; Gregory as he is).
  { key: 'lily', label: 'Lily', find: ['lily'], id: 'pFZP5JQG7iQjIQuC4Bku', pace: 0.75 },
  { key: 'gregory', label: 'Gregory Grumble', find: ['gregory grumble', 'grumble'], pace: 1 },
];

// A short sample each voice says when it's tapped in Voices (spelled the way it should sound).
const SAMPLE = 'Let your imagination play, with Oomlout Reader.';
const samplesPath = 'src/narration/samples.json';
const samples = fs.existsSync(samplesPath) ? JSON.parse(fs.readFileSync(samplesPath, 'utf8')) : {};

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
let helpers = null;
function loadStories() {
  let src = fs.readFileSync('src/story.js', 'utf8');
  src = src.replace(/require\([^)]*\)/g, 'null').replace(/^export /gm, '');
  const ctx = { module: { exports: {} } };
  vm.runInNewContext(src + '\nmodule.exports = { STORIES, cleanWord, syllablesFor };', ctx);
  helpers = ctx.module.exports;
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
  if (mine.status !== 200) {
    say(`Could not list voices: HTTP ${mine.status} ${mine.text.slice(0, 160)}`);
    if (v.id) { say(`${v.label}: using the standard voice ID instead`); return v.id; }
    return null;
  }
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

// Learn to Read: Lily saying every word in the books, and each word part for sounding out.
const wordsPath = 'src/narration/words.json';
const words = fs.existsSync(wordsPath) ? JSON.parse(fs.readFileSync(wordsPath, 'utf8')) : {};
const slug = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, (c) => `_${c.charCodeAt(0).toString(16)}`);
async function speakClip(voiceId, text, speed, settings, lang) {
  const r = await api('POST', `/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    text, model_id: MODEL, ...(lang ? { language_code: lang } : {}),
    voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed, ...(settings || {}) },
  });
  return r.status === 200 && r.json && r.json.audio_base64 ? Buffer.from(r.json.audio_base64, 'base64') : null;
}
async function makeSample(v, voiceId) {
  const speed = v.pace || PACE;
  const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${speed}|${SAMPLE}`).digest('hex').slice(0, 12);
  const file = path.join('assets/narration', v.key, 'sample.mp3');
  if (samples[v.key] && samples[v.key].fp === fp && fs.existsSync(file)) return say(`${v.label}: sample unchanged`);
  const audio = await speakClip(voiceId, SAMPLE, speed);
  if (!audio) return say(`FAILED sample for ${v.label}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, audio);
  samples[v.key] = { fp };
  say(`${v.label}: sample made`);
}
// The sample in the other app languages (the name spelled so each language's voice says it "oom-lout reader").
const SAMPLE_LANGS = {
  de: 'Lass deine Fantasie spielen, mit Umlaut Reader.',
  fr: 'Laisse jouer ton imagination, avec Oumlaout Rideur.',
  es: 'Deja volar tu imaginación, con Umlaut Rider.',
  ja: 'ウームラウト・リーダーで、そうぞうの せかいで あそぼう。',
};
async function makeSampleLangs(v, voiceId) {
  samples.langs = samples.langs || {};
  const mine = (samples.langs[v.key] = samples.langs[v.key] || {});
  const speed = v.pace || PACE;
  for (const [lang, text] of Object.entries(SAMPLE_LANGS)) {
    const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${speed}|${text}`).digest('hex').slice(0, 12);
    const file = path.join('assets/narration', v.key, 'sample', `${lang}.mp3`);
    if (mine[lang] === fp && fs.existsSync(file)) continue;
    const audio = await speakClip(voiceId, text, speed);
    if (!audio) { say(`FAILED sample (${lang}) for ${v.label}`); continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, audio);
    mine[lang] = fp;
    say(`${v.label}: sample (${lang}) made`);
  }
}
// "The End", said by each narrator on the last page of every book: slow, steady and soft, for bedtime.
// One clip per language, the same for every book. assets/narration/<voice>/the-end/<lang>.mp3
const THE_END = { en: 'The End.', de: 'Ende.', fr: 'Fin.', es: 'Fin.', ja: 'おしまい。' };
const END_SETTINGS = { stability: 0.9, similarity_boost: 0.8, style: 0, use_speaker_boost: false };
async function makeTheEnd(v, voiceId) {
  samples.theEnd = samples.theEnd || {};
  const mine = (samples.theEnd[v.key] = samples.theEnd[v.key] || {});
  for (const [lang, text] of Object.entries(THE_END)) {
    const speed = 0.7; // the slowest ElevenLabs allows
    const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${speed}|${JSON.stringify(END_SETTINGS)}|${text}`).digest('hex').slice(0, 12);
    const file = path.join('assets/narration', v.key, 'the-end', `${lang}.mp3`);
    if (mine[lang] === fp && fs.existsSync(file)) continue;
    const audio = await speakClip(voiceId, text, speed, END_SETTINGS);
    if (!audio) { say(`FAILED The End (${lang}) for ${v.label}`); continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, audio);
    mine[lang] = fp;
    say(`${v.label}: The End (${lang}) made`);
  }
}
// The Abc sheet in My Folder: each letter's name, its sound and a word ("B… buh… bear."), slowly and clearly.
// (Written so the voice says the sound, not the spelling: "buh", "ah", "kuh"…)
const LETTERS = {
  a: 'A… ah… apple.', b: 'B… buh… bear.', c: 'C… kuh… cat.', d: 'D… duh… dog.', e: 'E… eh… egg.', f: 'F… fff… fish.',
  g: 'G… guh… goat.', h: 'H… hhh… hat.', i: 'I… ih… igloo.', j: 'J… juh… jam.', k: 'K… kuh… kite.', l: 'L… lll… lion.',
  m: 'M… mmm… moon.', n: 'N… nnn… nest.', o: 'O… oh… octopus.', p: 'P… puh… pig.', q: 'Q… kwuh… queen.', r: 'R… rrr… rabbit.',
  s: 'S… sss… sun.', t: 'T… tuh… tree.', u: 'U… uh… umbrella.', v: 'V… vvv… van.', w: 'W… wuh… whale.', x: 'X… ks… fox.',
  y: 'Y… yuh… yo-yo.', z: 'Z… zzz… zebra.',
};
async function makeLetters(v, voiceId) {
  samples.letters = samples.letters || {};
  const mine = (samples.letters[v.key] = samples.letters[v.key] || {});
  for (const [ch, text] of Object.entries(LETTERS)) {
    const speed = 0.7;
    const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${speed}|${text}`).digest('hex').slice(0, 12);
    const file = path.join('assets/narration', v.key, 'letters', `${ch}.mp3`);
    if (mine[ch] === fp && fs.existsSync(file)) continue;
    const audio = await speakClip(voiceId, text, speed, { stability: 0.7 }, 'en');
    if (!audio) { say(`FAILED letter ${ch} for ${v.label}`); continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, audio);
    mine[ch] = fp;
    say(`${v.label}: letter ${ch} made`);
  }
}
async function makeWords(v, voiceId) {
  const stories = loadStories();
  const want = { words: new Map(), parts: new Map() };
  for (const story of stories) {
    for (const page of story.pages) {
      for (const raw of (page.text || '').split(/\s+/)) {
        const w = helpers.cleanWord(raw);
        if (!w) continue;
        const key = w.toLowerCase();
        if (!want.words.has(key)) want.words.set(key, w);
        const parts = helpers.syllablesFor(story, w);
        if (parts.length > 1) for (const part of parts) if (!want.parts.has(part.toLowerCase())) want.parts.set(part.toLowerCase(), part.toLowerCase());
      }
    }
  }
  words[v.key] = words[v.key] || { words: {}, parts: {} };
  let n = 0, kept = 0;
  words[v.key].parts = {}; // Learn to Read says whole words only (no word parts)
  for (const kind of ['words']) {
    for (const [key, text] of want[kind]) {
      const speed = kind === 'words' ? (v.pace || PACE) : 0.7;
      const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${speed}|${text}`).digest('hex').slice(0, 12);
      const file = path.join('assets/narration', v.key, kind, `${slug(key)}.mp3`);
      const have = words[v.key][kind][key];
      if (have && have.fp === fp && fs.existsSync(file)) { kept++; continue; }
      const audio = await speakClip(voiceId, kind === 'words' ? `${text}.` : text, speed);
      if (!audio) { say(`FAILED ${kind} "${text}"`); continue; }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, audio);
      words[v.key][kind][key] = { fp, file: `${slug(key)}.mp3` };
      n++;
    }
  }
  say(`${v.label}: ${n} word and part clips made, ${kept} unchanged (${want.words.size} words, ${want.parts.size} parts)`);
  // Learn to Read in the translated books: every word in each language, said by the same voice in that language
  // (kept in words-<lang>/, named by a short hash so any script works as a file name)
  words[v.key].langs = words[v.key].langs || {};
  for (const story of stories.filter((st) => TRANSLATED.includes(st.id) && st.langs)) {
    for (const [lang, L] of Object.entries(story.langs)) {
      const mine = (words[v.key].langs[lang] = words[v.key].langs[lang] || {});
      let ln = 0, lk = 0;
      for (const t of (L.texts || [])) {
        for (const raw of String(t || '').split(/\s+/)) {
          const w = helpers.cleanWord(raw);
          if (!w || w.length > 24) continue; // (a long unspaced Japanese phrase isn't a word to tap)
          const key = w.toLocaleLowerCase(lang);
          const speed = v.pace || PACE;
          const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${speed}|${lang}|${w}`).digest('hex').slice(0, 12);
          const fname = `${crypto.createHash('sha1').update(key).digest('hex').slice(0, 10)}.mp3`;
          const file = path.join('assets/narration', v.key, `words-${lang}`, fname);
          if (mine[key] && mine[key].fp === fp && fs.existsSync(file)) { lk++; continue; }
          const audio = await speakClip(voiceId, `${w}.`, speed, null, lang);
          if (!audio) { say(`FAILED word (${lang}) "${w}"`); continue; }
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, audio);
          mine[key] = { fp, file: fname };
          ln++;
        }
      }
      say(`${v.label}: ${story.id} ${lang}: ${ln} word clips made, ${lk} unchanged`);
    }
  }
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
        const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${v.pace || PACE}|${page.text}`).digest('hex').slice(0, 12);
        const file = path.join('assets/narration', v.key, story.id, `${page.pid}.mp3`);
        const have = data[v.key][story.id][page.pid];
        if (have && have.fp === fp && fs.existsSync(file)) { kept++; continue; }
        const r = await api('POST', `/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
          text: page.text,
          model_id: MODEL,
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: v.pace || PACE },
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
    // The translated books (Different for now): the same voice reading each language's text, kept as
    // <story>@<lang> (e.g. different@de), with word timings like the English pages.
    for (const story of stories.filter((st) => TRANSLATED.includes(st.id) && st.langs)) {
      for (const [lang, L] of Object.entries(story.langs)) {
        const sk = `${story.id}@${lang}`;
        data[v.key][sk] = data[v.key][sk] || {};
        for (let i = 0; i < story.pages.length; i++) {
          const page = story.pages[i];
          const text = L.texts && L.texts[i] != null ? L.texts[i] : null;
          if (!text || !text.trim()) continue;
          const fp = crypto.createHash('sha1').update(`${MODEL}|${voiceId}|${v.pace || PACE}|${lang}|${text}`).digest('hex').slice(0, 12);
          const file = path.join('assets/narration', v.key, sk, `${page.pid}.mp3`);
          const have = data[v.key][sk][page.pid];
          if (have && have.fp === fp && fs.existsSync(file)) { kept++; continue; }
          const r = await api('POST', `/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
            text, model_id: MODEL, language_code: lang,
            voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: v.pace || PACE },
          });
          if (r.status !== 200 || !r.json || !r.json.audio_base64) {
            failed++; say(`FAILED ${v.key}/${sk}/${page.pid}: HTTP ${r.status} ${r.text.slice(0, 300)}`);
            if (r.status === 401 || r.status === 402 || r.status === 403) break;
            continue;
          }
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, Buffer.from(r.json.audio_base64, 'base64'));
          const al = r.json.alignment || r.json.normalized_alignment;
          const starts = al ? tokenize(text).map((t) => {
            const s0 = al.character_start_times_seconds[Math.min(t.start, al.character_start_times_seconds.length - 1)];
            return Math.round((s0 || 0) * 1000) / 1000;
          }) : [];
          const dur = al ? al.character_end_times_seconds[al.character_end_times_seconds.length - 1] : 0;
          data[v.key][sk][page.pid] = { fp, words: starts, dur: Math.round(dur * 1000) / 1000 };
          made++; chars += text.length;
          say(`made ${v.key}/${sk}/${page.pid} (${text.length} chars, ${dur.toFixed(1)}s)`);
        }
      }
    }
    await makeWords(v, voiceId);
    await makeSample(v, voiceId);
    await makeTheEnd(v, voiceId);
    await makeLetters(v, voiceId);
    await makeSampleLangs(v, voiceId);
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
  fs.writeFileSync(wordsPath, JSON.stringify(words, null, 1));
  fs.writeFileSync(samplesPath, JSON.stringify(samples, null, 1));
  const sl = ['// Generated by ci/narrate.js. Do not edit by hand.', '// The sample each voice says when tapped in Voices.', 'export const SAMPLES = {'];
  for (const vk of Object.keys(samples)) if (vk !== 'theEnd' && vk !== 'langs' && vk !== 'letters' && fs.existsSync(path.join('assets/narration', vk, 'sample.mp3'))) sl.push(`  ${vk}: require(${JSON.stringify(`../../assets/narration/${vk}/sample.mp3`)}),`);
  sl.push('};', '', '// "The End", said gently by each narrator on the last page (by language).', 'export const THE_END = {');
  for (const [vk, langs] of Object.entries(samples.theEnd || {})) {
    const have = Object.keys(langs).filter((l) => fs.existsSync(path.join('assets/narration', vk, 'the-end', `${l}.mp3`)));
    sl.push(`  ${vk}: {`, ...have.map((l) => `    ${l}: require(${JSON.stringify(`../../assets/narration/${vk}/the-end/${l}.mp3`)}),`), '  },');
  }
  sl.push('};', '', '// The sample in the other app languages (English is SAMPLES).', 'export const SAMPLE_LANGS = {');
  for (const [vk, langs] of Object.entries(samples.langs || {})) {
    const have = Object.keys(langs).filter((l) => fs.existsSync(path.join('assets/narration', vk, 'sample', `${l}.mp3`)));
    sl.push(`  ${vk}: {`, ...have.map((l) => `    ${l}: require(${JSON.stringify(`../../assets/narration/${vk}/sample/${l}.mp3`)}),`), '  },');
  }
  sl.push('};', '', '// The Abc sheet: each letter said by each narrator ("B… buh… bear.").', 'export const LETTERS = {');
  for (const [vk, chars] of Object.entries(samples.letters || {})) {
    const have = Object.keys(chars).filter((c) => fs.existsSync(path.join('assets/narration', vk, 'letters', `${c}.mp3`)));
    sl.push(`  ${vk}: {`, ...have.map((c) => `    ${c}: require(${JSON.stringify(`../../assets/narration/${vk}/letters/${c}.mp3`)}),`), '  },');
  }
  sl.push('};', '');
  fs.writeFileSync('src/narration/samples.js', sl.join('\n'));
  const wl = ['// Generated by ci/narrate.js. Do not edit by hand.', '// Learn to Read clips: each word, and the parts used when sounding words out.', 'export const WORDS = {'];
  const pl = ['export const PARTS = {'];
  for (const vk of Object.keys(words)) {
    wl.push(`  ${vk}: {`); pl.push(`  ${vk}: {`);
    for (const [key, info] of Object.entries(words[vk].words)) wl.push(`    ${JSON.stringify(key)}: require(${JSON.stringify(`../../assets/narration/${vk}/words/${info.file}`)}),`);
    for (const [key, info] of Object.entries(words[vk].parts)) pl.push(`    ${JSON.stringify(key)}: require(${JSON.stringify(`../../assets/narration/${vk}/parts/${info.file}`)}),`);
    wl.push('  },'); pl.push('  },');
  }
  wl.push('};', ''); pl.push('};', '');
  // Learn to Read words in the other languages: WORDS_LANG[voice][lang][word]
  const ll = ['// Learn to Read words in the translated books, by voice and language.', 'export const WORDS_LANG = {'];
  for (const vk of Object.keys(words)) {
    ll.push(`  ${vk}: {`);
    for (const [lang, m] of Object.entries(words[vk].langs || {})) {
      ll.push(`    ${lang}: {`);
      for (const [key, info] of Object.entries(m)) if (fs.existsSync(path.join('assets/narration', vk, `words-${lang}`, info.file))) ll.push(`      ${JSON.stringify(key)}: require(${JSON.stringify(`../../assets/narration/${vk}/words-${lang}/${info.file}`)}),`);
      ll.push('    },');
    }
    ll.push('  },');
  }
  ll.push('};', '');
  fs.writeFileSync('src/narration/words.js', wl.concat(pl).concat(ll).join('\n'));
  say(`Done: ${made} new, ${kept} unchanged, ${failed} failed, ${chars} characters used this run`);
  finish();
})();
