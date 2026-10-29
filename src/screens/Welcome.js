// The welcome: the first time the app opens (and again from Help). "Who's here?" first, then two different paths:
//   kids: Coro, the grey felt pebble with googly eyes (it never has a mouth), shows them around, all spoken
//         (tap Coro, open a book, watch the words light up, tap a word, turn the page, draw, slide the moon), then
//         My Library.
//   grown-ups: calm, short screens (text, with a small speaker to have Fatima read them), a playful grown-up check,
//         then they set up a profile for each child (and why), then hand the phone over: the kid path, by name.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import { colors, fonts } from '../theme';
import { NUMBER_WORDS, useLang, useT } from '../i18n';
import { withTap } from '../haptics';
import { DogEar } from '../components/Chrome';
import { StrokesView } from '../components/Strokes';
import { PROFILE_COLORS, addProfile, getProfiles } from '../profiles';
import { DEFAULT_CONTROLS, quickSafeControls } from '../controls';
import { saveJSONFor } from '../storage';
import LINES from '../welcome/lines.json';
import TIMING from '../welcome/timing.json';
import AUDIO from '../welcome/audio';

const LETTERS = [ // Jörg's coloured felt c o r o . (cut from his photo), dropped in one by one: [picture, x, width] (height 304)
  [require('../../assets/welcome/letter-c.png'), 1, 267], [require('../../assets/welcome/letter-o.png'), 262, 278],
  [require('../../assets/welcome/letter-r.png'), 557, 171], [require('../../assets/welcome/letter-o2.png'), 723, 275],
  [require('../../assets/welcome/letter-dot.png'), 986, 107],
];
const LETTERS_W = 1094, LETTERS_H = 304;
const READER_LOGO = require('../../assets/logo-felt.png');
const GREEN_FELT = require('../../assets/ideas-felt.png');
const LEATHER = require('../../assets/leather.jpg');
const NOTEBOOK = require('../../assets/leather-cover-round.png');
const COVER = require('../../assets/books/different/d01.jpg'); // the cover the kids open: Different
const CAT = require('../../assets/welcome/cat.jpg'); // Jörg's felt cat, stretching
const SUN = require('../../assets/nightlight-sun.png');
const CORONA = require('../../assets/nightlight-corona.png');
const SHELF = [require('../../assets/books/different/d01.jpg'), require('../../assets/welcome/cat.jpg'), require('../../assets/welcome/horse.jpg')];
const KID_CHAR = PROFILE_COLORS[0][1];
const TAP_WORD = { en: 1, de: 1, fr: 1, es: 1, ja: 0 }; // the word to tap in "The cat sat on the mat."
const INK = '#2b2a28';
const CREAM = '#f4f0e8';
// white felt on white paper: a soft shadow under it (on the web a drop-shadow that follows the letters)
const FELT_SHADOW = Platform.OS === 'web' ? { filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.35))' } : { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } };
const LETTER_SHADOW = Platform.OS === 'web' ? { filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.18))' } : { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 2 } }; // (the coloured felt sits close to the paper)
const PAPER = '#fbfaf7';
// the welcome's type: Plus Jakarta Sans, a friendly round geometric sans (close to Circular); the story line stays in the book serif
const F = { bold: 'PlusJakartaSans_700Bold', semi: 'PlusJakartaSans_600SemiBold', reg: 'PlusJakartaSans_500Medium' }; // the welcome is bright (Jörg, 24 Oct 2026)

// ---- the voices: one line at a time; `say` resolves when the line has finished (or straight away when muted)
function useVoice(lang, muted) {
  const cur = useRef(null);
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const stop = () => { const c = cur.current; cur.current = null; if (c) { try { c.sub && c.sub.remove(); c.p.pause(); c.p.remove(); } catch (e) {} c.done && c.done(); } };
  useEffect(() => stop, []);
  const say = (id, { force = false } = {}) => new Promise((resolve) => {
    stop();
    const src = (AUDIO[lang] && AUDIO[lang][id]) || (AUDIO.en && AUDIO.en[id]);
    if (!src || (mutedRef.current && !force)) { setTimeout(resolve, 900); return; }
    try {
      const p = createAudioPlayer(src);
      const c = { p, done: resolve, t0: Date.now() };
      c.sub = p.addListener('playbackStatusUpdate', (s) => { if (s.didJustFinish && cur.current === c) { cur.current = null; try { c.sub.remove(); p.remove(); } catch (e) {} resolve(); } });
      cur.current = c;
      p.play();
      // (never stuck: some players never say they've finished; stop a moment after the line's length)
      const watch = setInterval(() => {
        if (cur.current !== c) { clearInterval(watch); return; }
        let d = 0; try { d = p.duration || 0; } catch (e) {}
        const el = (Date.now() - c.t0) / 1000;
        if ((d > 0 && el > d + 0.6) || el > 12) { clearInterval(watch); stop(); }
      }, 200);
    } catch (e) { resolve(); }
  });
  const time = () => { const c = cur.current; try { return c ? c.p.currentTime || (Date.now() - c.t0) / 1000 : -1; } catch (e) { return -1; } };
  return { say, stop, time };
}

