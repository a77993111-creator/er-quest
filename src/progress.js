// 白袍幣、成就、裝備功能、設定、管理者模式
import { ITEMS, PETS, BADGES, UNLOCK_TEXT } from './cosmetics.js';
import { CLERK_CASES } from './engine/clerkMenus.js';

export const ADMIN_HASH = '5028952ef4ec67647ed969104e7b58b4ecb8f5458e28dee0f60ef69dff827828';

export const SPEEDS = {
  text: [{ key: 'slow', label: '慢', ms: 32 }, { key: 'mid', label: '中', ms: 16 }, { key: 'fast', label: '快', ms: 6 }, { key: 'instant', label: '瞬間', ms: 0 }],
  walk: [{ key: 'normal', label: '一般', mult: 1 }, { key: 'fast', label: '快', mult: 1.4 }],
};

export function defaultV3() {
  return {
    coins: 0,
    owned: { items: [], pets: [] },
    equip: { steth: null, scrub: null, head: null, chest: null, shoes: null },
    pet: null,
    badges: [],
    stats: { redflagStreak: 0, kfStreak: 0, dxStreak: 0, ipassPerfect: 0, fullDayStreak: 0, ecgFast: 0, classroom: 0, daysWorked: 0 },
    settings: { textSpeed: 'mid', walk: 'normal' },
    admin: false,
    daily: { day: 0, freeCoffee: false, wbcBonus: false, procs: 0 },
    procs: {},
    inventory: { coffee: 0 },
    minicexDaily: [],
  };
}

// v2 → v3：保留所有進度，只補上新欄位
export function migrate(d) {
  if (d.v === 2) {
    const n = defaultV3();
    d = { ...n, ...d, v: 3 };
    d.stats = { ...n.stats, ...(d.stats || {}) };
    d.settings = { ...n.settings, ...(d.settings || {}) };
    d.equip = { ...n.equip, ...(d.equip || {}) };
  }
  return d;
}

const byId = Object.fromEntries([...ITEMS, ...PETS].map(x => [x.id, x]));
export const itemById = id => byId[id];

export function adminDevice() { try { return localStorage.getItem('erquest.admin') === '1'; } catch (_) { return false; } }
export function setAdminDevice(on) { try { on ? localStorage.setItem('erquest.admin', '1') : localStorage.removeItem('erquest.admin'); } catch (_) {} }

export function owns(s, id) {
  if (s.admin || adminDevice()) return true;
  const it = byId[id];
  if (!it) return false;
  return PETS.includes(it) ? s.owned.pets.includes(id) : s.owned.items.includes(id);
}

export function equipFor(s) {
  const eq = {};
  for (const [slot, id] of Object.entries(s.equip || {})) {
    if (!id) continue;
    const it = byId[id];
    if (!it) continue;
    eq[slot] = slot === 'head' ? it.head : slot === 'chest' ? { px: it.px } : { color: it.color, extra: it.extra };
  }
  return eq;
}

const wearing = (s, id) => Object.values(s.equip || {}).includes(id);
export const fx = {
  coinMult: s => (s.pet === 'pet_ab' ? 1.1 : 1) * (s.pet === 'pet_dragon' ? 1.2 : 1),
  energyMult: s => (s.pet === 'pet_lung' ? 0.8 : 1),
  energyMax: s => 100 + (wearing(s, 'ch_rainbow') ? 10 : 0),
  walkMult: s => (wearing(s, 'sh_wing') ? 1.5 : 1) * (SPEEDS.walk.find(w => w.key === s.settings?.walk)?.mult || 1),
  textMs: s => SPEEDS.text.find(t => t.key === s.settings?.textSpeed)?.ms ?? 16,
  ecgAnim: s => s.pet === 'pet_heart',
  goldSteth: s => wearing(s, 'st_gold'),
  neuron: s => s.pet === 'pet_neuron',
  chiefGlasses: s => wearing(s, 'hd_chief'),
  ecgStrip: s => s.pet === 'pet_ecg',
  pocus: s => s.pet === 'pet_pocus',
  aura: s => s.pet === 'pet_dragon',
  freeCoffee: s => wearing(s, 'sc_glow'),
};

// ---------- 白袍幣 ----------
const BASE = { S: 50, A: 30, B: 20, C: 5, F: 0 };
export function coinsForCase(s, res, prevBest) {
  let c = BASE[res.grade] || 0;
  const lines = [];
  if (c) lines.push(`評價 ${res.grade}：+${c}`);
  if (res.passed && !(prevBest && ['S', 'A', 'B'].includes(prevBest))) { c += 30; lines.push('第一次通過：+30'); }
  if (res.passed && res.kf === 100 && res.deductions.length === 0) { c += 20; lines.push('零扣分：+20'); }
  if (prevBest === 'S') { c = Math.floor(c / 2); lines.push('重複練習已拿 S 的案例：減半'); }
  const m = fx.coinMult(s);
  if (m > 1 && c) { c = Math.round(c * m); lines.push(`寵物加成 ×${m}`); }
  return { coins: c, lines };
}

