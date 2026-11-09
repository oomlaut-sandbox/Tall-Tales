// Mancala in the Garden (Jörg, 7 Nov 2026): the old counting-and-sowing game, on a dark felt board with a stitched
// edge and Jörg's felt stones. The rules are Kalah, the version most families know:
//   six pits each, four stones in every pit to start, and a store at each end
//   take all the stones from one of your pits and drop them one at a time into the next pits, going round
//     (into your own store too, never into the other player's)
//   the last stone lands in your store: go again
//   the last stone lands in an empty pit on your side: you take it, and every stone in the pit across from it
//   when one side has no stones left, the game ends: the other player keeps what's left on their side
//   the most stones in your store wins
// Play against Coro (it plays gently, so children can win) or with someone next to you, taking turns.
// Upright, the board stands tall: your pits on the right, going up to your store at the top. Sideways it lies across:
// your pits along the bottom, going right to your store.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { playPebble } from '../sound';
import { PaperLetter } from '../components/CoroLetter';

// Coro's letter about Mancala: a little of where it comes from, then how to play, for a six-year-old (strings/mancala.js)
const LETTER = [
  'Hello! Mancala is one of the oldest games in the world. Families in Africa have played it for more than a thousand years, and it has travelled to many places since.',
  'People played with seeds, shells or pebbles. Some carved beautiful boards out of wood, and some just scooped little holes in the sand. The word “mancala” comes from an Arabic word that means “to move”.',
  'It has many names. In Ghana it’s called Oware, and in East Africa it’s called Bao. Now it’s your turn to play!',
  'How to play',
  'Your pits are the six little holes with a white ring. Your store is the big hole at the end of your row. The numbers tell you how many stones are in each one.',
  '1. Tap one of your pits. Its stones hop out and drop into the next holes, one stone in each, going around the board.',
  '2. Stones that land in your store are yours to keep. (They skip the other player’s store.)',
  '3. If your last stone lands in your store, you get another turn!',
  '4. If your last stone lands in an empty pit on your side, you capture it, and all the stones in the pit right across from it. They all go into your store.',
  '5. When one side runs out of stones, the game is over. Whoever has the most stones in their store wins.',
  'Coro plays gently, so take your time. Count the stones before you tap, and have fun!',
];

const FELT = require('../../assets/desk-felt.jpg');
// Jörg's felt board (9 Nov 2026, second version): upright, and turned for sideways (your store on the right)
const BOARD = require('../../assets/garden/mancala/board.png'); // 624 × 1909
const BOARD_WIDE = require('../../assets/garden/mancala/board-wide.png');
const BOARD_AR = 624 / 1909; // width / height, upright
// where the holes are on the upright board (measured on the picture), as fractions of its size: the rows from the
// bottom store (cell 0) to the top store (cell 7); your pits in the right column, the other player's in the left
const ROWS = [0.9125, 0.7926, 0.6716, 0.5516, 0.4306, 0.3106, 0.1902, 0.0775];
const COL = { near: 0.6971, far: 0.3061 };
const STORES = { top: { x: 0.492, w: 0.6571, h: 0.0812 }, bottom: { x: 0.5016, w: 0.6859, h: 0.0812 } };
const HOLE_D = 0.2564; // a pit's hole, of the board's width
const PIT_D = HOLE_D * 1.06; // its ring: a few points bigger than the hole (Jörg, 9 Nov 2026)
// smooth grey pebbles, cut from Jörg's photo (9 Nov 2026; were the felt stones)
const STONES = [
  require('../../assets/garden/mancala/pebble-01.png'), require('../../assets/garden/mancala/pebble-02.png'),
  require('../../assets/garden/mancala/pebble-03.png'), require('../../assets/garden/mancala/pebble-04.png'),
  require('../../assets/garden/mancala/pebble-05.png'), require('../../assets/garden/mancala/pebble-06.png'),
  require('../../assets/garden/mancala/pebble-07.png'), require('../../assets/garden/mancala/pebble-08.png'),
  require('../../assets/garden/mancala/pebble-09.png'), require('../../assets/garden/mancala/pebble-10.png'),
  require('../../assets/garden/mancala/pebble-11.png'), require('../../assets/garden/mancala/pebble-12.png'),
];

