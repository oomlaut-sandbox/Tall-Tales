// The grown-up passcode (Jörg, 30 Oct 2026): optional. When a parent or teacher sets one (Settings → Parental
// controls), every grown-up check asks for it instead of the times-table question, which older kids can answer.
// One for the whole device (every profile). Kept as a scrambled fingerprint, not the digits themselves.
// Forgot it: the grown-up check offers Sign in with Apple, which asks for Face ID or the device passcode; that
// turns the passcode off.
import { useEffect, useState } from 'react';
import { loadJSON, saveJSON } from './storage';

let code = null;
let loaded = false;
const subs = new Set();
const tell = () => subs.forEach((fn) => { try { fn(); } catch (e) {} });
const scramble = (s) => { let h = 5381; for (const c of `coro-grown-up:${s}`) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36); };

export async function loadGrownupCode() {
  if (!loaded) {
    const v = await loadJSON('grownupCode', null).catch(() => null);
    code = v && v.h ? v.h : null; loaded = true; tell();
  }
  return loaded ? !!code : null; // null: not known yet
}
export const hasGrownupCode = () => !!code;
export const checkGrownupCode = (s) => !!code && scramble(String(s || '')) === code;
export async function setGrownupCode(s) {
  code = s ? scramble(String(s)) : null;
  await saveJSON('grownupCode', code ? { h: code } : {}).catch(() => {});
  tell();
}
export function useGrownupCode() {
  const [, bump] = useState(0);
  useEffect(() => { const fn = () => bump((x) => x + 1); subs.add(fn); loadGrownupCode().catch(() => {}); return () => { subs.delete(fn); }; }, []);
  return loaded ? !!code : null; // null: not known yet
}
