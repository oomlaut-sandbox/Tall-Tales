// The web preview can't buy anything: the store shows the prices, and only free books open.
import { PRICES } from './prices';

export const purchasesReady = false;
const state = { ready: false, member: false, owned: [], plans: null };
export const startPurchases = async () => {};
export const usePurchases = () => state;
export const canOpen = (s, book) => book.access === 'free';
export const planPrice = (s, plan) => PRICES[plan];
export const joinMembership = async () => { throw new Error('Memberships aren’t available yet.'); };
export const buyBook = async () => { throw new Error('Buying books isn’t available yet.'); };
export const restorePurchases = async () => { throw new Error('Purchases aren’t available yet.'); };
