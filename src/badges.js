// Reading badges for My Notes. Everything is kept on the phone.
// What counts:
//   - finishing a book (reading it to The End): one badge per book, with its cover
//   - milestones: 1, 5, 10, 25 and 50 different books finished
//   - streaks: reading on 3, 7 and 30 days in a row
//   - firsts: the first recording of your own voice, the first book you made, the first drawing, a bedtime read
// Their pictures are Jörg's felt badges (assets/badges, with a grey 'locked' version for ones not earned yet).
// When a new badge is earned, everyone listening (the app shows a speech bubble) hears about it.
import { loadJSON, saveJSON } from './storage';

const KEY = 'readingLog';
const empty = () => ({ finished: {}, days: [], firsts: {}, seen: [] });

let queue = Promise.resolve();
const serial = (fn) => (queue = queue.then(fn, fn));

const listeners = new Set();
export function onNewBadge(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export async function loadLog() {
  const l = await loadJSON(KEY, null);
  return { ...empty(), ...(l || {}) };
}

// local calendar day, e.g. '2026-10-17'
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };

// the longest run of days in a row with some reading
export function longestStreak(days) {
  const n = [...new Set(days)].map(dayNum).sort((a, b) => a - b);
  let best = n.length ? 1 : 0, run = 1;
  for (let i = 1; i < n.length; i++) { run = n[i] === n[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
  return best;
}
// the run that includes today (or yesterday), for "3 days in a row" on the badge page
export function currentStreak(days) {
  const set = new Set(days.map(dayNum));
  let d = dayNum(today());
  if (!set.has(d)) d -= 1;
  let run = 0;
  while (set.has(d)) { run += 1; d -= 1; }
  return run;
}

const MILESTONES = [
  { id: 'read1', n: 1, title: 'First Book', how: 'Read a book all the way to The End.', mark: '1', color: '#4f7a3a' },
  { id: 'read5', n: 5, title: 'Bookworm', how: 'Finish 5 different books.', mark: '5', color: '#3d6f9e' },
  { id: 'read10', n: 10, title: 'Story Explorer', how: 'Finish 10 different books.', mark: '10', color: '#8a4f9e' },
  { id: 'read25', n: 25, title: 'Super Reader', how: 'Finish 25 different books.', mark: '25', color: '#b5432f' },
  { id: 'read50', n: 50, title: 'Book Champ', how: 'Finish 50 different books.', mark: '50', color: '#2f6b3a' },
];
const STREAKS = [
  { id: 'streak3', n: 3, title: '3 Days in a Row', how: 'Read on 3 days in a row.', mark: '3', color: '#c9a227' },
  { id: 'streak7', n: 7, title: 'A Whole Week', how: 'Read every day for a week.', mark: '7', color: '#d07a2c' },
  { id: 'streak30', n: 30, title: 'A Whole Month', how: 'Read every day for 30 days.', mark: '30', color: '#2f7f74' },
];
const FIRSTS = [
  { id: 'firstRecording', title: 'First Recording', how: 'Record your own voice reading a page.', mark: '●', color: '#c0392b' },
  { id: 'firstBook', title: 'First Book Made', how: 'Make your own book in Make a Book.', mark: '+', color: '#4f7a3a' },
  { id: 'firstDrawing', title: 'First Drawing', how: 'Draw a picture in My Notes.', mark: '✎', color: '#3d6f9e' },
  { id: 'bedtime', title: 'Bedtime Read', how: 'Read a book in the evening, after 7 o’clock.', mark: '☾', color: '#24345e' },
];

// Every badge, earned or not, in the order they're shown: the fixed ones, then one per finished book.
export function allBadges(log) {
  const count = Object.keys(log.finished).length;
  const streak = longestStreak(log.days);
  const out = [
    ...MILESTONES.map((b) => ({ ...b, kind: 'milestone', earned: count >= b.n })),
    ...STREAKS.map((b) => ({ ...b, kind: 'streak', earned: streak >= b.n })),
    ...FIRSTS.map((b) => ({ ...b, kind: 'first', earned: !!log.firsts[b.id] })),
  ];
  const books = Object.entries(log.finished)
    .sort((a, b) => (a[1].at || 0) - (b[1].at || 0))
    .map(([id, f]) => ({ id: `book:${id}`, bookId: id, kind: 'book', title: f.title || 'A book', how: `You read “${f.title || 'this book'}” to The End.`, cover: f.cover || null, earned: true }));
  return out; // (finished books are counted for the milestones, but have no badges of their own)
}

// After any change: tell the listeners about badges that weren't earned before.
function announce(log) {
  const earned = allBadges(log).filter((b) => b.earned);
  const fresh = earned.filter((b) => !log.seen.includes(b.id));
  if (!fresh.length) return log;
  log.seen = [...log.seen, ...fresh.map((b) => b.id)];
  // a finished book also earns its own badge; say the bigger one first
  const order = { milestone: 0, streak: 1, first: 2, book: 3 };
  fresh.sort((a, b) => order[a.kind] - order[b.kind]);
  listeners.forEach((fn) => { try { fn(fresh); } catch (e) {} });
  return log;
}

const change = (fn) => serial(async () => {
  const log = await loadLog();
  if (fn(log) === false) return log;
  announce(log);
  await saveJSON(KEY, log);
  return log;
});

// a book was opened and read today
export const markReadToday = () => change((log) => {
  const t = today();
  let changed = false;
  // reading in the evening earns Bedtime Read
  if (new Date().getHours() >= 19 && !log.firsts.bedtime) { log.firsts = { ...log.firsts, bedtime: Date.now() }; changed = true; }
  if (!log.days.includes(t)) { log.days = [...log.days, t].slice(-400); changed = true; }
  if (!changed) return false;
});

// a book was read to The End. cover: a picture of the book's cover ({uri} or a bundled image) for its badge
export const markFinished = (story, cover) => change((log) => {
  if (!story || !story.id || log.finished[story.id]) return false;
  // only a stored picture is kept (the app's own books find their cover again when the badge is shown)
  const c = cover && typeof cover === 'object' && cover.uri ? { uri: cover.uri } : null;
  log.finished = { ...log.finished, [story.id]: { title: story.title, at: Date.now(), cover: c } };
  if (!log.days.includes(today())) log.days = [...log.days, today()];
});

// 'firstRecording' | 'firstBook' | 'firstDrawing'
export const markFirst = (id) => change((log) => {
  if (log.firsts[id]) return false;
  log.firsts = { ...log.firsts, [id]: Date.now() };
});
