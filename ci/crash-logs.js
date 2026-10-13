// Downloads TestFlight crash reports for the app through the App Store Connect API.
// Usage: node ci/crash-logs.js <path-to-p8> <appId>   (reads EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID)
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

const [keyPath, appId] = process.argv.slice(2);
const key = crypto.createPrivateKey(fs.readFileSync(keyPath, 'utf8'));
const kid = process.env.EXPO_ASC_KEY_ID.trim();
const iss = process.env.EXPO_ASC_ISSUER_ID.trim();
fs.mkdirSync('ios-out/crashes', { recursive: true });
const log = [];
const say = (s) => { log.push(s); console.log(s); };

function token() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const h = b64({ alg: 'ES256', kid, typ: 'JWT' });
  const b = b64({ iss, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' });
  const s = crypto.sign('sha256', Buffer.from(`${h}.${b}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${h}.${b}.${s}`;
}
function get(url) {
  return new Promise((resolve) => {
    const u = url.startsWith('http') ? new URL(url) : new URL(`https://api.appstoreconnect.apple.com${url}`);
    const headers = u.host.includes('appstoreconnect') ? { Authorization: `Bearer ${token()}` } : {};
    https.get(u, { headers }, (res) => {
      const chunks = []; res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', (e) => resolve({ status: 0, body: e.message }));
  });
}
const json = (r) => { try { return JSON.parse(r.body); } catch { return {}; } };

(async () => {
  const builds = json(await get(`/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=5`));
  for (const b of builds.data || []) say(`build ${b.attributes.version}: ${b.attributes.processingState} (id ${b.id})`);

  const subs = await get(`/v1/apps/${appId}/betaFeedbackCrashSubmissions?limit=20`);
  say(`crash submissions: HTTP ${subs.status}`);
  const list = json(subs).data || [];
  say(`${list.length} found`);
  for (const s of list) {
    const a = s.attributes || {};
    say(`- ${s.id} ${a.createdDate || ''} ${a.deviceModel || ''} iOS ${a.osVersion || ''} comment: ${a.comment || ''}`);
    const cl = json(await get(`/v1/betaFeedbackCrashSubmissions/${s.id}/crashLog`));
    const text = cl.data?.attributes?.logText;
    if (text) fs.writeFileSync(`ios-out/crashes/${s.id}.txt`, text);
    else say(`  crash log: ${JSON.stringify(cl).slice(0, 300)}`);
  }
  if (!list.length) say(subs.body.slice(0, 500));

  // Aggregated diagnostics (only appear once Apple has collected enough reports).
  for (const b of (builds.data || []).slice(0, 2)) {
    const d = await get(`/v1/builds/${b.id}/diagnosticSignatures?limit=10`);
    say(`diagnostics for build ${b.attributes.version}: HTTP ${d.status} ${(json(d).data || []).map((x) => x.attributes.signature).join(' | ').slice(0, 500)}`);
  }
  fs.writeFileSync('ios-out/crash-summary.txt', log.join('\n') + '\n');
})();