const PITS = 6, START = 4;
const STORE = [6, 13]; // player 0's store, player 1's store
// slots 0–5: player 0's pits, 6: their store, 7–12: player 1's pits, 13: their store
const sideOf = (i) => (i <= 6 ? 0 : 1);
const isStore = (i) => i === 6 || i === 13;
const across = (i) => 12 - i; // the pit opposite
const fresh = () => Array.from({ length: 14 }, (_, i) => (isStore(i) ? 0 : START));
const legal = (b, p) => Array.from({ length: PITS }, (_, k) => k + p * 7).filter((i) => b[i] > 0);

// one whole move, worked out at once: where every stone goes, and what happens after
function play(board, from, p) {
  const b = board.slice();
  let n = b[from]; b[from] = 0;
  const path = [];
  let i = from;
  while (n > 0) {
    i = (i + 1) % 14;
    if (i === STORE[1 - p]) continue; // never into the other player's store
    b[i] += 1; n -= 1; path.push(i);
  }
  let again = i === STORE[p];
  let took = null;
  if (!again && sideOf(i) === p && !isStore(i) && b[i] === 1 && b[across(i)] > 0) {
    took = { at: i, from: across(i), n: b[across(i)] + 1 };
    b[STORE[p]] += b[across(i)] + 1; b[i] = 0; b[across(i)] = 0;
  }
  // a side with no stones left: the game is over, and the other side keeps theirs
  let over = false;
  const empty = (q) => legal(b, q).length === 0;
  if (empty(0) || empty(1)) {
    over = true;
    for (let q = 0; q < 2; q += 1) for (let k = 0; k < PITS; k += 1) { const j = k + q * 7; b[STORE[q]] += b[j]; b[j] = 0; }
    again = false;
  }
  return { b, path, again, took, over };
}

// Coro's move: gentle. Usually the move that does best right now (a stone in its store, another turn, a capture);
// sometimes just any move, so a child can win
function coroMove(b) {
  const moves = legal(b, 1);
  if (Math.random() < 0.5) return moves[Math.floor(Math.random() * moves.length)];
  let best = moves[0], score = -1e9;
  for (const m of moves) {
    const r = play(b, m, 1);
    const s = (r.b[13] - b[13]) * 2 + (r.again ? 3 : 0) + (r.took ? r.took.n : 0) + Math.random();
    if (s > score) { score = s; best = m; }
  }
  return best;
}

// a fixed little scatter, so the stones in a pit don't jump about as more arrive
// one pebble; the one just sown drops into its hole from a little above, slowly (Jörg, 9 Nov 2026)
function Stone({ drop, fall, source, left, top, size, turn }) {
  const v = useRef(new Animated.Value(drop ? 0 : 1)).current;
  useEffect(() => {
    if (drop) Animated.timing(v, { toValue: 1, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.Image source={source} resizeMode="contain"
      style={{ position: 'absolute', left, top, width: size, height: size,
        opacity: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-fall, 0] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] }) }, { rotate: `${turn}deg` }] }} />
  );
}

const rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };

