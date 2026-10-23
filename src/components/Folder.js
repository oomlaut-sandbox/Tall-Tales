// My Folder: a kraft folder in My Library that holds sheets. Tapped, the screen dims and the sheets fan out:
// a warm note from Oomlaut, the Abc sheet (tap a letter and the chosen narrator says it: "B… buh… bear."), and any
// sheets other families sent (a drawing, a photo, a note from their notebook). A grown-up can send one of the
// child's notebook pages as a sheet.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts } from '../theme';
import { useLang, useT } from '../i18n';
import { alphabetFor } from '../alphabets';
import { withTap } from '../haptics';
import { playVoice, stopVoice } from '../voice';
import { speakTracked, stopSpeech } from '../speech';
import { LETTERS } from '../narration/samples';
import { StrokesView } from './Strokes';
import ParentGate from './ParentGate';
import { loadFolder, onFolder, removeSheet } from '../folder';
import { loadNotebook } from '../notebook';
import { shareSheet } from '../sheetShare';
import { activeProfile } from '../profiles';
import { onScopeChange } from '../scope';

const KRAFT = require('../../assets/kraft.jpg');
const ENVELOPE = require('../../assets/icon-envelope.png');
const TRASH = require('../../assets/icon-trash.png');
const TYPE = 'SpecialElite_400Regular'; // the typewriter, like My Notebook
const CREAM = '#f4f2ed';