// word start times for the line that lights up word by word
function wordTimes(lang, words) {
  const T = TIMING[lang];
  if (!T) return words.map((_, i) => 0.25 + i * 0.38);
  const out = []; let w = 0, inWord = false;
  T.chars.forEach((ch, i) => {
    const space = /\s/.test(ch);
    if (!space && !inWord) { out[w] = T.starts[i]; inWord = true; }
    if (space && inWord) { inWord = false; w++; }
  });
  return words.map((_, i) => (out[i] != null ? out[i] : 0));
}
const strip = (s) => s.replace(/\[[^\]]+\]\s*/g, ''); // (Coro's stage directions aren't shown)
const sentences = (s) => s.match(/[^.!?。！？]+[.!?。！？]+\s*/g) || [s];
const TITLE_SENTENCES = { p1: 1, p2: 3, p3: 1, p4: 1, p5: 1, p6: 1 };

// ---- Coro: the grey felt pebble with round glasses and a book under its arm, waving (no mouth, ever)
const CORO = require('../../assets/welcome/coro-wave.png');
const CORO_AR = 900 / 868; // (width / height)
function Coro({ size, style }) {
  return (
    <View pointerEvents="none" style={[{ width: size * CORO_AR, height: size }, style]}>
      <Image source={CORO} style={{ width: size * CORO_AR, height: size }} resizeMode="contain" />
    </View>
  );
}
// Coro that bounces when asked (and its eyes jiggle)
function useBounce() {
  const y = useRef(new Animated.Value(0)).current;
  const sq = useRef(new Animated.Value(1)).current;
  const [look, setLook] = useState([0, 0]);
  const bounce = (n = 1) => {
    const one = Animated.sequence([
      Animated.timing(sq, { toValue: 0.86, duration: 90, useNativeDriver: true }),
      Animated.parallel([Animated.timing(y, { toValue: -1, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(sq, { toValue: 1.06, duration: 230, useNativeDriver: true })]),
      Animated.parallel([Animated.timing(y, { toValue: 0, duration: 230, easing: Easing.in(Easing.quad), useNativeDriver: true }), Animated.timing(sq, { toValue: 1, duration: 230, useNativeDriver: true })]),
    ]);
    Animated.sequence(Array.from({ length: n }, () => one)).start();
    let k = 0; const id = setInterval(() => { setLook([Math.random() * 2 - 1, Math.random() * 2 - 1]); if (++k > 5 * n) { clearInterval(id); setLook([0, 0]); } }, 90);
  };
  return { y, sq, look, setLook, bounce };
}
function BouncyCoro({ b, size, lift = 60, style }) {
  const ty = b.y.interpolate({ inputRange: [-1, 0], outputRange: [-lift, 0] });
  return (
    <Animated.View pointerEvents="none" style={[{ transform: [{ translateY: ty }, { scaleY: b.sq }, { scaleX: Animated.divide(1, b.sq) }] }, style]}>
      <Coro size={size} />
    </Animated.View>
  );
}

// small felt crumbs falling (a celebration)
function Confetti({ w, h, go }) {
  const bits = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: Math.random() * w, d: 6 + Math.random() * 8, c: ['#b98a3e', '#9a4f36', '#93a08f', '#f1e8d8', '#2f4a4c', '#c9a2a0'][i % 6], r: Math.random() * 360, delay: Math.random() * 300 })), [w]);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (go) { t.setValue(0); Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); } }, [go]);
  if (!go) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => (
        <Animated.View key={i} style={{ position: 'absolute', left: b.x, top: -20, width: b.d, height: b.d * 0.8, borderRadius: b.d / 3, backgroundColor: b.c,
          opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, h * (0.6 + (i % 5) * 0.08)] }) }, { rotate: `${b.r + i * 40}deg` }] }} />
      ))}
    </View>
  );
}

// the sun and the moon (slide the moon across; e = 0..1)
function SunMoon({ size, e }) {
  const moonD = size * 0.42;
  const x = -size * 0.75 + e * size * 0.75;
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={SUN} style={{ position: 'absolute', width: size, height: size }} resizeMode="contain" />
      {e > 0.82 ? <Image source={CORONA} style={{ position: 'absolute', width: size, height: size, opacity: (e - 0.82) / 0.18 }} resizeMode="contain" /> : null}
      <View style={{ position: 'absolute', width: moonD, height: moonD, borderRadius: moonD / 2, backgroundColor: '#050506', transform: [{ translateX: x }] }} />
    </View>
  );
}
function useSlider(onChange, width) {
  const start = useRef(0); const val = useRef(0);
  return useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = val.current; },
    onPanResponderMove: (e, g) => { val.current = Math.max(0, Math.min(1, start.current + g.dx / width)); onChange(val.current); },
    onPanResponderRelease: () => onChange(val.current, true),
  })).current;
}

