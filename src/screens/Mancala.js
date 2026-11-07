// Mancala in the Garden (Jörg, 7 Nov 2026): the old counting-and-sowing game, on a board of light oak with felt
// stones. The rules are Kalah, the version most families know:
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
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { withTap } from '../haptics';
import { playPebble } from '../sound';

const FELT = require('../../assets/desk-felt.jpg');
const OAK = require('../../assets/desk-oak.jpg');
// Jörg's felt stones (the same ones as on the beach)
const STONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [
  null,
  require('../../assets/garden/pebble-1.png'), require('../../assets/garden/pebble-2.png'), require('../../assets/garden/pebble-3.png'),
  require('../../assets/garden/pebble-4.png'), require('../../assets/garden/pebble-5.png'), require('../../assets/garden/pebble-6.png'),
  require('../../assets/garden/pebble-7.png'), require('../../assets/garden/pebble-8.png'), require('../../assets/garden/pebble-9.png'),
  require('../../assets/garden/pebble-10.png'),
][n]);

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
    const STEP = 230;
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
  const top = Math.max(insets.top, 12) + 66; // under the back button and the words
  const bottom = 86; // the choices underneath
  const room = { w: W - 32, h: H - top - bottom };
  const LEN = 8; // cells along the board: a store, six pits, a store
  const c = tall ? Math.min(room.h / LEN, room.w / 2.4) : Math.min(room.w / LEN, room.h / 2.4);
  const bw = tall ? c * 2.4 : c * LEN, bh = tall ? c * LEN : c * 2.4;
  const bx = (W - bw) / 2, by = top + (room.h - bh) / 2;
  const cellOf = (i) => (i === 6 ? 7 : i === 13 ? 0 : i < 6 ? i + 1 : 13 - i);
  const slot = (i) => {
    const cell = cellOf(i), near = sideOf(i) === 0;
    const along = (cell + 0.5) * c, side = (near ? 0.72 : 0.28) * 2.4 * c;
    const store = isStore(i);
    const sw = store ? c * 0.86 : c * 0.84, sh = store ? 2.4 * c * 0.84 : c * 0.84;
    if (tall) return { x: store ? 1.2 * c : side, y: bh - along, w: store ? sh : sw, h: store ? sw : sh };
    return { x: along, y: store ? 1.2 * c : bh - side, w: sw, h: sh };
  };
  const stoneSize = c * 0.3;

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
        <Text style={styles.status} numberOfLines={1} adjustsFontSizeToFit>{status}</Text>
        <Text style={styles.sub} numberOfLines={2}>{sub}</Text>
      </View>
      {/* the board: light oak, its pits and stores sunk into it */}
      <View style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, borderRadius: c * 0.5, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }}>
        <Image source={OAK} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {board.map((n, i) => {
          const s = slot(i);
          const glow = canTap(i);
          return (
            <Pressable key={i} disabled={!canTap(i)} onPress={withTap(() => move(i, turn))}
              accessibilityRole="button" accessibilityLabel={isStore(i) ? t('{name}’s store: {n} stones', { name: name(sideOf(i)), n }) : t('{n} stones', { n })}
              style={{ position: 'absolute', left: s.x - s.w / 2, top: s.y - s.h / 2, width: s.w, height: s.h, borderRadius: Math.min(s.w, s.h) / 2,
                backgroundColor: 'rgba(40,26,14,0.55)', borderWidth: glow ? 3 : 1.5, borderColor: glow ? '#ffffff' : lit === i ? '#f2c14e' : 'rgba(0,0,0,0.35)' }}>
              {/* the stones in it, scattered a little */}
              {Array.from({ length: Math.min(n, isStore(i) ? 36 : 18) }, (_, k) => {
                const a = rnd(i * 101 + k) * Math.PI * 2, rr = Math.sqrt(rnd(i * 77 + k * 3)) * 0.32;
                const sx = s.w / 2 + Math.cos(a) * rr * s.w - stoneSize / 2, sy = s.h / 2 + Math.sin(a) * rr * s.h - stoneSize / 2;
                return <Image key={k} source={STONES[(i * 7 + k) % STONES.length]} style={{ position: 'absolute', left: sx, top: sy, width: stoneSize, height: stoneSize }} resizeMode="contain" />;
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
      <Pressable onPress={withTap(onBack)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Back to the Garden')}
        style={[styles.back, { top: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.backChevron} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 22, textAlign: 'center' },
  sub: { color: '#d8d3c8', fontFamily: fonts.ui, fontSize: 14, lineHeight: 19, textAlign: 'center', marginTop: 2 },
  count: { color: '#2a1d10', fontFamily: fonts.uiBold, fontSize: 13, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 9, paddingHorizontal: 6, overflow: 'hidden' },
  choices: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap', paddingHorizontal: 12 },
  chip: { height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  chipOn: { backgroundColor: colors.green },
  chipText: { color: colors.white, fontFamily: fonts.uiBold, fontSize: 15 },
  back: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  backChevron: { width: 12, height: 12, borderLeftWidth: 2.6, borderBottomWidth: 2.6, borderColor: colors.white, transform: [{ translateX: 2 }, { rotate: '45deg' }] },
});
