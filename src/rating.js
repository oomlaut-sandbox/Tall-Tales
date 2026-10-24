// Asking for an App Store rating, gently, and only of a grown-up: right after they've recorded several pages of a book
// in their own voice (a happy moment, and the phone is surely in a grown-up's hands, which matters in the Kids
// Category). At most once every four months; Apple's own rating box decides whether it shows (three times a year at most).
import { loadJSON, saveJSON } from './storage';

let StoreReview = null;
try { StoreReview = require('expo-store-review'); } catch (e) {}

const PAGES = 3; // pages recorded in one go before asking
const GAP_DAYS = 120;

export async function recordingDone(pages) {
  try {
    if (!StoreReview || pages < PAGES) return;
    const r = (await loadJSON('rating', null)) || {};
    if (r.asked && Date.now() - r.asked < GAP_DAYS * 86400000) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    r.asked = Date.now();
    await saveJSON('rating', r);
    setTimeout(() => { StoreReview.requestReview().catch(() => {}); }, 1500);
  } catch (e) {}
}
