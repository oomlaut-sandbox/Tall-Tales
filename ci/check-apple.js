// Checks the App Store Connect API key without printing any secret values.
// Usage: node ci/check-apple.js <path-to-p8>   (reads EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID)
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

const out = [];
const say = (s) => { out.push(s); console.log(s); };
const keyId = (process.env.EXPO_ASC_KEY_ID || '').trim();
const issuer = (process.env.EXPO_ASC_ISSUER_ID || '').trim();
const raw = fs.readFileSync(process.argv[2], 'utf8');

say(`Key ID: ${keyId.length} chars, ${/^[A-Z0-9]{10}$/.test(keyId) ? 'looks right (10 letters/digits)' : 'DOES NOT look like a Key ID (expect 10 capital letters/digits)'}`);
if (keyId !== (process.env.EXPO_ASC_KEY_ID || '')) say('Key ID has extra spaces or newlines around it');
say(`Issuer ID: ${issuer.length} chars, ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issuer) ? 'looks right (UUID)' : 'DOES NOT look like an Issuer ID (expect xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)'}`);
say(`Key file: ${raw.length} chars, ${raw.split('\n').length} lines, BEGIN line ${raw.includes('-----BEGIN PRIVATE KEY-----') ? 'present' : 'MISSING'}, END line ${raw.includes('-----END PRIVATE KEY-----') ? 'present' : 'MISSING'}`);

// Rebuild the PEM in case line breaks were lost when pasting.
let pem = raw;
const m = raw.replace(/\s+/g, '').match(/-----BEGINPRIVATEKEY-----(.+)-----ENDPRIVATEKEY-----/);
if (m) pem = `-----BEGIN PRIVATE KEY-----\n${m[1].match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
let key;
try {
  key = crypto.createPrivateKey(pem);
  say(`Key file parses: ${key.asymmetricKeyType} ${key.asymmetricKeyDetails?.namedCurve || ''}`);
  if (pem !== raw && !raw.includes('\n-----END')) say('Note: line breaks were missing; repaired copy written');
  fs.writeFileSync(process.argv[2], pem);
} catch (e) {
  say(`Key file DOES NOT parse as a private key: ${e.message}`);
}

function call(path) {
  return new Promise((resolve) => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const head = b64({ alg: 'ES256', kid: keyId, typ: 'JWT' });
    const body = b64({ iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' });
    const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    https.get({ host: 'api.appstoreconnect.apple.com', path, headers: { Authorization: `Bearer ${head}.${body}.${sig}` } }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode, d }));
    }).on('error', (e) => resolve({ status: 0, d: e.message }));
  });
}

(async () => {
  if (key) {
    for (const p of ['/v1/apps?limit=5', '/v1/bundleIds?limit=5', '/v1/certificates?limit=5']) {
      const r = await call(p);
      let note = '';
      try {
        const j = JSON.parse(r.d);
        if (j.errors) note = j.errors.map((e) => `${e.code}: ${e.detail || e.title}`).join(' | ');
        else if (j.data) note = `${j.data.length} found` + (p.startsWith('/v1/apps') ? ` (${j.data.map((a) => a.id).join(', ')})` : p.startsWith('/v1/bundleIds') ? ` (${j.data.map((b) => b.attributes.identifier).join(', ')})` : '');
      } catch { note = r.d.slice(0, 200); }
      say(`Apple ${p.split('?')[0]}: HTTP ${r.status} ${note}`);
    }
  }
  fs.writeFileSync('ios-out/apple-check.txt', out.join('\n') + '\n');
})();
