// Asking for an App Store rating, gently. Only at a happy moment: a book just finished (The End), read with a grown-up
// around (not Listen Only, not at bedtime, not on a locked-down child setup), after a few books, and at most once
// every four months. Apple's own rating box decides whether it actually shows (it shows at most three times a year).
import { loadJSON, saveJSON } from './storage';

let StoreReview = null;
try { StoreReview = require('expo-store-review'); } catch (e) {}

const BOOKS_FIRST = 3; // books finished before the first ask
const GAP_DAYS = 120;

export async function bookFinished({ listen = false, controls = {} } = {}) {
  try {
    const r = (await loadJSON('rating', null)) || { finished: 0, asked: 0 };
    r.finished = (r.finished || 0) + 1;
    await saveJSON('rating', r);
    if (!StoreReview || listen) return;
    const h = new Date().getHours();
    if (h < 8 || h >= 19) return; // never at bedtime
    if (controls.store === false || controls.playback === false) return; // a child's locked-down setup
    if (r.finished < BOOKS_FIRST) return;
    if (r.asked && Date.now() - r.asked < GAP_DAYS * 86400000) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    r.asked = Date.now();
    await saveJSON('rating', r);
    setTimeout(() => { StoreReview.requestReview().catch(() => {}); }, 2500); // after The End has settled
  } catch (e) {}
}
