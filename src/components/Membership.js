// The membership screen (for grown-ups; the store asks the grown-up question first). Two plans, yearly
// picked to start with, a 7-day free trial, Restore Purchases, and the renewal terms Apple asks for.
// Until purchases are switched on (see purchases.native.js) it shows the prices and says it's coming soon.
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { PRICES, PRIVACY_URL, TERMS_URL } from '../prices';
import { useT } from '../i18n';
import { STORE_ON } from '../controls'; // (no longer changes the wording here)
import { joinMembership, planPrice, purchasesReady, restorePurchases, usePurchases } from '../purchases';

export default function Membership({ visible, onClose, toast }) {
  const t = useT();
  const s = usePurchases();
  const [plan, setPlan] = useState('yearly');
  const [busy, setBusy] = useState(null); // 'join' | 'restore'
  if (!visible) return null;
  const live = purchasesReady && s.ready && !!s.plans;
  const join = async () => {
    setBusy('join');
    try {
      const r = await joinMembership(plan);
      if (r === 'done') { toast && toast(t('Welcome to Coro Family! Make as many books as you like.')); onClose(); }
    } catch (e) { toast && toast(t(e.message)); }
    setBusy(null);
  };
  const restore = async () => {
    setBusy('restore');
    try {
      const r = await restorePurchases();
      toast && toast(r === 'restored' ? t('Your purchases are back.') : t('No earlier purchases were found for this Apple ID.'));
      if (r === 'restored') onClose();
    } catch (e) { toast && toast(t(e.message)); }
    setBusy(null);
  };
  const Plan = ({ id, title, price, per, note }) => (
    <Pressable onPress={() => setPlan(id)} accessibilityRole="radio" accessibilityState={{ selected: plan === id }} style={[styles.plan, plan === id && styles.planOn]}>
      <View style={[styles.dot, plan === id && styles.dotOn]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.planTitle}>{title}</Text>
        {note ? <Text style={styles.planNote}>{note}</Text> : null}
      </View>
      <Text style={styles.planPrice}>{price}<Text style={styles.per}>{per}</Text></Text>
    </Pressable>
  );
  return (
    <View style={styles.scrim}>
      <View style={styles.card}>
        <ScrollView contentContainerStyle={{ gap: 14 }} bounces={false}>
          <Text style={styles.kicker}>{t('For grown-ups')}</Text>
          <Text style={styles.title}>{t('Coro Family')}</Text>
          <Text style={styles.body}>{t('Make as many books as you like, with every page, voice and drawing tool. Share them with family and save a print-quality PDF.') /* the membership is for the book maker; artists' books are bought on their own (Jörg, 30 Oct 2026) */}</Text>
          <View style={{ gap: 10 }}>
            <Plan id="yearly" title={t('Yearly')} price={planPrice(s, 'yearly')} per={t(' / year')} note={t('Best value: about a third off')} />
            <Plan id="monthly" title={t('Monthly')} price={planPrice(s, 'monthly')} per={t(' / month')} />
          </View>
          <Pressable onPress={join} disabled={!live || !!busy} accessibilityRole="button" style={[styles.join, (!live || busy) && { opacity: 0.5 }]}>
            {busy === 'join' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.joinText}>{t('Try {n} days free', { n: PRICES.trialDays })}</Text>}
          </Pressable>
          {!live ? <Text style={styles.soon}>{t('Memberships are being set up and arrive in the next update.')}</Text> : null}
          <Text style={styles.small}>
            {t('Free for {n} days, then {price} a {period}. Payment is charged to your Apple ID. The membership renews automatically unless it’s cancelled at least 24 hours before the end of the period. You can manage or cancel it any time in your App Store account settings.', { n: PRICES.trialDays, price: planPrice(s, plan), period: t(plan === 'yearly' ? 'year' : 'month') })}
          </Text>
          <View style={styles.links}>
            <Pressable onPress={restore} disabled={!purchasesReady || !!busy} hitSlop={8}><Text style={[styles.link, !purchasesReady && { opacity: 0.5 }]}>{busy === 'restore' ? t('Restoring…') : t('Restore Purchases')}</Text></Pressable>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}><Text style={styles.link}>{t('Terms of Use')}</Text></Pressable>
            {PRIVACY_URL ? <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}><Text style={styles.link}>{t('Privacy Policy')}</Text></Pressable> : null}
          </View>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button"><Text style={styles.closeText}>{t('Not now')}</Text></Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 50, zIndex: 85 },
  card: { backgroundColor: colors.glass, borderRadius: 24, padding: 24, maxHeight: '100%', alignSelf: 'center', width: '100%', maxWidth: 480 },
  kicker: { color: colors.muted, fontFamily: fonts.uiBold, fontSize: 13 },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 24 },
  body: { color: '#e2e2e2', fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#2e2e2e', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 2, borderColor: 'transparent' },
  planOn: { borderColor: colors.green },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#8a8a8a' },
  dotOn: { borderColor: colors.green, backgroundColor: colors.green },
  planTitle: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17 },
  planNote: { color: '#bdbdbd', fontFamily: fonts.ui, fontSize: 13, marginTop: 2 },
  planPrice: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17 },
  per: { fontFamily: fonts.uiRegular, fontSize: 14, color: '#cfcfcf' },
  join: { backgroundColor: colors.green, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  joinText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 17 },
  soon: { color: '#e2e2e2', fontFamily: fonts.ui, fontSize: 14, textAlign: 'center' },
  small: { color: '#a9a9a9', fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  link: { color: '#d6d6d6', fontFamily: fonts.ui, fontSize: 13, textDecorationLine: 'underline' },
  close: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 18 },
  closeText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
});
