// 存檔：只存在本機瀏覽器（localStorage），不收集任何個資
const KEY = 'erquest.save.v1';

export const DEFAULT_SAVE = () => ({
  v: 1,
  look: 'docA',
  mode: 'clerk',
  exp: 0,
  energy: 100,
  dex: {},        // caseId → { best, plays, wins }
  flags: {},
  pos: null,      // { x, y, dir }
  plays: 0,
});

export const state = { save: null, cases: {} };

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (_) { return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (state.save = { ...DEFAULT_SAVE(), ...JSON.parse(raw) });
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

const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, F: 1 };
export function recordResult(caseId, res) {
  const s = state.save;
  s.exp += res.exp;
  s.plays += 1;
  s.energy = Math.max(0, Math.min(100, res.energy));
  const d = s.dex[caseId] || { best: null, plays: 0, wins: 0 };
  d.plays += 1;
  if (res.win) {
    d.wins += 1;
    if (!d.best || GRADE_RANK[res.grade] > GRADE_RANK[d.best]) d.best = res.grade;
  }
  s.dex[caseId] = d;
  persist();
}

export function level(exp = state.save.exp) { return 1 + Math.floor(exp / 100); }

export function rankTitle(mode = state.save.mode, exp = state.save.exp) {
  const lv = level(exp);
  const T = mode === 'clerk'
    ? ['見習醫學生', '實習醫學生', '可靠的 Clerk', '準 PGY', '傳說中的 Clerk']
    : ['R1 新手', 'R1', 'R2', 'R3', '總醫師候選'];
  return T[Math.min(T.length - 1, Math.floor((lv - 1) / 2))];
}

export const MODE_LABEL = { clerk: 'Clerk 模式', resident: 'Resident 模式' };
