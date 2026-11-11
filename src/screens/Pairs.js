// Find the pairs in the Garden (Jörg, 11 Nov 2026): thirty square cards face down on the grey felt, like the
// small white-bordered photos on the Message Board. Turn over two: a matching pair stays face up, two that don't
// match turn back. Fifteen pairs, 5 across and 6 down (6 across and 5 down sideways). Every card lies a little
// askew, with a soft shadow, so the table feels real. A calm game: no clock, no score, just the pairs found so far.
// Coro's own pictures are in assets/garden/pairs. A family can also make its own sets of fifteen photos, each with a
// name, and play with those (the Make your own button: components/PairSets.js).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { playSound } from '../sound';
import { PaperLetter } from '../components/CoroLetter';
import PairSets from '../components/PairSets';
import { liveUri } from '../storage';
import { SET_SIZE, loadPairSets, savePairSets } from '../pairSets';

// Coro's letter on how to play (strings/pairs.js)
const LETTER = [
  'Hello! This is a game for sharp eyes and a good memory. Every picture is hiding here twice.',
  'How to play',
  '1. All the cards start face down. Tap one to turn it over, then tap another.',
  '2. If the two pictures match, you found a pair! They stay face up.',
  '3. If they don’t match, look closely and remember where they are. Then they turn back over.',
  '4. Keep going until you have found every pair.',
  'Play by yourself, or take turns with someone next to you. Take your time, and have fun!',
];

const FELT = require('../../assets/desk-felt.jpg'); // the grey felt, as under Mancala (Jörg, 11 Nov 2026; first on his oak table)
const ICON_PICTURE = require('../../assets/icon-picture-line.png'); // Make your own (Jörg, 11 Nov 2026)
const ICON_AGAIN = require('../../assets/icon-again-line.png'); // New game / Play again
const FACES = [
  require('../../assets/garden/pairs/pair-01.jpg'), require('../../assets/garden/pairs/pair-02.jpg'), require('../../assets/garden/pairs/pair-03.jpg'),
  require('../../assets/garden/pairs/pair-04.jpg'), require('../../assets/garden/pairs/pair-05.jpg'), require('../../assets/garden/pairs/pair-06.jpg'),
  require('../../assets/garden/pairs/pair-07.jpg'), require('../../assets/garden/pairs/pair-08.jpg'), require('../../assets/garden/pairs/pair-09.jpg'),
  require('../../assets/garden/pairs/pair-10.jpg'), require('../../assets/garden/pairs/pair-11.jpg'), require('../../assets/garden/pairs/pair-12.jpg'),
  require('../../assets/garden/pairs/pair-13.jpg'), require('../../assets/garden/pairs/pair-14.jpg'), require('../../assets/garden/pairs/pair-15.jpg'),
];
const PAIRS = FACES.length;

// a fresh table: every picture twice, shuffled, each card with its own small turn and nudge
function deal() {
  const cards = [];
  for (let p = 0; p < PAIRS; p++) for (let k = 0; k < 2; k++) cards.push({ pic: p });
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = cards[i]; cards[i] = cards[j]; cards[j] = x; }
  return cards.map((c, i) => ({ ...c, id: i, turn: (Math.random() - 0.5) * 9, dx: (Math.random() - 0.5) * 0.06, dy: (Math.random() - 0.5) * 0.06 }));
}

// one card: white back, picture face with a white border; it turns over about its middle
function Card({ card, face, size, up, found, onPress, label }) {
  const v = useRef(new Animated.Value(up ? 1 : 0)).current;
  useEffect(() => { Animated.timing(v, { toValue: up ? 1 : 0, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(); }, [up]);
  const edge = Math.max(3, Math.round(size * 0.07));
  return (
    <Pressable onPress={onPress} disabled={up} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: size, height: size, transform: [{ rotate: `${card.turn}deg` }] }}>
      <Animated.View style={[styles.card, { width: size, height: size, transform: [{ scaleX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.02, 1] }) }] }]}>
        {/* the face */}
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, padding: edge, opacity: v.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [0, 0, 1, 1] }) }}>
          <Image source={face} style={{ width: size - edge * 2, height: size - edge * 2, opacity: found ? 0.92 : 1 }} resizeMode="cover" />
        </Animated.View>
        {/* the back: plain white paper */}
        <Animated.View style={[styles.back, { width: size, height: size, opacity: v.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] }) }]} />
      </Animated.View>
    </Pressable>
  );
}

