// Finds real archival film on archive.org for the Coro ad, and cuts chosen clips (ci/archive-film.json).
// Output (archive-out/): <query>.txt lists (title, year, licence, rights), sheets/<query>-<id>.jpg contact sheets
// (one frame every 10 s, time stamped), clips/<name>.mp4. Needs ffmpeg (on the GitHub runner).
const fs = require('fs');
const { execFileSync } = require('child_process');
const cfg = JSON.parse(fs.readFileSync('ci/archive-film.json', 'utf8'));
const O = 'archive-out';
fs.mkdirSync(`${O}/sheets`, { recursive: true }); fs.mkdirSync(`${O}/clips`, { recursive: true });
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
const ff = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
async function bestFile(id, small) {
  const m = await get(`https://archive.org/metadata/${id}`);
  const files = (m.files || []).filter((f) => /\.(mp4|mpeg|mpg|ogv|m4v|mov)$/i.test(f.name));
  const mp4 = files.filter((f) => /mp4$/i.test(f.name)).sort((a, b) => (+a.size || 0) - (+b.size || 0));
  const f = small ? (mp4.find((x) => /512kb|\.ia\.mp4/i.test(x.name)) || mp4[0]) : (files.filter((x) => /mpeg|mpg|mov|m4v/i.test(x.name)).sort((a, b) => (+b.size || 0) - (+a.size || 0))[0] || mp4[mp4.length - 1]);
  return { meta: m.metadata || {}, url: f ? `https://archive.org/download/${id}/${encodeURIComponent(f.name)}` : null, name: f && f.name };
}
(async () => {
  const done = fs.existsSync(`${O}/done.json`) ? JSON.parse(fs.readFileSync(`${O}/done.json`, 'utf8')) : {};
  for (const [key, q] of Object.entries(cfg.search || {})) {
    if (done[key]) continue;
    const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q + ' AND mediatype:movies')}&fl[]=identifier&fl[]=title&fl[]=year&fl[]=licenseurl&fl[]=rights&fl[]=downloads&sort[]=downloads+desc&rows=40&output=json`;
    let docs = [];
    try { docs = (await get(u)).response.docs; } catch (e) { console.log('search failed', key, e.message); continue; }
    const lines = docs.map((d) => `${d.identifier} | ${d.title} | ${d.year || '?'} | ${d.licenseurl || '-'} | ${(d.rights || '').toString().slice(0, 120)}`);
    fs.writeFileSync(`${O}/${key}.txt`, lines.join('\n') + '\n');
    for (const d of docs.slice(0, cfg.perQuery || 6)) {
      try {
        const { url } = await bestFile(d.identifier, true);
        ff(['-i', url, '-t', '1200', '-vf', "fps=1/10,scale=240:-1,drawtext=text='%{pts\\:hms}':fontcolor=yellow:fontsize=14:x=4:y=4,tile=8x15", '-frames:v', '1', `${O}/sheets/${key}-${d.identifier}.jpg`]);
        console.log('sheet', key, d.identifier);
      } catch (e) { console.log('sheet failed', d.identifier, e.message.slice(0, 120)); }
    }
    done[key] = true;
  }
  for (const [id, start, len, name] of cfg.clips || []) {
    if (fs.existsSync(`${O}/clips/${name}.mp4`)) continue;
    try {
      const { url, meta } = await bestFile(id, false);
      ff(['-ss', String(start), '-i', url, '-t', String(len), '-an', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', `${O}/clips/${name}.mp4`]);
      fs.appendFileSync(`${O}/clips.txt`, `${name} | ${id} | ${meta.title} | ${meta.year || meta.date || '?'} | ${meta.licenseurl || '-'} | rights: ${String(meta.rights || meta['possible-copyright-status'] || '-').slice(0, 200)} | ${start}s +${len}s\n`);
      console.log('clip', name);
    } catch (e) { console.log('clip failed', name, e.message.slice(0, 160)); }
  }
  fs.writeFileSync(`${O}/done.json`, JSON.stringify(done));
})();
