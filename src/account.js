// The parent's Oomlaut account (Supabase). Sign in with Apple, or a 6-digit code sent by email.
// No passwords. The connection details (project URL and public "anon" key) are written into
// supabaseConfig.json by the TestFlight workflow from the SUPABASE_URL / SUPABASE_ANON_KEY secrets;
// until they exist, accounts simply show as "not set up yet".
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { loadJSON, saveJSON } from './storage';
import config from './supabaseConfig.json';

export const accountsReady = !!(config.url && config.anonKey);

// The sign-in is kept on the phone, in the app's own storage.
const store = {
  getItem: async (k) => { const v = await loadJSON(`auth.${k}`, null); return v == null ? null : v; },
  setItem: (k, v) => saveJSON(`auth.${k}`, v),
  removeItem: (k) => saveJSON(`auth.${k}`, null),
};

export const supabase = accountsReady
  ? createClient(config.url, config.anonKey, { auth: { storage: store, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
  : null;

export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
}

export function onUserChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session?.user || null));
  return () => data.subscription.unsubscribe();
}

export async function appleAvailable() {
  if (Platform.OS !== 'ios') return false;
  try { return await AppleAuthentication.isAvailableAsync(); } catch { return false; }
}

export async function signInWithApple() {
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  if (!cred.identityToken) throw new Error('Apple did not return a sign-in token.');
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
  if (error) throw error;
  // Apple only shares the name the very first time; keep it.
  const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
  if (name && !data.user?.user_metadata?.name) await supabase.auth.updateUser({ data: { name } });
  return data.user;
}

export async function sendEmailCode(email) {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyEmailCode(email, code) {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw error;
  return data.user;
}

export async function updateProfile(fields) {
  const { data, error } = await supabase.auth.updateUser({ data: fields });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

// Removes the account for good (Apple requires apps with accounts to offer this).
// Uses the delete_my_account function from docs/supabase-setup.sql.
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
