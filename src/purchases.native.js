// Buying in the app (iPhone): the membership and single books, through Apple, handled by RevenueCat.
// Switched off until the RevenueCat key exists (the TestFlight workflow writes it into purchasesConfig.json
// from the REVENUECAT_IOS_KEY secret); until then the store shows the prices but nothing can be bought.
// What's known: whether this family is a member, and which single books they own. It's kept up to date by
// RevenueCat (a renewal, a cancellation, a purchase on another device after Restore).
import { useEffect, useState } from 'react';
import config from './purchasesConfig.json';
import { ENTITLEMENT, PRICES, bookProductId } from './prices';

let Purchases = null;
try { Purchases = require('react-native-purchases').default; } catch (e) { Purchases = null; }

export const purchasesReady = !!(config.iosKey && Purchases);

let state = { ready: false, member: false, owned: [], plans: null };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn(state)); };
const fromInfo = (info) => ({
  member: !!(info && info.entitlements && info.entitlements.active && info.entitlements.active[ENTITLEMENT]),
  owned: ((info && info.nonSubscriptionTransactions) || []).map((t) => t.productIdentifier),
});

let started = false;
export async function startPurchases() {
  if (started || !purchasesReady) return;
  started = true;
  try {
    Purchases.configure({ apiKey: config.iosKey });
    Purchases.addCustomerInfoUpdateListener((info) => set(fromInfo(info)));
    const info = await Purchases.getCustomerInfo();
    set({ ready: true, ...fromInfo(info) });
    const offerings = await Purchases.getOfferings();
    const cur = offerings && offerings.current;
    if (cur) set({ plans: { monthly: cur.monthly || null, yearly: cur.annual || null } });
  } catch (e) {
    set({ ready: false });
  }
}

export function usePurchases() {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); startPurchases(); return () => { listeners.delete(setS); }; }, []);
  return s;
}

// may this book be read? (free; or a member; or a single book they bought)
export const canOpen = (s, book) => book.access === 'free' || s.member || (book.access === 'paid' && s.owned.includes(bookProductId(book.id)));

// the price to show for a plan ('monthly' | 'yearly'), from the App Store once it's known
export const planPrice = (s, plan) => (s.plans && s.plans[plan] && s.plans[plan].product.priceString) || PRICES[plan];

// buying: each returns 'done', 'cancelled', or throws with a message for the grown-up
const tidy = (e) => { if (e && e.userCancelled) return 'cancelled'; throw new Error((e && e.message) || 'The purchase didn’t go through. Please try again.'); };
export async function joinMembership(plan) {
  if (!purchasesReady || !state.plans || !state.plans[plan]) throw new Error('Memberships aren’t available yet.');
  try { const { customerInfo } = await Purchases.purchasePackage(state.plans[plan]); set(fromInfo(customerInfo)); return 'done'; } catch (e) { return tidy(e); }
}
export async function buyBook(book) {
  if (!purchasesReady) throw new Error('Buying books isn’t available yet.');
  try {
    const [product] = await Purchases.getProducts([bookProductId(book.id)], Purchases.PRODUCT_CATEGORY ? Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION : undefined);
    if (!product) throw new Error('This book can’t be bought just yet.');
    const { customerInfo } = await Purchases.purchaseStoreProduct(product);
    set(fromInfo(customerInfo));
    return 'done';
  } catch (e) { return tidy(e); }
}
export async function restorePurchases() {
  if (!purchasesReady) throw new Error('Purchases aren’t available yet.');
  const info = await Purchases.restorePurchases();
  set(fromInfo(info));
  return state.member || state.owned.length ? 'restored' : 'nothing';
}