export default function Mancala({ area, onBack }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const W = area.w, H = area.h;
  const tall = H > W;
  const [vsCoro, setVsCoro] = useState(true);
  const [board, setBoard] = useState(fresh);
  const [turn, setTurn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState(null); // the pit a stone just landed in
  const [note, setNote] = useState(null); // 'again' | 'took'
  const [over, setOver] = useState(false);
  const [help, setHelp] = useState(false);
  const timers = useRef([]);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; timers.current.forEach(clearTimeout); }, []);
  const later = (fn, ms) => { const id = setTimeout(() => { if (live.current) fn(); }, ms); timers.current.push(id); };

  const restart = (coro = vsCoro) => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setVsCoro(coro); setBoard(fresh()); setTurn(0); setBusy(false); setLit(null); setNote(null); setOver(false);
  };

  // sow, one stone at a time, with the sound of each one landing
  const move = (from, p) => {
    if (busy || over) return;
    const r = play(board, from, p);
    setBusy(true); setNote(null);
    const STEP = 420; // one stone at a time, unhurried (Jörg, 9 Nov 2026; was 230)
    const b = board.slice(); b[from] = 0;
    setBoard(b.slice());
    r.path.forEach((i, k) => later(() => { b[i] += 1; setBoard(b.slice()); setLit(i); playPebble(0.35); }, STEP * (k + 1)));
    later(() => {
      setLit(null);
      setBoard(r.b);
      if (r.took) { setNote('took'); playPebble(0.7); }
      if (r.over) { setOver(true); setBusy(false); return; }
      if (r.again) setNote('again');
      const next = r.again ? p : 1 - p;
      setTurn(next); setBusy(false);
    }, STEP * (r.path.length + 1) + 120);
  };
  // Coro takes its turn after a moment
  useEffect(() => {
    if (!vsCoro || turn !== 1 || busy || over) return;
    later(() => move(coroMove(board), 1), 900);
  }, [turn, busy, over, vsCoro, board]);

  // ---- the board's size and every slot's place on it ----
  const top = Math.max(insets.top, 12) + 96; // under the title, whose turn it is and the words
  const bottom = 86; // the choices underneath
  const room = { w: W - 32, h: H - top - bottom };
  // the board keeps the picture's shape: as big as fits
  const tallH = Math.min(room.h, room.w / BOARD_AR), wideW = Math.min(room.w, room.h / BOARD_AR);
  const bw = tall ? tallH * BOARD_AR : wideW, bh = tall ? tallH : wideW * BOARD_AR;
  const along = tall ? bw : bh; // the board's short side
  const c = (along * PIT_D) / 0.84; // (the old cell size, which the counts' spacing is measured in)
  const bx = (W - bw) / 2, by = top + (room.h - bh) / 2;
  const cellOf = (i) => (i === 6 ? 7 : i === 13 ? 0 : i < 6 ? i + 1 : 13 - i);
  const slot = (i) => {
    const cell = cellOf(i), store = isStore(i), st = cell === 7 ? STORES.top : STORES.bottom;
    const u = store ? st.x : sideOf(i) === 0 ? COL.near : COL.far, v = ROWS[cell];
    const d = along * PIT_D;
    if (tall) return { x: u * bw, y: v * bh, w: store ? st.w * bw : d, h: store ? st.h * bh : d };
    // sideways: the upright board turned a quarter clockwise, so the top store is on the right
    return { x: (1 - v) * bw, y: u * bh, w: store ? st.h * bw : d, h: store ? st.w * bh : d };
  };
  const stoneSize = along * 0.103; // (each pebble's picture now carries a deeper shadow around it)
  const edgeGap = along * (0.031 + (PIT_D - HOLE_D) / 2); // about 15 pixels in from the inner edge of each hole (Jörg, 9 Nov 2026)

  const mine = (i) => !isStore(i) && sideOf(i) === turn && (!vsCoro || turn === 0);
  const canTap = (i) => !busy && !over && mine(i) && board[i] > 0;

  const name = (p) => (vsCoro ? (p === 0 ? t('You') : 'Coro') : p === 0 ? t('Player 1') : t('Player 2'));
  const s0 = board[6], s1 = board[13];
  const status = over
    ? (s0 === s1 ? t('It’s a tie!') : vsCoro ? (s0 > s1 ? t('You win!') : t('Coro wins this time.')) : t('{name} wins!', { name: name(s0 > s1 ? 0 : 1) }))
    : vsCoro ? (turn === 0 ? t('Your turn') : t('Coro’s turn')) : t('{name}’s turn', { name: name(turn) });
  const sub = over ? t('{a} to {b}', { a: Math.max(s0, s1), b: Math.min(s0, s1) })
    : note === 'again' ? t('The last stone landed in the store. Go again!')
      : note === 'took' ? t('Captured! Those stones go to the store.')
        : turn === 0 || !vsCoro ? t('Tap a pit on your side.') : ' ';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={FELT} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
      {/* whose turn */}
      <View style={{ position: 'absolute', left: 70, right: 70, top: Math.max(insets.top, 12) + 6, alignItems: 'center' }}>
        <Text style={styles.title} accessibilityRole="header">{t('Mancala')}</Text>
        <Text style={styles.status} numberOfLines={1} adjustsFontSizeToFit>{status}</Text>
        <Text style={styles.sub} numberOfLines={2}>{sub}</Text>
      </View>
      {/* the board: light oak, its pits and stores sunk into it */}
      <View style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 4, height: 8 } }}>
        {/* the board: Jörg's brown felt board, its holes in the picture (9 Nov 2026) */}
        <Image source={tall ? BOARD : BOARD_WIDE} style={{ position: 'absolute', left: 0, top: 0, width: bw, height: bh }} resizeMode="stretch" />
        {board.map((n, i) => {
          const s = slot(i);
          const glow = canTap(i);
          return (
            <Pressable key={i} disabled={!canTap(i)} onPress={withTap(() => move(i, turn))}
              accessibilityRole="button" accessibilityLabel={isStore(i) ? t('{name}’s store: {n} stones', { name: name(sideOf(i)), n }) : t('{n} stones', { n })}
              style={{ position: 'absolute', left: s.x - s.w / 2, top: s.y - s.h / 2, width: s.w, height: s.h, borderRadius: Math.min(s.w, s.h) / 2,
                borderWidth: glow || lit === i ? 2.75 : 0, borderColor: glow ? '#a9a9a9' /* a solid mid grey (Jörg, 9 Nov 2026) */ : '#f2c14e' }}>
              {/* the stones in it, scattered a little */}
              {Array.from({ length: Math.min(n, isStore(i) ? 36 : 18) }, (_, k) => {
                // clustered in the middle: no stone comes nearer the hole's inner edge than the margin (Jörg, 9 Nov 2026)
                // placed at random anywhere inside that margin
                const a = rnd(i * 101 + k) * Math.PI * 2, rr = Math.sqrt(rnd(i * 77 + k * 3));
                const ax = Math.max(0, s.w / 2 - edgeGap - stoneSize / 2), ay = Math.max(0, s.h / 2 - edgeGap - stoneSize / 2);
                const sx = s.w / 2 + Math.cos(a) * rr * ax - stoneSize / 2, sy = s.h / 2 + Math.sin(a) * rr * ay - stoneSize / 2;
                return <Stone key={k} drop={lit === i && k === n - 1} fall={stoneSize} source={STONES[(i * 7 + k) % STONES.length]} left={sx} top={sy} size={stoneSize} turn={Math.round((rnd(i * 13 + k * 7) - 0.5) * 30)} />;
              })}
            </Pressable>
          );
        })}
        {/* how many in each: small numbers, always upright */}
        {board.map((n, i) => {
          const s = slot(i);
          const off = isStore(i) ? 0 : (tall ? 0 : (sideOf(i) === 0 ? 1 : -1) * (s.h / 2 + c * 0.13));
          const offX = isStore(i) || !tall ? 0 : (sideOf(i) === 0 ? 1 : -1) * (s.w / 2 + c * 0.16);
          return (
            <View key={`n${i}`} pointerEvents="none" style={{ position: 'absolute', left: s.x + offX - 22, top: s.y + off - (isStore(i) ? -s.h / 2 + 30 : 11), width: 44, alignItems: 'center' }}>
              <Text style={styles.count}>{n}</Text>
            </View>
          );
        })}
      </View>
      {/* ?: Coro's letter about the game, where it comes from and how to play (Jörg, 9 Nov 2026) */}
      <Pressable onPress={withTap(() => setHelp(true))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('How to play Mancala')}
        style={[styles.help, { top: Math.max(insets.top, 12) + 8 }]}>
        <Text style={styles.helpText}>?</Text>
      </Pressable>
      {help ? <PaperLetter title="Let’s play Mancala!" paras={LETTER} onClose={() => setHelp(false)} /> : null}
      {/* who to play with, and a new game */}
      <View style={[styles.choices, { bottom: 22 }]}>
        <Pressable onPress={withTap(() => restart(true))} style={[styles.chip, vsCoro && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: vsCoro }}>
          <Text style={styles.chipText}>{t('Play Coro')}</Text>
        </Pressable>
        <Pressable onPress={withTap(() => restart(false))} style={[styles.chip, !vsCoro && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: !vsCoro }}>
          <Text style={styles.chipText}>{t('Two players')}</Text>
        </Pressable>
        <Pressable onPress={withTap(() => restart())} style={[styles.chip, over && styles.chipOn]} accessibilityRole="button">
          <Text style={styles.chipText}>{over ? t('Play again') : t('New game')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 26, textAlign: 'center' },
  status: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 18, textAlign: 'center', marginTop: 4 },
  help: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  helpText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 22, lineHeight: 26 },
  sub: { color: '#d8d3c8', fontFamily: fonts.ui, fontSize: 14, lineHeight: 19, textAlign: 'center', marginTop: 2 },
  count: { color: '#ebe4d7', fontFamily: fonts.uiBold, fontSize: 15 },
  choices: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap', paddingHorizontal: 12 },
  chip: { height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  chipOn: { backgroundColor: colors.green },
  chipText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  backChevron: { width: 12, height: 12, borderLeftWidth: 2.6, borderBottomWidth: 2.6, borderColor: colors.white, transform: [{ translateX: 2 }, { rotate: '45deg' }] },
});
