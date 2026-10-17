// The parent's profile: sign in (Apple, or a code by email), your name, sign out, delete account.
// Reached from the menu behind the parent gate.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, fonts } from '../theme';
import { Felt, IS_TABLET, Stitch } from '../look';

const BAND_FELT = require('../../assets/band-profile.jpg');
import { Bar, BarMeta, Burger, Toast, WithBar } from '../components/Chrome';
import {
  accountsReady, appleAvailable, currentUser, deleteAccount, onUserChange, sendEmailCode, signInWithApple, signOut, updateProfile, verifyEmailCode,
} from '../account';

const nice = (e) => {
  const m = (e && e.message) || String(e);
  if (/ERR_REQUEST_CANCELED|canceled/i.test(m)) return '';
  if (/token has expired|invalid/i.test(m)) return 'That code didn’t work. Check it, or send a new one.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Please wait a minute and try again.';
  if (/network|fetch/i.test(m)) return 'No connection. Check your internet and try again.';
  return m;
};

export default function Profile({ u, openMenu, toast }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apple, setApple] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('start'); // start | email | code
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tip, setTip] = useState(true); // the 'For parents' speech bubble

  useEffect(() => {
    currentUser().then((us) => { setUser(us); setLoading(false); });
    appleAvailable().then(setApple);
    return onUserChange(setUser);
  }, []);
  useEffect(() => { setName(user?.user_metadata?.name || ''); }, [user]);

  const run = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(nice(e)); }
    setBusy(false);
  };

  let body;
  if (!accountsReady) {
    body = <Text style={styles.p}>Accounts are almost ready. In a coming update you’ll be able to sign in here, so your stories and recordings are kept safe.</Text>;
  } else if (loading) {
    body = <ActivityIndicator color={colors.ink} />;
  } else if (user) {
    body = (
      <>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user.email || 'Your Apple ID (email hidden)'}</Text>
        <Text style={[styles.label, { marginTop: 18 }]}>Your name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#777" style={styles.input}
          autoCapitalize="words" returnKeyType="done"
          onEndEditing={() => name !== (user.user_metadata?.name || '') && run(async () => { await updateProfile({ name: name.trim() }); toast && toast('Saved.'); })} />
        <Text style={styles.small}>Coming next: your stories and recordings backed up, and on all your family’s devices.</Text>
        <Pressable onPress={() => run(signOut)} style={styles.btn} accessibilityRole="button"><Text style={styles.btnText}>Sign out</Text></Pressable>
        {confirmDelete ? (
          <View style={styles.warnBox}>
            <Text style={styles.warn}>Delete your Oomlaut account? You’ll be signed out and the account is removed for good. Books and recordings on this phone stay here.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => run(async () => { await deleteAccount(); setConfirmDelete(false); toast && toast('Your account was deleted.'); })} style={[styles.btn, { flex: 1, backgroundColor: colors.deepRed }]}>
                <Text style={styles.btnText}>Delete account</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmDelete(false)} style={[styles.btn, { flex: 1 }]}><Text style={styles.btnText}>Keep it</Text></Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmDelete(true)} hitSlop={8}><Text style={styles.deleteLink}>Delete account…</Text></Pressable>
        )}
      </>
    );
  } else if (step === 'start') {
    body = (
      <>
        {/* the words moved into the speech bubble at the bottom; this keeps the buttons where they were */}
        <View style={{ height: 33 }} />
        {apple ? (
          // our own button so both match (same font, size and dark grey); Apple's logo and wording kept
          <Pressable onPress={() => run(signInWithApple)} style={[styles.btn, { flexDirection: 'row', justifyContent: 'center', gap: 7 }]} accessibilityRole="button" accessibilityLabel="Sign in with Apple">
            <Text style={[styles.btnText, { fontSize: 18, marginTop: -2 }]}>{'\uF8FF'}</Text>
            <Text style={styles.btnText}>Sign in with Apple</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => { setErr(''); setStep('email'); }} style={styles.btn} accessibilityRole="button">
          <Text style={styles.btnText}>{apple ? 'Use email instead' : 'Sign in with email'}</Text>
        </Pressable>
      </>
    );
  } else if (step === 'email') {
    body = (
      <>
        <Text style={styles.p}>We’ll email you a 6-digit code.</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#777" style={styles.input}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" />
        <Pressable disabled={busy || !/.+@.+\..+/.test(email)} onPress={() => run(async () => { await sendEmailCode(email); setStep('code'); })}
          style={[styles.btn, (busy || !/.+@.+\..+/.test(email)) && styles.off]} accessibilityRole="button">
          <Text style={styles.btnText}>{busy ? 'Sending…' : 'Send code'}</Text>
        </Pressable>
        <Pressable onPress={() => setStep('start')} hitSlop={8}><Text style={styles.link}>‹ Back</Text></Pressable>
      </>
    );
  } else {
    body = (
      <>
        <Text style={styles.p}>Enter the code we sent to {email.trim()}.</Text>
        <TextInput value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="123456" placeholderTextColor="#777"
          style={[styles.input, styles.codeInput]} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} />
        <Pressable disabled={busy || code.length !== 6} onPress={() => run(() => verifyEmailCode(email, code))}
          style={[styles.btn, (busy || code.length !== 6) && styles.off]} accessibilityRole="button">
          <Text style={styles.btnText}>{busy ? 'Checking…' : 'Sign in'}</Text>
        </Pressable>
        <Pressable onPress={() => run(() => sendEmailCode(email))} hitSlop={8}><Text style={styles.link}>Send a new code</Text></Pressable>
        <Pressable onPress={() => { setCode(''); setStep('email'); }} hitSlop={8}><Text style={styles.link}>‹ Use a different email</Text></Pressable>
      </>
    );
  }

  return (
    <WithBar style={styles.screen} bar={(v) => <Bar u={u} vertical={v}><Burger u={u} onPress={openMenu} /></Bar>}>
      <View style={[styles.band, { paddingTop: insets.top + 30 }]}>
        {/* Jörg's stitched orange felt, treated like the My Library and Book Store banners */}
        {!IS_TABLET ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0, overflow: 'hidden' }}><Image source={BAND_FELT} resizeMode="stretch" style={{ width: '100%', height: '100%' }} /></View> : null}{/* iPad: the classic solid orange */}
        {/* just the title, centred top to bottom in the band (like My Library and the Book Store) */}
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.col}>
          {body}
          {err ? <Text style={styles.err}>{err}</Text> : null}
        </View>
      </ScrollView>
      {/* for grown-ups: a speech bubble at the bottom (tap it to put it away) */}
      {accountsReady && step === 'start' && !user && !loading && tip ? <Toast message="Parents, sign into your Oomlaut account." onDismiss={() => setTip(false)} /> : null}
    </WithBar>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  band: { backgroundColor: colors.orange, paddingBottom: 30, paddingHorizontal: 24, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 32, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, transform: [{ translateY: -3 }] },
  sub: { color: colors.white, fontFamily: fonts.ui, fontSize: 15, marginTop: 6, opacity: 0.9 },
  body: { padding: 24, paddingTop: 40, paddingBottom: 40, alignItems: 'center' },
  col: { width: '100%', maxWidth: 420, gap: 18 },
  p: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, color: colors.ink },
  small: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: '#444', marginTop: 6 },
  label: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: fonts.ui, fontSize: 17, color: colors.ink },
  input: { backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.ui, fontSize: 17, color: colors.ink },
  codeInput: { fontSize: 26, letterSpacing: 8, textAlign: 'center' },
  btn: { backgroundColor: '#3b3b3b', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, // Apple-style pills
  off: { opacity: 0.4 },
  btnText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  link: { color: colors.ink, fontFamily: fonts.ui, fontWeight: '700', fontSize: 15, textAlign: 'center', paddingVertical: 4 },
  deleteLink: { color: '#b00000', fontFamily: fonts.ui, fontWeight: '700', fontSize: 15, textAlign: 'center', paddingVertical: 8 },
  warnBox: { gap: 10, backgroundColor: '#e6e6e6', padding: 14 },
  warn: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: colors.ink },
  err: { fontFamily: fonts.ui, fontSize: 15, color: '#b00000' },
});