export default function Pairs({ area, toast }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const tall = H > W;
  const [cards, setCards] = useState(deal);
  const [up, setUp] = useState([]); // the cards turned over this go (one or two)
  const [found, setFound] = useState({}); // card id: true, once its pair is found
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  // the pictures in play: Coro's, or one of the family's own sets (a set plays once it has all fifteen)
  const [own, setOwn] = useState({ sets: [], chosen: null });
  const [choosing, setChoosing] = useState(false);
  useEffect(() => { loadPairSets().then((d) => { if (live.current) setOwn(d); }); }, []);
  const mine = own.sets.find((s) => s.id === own.chosen && s.pics.length === SET_SIZE);
  const faces = mine ? mine.pics.map((u) => ({ uri: liveUri(u) })) : FACES;
  const timers = useRef([]);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; timers.current.forEach(clearTimeout); }, []);
  const later = (fn, ms) => { const id = setTimeout(() => { if (live.current) fn(); }, ms); timers.current.push(id); };

  const pairsFound = Object.keys(found).length / 2;
  const over = pairsFound === PAIRS;

  const restart = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setUp([]); setFound({}); setBusy(true);
    later(() => { setCards(deal()); setBusy(false); }, 320); // (the cards turn back first, then they're dealt again)
  };

  const tap = (c) => {
    if (busy || found[c.id] || up.includes(c.id) || up.length >= 2) return;
    playSound('cardLift');
    const now = [...up, c.id];
    setUp(now);
    if (now.length < 2) return;
    const a = cards.find((x) => x.id === now[0]);
    if (a.pic === c.pic) {
      later(() => { setFound((f) => ({ ...f, [a.id]: true, [c.id]: true })); setUp([]); playSound('setDown', 0.6); }, 380);
    } else {
      setBusy(true);
      later(() => { setUp([]); setBusy(false); }, 1100); // long enough to look at both
    }
  };

  // the cards: 5 across and 6 down upright, 6 across and 5 down sideways, as big as the table allows
  const cols = tall ? 5 : 6, rows = tall ? 6 : 5;
  const top = Math.max(insets.top, 12) + (tall ? 92 : 84), bottom = 74;
  const side = tall ? 10 : 70;
  const cell = Math.min((W - side * 2) / cols, (H - top - bottom) / rows);
  const size = Math.floor(cell * 0.88);
  const gx = (W - cell * cols) / 2, gy = top + (H - top - bottom - cell * rows) / 2;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={FELT} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      <View style={{ position: 'absolute', left: 70, right: 70, top: Math.max(insets.top, 12) + 6, alignItems: 'center' }}>
        <Text style={styles.title} accessibilityRole="header">{t('Find the pairs')}</Text>
        <Text style={[styles.sub, { marginTop: tall ? 16 : 8 }]} numberOfLines={2} adjustsFontSizeToFit>
          {over ? t('You found them all!') : pairsFound ? t('{n} of {m} pairs found', { n: pairsFound, m: PAIRS }) : t('Turn over two cards. If they match, they stay.')}
        </Text>
      </View>
      {cards.map((c, i) => (
        <View key={c.id} style={{ position: 'absolute', left: gx + (i % cols) * cell + (cell - size) / 2 + c.dx * cell, top: gy + Math.floor(i / cols) * cell + (cell - size) / 2 + c.dy * cell }}>
          <Card card={c} face={faces[c.pic]} size={size} up={up.includes(c.id) || !!found[c.id]} found={!!found[c.id]} onPress={() => tap(c)} label={t('Card {n}', { n: i + 1 })} />
        </View>
      ))}
      {/* ?: Coro's letter on how to play, as in Mancala (Jörg, 11 Nov 2026) */}
      <Pressable onPress={withTap(() => setHelp(true))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('How to play Find the pairs')}
        style={[styles.help, tall ? { top: Math.max(insets.top, 12) + 8 } : { bottom: 20 }]}>
        <Text style={styles.helpText}>?</Text>
      </Pressable>
      {choosing ? (
        <PairSets data={own} coroFaces={FACES} width={W} toast={toast} onClose={() => setChoosing(false)}
          onChange={(d, fresh) => { setOwn(d); savePairSets(d); if (fresh) restart(); }} />
      ) : null}
      {help ? <PaperLetter title="Let’s find the pairs!" paras={LETTER} onClose={() => setHelp(false)} /> : null}
      <View style={styles.choices}>
        <Pressable onPress={withTap(() => setChoosing(true))} style={styles.chip} accessibilityRole="button">
          <Image source={ICON_PICTURE} style={styles.chipIcon} resizeMode="contain" />
          <Text style={styles.chipText}>{t('Make your own')}</Text>
        </Pressable>
        <Pressable onPress={withTap(restart)} style={[styles.chip, over && styles.chipOn]} accessibilityRole="button">
          <Image source={ICON_AGAIN} style={styles.chipIcon} resizeMode="contain" />
          <Text style={styles.chipText}>{over ? t('Play again') : t('New game')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 26, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  sub: { color: colors.white, fontFamily: fonts.uiSemiBold, fontSize: 15, lineHeight: 20, textAlign: 'center', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 } },
  card: { backgroundColor: '#fbfaf6', borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 4, shadowOffset: { width: 1.5, height: 3 }, elevation: 4 },
  back: { position: 'absolute', left: 0, top: 0, backgroundColor: '#fbfaf6', borderRadius: 2 },
  help: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  helpText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 22, lineHeight: 26 },
  choices: { position: 'absolute', left: 0, right: 0, bottom: 22, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  chip: { height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipIcon: { width: 18, height: 18, tintColor: colors.white },
  chipOn: { backgroundColor: colors.green },
  chipText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
});