// the little page used by the kid path and the grown-up path: the cat, and a line whose words light up
function CatPage({ w, lang, lit, onWord, tapWord = -1, pulse }) {
  const words = strip(LINES.k3read[lang] || LINES.k3read.en).split(' ');
  const fs = Math.round(w * 0.075);
  return (
    <View style={{ width: w, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
      <Image source={CAT} style={{ width: w, height: w }} resizeMode="cover" />
      <View style={{ height: w * 0.42, backgroundColor: '#d9d9d9', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: w * 0.06 }}>
        {words.map((wd, i) => (
          <Pressable key={i} disabled={!onWord} onPress={() => onWord && onWord(i)} hitSlop={6} accessibilityLabel={wd.replace(/[.,!?。]/g, '')}>
            <Text style={{ fontFamily: 'EBGaramond_400Regular', fontSize: fs, color: lit === i ? colors.highlight : INK, textDecorationLine: tapWord === i && pulse ? 'underline' : 'none', textDecorationColor: colors.highlight }}>{wd}{i < words.length - 1 ? ' ' : ''}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---- small chrome: Skip and the speaker / mute
function TopBar({ insets, onSkip, sound, onSound, t, dark }) {
  const c = 'rgba(43,42,40,0.6)';
  return (
    <View style={{ position: 'absolute', top: insets.top + 10, right: 16, left: 16, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18, zIndex: 20 }}>
      {onSound ? (
        <Pressable onPress={withTap(onSound)} hitSlop={12} accessibilityRole="switch" accessibilityState={{ checked: sound }} accessibilityLabel={sound ? t('Voice on') : t('Voice off')}>
          <Speaker on={sound} color={c} />
        </Pressable>
      ) : null}
      {onSkip ? <Pressable onPress={withTap(onSkip)} hitSlop={12} accessibilityRole="button"><Text style={{ color: c, fontFamily: F.reg, fontSize: 15 }}>{t('Skip')}</Text></Pressable> : null}
    </View>
  );
}
function Speaker({ on, color, size = 22 }) {
  const w = 1.6;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 1, top: size * 0.36, width: size * 0.18, height: size * 0.28, borderWidth: w, borderColor: color, borderRightWidth: 0 }} />
      <View style={{ position: 'absolute', left: size * 0.18, top: size * 0.2, width: 0, height: 0, borderTopWidth: size * 0.3, borderBottomWidth: size * 0.3, borderRightWidth: size * 0.26, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color, opacity: 0.9 }} />
      {on ? (
        <>
          <View style={{ position: 'absolute', left: size * 0.38, top: size * 0.3, width: size * 0.4, height: size * 0.4, borderRadius: size, borderWidth: w, borderColor: 'transparent', borderRightColor: color }} />
          <View style={{ position: 'absolute', left: size * 0.36, top: size * 0.14, width: size * 0.72, height: size * 0.72, borderRadius: size, borderWidth: w, borderColor: 'transparent', borderRightColor: color }} />
        </>
      ) : (
        <>
          <View style={{ position: 'absolute', left: size * 0.6, top: size * 0.5 - w / 2, width: size * 0.36, height: w, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
          <View style={{ position: 'absolute', left: size * 0.6, top: size * 0.5 - w / 2, width: size * 0.36, height: w, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
        </>
      )}
    </View>
  );
}
function Glasses({ size, color = CREAM }) {
  const r = size * 0.36, w = Math.max(2, size * 0.07);
  return (
    <View style={{ width: size * 1.1, height: r + w * 2 }}>
      <View style={{ position: 'absolute', left: 0, top: w, width: r, height: r, borderRadius: r / 2, borderWidth: w, borderColor: color }} />
      <View style={{ position: 'absolute', right: 0, top: w, width: r, height: r, borderRadius: r / 2, borderWidth: w, borderColor: color }} />
      <View style={{ position: 'absolute', left: r - w / 2, right: r - w / 2, top: w + r * 0.38, height: w, backgroundColor: color }} />
    </View>
  );
}
function Pill({ label, onPress, disabled, light }) {
  return (
    <Pressable onPress={withTap(onPress)} disabled={disabled} accessibilityRole="button" style={[{ height: 50, borderRadius: 25, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: light ? 'rgba(0,0,0,0.08)' : colors.green }, disabled && { opacity: 0.35 }]}>
      <Text style={{ color: light ? INK : '#fff', fontFamily: F.bold, fontSize: 17 }}>{label}</Text>
    </Pressable>
  );
}

// ===================================================================================================================
export default function Welcome({ onDone, controls, setControls }) {
  const t = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [path, setPath] = useState('who'); // who | kid | grown
  const [kidName, setKidName] = useState(null);
  const [kidMuted, setKidMuted] = useState(false);
  const [grownSound, setGrownSound] = useState(false);
  const voice = useVoice(lang, path === 'kid' ? kidMuted : path === 'grown' ? !grownSound : false);
  const finish = () => { voice.stop(); onDone && onDone(); };
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 200, backgroundColor: PAPER }]}>
      {/* bright: white paper, so Coro, the felt and the dark screens pop */}
      {path === 'who' ? <Who W={W} H={H} insets={insets} voice={voice} t={t} onKid={() => setPath('kid')} onGrown={() => setPath('grown')} onSkip={finish} /> : null}
      {path === 'kid' ? <KidPath W={W} H={H} insets={insets} voice={voice} t={t} lang={lang} name={kidName} muted={kidMuted} onMute={() => setKidMuted((m) => !m)} onDone={finish} /> : null}
      {path === 'grown' ? <GrownPath W={W} H={H} insets={insets} voice={voice} t={t} lang={lang} sound={grownSound} onSound={() => setGrownSound((s) => !s)}
        controls={controls} setControls={setControls} onSkip={finish} onHandOver={(name) => { setKidName(name); setPath('kid'); }} /> : null}
    </View>
  );
}

// ---- 0. Who's here?
function Who({ W, H, insets, voice, t, onKid, onGrown, onSkip }) {
  const drops = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const roll = useRef(new Animated.Value(0)).current;
  const b = useBounce();
  const [hint, setHint] = useState(false);
  useEffect(() => {
    Animated.stagger(170, drops.map((d) => Animated.spring(d, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }))).start();
    Animated.timing(roll, { toValue: 1, duration: 1100, delay: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => b.bounce(1));
    let live = true;
    (async () => { await new Promise((r) => setTimeout(r, 1700)); if (!live) return; await voice.say('hello'); if (!live) return; setHint(true); await new Promise((r) => setTimeout(r, 2500)); if (live) voice.say('choose'); })();
    return () => { live = false; voice.stop(); };
  }, []);
  const lw = Math.min(W * 0.62, 380), k = lw / LETTERS_W;
  const cs = Math.min(W * 0.26, 140);
  const bw = Math.min((W - 48 - 16) / 2, 220), bh = bw * 805 / 1100;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <TopBar insets={insets} onSkip={onSkip} t={t} />
      <View style={{ width: lw, height: LETTERS_H * k, marginBottom: H * 0.05 }}>
        {LETTERS.map(([src, x, w], i) => (
          <Animated.Image key={i} source={src} style={{ ...LETTER_SHADOW, position: 'absolute', left: x * k, top: 0, width: w * k, height: LETTERS_H * k, opacity: drops[i],
            transform: [{ translateY: drops[i].interpolate({ inputRange: [0, 1], outputRange: [-H * 0.5, 0] }) }] }} resizeMode="contain" />
        ))}
      </View>
      <Animated.View style={{ height: cs, marginBottom: H * 0.06, transform: [{ translateX: roll.interpolate({ inputRange: [0, 1], outputRange: [-W, 0] }) }, { rotate: roll.interpolate({ inputRange: [0, 1], outputRange: ['-540deg', '0deg'] }) }] }}>
        <BouncyCoro b={b} size={cs} lift={30} />
      </Animated.View>
      <Text style={styles.whoTitle}>{t('Who’s here today?')}</Text>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 22 }}>
        <Pressable onPress={withTap(onKid)} accessibilityRole="button" accessibilityLabel={t('I’m a kid')} style={[styles.choice, { width: bw, height: bh, shadowOpacity: 0 }]}>{/* (the felt patch has its own shadow) */}
          <Image source={GREEN_FELT} style={{ position: 'absolute', left: 0, top: 0, width: bw, height: bh }} resizeMode="stretch" />
          <Image source={KID_CHAR} style={{ width: bh * 0.46, height: bh * 0.46 }} resizeMode="contain" />
          <Text style={styles.choiceText}>{t('I’m a kid')}</Text>
        </Pressable>
        <Pressable onPress={withTap(onGrown)} accessibilityRole="button" accessibilityLabel={t('I’m a grown-up')} style={[styles.choice, { width: bw, height: bh, overflow: 'hidden', borderRadius: bw * 0.09 }]}>
          <Image source={LEATHER} style={{ position: 'absolute', left: 0, top: 0, width: bw, height: bh }} resizeMode="cover" />
          <View style={{ position: 'absolute', left: 7, top: 7, right: 7, bottom: 7, borderRadius: bw * 0.07, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,235,210,0.45)' }} />
          <View style={{ height: bh * 0.46, justifyContent: 'center' }}><Glasses size={bw * 0.42} /></View>
          <Text style={styles.choiceText}>{t('I’m a grown-up')}</Text>
        </Pressable>
      </View>
      {hint ? <View style={{ height: 1 }} /> : null}
    </View>
  );
}

// ---- the kid path
function KidPath({ W, H, insets, voice, t, lang, name, muted, onMute, onDone }) {
  const [step, setStep] = useState('k1');
  const b = useBounce();
  const live = useRef(true);
  useEffect(() => () => { live.current = false; voice.stop(); }, []);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cs = Math.min(W * 0.34, 170);
  const pw = Math.min(W - 64, H * 0.42, 420); // the little page
  // K1
  const [k1Tapped, setK1Tapped] = useState(false);
  useEffect(() => { if (step === 'k1') { b.bounce(1); voice.say('k1'); } }, [step]);
  // K2/K3/K4: the book
  const open = useRef(new Animated.Value(0)).current;
  const [lit, setLit] = useState(-1);
  const [canTap, setCanTap] = useState(false);
  const [yay, setYay] = useState(false);
  const words = strip(LINES.k3read[lang] || LINES.k3read.en).split(' ');
  const times = useMemo(() => wordTimes(lang, words), [lang]);
  const readAlong = async (id) => {
    const p = voice.say(id, { force: true });
    const tick = setInterval(() => { const s = voice.time(); if (s < 0) return; let i = -1; times.forEach((st, k) => { if (s >= st) i = k; }); setLit(i); }, 60);
    await p; clearInterval(tick); setLit(-1);
  };
  useEffect(() => { if (step === 'k2') voice.say('k2'); }, [step]);
  const openBook = async () => {
    if (step !== 'k2') return;
    Animated.timing(open, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
    setStep('k3');
    await wait(1000); if (!live.current) return;
    await readAlong('k3read'); if (!live.current) return;
    await voice.say('k3'); if (!live.current) return;
    setCanTap(true);
  };
  const tapWord = async (i) => {
    if (!canTap || i !== TAP_WORD[lang]) return;
    setCanTap(false); setLit(i);
    await voice.say('k3sound', { force: true }); if (!live.current) return;
    setYay(true); b.bounce(2);
    await voice.say('k3yay'); if (!live.current) return;
    setLit(-1); setStep('k4'); voice.say('k4');
  };
  const turn = useRef(new Animated.Value(0)).current;
  const turnPage = () => {
    if (step !== 'k4') return;
    Animated.timing(turn, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => { setYay(false); setStep('k5'); voice.say('k5'); });
  };
  // K5: draw
  const [strokes, setStrokes] = useState([]);
  const [liveStroke, setLiveStroke] = useState(null);
  const drawn = useRef(false);
  const dw = Math.min(W - 64, H * 0.4, 400);
  const curS = useRef(null);
  const PENC = ['#9a4f36', '#2f4a4c', '#b98a3e', '#4e3125'];
  const pad = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { const x = e.nativeEvent.locationX / dw, y = e.nativeEvent.locationY / dw; curS.current = { c: PENC[Math.floor(Math.random() * PENC.length)], s: 0.03, b: 'crayon', p: [x, y] }; setLiveStroke({ ...curS.current }); },
    onPanResponderMove: (e) => { const c = curS.current; if (!c) return; const x = e.nativeEvent.locationX / dw, y = e.nativeEvent.locationY / dw; const n = c.p.length; if ((c.p[n - 2] - x) ** 2 + (c.p[n - 1] - y) ** 2 < 0.004 ** 2) return; c.p.push(+x.toFixed(4), +y.toFixed(4)); setLiveStroke({ ...c, p: [...c.p] }); },
    onPanResponderRelease: async () => {
      const c = curS.current; curS.current = null; setLiveStroke(null);
      if (c && c.p.length > 6) setStrokes((s) => [...s, c]);
      if (c && c.p.length > 20 && !drawn.current) {
        drawn.current = true; await wait(600); if (!live.current) return;
        b.bounce(1); await voice.say('k5wow'); if (!live.current) return;
        await wait(700); if (!live.current) return;
        setStep('k6'); voice.say('k6');
      }
    },
  })).current;
  // K6: the moon
  const [e, setE] = useState(0);
  const night = useRef(false);
  const ss = Math.min(W * 0.72, H * 0.38, 360);
  const slide = useSlider(async (v, end) => {
    setE(v);
    if (v > 0.9 && !night.current) {
      night.current = true; setE(1);
      await voice.say('k6night'); if (!live.current) return;
      await wait(900);
      const a = { v: 1 }; const id = setInterval(() => { a.v -= 0.06; setE(Math.max(0, a.v)); if (a.v <= 0) clearInterval(id); }, 30);
      b.bounce(1); await voice.say('k6wake'); if (!live.current) return;
      setStep('k7');
    }
  }, ss);
  // K7: the shelf
  useEffect(() => {
    if (step !== 'k7') return;
    (async () => { b.bounce(3); await voice.say('k7'); if (!live.current) return; if (!getProfiles().list.length) await voice.say('k7ask'); if (!live.current) return; await wait(700); if (live.current) onDone(); })();
  }, [step]);

  const rotY = open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] });
  const coverOp = open.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] });
  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <TopBar insets={insets} onSkip={onDone} sound={!muted} onSound={onMute} t={t} />
      {/* Coro, always at hand (top left) except on its own first screen */}
      {step !== 'k1' && step !== 'k7' ? <View style={{ position: 'absolute', left: 18, top: insets.top + 50, zIndex: 10 }}><BouncyCoro b={b} size={cs * 0.55} lift={26} /></View> : null}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {step === 'k1' ? (
          <Pressable onPress={async () => { b.bounce(2); setK1Tapped(true); await voice.say('k1tap'); if (live.current) setStep('k2'); }} accessibilityRole="button" accessibilityLabel="Coro">
            <BouncyCoro b={b} size={cs * 1.4} lift={70} />
          </Pressable>
        ) : null}
        {step === 'k2' || step === 'k3' || step === 'k4' ? (
          <View style={{ width: pw, alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ perspective: 1600 }, { translateX: turn.interpolate({ inputRange: [0, 1], outputRange: [0, -W] }) }, { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] }) }] }}>
              <View style={{ opacity: step === 'k2' ? 0 : 1 }}>
                <CatPage w={pw} lang={lang} lit={lit} onWord={canTap ? tapWord : null} tapWord={TAP_WORD[lang]} pulse={canTap} />
                {step === 'k4' ? <View style={{ position: 'absolute', right: 0, bottom: 0 }}><DogEar u={pw / 100 * 1.4} onPress={turnPage} /></View> : null}
              </View>
              {step !== 'k4' ? (
                <Animated.View pointerEvents={step === 'k2' ? 'auto' : 'none'} style={{ position: 'absolute', left: 0, top: 0, width: pw, height: pw, opacity: coverOp, transformOrigin: 'left', transform: [{ perspective: 1600 }, { rotateY: rotY }] }}>
                  <Pressable onPress={withTap(openBook)} accessibilityRole="button" accessibilityLabel="Different" style={{ flex: 1, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }}>
                    <Image source={COVER} style={{ width: pw, height: pw }} resizeMode="cover" />
                  </Pressable>
                </Animated.View>
              ) : null}
            </Animated.View>
            <Confetti w={pw} h={H * 0.6} go={yay} />
          </View>
        ) : null}
        {step === 'k5' ? (
          <View {...pad.panHandlers} style={{ width: dw, height: dw, backgroundColor: '#fbfaf6', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
            <StrokesView strokes={strokes} live={liveStroke} width={dw} height={dw} />
          </View>
        ) : null}
        {step === 'k6' ? (
          <View {...slide.panHandlers} style={{ width: W, alignItems: 'center', paddingVertical: 40 }}>
            <SunMoon size={ss} e={e} />
            <View style={{ width: ss * 0.8, height: 2, backgroundColor: 'rgba(0,0,0,0.18)', marginTop: 34 }}>
              <View style={{ position: 'absolute', left: e * ss * 0.8 - 13, top: -12, width: 26, height: 26, borderRadius: 13, backgroundColor: '#050506', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' }} />
            </View>
          </View>
        ) : null}
        {step === 'k7' ? (
          <View style={{ alignItems: 'center' }}>
            <BouncyCoro b={b} size={cs} lift={60} style={{ marginBottom: 6 }} />
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 6, borderBottomColor: '#3a2a20' }}>
              {SHELF.map((s, i) => <Image key={i} source={s} style={{ width: Math.min(W * 0.24, 110), height: Math.min(W * 0.24, 110), shadowColor: '#000' }} resizeMode="cover" />)}
            </View>
            {name ? <Text style={[styles.whoTitle, { marginTop: 22 }]}>{name}</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ---- the grown-up path
function GrownPath({ W, H, insets, voice, t, lang, sound, onSound, controls, setControls, onSkip, onHandOver }) {
  const [i, setI] = useState(0); // 0 p1, 1 p2, 2 p3, 3 p4, 4 p5, 5 p6, 6 p8
  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8'];
  const id = ids[i];
  const [passed, setPassed] = useState(false);
  const [kids, setKids] = useState([]); // names made here
  useEffect(() => { if (sound) voice.say(id); else voice.stop(); }, [i, sound]);
  const text = strip(LINES[id][lang] || LINES[id].en);
  const ss = sentences(text);
  const nT = TITLE_SENTENCES[id] || 1;
  let title = ss.slice(0, nT).join('').trim(), body = ss.slice(nT).join('').trim();
  if (id === 'p4') body = body.replace(t('Slide the moon yourself.'), '').trim();
  const firstName = kids[0] || (getProfiles().list[0] && getProfiles().list[0].name);
  if (id === 'p8') { title = t('All set.'); body = firstName ? t('Hand the phone to {name}.', { name: firstName }) : t('Hand the phone to your child.'); }
  const vis = Math.min(W - 48, H * 0.36);
  const canNext = id === 'p5' ? passed : true;
  const next = () => { voice.stop(); if (i < ids.length - 1) setI(i + 1); else onHandOver(firstName || null); };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <TopBar insets={insets} onSkip={onSkip} sound={sound} onSound={onSound} t={t} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 54, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 520, flex: 1 }}>
          <View style={{ minHeight: vis, alignItems: 'center', justifyContent: 'center' }}>
            {id === 'p1' ? <P1Visual w={vis} /> : null}
            {id === 'p2' ? <P2Visual w={vis} lang={lang} voice={voice} t={t} /> : null}
            {id === 'p3' ? <P3Visual w={vis} t={t} /> : null}
            {id === 'p4' ? <P4Visual w={vis} t={t} /> : null}
            {id === 'p5' ? <P5Check t={t} lang={lang} passed={passed} onPass={() => setPassed(true)} /> : null}
            {id === 'p6' ? null : null}
            {id === 'p8' ? <P8Visual w={vis} /> : null}
          </View>
          <Text style={styles.gTitle}>{title}</Text>
          {body ? <Text style={styles.gBody}>{body}</Text> : null}
          {id === 'p6' ? <ProfileForm t={t} controls={controls} setControls={setControls} kids={kids} onSaved={(n) => setKids((k) => [...k, n])} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26 }}>
            <View style={{ flexDirection: 'row', gap: 7 }}>{ids.map((x, k) => <View key={x} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: k === i ? INK : 'rgba(0,0,0,0.18)' }} />)}</View>
            <Pill label={i === 0 ? t('Show me') : id === 'p8' ? t('Ready') : t('Next')} onPress={next} disabled={!canNext || (id === 'p6' && !kids.length && !getProfiles().list.length)} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function P1Visual({ w }) {
  const lw = w * 0.8, k = lw / LETTERS_W;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: lw, height: LETTERS_H * k }}>
        {LETTERS.map(([src, x, lw2], i) => <Image key={i} source={src} style={{ ...LETTER_SHADOW, position: 'absolute', left: x * k, top: 0, width: lw2 * k, height: LETTERS_H * k }} resizeMode="contain" />)}
      </View>
      <Image source={NOTEBOOK} style={{ width: w * 0.5, height: w * 0.5, marginTop: 14 }} resizeMode="contain" />
    </View>
  );
}
function P2Visual({ w, lang, voice, t }) {
  const [mode, setMode] = useState('read');
  const [lit, setLit] = useState(-1);
  const words = strip(LINES.k3read[lang] || LINES.k3read.en).split(' ');
  const times = useMemo(() => wordTimes(lang, words), [lang]);
  const pw = w * 0.62;
  const read = async () => {
    const p = voice.say('k3read', { force: true });
    const tick = setInterval(() => { const s = voice.time(); if (s < 0) return; let i = -1; times.forEach((st, k) => { if (s >= st) i = k; }); setLit(i); }, 60);
    await p; clearInterval(tick); setLit(-1);
  };
  const chip = (k, label) => (
    <Pressable key={k} onPress={withTap(() => { setMode(k); if (k === 'read') read(); })} style={{ height: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: mode === k ? colors.green : 'rgba(0,0,0,0.07)' }}>
      <Text style={{ color: mode === k ? '#fff' : INK, fontFamily: F.semi, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ alignItems: 'center' }}>
      <CatPage w={pw} lang={lang} lit={lit} onWord={mode === 'learn' ? async (i) => { setLit(i); await voice.say('k3sound', { force: true }); setLit(-1); } : null} />
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {chip('read', t('Read to me'))}{chip('learn', t('Learn to Read'))}{chip('self', t('Read myself'))}
      </View>
    </View>
  );
}
function P3Visual({ w, t }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true })])); a.start(); return () => a.stop(); }, []);
  const row = (img, name, on) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, borderRadius: 22, paddingHorizontal: 8, backgroundColor: on ? colors.green : 'transparent' }}>
      {img ? <Image source={img} style={{ width: 30, height: 30 }} resizeMode="contain" /> : <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#3d3d40' }} />}
      <Text style={{ color: '#fff', fontFamily: F.bold, fontSize: 15 }}>{name}</Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
      <View style={{ width: w * 0.58, backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 20, padding: 12, gap: 4 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: F.semi, fontSize: 12, marginBottom: 4, marginLeft: 6 }}>{t('Who reads this book?')}</Text>
        {row(null, 'Fatima')}{row(null, 'Henry')}{row(PROFILE_COLORS[3][1], t('Grandma'), true)}
      </View>
      <Animated.View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.highlight, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }} />
    </View>
  );
}
function P4Visual({ w, t }) {
  const [e, setE] = useState(0);
  const s = w * 0.8;
  const slide = useSlider((v) => setE(v), s);
  return (
    <View {...slide.panHandlers} style={{ alignItems: 'center', paddingVertical: 10 }}>
      <View style={{ width: s, height: s, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <SunMoon size={s * 0.9} e={e} />
      </View>
      <Text style={{ color: 'rgba(0,0,0,0.45)', fontFamily: F.reg, fontSize: 13, marginTop: 10 }}>{t('Slide the moon yourself.')}</Text>
    </View>
  );
}
function P5Check({ t, lang, passed, onPass }) {
  const words = NUMBER_WORDS[lang] || NUMBER_WORDS.en;
  const [q] = useState(() => ({ a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }));
  const [ans, setAns] = useState('');
  const [wrong, setWrong] = useState(false);
  const star = useRef(new Animated.Value(0)).current;
  const check = () => { if (parseInt(ans, 10) === q.a * q.b) { onPass(); Animated.spring(star, { toValue: 1, friction: 4, useNativeDriver: true }).start(); } else { setWrong(true); setAns(''); } };
  return (
    <View style={{ width: '100%', maxWidth: 380, backgroundColor: 'rgba(0,0,0,0.86)', borderRadius: 24, padding: 22, alignItems: 'center' }}>
      {passed ? (
        <Animated.View style={{ alignItems: 'center', transform: [{ scale: star }] }}>
          <Text style={{ fontSize: 54, color: '#e8b64c' }}>★</Text>
          <Text style={{ color: '#fff', fontFamily: F.bold, fontSize: 17, marginTop: 4 }}>{t('Grown-up confirmed.')}</Text>
        </Animated.View>
      ) : (
        <>
          <Text style={{ color: '#fff', fontFamily: F.bold, fontSize: 19, textAlign: 'center' }}>{t('What is {a} times {b}?', { a: words[q.a], b: words[q.b] })}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TextInput value={ans} onChangeText={(v) => { setAns(v.replace(/[^0-9]/g, '')); setWrong(false); }} keyboardType="number-pad" maxLength={3} onSubmitEditing={check}
              style={{ width: 110, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 22, textAlign: 'center', fontFamily: F.reg, outlineWidth: 0 }} />
            <Pill label={t('Check')} onPress={check} disabled={!ans} />
          </View>
          {wrong ? <Text style={{ color: '#ff9b9b', fontFamily: F.reg, marginTop: 10 }}>{t('That’s not quite right. Try again.')}</Text> : null}
        </>
      )}
    </View>
  );
}
function ProfileForm({ t, controls, setControls, kids, onSaved }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState(null);
  const [color, setColor] = useState(PROFILE_COLORS[kids.length % PROFILE_COLORS.length][0]);
  const [quick, setQuick] = useState(false);
  const save = async () => {
    const n = name.trim(); if (!n) return;
    const first = getProfiles().list.length === 0;
    const p = await addProfile({ name: n, color, age });
    if (!p) return;
    if (first) setControls({ ...controls, childAge: age, ...(quick ? quickSafeControls(age) : {}) });
    else if (quick) await saveJSONFor(p.id, 'controls', { ...DEFAULT_CONTROLS, ...quickSafeControls(age) });
    onSaved(n); setName(''); setAge(null); setQuick(false); setColor(PROFILE_COLORS[(kids.length + 1) % PROFILE_COLORS.length][0]);
  };
  const label = (s) => <Text style={{ color: 'rgba(0,0,0,0.5)', fontFamily: F.semi, fontSize: 13, marginTop: 18, marginBottom: 8 }}>{s}</Text>;
  return (
    <View style={{ marginTop: 6 }}>
      {kids.map((k) => <Text key={k} style={{ color: colors.green, fontFamily: F.reg, fontSize: 15, marginTop: 6 }}>✓ {t('{name}’s shelf is ready.', { name: k })}</Text>)}
      {label(t('First name or nickname'))}
      <TextInput value={name} onChangeText={setName} maxLength={16} placeholder="" style={{ height: 48, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', color: INK, fontSize: 18, paddingHorizontal: 14, fontFamily: F.reg, outlineWidth: 0 }} />
      {label(t('Age'))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((a) => (
          <Pressable key={a} onPress={() => setAge(a)} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: age === a ? colors.green : 'rgba(0,0,0,0.06)' }}>
            <Text style={{ color: age === a ? '#fff' : INK, fontFamily: F.bold, fontSize: 16 }}>{a}</Text>
          </Pressable>
        ))}
      </View>
      {label(t('Pick a character'))}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {PROFILE_COLORS.map(([c, img]) => (
          <Pressable key={c} onPress={() => setColor(c)} style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color === c ? '#fff' : 'transparent' }}>
            <Image source={img} style={{ width: 44, height: 44 }} resizeMode="contain" />
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => setQuick((q) => !q)} style={{ flexDirection: 'row', gap: 12, marginTop: 20, alignItems: 'flex-start' }} accessibilityRole="switch" accessibilityState={{ checked: quick }}>
        <View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: quick ? colors.green : 'rgba(0,0,0,0.15)', justifyContent: 'center', paddingHorizontal: 3 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: quick ? 'flex-end' : 'flex-start' }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: INK, fontFamily: F.bold, fontSize: 15 }}>{t('Quick and Safe Kid')}</Text>
          <Text style={{ color: 'rgba(0,0,0,0.55)', fontFamily: F.reg, fontSize: 13, lineHeight: 18, marginTop: 3 }}>{t('Only My Library and My Notes, every book read aloud, nothing to buy, share or record. Recommended if they’ll read alone.')}</Text>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', marginTop: 18 }}>
        <Pill label={kids.length ? t('Save and add another child') : t('Done')} onPress={save} disabled={!name.trim()} light={!!kids.length} />
      </View>
    </View>
  );
}
function P8Visual({ w }) {
  const b = useBounce();
  useEffect(() => { const id = setInterval(() => b.bounce(1), 2200); b.bounce(1); return () => clearInterval(id); }, []);
  return <BouncyCoro b={b} size={w * 0.45} lift={40} />;
}

const styles = StyleSheet.create({
  whoTitle: { color: INK, fontFamily: F.bold, fontSize: 30, textAlign: 'center' },
  choice: { alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  choiceText: { color: CREAM, fontFamily: F.bold, fontSize: 17, marginTop: 8, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  gTitle: { color: INK, fontFamily: F.bold, fontSize: 28, lineHeight: 34, marginTop: 18 },
  gBody: { color: 'rgba(43,42,40,0.75)', fontFamily: F.reg, fontSize: 16, lineHeight: 23, marginTop: 10 },
});
