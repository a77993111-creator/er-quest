// 存檔：只存在本機瀏覽器（localStorage），不收集任何個資
import { CLERK_CASES, PGY_CASES, MINICEX } from './engine/clerkMenus.js';
import { makeVariant } from './engine/clerkEngine.js';
import { AREAS } from './mapData.js';
import { defaultV3, migrate, coinsForCase, addCoins, afterCase, afterIpass, fx } from './progress.js';

const KEY = 'erquest.save.v2';
const PASS = ['S', 'A', 'B'];
const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, F: 1 };

export const DEFAULT_SAVE = () => ({
  ...defaultV3(),
  v: 3,
  look: 'docA',
  rank: 'clerk',
  exp: 0,
  energy: 100,
  day: 1,
  shift: null,
  today: { exp: 0, coins: 0, results: [] },
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
    const v = raw && JSON.parse(raw).v;
    return v === 2 || v === 3;
  } catch (_) { return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = migrate(JSON.parse(raw));
      if (d.v === 3) { state.save = { ...DEFAULT_SAVE(), ...d }; persist(); return state.save; }
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
export const NEXT_RANK = { clerk: 'pgy', pgy: 'r1', r1: 'r2', r2: 'r3', r3: 'vs' };
export const tierOf = rank => (rank === 'clerk' ? 'clerk' : 'pgy');   // R1 篇完成前，R1 以上仍在留觀區練習
export const areaOf = rank => (rank === 'clerk' ? 'clinic' : 'obs');
export const casesOf = tier => (tier === 'clerk' ? CLERK_CASES : PGY_CASES);
const EXAM = { clerk: { lv: 10, need: 8 }, pgy: { lv: 20, need: 8 } };
export const examRule = (rank = state.save.rank) => EXAM[rank] || null;

export function level(exp = state.save.exp) { return 1 + Math.floor(exp / 100); }
export function rankTitle(s = state.save) {
  const lv = level(s.exp);
  if (s.rank === 'clerk') return lv >= 8 ? '準 PGY 的 Clerk' : lv >= 4 ? '可靠的 Clerk' : '見習 Clerk';
  if (s.rank === 'pgy') return lv >= 18 ? '準 R1 的 PGY' : lv >= 14 ? '可靠的 PGY' : '新手 PGY';
  return RANK_LABEL[s.rank] || s.rank;
}
export function passedCount(s = state.save, tier = tierOf(s.rank)) {
  return casesOf(tier).filter(id => PASS.includes(s.cases[id]?.best)).length;
}
export function examEligible(s = state.save) {
  const r = EXAM[s.rank];
  return !!r && level(s.exp) >= r.lv && passedCount(s) >= r.need;
}

// ---------- 班表 ----------
export const PROXY_RATE = 0.3;
export function generateShift(s = state.save, cases = state.cases, rnd = Math.random) {
  const tier = tierOf(s.rank);
  const LIST = casesOf(tier);
  const passed = id => PASS.includes(s.cases[id]?.best);
  const plays = id => s.cases[id]?.plays || 0;
  const shuffle = a => a.map(x => [rnd(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  let cand = shuffle(LIST.filter(id => !passed(id) && cases[id])).sort((a, b) => plays(a) - plays(b));
  const pick = [];
  for (const id of cand) {
    if (pick.length >= 2) break;
    if (pick.length === 1 && cases[pick[0]]?.dept === cases[id]?.dept && cand.length > 2) continue;
    pick.push(id);
  }
  for (const id of cand) { if (pick.length >= 2) break; if (!pick.includes(id)) pick.push(id); }
  // 全部通過後：挑評價最低的案例複習
  if (pick.length < 2) {
    const rest = shuffle(LIST.filter(id => !pick.includes(id) && cases[id]))
      .sort((a, b) => (GRADE_RANK[s.cases[a]?.best] || 0) - (GRADE_RANK[s.cases[b]?.best] || 0));
    while (pick.length < 2 && rest.length) pick.push(rest.shift());
    while (pick.length < 2) pick.push(pick[0] || LIST.find(id => cases[id]));
  }
  const nRooms = AREAS[areaOf(s.rank)].rooms.length;
  const rooms = shuffle([...Array(nRooms).keys()]).slice(0, 2).sort((a, b) => a - b);
  s.shift = {
    day: s.day,
    tier,
    briefed: false,
    ipass: null,
    list: pick.map((id, k) => {
      const v = plays(id) > 0 && cases[id] ? makeVariant(cases[id], rnd) : null;
      const proxy = rnd() < PROXY_RATE ? 1 + Math.floor(rnd() * 1e9) : null;   // 家屬代述（亂數種子）
      return { id, room: rooms[k], variant: v?.variant || null, vitals: v?.vitals || null, proxy, done: false, grade: null };
    }),
  };
  s.today = { exp: 0, coins: 0, results: [] };
  return s.shift;
}

export function shiftComplete(s = state.save) {
  return !!s.shift && s.shift.list.every(x => x.done);
}

export function roomNo(i, rank = state.save.rank) { return AREAS[areaOf(rank)].rooms[i].no; }
// 班表與職級不符（例如剛升等）且還沒開始看診時，重新排班
export function shiftStale(s = state.save) {
  if (!s.shift) return true;
  const tier = s.shift.tier || 'clerk';
  return tier !== tierOf(s.rank) && !s.shift.list.some(x => x.done);
}

// ---------- 結果寫入 ----------
export function recordClerk(res, shiftIdx = null, isBoss = false) {
  const s = state.save;
  const lvBefore = level(s.exp);
  const prevBest = s.cases[res.caseId]?.best || null;
  const coin = coinsForCase(s, res, prevBest);
  addCoins(s, coin.coins);
  s.exp += res.exp;
  s.plays += 1;
  s.energy = Math.max(0, Math.min(fx.energyMax(s), res.energy));
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
  s.today.coins = (s.today.coins || 0) + coin.coins;
  s.today.results.push({ caseId: res.caseId, grade: res.grade });
  // 白白：每天第一位病人看完，精神值 +10
  const notes = [];
  if (s.pet === 'pet_wbc' && !s.daily?.wbcBonus) { s.energy = Math.min(fx.energyMax(s), s.energy + 10); if (s.daily) s.daily.wbcBonus = true; notes.push('白白幫你打氣：精神值 +10'); }
  notes.push(...afterCase(s, res, isBoss));
  persist();
  return { levelUp: level(s.exp) > lvBefore ? level(s.exp) : null, coins: coin, notes };
}

export function recordIpass(score) {
  const s = state.save;
  const gain = Math.round(score / 5);
  s.shift.ipass = score;
  s.exp += gain;
  s.today.exp += gain;
  let coins = 0;
  if (score === 100) { coins = Math.round(20 * fx.coinMult(s)); addCoins(s, coins); s.today.coins = (s.today.coins || 0) + coins; }
  const notes = afterIpass(s, score);
  persist();
  return { gain, coins, notes };
}

export function minicexAvg(s = state.save) {
  return Object.fromEntries(MINICEX.map(m => {
    const x = s.minicex[m.key];
    return [m.key, x.n ? x.sum / x.n : 0];
  }));
}

export function snapshotMinicex(s = state.save) {
  const avg = minicexAvg(s);
  s.minicexDaily = [...(s.minicexDaily || []).filter(x => x.day !== s.day), { day: s.day, avg }].slice(-30);
}

export function nextDay(s = state.save) {
  s.day += 1;
  s.energy = fx.energyMax(s);
  s.shift = null;
  s.today = { exp: 0, coins: 0, results: [] };
  persist();
}

export function bar9(v) {
  const n = Math.round(v);
  return '■'.repeat(n) + '□'.repeat(9 - n);
}

// 固定種子的亂數（家屬代述用，同一位病人重新進入時設定一致）
export function seededRnd(seed) {
  let n = (seed % 2147483646) + 1;
  return () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646;
}