// a page from someone's notebook, drawn like the notebook: the picture square above the notes
function SheetPage({ page, size }) {
  return (
    <View style={{ width: size, backgroundColor: CREAM, borderRadius: size * 0.06, overflow: 'hidden' }}>
      <View style={{ width: size, height: size, borderBottomWidth: 1, borderColor: '#cfc9bd' }}>
        {page.uri ? <Image source={{ uri: page.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <StrokesView strokes={page.strokes || []} width={size} height={size} noPaper={!!page.uri} />
      </View>
      {page.kind === 'sketch' ? (
        <View style={{ width: size, height: size }}><StrokesView strokes={page.strokes2 || []} width={size} height={size} /></View>
      ) : (
        <View style={{ width: size, minHeight: size * 0.42, padding: size * 0.08, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: TYPE, fontSize: Math.max(12, size * 0.055), lineHeight: Math.max(18, size * 0.085), color: colors.ink, textAlign: 'center' }}>{page.text}</Text>
        </View>
      )}
    </View>
  );
}

// the Abc sheet, opened: a kraft square nearly as wide as the phone, the whole alphabet on it
function AbcSheet({ size, narrator }) {
  const lang = useLang();
  const ABC_L = alphabetFor(lang);
  const [hit, setHit] = useState(null);
  const bounce = useRef(new Animated.Value(1)).current;
  const say = ([ch, key, , word]) => {
    setHit(ch);
    bounce.setValue(0.82);
    Animated.spring(bounce, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
    stopSpeech(); stopVoice();
    const clip = ((LETTERS.lily || {})[lang] || {})[key]; // always Fatima, in the app's language
    const fallback = () => speakTracked(`${ch}. ${word}.`, { rate: 0.7, lang });
    if (clip && playVoice(clip, { onFail: fallback })) return;
    fallback();
  };
  const cols = ABC_L.length > 36 ? 7 : 6; // Japanese has 46 hiragana
  const cell = (size - 36) / cols;
  const latin = lang !== 'ja';
  return (
    <View style={{ width: size, height: size, borderRadius: 6, overflow: 'hidden' }}>
      <Image source={KRAFT} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={{ flex: 1, padding: 18, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' }}>
        {ABC_L.map((L) => {
          const ch = L[0];
          const pair = latin && ch.toLowerCase() !== ch; // Aa, Ää … (ß has no capital: shown once)
          return (
            <Pressable key={L[1]} onPress={() => say(L)} accessibilityRole="button" accessibilityLabel={ch} style={{ width: cell, height: cell * 1.02, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.Text allowFontScaling={false} style={[styles.letter, !latin && styles.kana, { fontSize: cell * (latin ? 0.58 : 0.6) }, hit === ch && { color: '#8a2c1b', transform: [{ scale: bounce }] }]}>
                {ch}{pair ? <Text style={{ fontSize: cell * 0.42 }}>{ch.toLowerCase()}</Text> : null}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Folder({ narrator = 'lily', onClose, toast, canSend = true }) {
  const t = useT();
  const lang = useLang();
  const { width: winW, height: winH } = useWindowDimensions();
  const [sheets, setSheets] = useState([]);
  const [open, setOpen] = useState(null); // 'welcome' | 'abc' | a sheet
  const [sendGate, setSendGate] = useState(false);
  const [picking, setPicking] = useState(null); // notebook pages to choose from
  const [sure, setSure] = useState(null); // a sheet about to be thrown away
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    loadFolder().then((f) => setSheets(f.sheets));
    const a = onFolder((f) => setSheets(f.sheets));
    const b = onScopeChange(() => loadFolder().then((f) => setSheets(f.sheets)));
    Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    return () => { a(); b(); stopVoice(); stopSpeech(); };
  }, []);
  const close = () => Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
  const big = Math.min(winW - 28, winH - 220, 620); // an opened sheet: nearly the phone's width
  const thumb = Math.min((winW - 72) / 2, 200);

  // the sheets as small cards, a little tilted, as if just spilled out of the folder
  const card = (key, label, child, rot, onPress) => (
    <Pressable key={key} onPress={withTap(onPress)} accessibilityRole="button" accessibilityLabel={label} style={{ width: thumb, alignItems: 'center', gap: 8, transform: [{ rotate: `${rot}deg` }] }}>
      <View style={styles.cardShadow}>{child}</View>
      <Text numberOfLines={1} style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );
  const name = (activeProfile() || {}).name || '';

  return (
    <Modal transparent visible animationType="none" onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)', opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('Close')} />
        <ScrollView contentContainerStyle={{ paddingTop: 90, paddingBottom: 60, paddingHorizontal: 24, alignItems: 'center' }}>
          <Text style={styles.title}>{t('My Folder')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 26 }}>
            {card('welcome', t('A note from Oomlaut'), (
              <View style={[styles.paper, { width: thumb, height: thumb * 1.25, padding: thumb * 0.1 }]}>
                <Text style={[styles.hand, { fontSize: thumb * 0.1 }]}>{t('Hello!')}</Text>
                {[0, 1, 2, 3, 4, 5].map((k) => <View key={k} style={{ height: 1.2, backgroundColor: '#b9b2a3', marginTop: thumb * 0.09, width: k === 5 ? '55%' : '100%' }} />)}
              </View>
            ), -3, () => setOpen('welcome'))}
            {card('abc', t('Abc'), (
              <View style={{ width: thumb, height: thumb, borderRadius: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <Image source={KRAFT} style={StyleSheet.absoluteFill} resizeMode="cover" />
                {/* lifted a little, so it sits in the optical middle of the card */}
                <Text allowFontScaling={false} style={[styles.letter, lang === 'ja' && styles.kana, { fontSize: thumb * (lang === 'ja' ? 0.3 : 0.36), transform: [{ translateY: -thumb * 0.05 }] }]}>{lang === 'ja' ? 'あいう' : lang === 'de' ? 'Äbc' : 'Abc'}</Text>
              </View>
            ), 2.5, () => setOpen('abc'))}
            {sheets.map((s, k) => card(s.id, s.from ? t('From {name}', { name: s.from }) : t('A sheet'), <SheetPage page={s.page} size={thumb} />, k % 2 ? 2 : -2, () => setOpen(s)))}
          </View>
          {canSend ? (
            <Pressable onPress={withTap(() => setSendGate(true))} style={styles.sendPill} accessibilityRole="button">
              <Image source={ENVELOPE} style={{ width: 20, height: 20, tintColor: colors.white }} resizeMode="contain" />
              <Text style={styles.pillText}>{t('Send a sheet')}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={close} hitSlop={10} style={[styles.pill, styles.closePill]} accessibilityRole="button"><Text style={styles.pillText}>{t('Close')}</Text></Pressable>
        </ScrollView>
      </Animated.View>

      {/* a sheet, opened */}
      {open ? (
        <View style={[StyleSheet.absoluteFill, styles.openBack]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { stopVoice(); stopSpeech(); setOpen(null); }} accessibilityLabel={t('Close')} />
          {open === 'welcome' ? (
            <View style={[styles.paper, { width: big, padding: big * 0.08, paddingBottom: big * 0.1 }]}>
              <Text style={[styles.hand, { fontSize: 24, marginBottom: 14 }]}>{name ? t('Hello, {name}!', { name }) : t('Hello!')}</Text>
              <Text style={styles.letterText}>{t('This folder is yours. Sheets live here: things to keep, and little things to play with.')}</Text>
              <Text style={styles.letterText}>{t('The Abc sheet is a good place to start. Tap a letter and listen.')}</Text>
              <Text style={styles.letterText}>{t('When someone sends you a drawing or a note, it will be waiting here for you.')}</Text>
              <Text style={styles.letterText}>{t('Happy reading!')}</Text>
              <Text style={[styles.hand, { fontSize: 16, marginTop: 10, alignSelf: 'flex-end' }]}>{t('Jörg and everyone at Oomlaut')}</Text>
            </View>
          ) : open === 'abc' ? (
            <AbcSheet size={big} narrator={narrator} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              {open.from ? <Text style={[styles.cardLabel, { fontSize: 16, marginBottom: 12 }]}>{t('From {name}', { name: open.from })}</Text> : null}
              <SheetPage page={open.page} size={Math.min(big, (winH - 240) / (open.page.kind === 'sketch' ? 2 : 1.42))} />
              <Pressable onPress={withTap(() => setSure(open))} hitSlop={10} style={{ marginTop: 18 }} accessibilityRole="button" accessibilityLabel={t('Delete')}>
                <Image source={TRASH} style={{ width: 22, height: 22, tintColor: '#bdbdbd' }} resizeMode="contain" />
              </Pressable>
            </View>
          )}
          <Pressable onPress={() => { stopVoice(); stopSpeech(); setOpen(null); }} hitSlop={10} style={[styles.pill, styles.closePill]} accessibilityRole="button"><Text style={styles.pillText}>{t('Close')}</Text></Pressable>
        </View>
      ) : null}

      {/* throwing a sheet away */}
      {sure ? (
        <View style={[StyleSheet.absoluteFill, styles.openBack]}>
          <View style={styles.sureBox}>
            <Text style={styles.sureText}>{t('Throw this sheet away?')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <Pressable onPress={withTap(async () => { const id = sure.id; setSure(null); setOpen(null); await removeSheet(id); })} style={[styles.pill, { backgroundColor: '#b3261e' }]}><Text style={styles.pillText}>{t('Remove')}</Text></Pressable>
              <Pressable onPress={() => setSure(null)} style={[styles.pill, { backgroundColor: '#3a3a3a' }]}><Text style={styles.pillText}>{t('Keep')}</Text></Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* sending: which notebook page? */}
      {picking ? (
        <View style={[StyleSheet.absoluteFill, styles.openBack]}>
          <View style={[styles.sureBox, { maxWidth: 440, maxHeight: winH - 160 }]}>
            <Text style={[styles.sureText, { fontWeight: '700' }]}>{t('Which page from My Notebook?')}</Text>
            {picking.length ? (
              <ScrollView style={{ marginTop: 16 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {picking.map((p, k) => (
                  <Pressable key={p.pid} onPress={withTap(async () => { setPicking(null); await shareSheet(p, name || t('a friend'), t('A sheet for you from {name}. Open the file in Oomlaut Reader to put it in My Folder.', { name: name || t('a friend') })); })}
                    style={{ alignItems: 'center', gap: 4 }} accessibilityRole="button" accessibilityLabel={t('Page {n}', { n: k + 3 })}>
                    <SheetPage page={p} size={90} />
                    <Text style={styles.cardLabel}>{t('Page {n}', { n: k + 3 })}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : <Text style={[styles.letterText, { color: '#ddd', marginTop: 12 }]}>{t('Your notebook has no pages to send yet.')}</Text>}
            <Pressable onPress={() => setPicking(null)} style={[styles.pill, { backgroundColor: '#3a3a3a', alignSelf: 'flex-end', marginTop: 18 }]}><Text style={styles.pillText}>{t('Cancel')}</Text></Pressable>
          </View>
        </View>
      ) : null}
      <ParentGate visible={sendGate} reason={t('Sending a sheet opens your phone’s messages and email.')} onCancel={() => setSendGate(false)}
        onPass={async () => { setSendGate(false); const nb = await loadNotebook(); setPicking(nb.pages.filter((p) => p.uri || (p.strokes && p.strokes.length) || (p.strokes2 && p.strokes2.length) || (p.text || '').trim())); }} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 28 },
  cardShadow: { shadowColor: '#000', shadowOffset: { width: 2, height: 8 }, shadowOpacity: 0.55, shadowRadius: 10, elevation: 8 },
  cardLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.ui, fontWeight: '600', fontSize: 14 },
  paper: { backgroundColor: '#fbf7ee', borderRadius: 3 },
  hand: { fontFamily: TYPE, color: '#3a2f22' },
  letterText: { fontFamily: TYPE, fontSize: 16, lineHeight: 25, color: '#3a3226', marginBottom: 10 },
  letter: { fontFamily: 'EBGaramond_700Bold', color: '#2f2418' },
  kana: { fontFamily: undefined, fontWeight: '700' },
  openBack: { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  sendPill: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: 23, paddingHorizontal: 22, backgroundColor: '#3a3a3a', marginTop: 36 },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontWeight: '700', fontSize: 16 },
  closePill: { backgroundColor: colors.deepRed, marginTop: 22 }, // a dark red pill
  closeText: { color: '#8a8a8a', fontFamily: fonts.ui, fontSize: 15 },
  sureBox: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 24, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 22 },
  sureText: { color: colors.white, fontFamily: fonts.ui, fontSize: 17, lineHeight: 24 },
});
