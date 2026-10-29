// 存檔：只存在本機瀏覽器（localStorage），不收集任何個資
import { CLERK_CASES, MINICEX } from './engine/clerkMenus.js';
import { makeVariant } from './engine/clerkEngine.js';
import { ROOMS } from './mapData.js';

const KEY = 'erquest.save.v2';
const PASS = ['S', 'A', 'B'];
const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, F: 1 };

export const DEFAULT_SAVE = () => ({
  v: 2,
  look: 'docA',
  rank: 'clerk',
  exp: 0,
  energy: 100,
  day: 1,
  shift: null,
  today: { exp: 0, results: [] },
  cases: {},       // caseId → { best, plays, wins }
  minicex: Object.fromEntries(MINICEX.map(m => [m.key, { sum: 0, n: 0 }])),
  flags: {},
  pos: null,
  plays: 0,
});

export const state = { save: null, cases: {} };

export function hasSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return !!raw && JSON.parse(raw).v === 2;
  } catch (_) { return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.v === 2) return (state.save = { ...DEFAULT_SAVE(), ...d });
    }
  } catch (_) {}
  return (state.save = DEFAULT_SAVE());
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state.save)); return true; } catch (_) { return false; }
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch (_) {}
  state.save = DEFAULT_SAVE();
}

// ---------- 等級與職級 ----------
export const RANK_LABEL = { clerk: 'Clerk', pgy: 'PGY', r1: 'R1', r2: 'R2', r3: 'R3', vs: '主治醫師' };
export function level(exp = state.save.exp) { return 1 + Math.floor(exp / 100); }
export function rankTitle(s = state.save) {
  if (s.rank === 'clerk') return level(s.exp) >= 8 ? '準 PGY 的 Clerk' : level(s.exp) >= 4 ? '可靠的 Clerk' : '見習 Clerk';
  return RANK_LABEL[s.rank] || s.rank;
}
export function passedCount(s = state.save) {
  return CLERK_CASES.filter(id => PASS.includes(s.cases[id]?.best)).length;
}
export function examEligible(s = state.save) {
  return s.rank === 'clerk' && level(s.exp) >= 10 && passedCount(s) >= 8;
}

// ---------- 班表 ----------
export function generateShift(s = state.save, cases = state.cases, rnd = Math.random) {
  const passed = id => PASS.includes(s.cases[id]?.best);
  const plays = id => s.cases[id]?.plays || 0;
  const shuffle = a => a.map(x => [rnd(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  let cand = shuffle(CLERK_CASES.filter(id => !passed(id))).sort((a, b) => plays(a) - plays(b));
  const pick = [];
  for (const id of cand) {
    if (pick.length >= 2) break;
    if (pick.length === 1 && cases[pick[0]]?.dept === cases[id]?.dept && cand.length > 2) continue;
    pick.push(id);
  }
  for (const id of cand) { if (pick.length >= 2) break; if (!pick.includes(id)) pick.push(id); }
  // 全部通過後：挑評價最低的案例複習
  if (pick.length < 2) {
    const rest = shuffle(CLERK_CASES.filter(id => !pick.includes(id)))
      .sort((a, b) => (GRADE_RANK[s.cases[a]?.best] || 0) - (GRADE_RANK[s.cases[b]?.best] || 0));
    while (pick.length < 2) pick.push(rest.shift());
  }
  const rooms = shuffle([0, 1, 2, 3]).slice(0, 2).sort();
  s.shift = {
    day: s.day,
    briefed: false,
    ipass: null,
    list: pick.map((id, k) => {
      const v = plays(id) > 0 && cases[id] ? makeVariant(cases[id], rnd) : null;
      return { id, room: rooms[k], variant: v?.variant || null, vitals: v?.vitals || null, done: false, grade: null };
    }),
  };
  s.today = { exp: 0, results: [] };
  return s.shift;
}

export function shiftComplete(s = state.save) {
  return !!s.shift && s.shift.list.every(x => x.done);
}

export function roomNo(i) { return ROOMS[i].no; }

// ---------- 結果寫入 ----------
export function recordClerk(res, shiftIdx = null) {
  const s = state.save;
  const lvBefore = level(s.exp);
  s.exp += res.exp;
  s.plays += 1;
  s.energy = Math.max(0, Math.min(100, res.energy));
  const d = s.cases[res.caseId] || { best: null, plays: 0, wins: 0 };
  d.plays += 1;
  if (res.passed) d.wins += 1;
  if (res.grade !== 'F' && (!d.best || GRADE_RANK[res.grade] > GRADE_RANK[d.best])) d.best = res.grade;
  s.cases[res.caseId] = d;
  for (const m of MINICEX) { s.minicex[m.key].sum += res.minicex[m.key]; s.minicex[m.key].n += 1; }
  if (shiftIdx != null && s.shift?.list[shiftIdx]) {
    s.shift.list[shiftIdx].done = true;
    s.shift.list[shiftIdx].grade = res.grade;
  }
  s.today.exp += res.exp;
  s.today.results.push({ caseId: res.caseId, grade: res.grade });
  persist();
  return { levelUp: level(s.exp) > lvBefore ? level(s.exp) : null };
}

export function recordIpass(score) {
  const s = state.save;
  const gain = Math.round(score / 5);
  s.shift.ipass = score;
  s.exp += gain;
  s.today.exp += gain;
  persist();
  return gain;
}

export function minicexAvg(s = state.save) {
  return Object.fromEntries(MINICEX.map(m => {
    const x = s.minicex[m.key];
    return [m.key, x.n ? x.sum / x.n : 0];
  }));
}

export function nextDay(s = state.save) {
  s.day += 1;
  s.energy = 100;
  s.shift = null;
  s.today = { exp: 0, results: [] };
  persist();
}

export function bar9(v) {
  const n = Math.round(v);
  return '■'.repeat(n) + '□'.repeat(9 - n);
}
