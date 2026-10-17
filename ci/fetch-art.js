// Looks for public-domain natural-history drawings on Wikimedia Commons and downloads the candidates
// (with their title, date and licence) so the best ones can be chosen for a book.
// Runs on GitHub Actions (the build machines can reach Wikimedia).  node ci/fetch-art.js
const fs = require('fs');
const path = require('path');
const QUERIES = JSON.parse(fs.readFileSync('ci/art-queries.json', 'utf8'));
const OUT = 'art-out';
fs.mkdirSync(OUT, { recursive: true });
const UA = { 'User-Agent': 'OomlautReader/1.0 (book art lookup; contact via oomlaut.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// politely: a pause between requests, and a longer wait when Wikimedia asks us to slow down
const get = async (u) => {
  for (let i = 0; i < 6; i++) {
    await sleep(1500);
    const r = await fetch(u, { headers: UA });
    if (r.status !== 429) return r;
    await sleep(15000 * (i + 1));
  }
  throw new Error('still rate limited');
};
const api = async (params) => {
  const r = await get('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params }));
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { throw new Error(`API HTTP ${r.status}: ${t.slice(0, 200)}`); }
};
(async () => {
  const index = [];
  for (const [key, query] of Object.entries(QUERIES)) {
   try {
    const titles = query.files
      ? query.files
      : ((await api({ action: 'query', list: 'search', srnamespace: '6', srlimit: '15', srsearch: query.search })).query?.search || []).map((x) => x.title);
    let n = 0;
    for (const title of titles) {
      if (!/\.(jpe?g|png|tif?f)$/i.test(title)) continue;
      const info = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1400' });
      const page = Object.values(info.query?.pages || {})[0];
      const ii = page && page.imageinfo && page.imageinfo[0];
      if (!ii) { index.push(`${key}\tMISSING\t${title}`); continue; }
      const md = ii.extmetadata || {};
      const lic = (md.LicenseShortName && md.LicenseShortName.value) || '';
      const date = ((md.DateTimeOriginal && md.DateTimeOriginal.value) || '').replace(/<[^>]+>/g, '').slice(0, 60);
      const artist = ((md.Artist && md.Artist.value) || '').replace(/<[^>]+>/g, '').slice(0, 60);
      if (!/public domain|pd/i.test(lic)) { index.push(`${key}\tSKIP (${lic})\t${title}`); continue; } // public domain only
      const r = await get(ii.thumburl || ii.url);
      if (!r.ok) { index.push(`${key}\tHTTP ${r.status}\t${title}`); continue; }
      const file = `${key}-${++n}${path.extname(new URL(ii.thumburl || ii.url).pathname).toLowerCase() || '.jpg'}`;
      fs.writeFileSync(path.join(OUT, file), Buffer.from(await r.arrayBuffer()));
      index.push(`${key}\t${file}\t${title}\t${lic}\t${date}\t${artist}\t${ii.descriptionurl}`);
      if (n >= (query.max || 4)) break;
    }
   } catch (e) { index.push(`${key}\tERROR\t${e.message}`); }
  }
  fs.writeFileSync(path.join(OUT, 'index.txt'), index.join('\n') + '\n');
  console.log(index.join('\n'));
})();
