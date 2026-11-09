// Things to share: a kraft folder in My Library that holds sheets. Tapped, the screen dims and the sheets fan out:
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
import { ConfirmBox } from './Chrome';
import { addSheet, loadFolder, onFolder, removeSheet, updateSheet } from '../folder';
import { strokesToImage } from './Strokes';
import { DrawEditor } from '../screens/Notebook';
import { pinPhoto } from '../corkboard';
import { PAPERS, paperFile } from '../sheets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadNotebook } from '../notebook';
import { shareSheet } from '../sheetShare';
import { activeProfile } from '../profiles';
import { onScopeChange } from '../scope';

const KRAFT = require('../../assets/kraft.jpg');
const ENVELOPE = require('../../assets/icon-envelope.png');
const TRASH = require('../../assets/icon-trash.png');
const TYPE = 'SpecialElite_400Regular'; // the typewriter, like My Notes
const CREAM = '#f4f2ed';

// a page from someone's notebook, drawn like the notebook: the picture square above the notes
function SheetPage({ page, size }) {
  if (page.kind === 'drawing') return (
    <View style={{ width: size, height: size, borderRadius: 3, overflow: 'hidden', backgroundColor: CREAM }}>
      {page.uri ? <Image source={{ uri: page.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <StrokesView strokes={page.strokes || []} width={size} height={size} noPaper />
    </View>
  );
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

// the folder itself, opened flat (Jörg's photo, 8 Nov 2026): its back half with the tab, and its front half, which
// swings down open when Things to share opens. 1200 × 876 and 1200 × 824.
const FOLDER_BACK = require('../../assets/folder-open-back.png');
const FOLDER_FRONT = require('../../assets/folder-open-front.png');
const FOLDER_LABEL = require('../../assets/folder-label.png'); // the paper label from the small folder's tab (616 × 124)
const FB_H = 876, FF_H = 824, F_W = 1200;

export default function Folder({ narrator = 'lily', onClose, toast, canSend = true }) {
  const t = useT();
  const lang = useLang();
  const { width: winW, height: winH } = useWindowDimensions();
  const [sheets, setSheets] = useState([]);
  const [open, setOpen] = useState(null); // 'welcome' | 'abc' | a sheet
  const [sendGate, setSendGate] = useState(false);
  const [picking, setPicking] = useState(null); // notebook pages to choose from
  const [sure, setSure] = useState(null); // a sheet about to be thrown away
  const [drawOn, setDrawOn] = useState(null); // drawing on a sheet: { bg, strokes, id }
  const [pinAsk, setPinAsk] = useState(null); // after a drawing: pin it to the Message Board too? { strokes, bg }
  const insets = useSafeAreaInsets();
  const startPaper = async (src) => { try { setDrawOn({ bg: await paperFile(src), strokes: [] }); } catch (e) { toast && toast(t('That didn’t work. Try again.')); } };
  const pinNow = async (strokes, bg) => {
    try { const png = await strokesToImage(strokes, 1200, '#ffffff', bg); await pinPhoto(png, 'doodle'); toast && toast(t('Pinned to the Message Board.')); }
    catch (e) { toast && toast(t('That didn’t work. Try again.')); }
  };
  const drawDone = async (strokes) => {
    const d = drawOn; setDrawOn(null);
    const ink = (strokes || []).some((x) => !x.e);
    if (!ink) return;
    try {
      if (d.id) { await updateSheet(d.id, { strokes }); setOpen(null); }
      else await addSheet({ kind: 'page', from: null, page: { kind: 'drawing', strokes } }, d.bg);
      setPinAsk({ strokes, bg: d.bg });
    } catch (e) { toast && toast(t('That didn’t work. Try again.')); }
  };
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    loadFolder().then((f) => setSheets(f.sheets));
    const a = onFolder((f) => setSheets(f.sheets));
    const b = onScopeChange(() => loadFolder().then((f) => setSheets(f.sheets)));
    Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    return () => { a(); b(); stopVoice(); stopSpeech(); };
  }, []);
  // (the folder simply lies open, no swinging front half: Jörg, 8 Nov 2026)
  const close = () => Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
  const big = Math.min(winW - 28, winH - 220, 620); // an opened sheet: nearly the phone's width
  const fw = Math.min(winW - 24, 760); // the folder, across
  const [innerH, setInnerH] = useState(0); // how tall the sheets on it are: the folder's front half stretches to hold them all
  const fbh = fw * FB_H / F_W, ffh = Math.max(fw * FF_H / F_W, innerH - fw * FB_H / F_W + 40);
  const thumb = Math.min((fw * 0.84 - 24) / 2, 200);
  const headH = insets.top + 128; // the title and its buttons, fixed at the top

  // the sheets as small cards, a little tilted, as if just spilled out of the folder
  const card = (key, label, child, rot, onPress) => (
    <Pressable key={key} onPress={withTap(onPress)} accessibilityRole="button" accessibilityLabel={label} style={{ width: thumb, alignItems: 'center', gap: 8, transform: [{ rotate: `${rot}deg` }] }}>
      <View style={styles.cardShadow}>{child}</View>
      <Text numberOfLines={1} style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );
  const name = (activeProfile() || {}).name || '';

  return (
    <Modal supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} transparent visible animationType="none" onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.92)', opacity: fade }]}>{/* nearly black behind the folder (Jörg, 8 Nov 2026; was 0.78) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('Close')} />
        {/* the title, with Send a sheet and Close always at the top (Jörg, 8 Nov 2026: at the bottom they were hard to
            reach once the folder filled up) */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: insets.top + 18, alignItems: 'center', gap: 12, zIndex: 3 }}>
          <Text style={styles.title}>{t('Things to share')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {canSend ? (
              <Pressable onPress={withTap(() => setSendGate(true))} style={[styles.sendPill, { marginTop: 0 }]} accessibilityRole="button">
                <Image source={ENVELOPE} style={{ width: 20, height: 20, tintColor: colors.white }} resizeMode="contain" />
                <Text style={styles.pillText}>{t('Send a sheet')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={close} hitSlop={10} style={[styles.pill, styles.closePill, { marginTop: 0 }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Close')}</Text></Pressable>
          </View>
        </View>
        <ScrollView style={{ marginTop: headH }} contentContainerStyle={{ paddingBottom: 60, alignItems: 'center' }}>
          {/* the folder, opened, a little darkened so the sheets on it stand out */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: (winW - fw) / 2, width: fw, height: fbh + ffh }}>
            <Image source={FOLDER_BACK} style={{ position: 'absolute', top: 0, left: 0, width: fw, height: fbh }} />
            <Image source={FOLDER_BACK} style={{ position: 'absolute', top: 0, left: 0, width: fw, height: fbh, tintColor: '#000', opacity: 0.38 }} />
            {/* the folder's paper label on its tab, typed with the child's name, like the small folder on My Workspace
                (its label cut from that folder, the same warm cream, not darkened: Jörg, 9 Nov 2026) */}
            {name ? (
              <View style={{ position: 'absolute', left: fw * 0.056, top: fw * 0.0055, width: fw * 0.216, height: fw * 0.03, alignItems: 'center', justifyContent: 'center', paddingHorizontal: fw * 0.012 }}>{/* a little bigger (Jörg, 9 Nov 2026) */}
                {/* its exact size: an image pinned only by its edges was drawn at its own (large) size on the phone */}
                <Image source={FOLDER_LABEL} resizeMode="stretch" style={{ position: 'absolute', left: 0, top: 0, width: fw * 0.216, height: fw * 0.03 }} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false}
                  style={{ fontFamily: 'SpecialElite_400Regular', fontSize: Math.max(8, Math.round(fw * 0.017)), lineHeight: Math.max(8, Math.round(fw * 0.017)) * 1.15, color: '#3b342b', textAlign: 'center', includeFontPadding: false, transform: [{ translateY: Math.max(8, Math.round(fw * 0.017)) * 0.12 }] /* the typewriter face sits high in its line: down to the label's middle */ }}>{name}</Text>
              </View>
            ) : null}
            <View style={{ position: 'absolute', top: fbh, left: 0, width: fw, height: ffh }}>
              <Image source={FOLDER_FRONT} style={{ width: fw, height: ffh }} resizeMode="stretch" />
              <Image source={FOLDER_FRONT} resizeMode="stretch" style={{ position: 'absolute', top: 0, left: 0, width: fw, height: ffh, tintColor: '#000', opacity: 0.38 }} />
            </View>
          </View>
          <Animated.View onLayout={(e) => { const h = e.nativeEvent.layout.height; if (Math.abs(h - innerH) > 4) setInnerH(h); }} style={{ width: fw, paddingTop: fw * 0.1, paddingBottom: fw * 0.08, paddingHorizontal: fw * 0.08, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 0 }}>
            {card('welcome', t('A note from Coro'), (
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
            {sheets.map((s, k) => card(s.id, s.from ? t('From {name}', { name: s.from }) : s.page && s.page.kind === 'drawing' ? t('My drawing') : t('A sheet'), <SheetPage page={s.page} size={thumb} />, k % 2 ? 2 : -2, () => setOpen(s)))}
          </View>
          {/* paper to draw on */}
          <Text style={[styles.title, { fontSize: 20, marginTop: 40, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 } }]}>{t('Draw on a sheet')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginTop: 18 }}>
            {PAPERS.map(([k, label, src], i) => (
              <Pressable key={k} onPress={withTap(() => startPaper(src))} accessibilityRole="button" accessibilityLabel={t(label)} style={{ width: thumb * 0.7, alignItems: 'center', gap: 8, transform: [{ rotate: `${[-2, 1.5, -1, 2][i % 4]}deg` }] }}>
                <View style={styles.cardShadow}><Image source={src} style={{ width: thumb * 0.7, height: thumb * 0.7, borderRadius: 3 }} /></View>
                <Text numberOfLines={1} style={styles.cardLabel}>{t(label)}</Text>
              </Pressable>
            ))}
          </View>
          </Animated.View>
          {/* a small x at the folder's bottom right that closes it (Jörg, 9 Nov 2026) */}
          <Pressable onPress={withTap(close)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Close')}
            style={[styles.folderX, { top: fbh + ffh - fw * 0.075 - 34, left: (winW - fw) / 2 + fw - fw * 0.065 - 34 }]}>
            <View style={[styles.xBar, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.xBar, { transform: [{ rotate: '-45deg' }] }]} />
          </Pressable>
        </ScrollView>
      </Animated.View>

      {/* a sheet, opened */}
      {open ? (
        <View style={[StyleSheet.absoluteFill, styles.openBack]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { stopVoice(); stopSpeech(); setOpen(null); }} accessibilityLabel={t('Close')} />
          {open === 'welcome' ? (
            <View style={[styles.paper, { width: big, padding: big * 0.08, paddingBottom: big * 0.1 }]}>
              <Text style={[styles.hand, { fontSize: 24, marginBottom: 14 }]}>{name ? t('Hello, {name}!', { name }) : t('Hello!')}</Text>
              <Text style={styles.letterText}>{t('Things to share is yours. Sheets live here: things to keep, and little things to play with.')}</Text>
              <Text style={styles.letterText}>{t('The Abc sheet is a good place to start. Tap a letter and listen.')}</Text>
              <Text style={styles.letterText}>{t('When someone sends you a drawing or a note, it will be waiting here for you.')}</Text>
              <Text style={styles.letterText}>{t('Happy reading!')}</Text>
              <Text style={[styles.hand, { fontSize: 16, marginTop: 10, alignSelf: 'flex-end' }]}>{t('Your friends at Coro')}</Text>
            </View>
          ) : open === 'abc' ? (
            <AbcSheet size={big} narrator={narrator} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              {open.from ? <Text style={[styles.cardLabel, { fontSize: 16, marginBottom: 12 }]}>{t('From {name}', { name: open.from })}</Text> : null}
              <SheetPage page={open.page} size={Math.min(big, (winH - 240) / (open.page.kind === 'sketch' ? 2 : 1.42))} />
              {open.page.kind === 'drawing' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 18, paddingHorizontal: 16 }}>
                  <Pressable onPress={withTap(() => setDrawOn({ bg: open.page.uri, strokes: open.page.strokes || [], id: open.id }))} style={[styles.pill, { backgroundColor: colors.green }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Draw on it')}</Text></Pressable>
                  <Pressable onPress={withTap(() => pinNow(open.page.strokes || [], open.page.uri))} style={[styles.pill, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Pin it')}</Text></Pressable>
                  {/* send the drawing to another family, behind the grown-up check (Jörg, 6 Nov 2026) */}
                  {canSend ? <Pressable onPress={withTap(() => setSendGate({ page: open.page }))} style={[styles.pill, { backgroundColor: '#3a3a3a' }]} accessibilityRole="button"><Text style={styles.pillText}>{t('Send it')}</Text></Pressable> : null}
                </View>
              ) : null}
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
        <ConfirmBox message={t('Throw this sheet away?')} confirm={t('Remove')} cancel={t('Keep')}
          onConfirm={withTap(async () => { const id = sure.id; setSure(null); setOpen(null); await removeSheet(id); })} onCancel={() => setSure(null)} />
      ) : null}

      {/* sending: which notebook page? */}
      {picking ? (
        <View style={[StyleSheet.absoluteFill, styles.openBack]}>
          <View style={[styles.sureBox, { maxWidth: 440, maxHeight: winH - 160 }]}>
            <Text style={[styles.sureText, { fontFamily: fonts.uiBold }]}>{t('Which page from My Notes?')}</Text>
            {picking.length ? (
              <ScrollView style={{ marginTop: 16 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {picking.map((p, k) => (
                  <Pressable key={p.pid} onPress={withTap(async () => { setPicking(null); await shareSheet(p, name || t('a friend'), t('A sheet for you from {name}. Open the file in Coro to put it in Things to share.', { name: name || t('a friend') })); })}
                    style={{ alignItems: 'center', gap: 4 }} accessibilityRole="button" accessibilityLabel={t('Page {n}', { n: k + 3 })}>
                    <SheetPage page={p} size={90} />
                    <Text style={styles.cardLabel}>{t('Page {n}', { n: k + 3 })}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : <Text style={[styles.letterText, { color: '#ddd', marginTop: 12 }]}>{t('My Notes has no pages to send yet.')}</Text>}
            <Pressable onPress={() => setPicking(null)} style={[styles.pill, { backgroundColor: '#3a3a3a', alignSelf: 'flex-end', marginTop: 18 }]}><Text style={styles.pillText}>{t('Cancel')}</Text></Pressable>
          </View>
        </View>
      ) : null}
      {/* after a drawing on a sheet: kept here; pin it to the Message Board too? */}
      {pinAsk ? (
        <ConfirmBox message={t('Your drawing is in Things to share. Pin it to the Message Board too?')} confirm={t('Pin it')} cancel={t('Not now')} danger={false}
          onConfirm={withTap(async () => { const a = pinAsk; setPinAsk(null); await pinNow(a.strokes, a.bg); })} onCancel={() => setPinAsk(null)} />
      ) : null}
      {/* drawing on a sheet: the drawing tools, over everything */}
      {drawOn ? (
        <DrawEditor insets={insets} photo={drawOn.bg} strokes={drawOn.strokes} title={t('Drawing')} draftKey={drawOn.id ? `sheet:${drawOn.id}` : 'sheet:new'} onDone={drawDone} />
      ) : null}
      <ParentGate visible={!!sendGate} reason={t('Sending a sheet opens your phone’s messages and email.')} onCancel={() => setSendGate(false)}
        onPass={async () => {
          const g = sendGate; setSendGate(false);
          if (g && g.page) { const who = name || t('a friend'); await shareSheet({ kind: 'drawing', uri: g.page.uri, strokes: g.page.strokes || [] }, who, t('A sheet for you from {name}. Open the file in Coro to put it in Things to share.', { name: who })); return; }
          const nb = await loadNotebook(); setPicking(nb.pages.filter((p) => p.uri || (p.strokes && p.strokes.length) || (p.strokes2 && p.strokes2.length) || (p.text || '').trim())); }} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  folderX: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  xBar: { position: 'absolute', width: 14, height: 2.2, borderRadius: 1.1, backgroundColor: '#f2eee6' },
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 28 },
  cardShadow: { shadowColor: '#000', shadowOffset: { width: 2, height: 8 }, shadowOpacity: 0.55, shadowRadius: 10, elevation: 8 },
  cardLabel: { color: 'rgba(255,255,255,0.92)', fontFamily: fonts.uiSemiBold, fontSize: 14, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  paper: { backgroundColor: '#fbf7ee', borderRadius: 3 },
  hand: { fontFamily: TYPE, color: '#3a2f22' },
  letterText: { fontFamily: TYPE, fontSize: 16, lineHeight: 25, color: '#3a3226', marginBottom: 10 },
  letter: { fontFamily: 'EBGaramond_700Bold', color: '#2f2418' },
  kana: { fontFamily: undefined, fontWeight: '700' },
  openBack: { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  sendPill: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: 23, paddingHorizontal: 22, backgroundColor: '#3a3a3a', marginTop: 36 },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 16 },
  closePill: { backgroundColor: colors.pillGrey, marginTop: 22 }, // a grey pill (red is only for throwing away: 31 Oct 2026)
  sureBox: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 24, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 22 },
  sureText: { color: colors.white, fontFamily: fonts.ui, fontSize: 17, lineHeight: 24 },
});
