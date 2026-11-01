// What RevenueCat hands the app: the offerings and their App Store product IDs, read with the app's own public
// iOS key (REVENUECAT_IOS_KEY), as a brand-new phone would. Never prints the key.
const fs = require('fs');
const key = (process.env.REVENUECAT_IOS_KEY || '').trim();
const log = []; const say = (s) => { log.push(s); console.log(s); };
(async () => {
  if (!key) say('REVENUECAT_IOS_KEY missing');
  else {
    say(`key kind: ${key.slice(0, 5)}… (should start appl_)`);
    const id = '$RCAnonymousID:' + Math.random().toString(16).slice(2) + 'check';
    const h = { Authorization: `Bearer ${key}`, 'X-Platform': 'ios', 'Content-Type': 'application/json' };
    const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}/offerings`, { headers: h });
    const t = await r.text(); say(`offerings: HTTP ${r.status}`);
    try {
      const j = JSON.parse(t);
      say(`current offering: ${j.current_offering_id || 'NONE (no default offering)'}`);
      for (const o of j.offerings || []) { say(`- offering "${o.identifier}"`); for (const p of o.packages || []) say(`    package ${p.identifier} -> ${p.platform_product_identifier}`); }
      if (!(j.offerings || []).length) say(t.slice(0, 400));
    } catch { say(t.slice(0, 400)); }
  }
  fs.mkdirSync('ios-out', { recursive: true }); fs.writeFileSync('ios-out/rc-check.txt', log.join('\n') + '\n');
})();
