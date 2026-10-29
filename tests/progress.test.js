// node tests/progress.test.js — 白袍幣、成就、存檔遷移、裝備功能
import assert from 'node:assert/strict';
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
const P = await import('../src/progress.js');
const { ITEMS, PETS } = await import('../src/cosmetics.js');
const { CLERK_CASES } = await import('../src/engine/clerkMenus.js');

const results = [];
const t = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message]); } };
const fresh = () => ({ ...P.defaultV3(), v: 3, day: 1, cases: {}, flags: {}, shift: null });
const res = (o = {}) => ({ grade: 'A', passed: true, kf: 100, deductions: [], missedRedFlag: false, dxOk: true, ecgAt: null, ...o });

await t('v2 save migrates to v3 and keeps progress', () => {
  const d = P.migrate({ v: 2, exp: 420, day: 6, rank: 'clerk', cases: { 'c01-af': { best: 'A' } } });
  assert.equal(d.v, 3); assert.equal(d.exp, 420); assert.equal(d.day, 6);
  assert.equal(d.coins, 0); assert.deepEqual(d.owned, { items: [], pets: [] }); assert.equal(d.settings.textSpeed, 'mid');
});
await t('coins: first S with zero deductions = 50+30+20', () => {
  assert.equal(P.coinsForCase(fresh(), res({ grade: 'S' }), null).coins, 100);
});
await t('coins: replaying an S case is halved, no first-pass bonus', () => {
  assert.equal(P.coinsForCase(fresh(), res({ grade: 'S' }), 'S').coins, 35);
});
await t('coins: failed case gives 0', () => {
  assert.equal(P.coinsForCase(fresh(), res({ grade: 'F', passed: false, kf: 40, deductions: [{}] }), null).coins, 0);
});
await t('coins: pet multipliers', () => {
  const s = fresh(); s.pet = 'pet_dragon';
  assert.equal(P.coinsForCase(s, res({ grade: 'B', kf: 80, deductions: [{}] }), 'B').coins, 24);
});
await t('5 cases without missed red flag unlock 聽診龍 + badge once', () => {
  const s = fresh(); let notes = [];
  for (let i = 0; i < 6; i++) notes.push(...P.afterCase(s, res(), false));
  assert.ok(s.owned.pets.includes('pet_dragon')); assert.ok(s.badges.includes('b_redflag'));
  assert.equal(notes.filter(n => n.includes('聽診龍')).length, 1);
});
await t('missed red flag resets streak', () => {
  const s = fresh();
  for (let i = 0; i < 4; i++) P.afterCase(s, res(), false);
  P.afterCase(s, res({ missedRedFlag: true }), false);
  assert.equal(s.stats.redflagStreak, 0); assert.ok(!s.owned.pets.includes('pet_dragon'));
});
await t('boss pass unlocks 主任眼鏡', () => {
  const s = fresh(); P.afterCase(s, res(), true); assert.ok(s.owned.items.includes('hd_chief'));
});
await t('all 10 A → POCUS 豚', () => {
  const s = fresh(); CLERK_CASES.forEach(id => (s.cases[id] = { best: 'A' }));
  P.afterCase(s, res(), false); assert.ok(s.owned.pets.includes('pet_pocus'));
});
await t('legendary items are never purchasable', () => {
  [...ITEMS, ...PETS].filter(x => x.rarity === 'L').forEach(x => { assert.ok(x.unlock && !x.price, x.id); });
  [...ITEMS, ...PETS].filter(x => x.rarity !== 'L').forEach(x => assert.ok(x.price > 0, x.id));
});
await t('every unlock key has a reward and text', () => {
  [...ITEMS, ...PETS].filter(x => x.unlock).forEach(x => assert.ok(P.ACH_REWARD[x.unlock]?.includes(x.id), x.id));
});
await t('fx: energy max and walk speed from equipment', () => {
  const s = fresh(); s.equip.chest = 'ch_rainbow'; s.equip.shoes = 'sh_wing'; s.settings.walk = 'fast';
  assert.equal(P.fx.energyMax(s), 110); assert.ok(Math.abs(P.fx.walkMult(s) - 2.1) < 1e-9);
});
await t('fx never touches scoring: no fx name mentions score/hint', () => {
  assert.ok(!Object.keys(P.fx).some(k => /score|hint|dept|exam/i.test(k)));
});
await t('owns: admin device unlocks all', () => {
  const s = fresh(); assert.equal(P.owns(s, 'pet_dragon'), false);
  P.setAdminDevice(true); assert.equal(P.owns(s, 'pet_dragon'), true); P.setAdminDevice(false);
});
await t('admin code check rejects wrong code', async () => {
  assert.equal(await P.checkAdmin('wrong'), false);
});
await t('full attendance day bonus', () => {
  const s = fresh(); s.shift = { list: [{ grade: 'S' }, { grade: 'A' }] };
  const n = P.afterDay(s); assert.equal(s.coins, 30); assert.ok(n[0].includes('全勤'));
});

for (const r of results) console.log(r.join(' | '));
const fail = results.filter(r => r[0] === 'FAIL').length;
console.log(`${results.length - fail}/${results.length} passed`);
if (fail) process.exit(1);
