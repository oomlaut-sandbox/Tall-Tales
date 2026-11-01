// Gives each Coro Family plan in App Store Connect its review screenshot (the membership screen), if it has none.
// Apple marks a plan "Missing Metadata" without one. Usage: node ci/review-shots.js <p8> <appId> <png>
// (reads EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID). Never prints keys.
const fs = require('fs');
const crypto = require('crypto');
const [keyPath, appId, png] = process.argv.slice(2);
const key = crypto.createPrivateKey(fs.readFileSync(keyPath, 'utf8'));
const kid = process.env.EXPO_ASC_KEY_ID.trim();
const iss = process.env.EXPO_ASC_ISSUER_ID.trim();
const token = () => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const h = b64({ alg: 'ES256', kid, typ: 'JWT' });
  const b = b64({ iss, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' });
  return `${h}.${b}.${crypto.sign('sha256', Buffer.from(`${h}.${b}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
};
const api = async (method, path, body) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, { method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch {}
  return { status: r.status, j, text };
};
const log = [];
const say = (s) => { log.push(s); console.log(s); };
(async () => {
  const file = fs.readFileSync(png);
  const md5 = crypto.createHash('md5').update(file).digest('hex');
  const groups = await api('GET', `/v1/apps/${appId}/subscriptionGroups?limit=10`);
  for (const g of groups.j.data || []) {
    const subs = await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptions?limit=20`);
    for (const sb of subs.j.data || []) {
      const pid = sb.attributes.productId;
      const cur = await api('GET', `/v1/subscriptions/${sb.id}/appStoreReviewScreenshot`);
      if (cur.j.data) { say(`${pid}: has a review screenshot already (${cur.j.data.attributes.assetDeliveryState && cur.j.data.attributes.assetDeliveryState.state})`); continue; }
      const res = await api('POST', '/v1/subscriptionAppStoreReviewScreenshots', { data: { type: 'subscriptionAppStoreReviewScreenshots', attributes: { fileName: 'membership.png', fileSize: file.length }, relationships: { subscription: { data: { type: 'subscriptions', id: sb.id } } } } });
      if (res.status >= 300) { say(`${pid}: reserve failed HTTP ${res.status} ${res.text.slice(0, 400)}`); continue; }
      const shot = res.j.data;
      for (const op of shot.attributes.uploadOperations || []) {
        const headers = {}; for (const h of op.requestHeaders || []) headers[h.name] = h.value;
        const up = await fetch(op.url, { method: op.method, headers, body: file.subarray(op.offset, op.offset + op.length) });
        if (!up.ok) say(`${pid}: upload part failed HTTP ${up.status}`);
      }
      const done = await api('PATCH', `/v1/subscriptionAppStoreReviewScreenshots/${shot.id}`, { data: { type: 'subscriptionAppStoreReviewScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } });
      say(`${pid}: screenshot ${done.status < 300 ? 'uploaded' : 'commit failed HTTP ' + done.status + ' ' + done.text.slice(0, 300)}`);
    }
  }
  await new Promise((r) => setTimeout(r, 20000));
  for (const g of groups.j.data || []) {
    const subs = await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptions?limit=20`);
    for (const sb of subs.j.data || []) say(`${sb.attributes.productId}: now ${sb.attributes.state}`);
  }
  fs.mkdirSync('ios-out', { recursive: true });
  fs.writeFileSync('ios-out/review-shots.txt', log.join('\n') + '\n');
})();