export function addCoins(s, n) { s.coins = (s.coins || 0) + n; }

// ---------- 成就 ----------
export const ACH_REWARD = {
  kf5: ['st_gold'], ipass5: ['sc_glow', 'b_ipass'], exam: ['hd_chief', 'b_exam'], days10: ['sh_wing'],
  ecg20: ['pet_ecg'], allA: ['pet_pocus'], redflag5: ['pet_dragon', 'b_redflag'],
  nodx10: ['b_nodx'], full5: ['b_full'], firstS: ['b_firsts'], all10: ['b_all10'], class5: ['b_class'],
};
const REWARD_NAME = id => byId[id]?.name || BADGES.find(b => b.id === id)?.name || id;

function grant(s, key) {
  s.flags = s.flags || {};
  const fk = 'ach_' + key;
  if (s.flags[fk]) return [];
  s.flags[fk] = true;
  const got = [];
  for (const id of ACH_REWARD[key]) {
    if (id.startsWith('b_')) { if (!s.badges.includes(id)) s.badges.push(id); }
    else if (PETS.some(p => p.id === id)) { if (!s.owned.pets.includes(id)) s.owned.pets.push(id); }
    else if (!s.owned.items.includes(id)) s.owned.items.push(id);
    got.push(REWARD_NAME(id));
  }
  return [`★ 成就達成：${UNLOCK_TEXT[key] || BADGES.find(b => ACH_REWARD[key].includes(b.id))?.desc || key}`, `獲得：${got.join('、')}`];
}

export function afterCase(s, res, isBoss) {
  const st = s.stats;
  const notes = [];
  st.redflagStreak = res.missedRedFlag ? 0 : st.redflagStreak + 1;
  st.kfStreak = res.kf === 100 ? st.kfStreak + 1 : 0;
  st.dxStreak = res.dxOk ? st.dxStreak + 1 : 0;
  if (res.ecgAt != null && res.ecgAt <= 10) st.ecgFast += 1;
  if (st.redflagStreak >= 5) notes.push(...grant(s, 'redflag5'));
  if (st.kfStreak >= 5) notes.push(...grant(s, 'kf5'));
  if (st.dxStreak >= 10) notes.push(...grant(s, 'nodx10'));
  if (st.ecgFast >= 20) notes.push(...grant(s, 'ecg20'));
  if (s.day === 1 && res.grade === 'S') notes.push(...grant(s, 'firstS'));
  if (isBoss && res.passed) notes.push(...grant(s, 'exam'));
  const best = id => s.cases[id]?.best;
  if (CLERK_CASES.every(id => ['S', 'A', 'B'].includes(best(id)))) notes.push(...grant(s, 'all10'));
  if (CLERK_CASES.every(id => ['S', 'A'].includes(best(id)))) notes.push(...grant(s, 'allA'));
  return notes;
}

export function afterIpass(s, score) {
  if (score === 100) s.stats.ipassPerfect += 1;
  return s.stats.ipassPerfect >= 5 ? grant(s, 'ipass5') : [];
}

export function afterDay(s) {
  const notes = [];
  s.stats.daysWorked += 1;
  const list = s.shift?.list || [];
  const full = list.length && list.every(x => ['S', 'A'].includes(x.grade));
  if (full) {
    const c = Math.round(30 * fx.coinMult(s));
    addCoins(s, c);
    notes.push(`全勤獎（兩位病人都 A 以上）：+${c} 白袍幣`);
    s.stats.fullDayStreak += 1;
  } else s.stats.fullDayStreak = 0;
  if (s.stats.fullDayStreak >= 5) notes.push(...grant(s, 'full5'));
  if (s.stats.daysWorked >= 10) notes.push(...grant(s, 'days10'));
  return notes;
}

export function afterClassroom(s) {
  s.stats.classroom += 1;
  return s.stats.classroom >= 5 ? grant(s, 'class5') : [];
}

// ---------- 每日 ----------
export function dailyReset(s) {
  if (s.daily.day === s.day) return;
  s.daily = { day: s.day, freeCoffee: false, wbcBonus: false, procs: 0 };
}

// 福利社每日特賣：依天數固定亂數，6 件尚未擁有的商品
export function dailyStock(s) {
  let seed = (s.day * 9301 + 49297) % 233280;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const pool = ITEMS.filter(i => i.price && !s.owned.items.includes(i.id));
  const out = [];
  while (pool.length && out.length < 6) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

export async function checkAdmin(code) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    return hex === ADMIN_HASH;
  } catch (_) { return false; }
}
