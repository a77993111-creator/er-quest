// node tests/pgy.test.js — PGY 篇案例格式檢查＋最佳路徑＋常見錯誤路徑＋家屬代述
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ClerkEngine, makeProxy } from '../src/engine/clerkEngine.js';
import { PGY_CASES, PGY_BOSS, PGY_PE_ITEMS, PGY_LAB_ITEMS, PGY_TX_ITEMS, CLERK_CASES } from '../src/engine/clerkMenus.js';

const only = process.argv[2];
const ids = [...PGY_CASES, PGY_BOSS].filter(id => !only || id === only);
const path = id => new URL(`../data/cases/pgy/${id}.json`, import.meta.url);
const results = [];
const t = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message]); } };
const PE = new Set(PGY_PE_ITEMS.map(x => x.id)), LAB = new Set(PGY_LAB_ITEMS.map(x => x.id)), TX = new Set(PGY_TX_ITEMS.map(x => x.id));
const seeded = (n = 7) => () => ((n = (n * 16807) % 2147483647) / 2147483647);

function optimal(d, opts = {}) {
  const e = new ClerkEngine(d, opts);
  const ntx = Object.entries(d.tx).filter(([, v]) => v.cls === 'N').sort((a, b) => (a[1].deadline ?? 99) - (b[1].deadline ?? 99));
  for (const [id, v] of ntx) {
    for (const l of v.needs || []) if (!e.labsDone.has(l)) e.order(l);
    e.treat(id);
  }
  Object.entries(d.labs).forEach(([k, v]) => { if (v[1] === 'N' && !e.labsDone.has(k)) e.order(k); });
  d.history.forEach((h, i) => { if (h[3] === 'K' || h[3] === 'RF') e.ask(i); });
  Object.entries(d.pe).forEach(([k, v]) => { if (v[1] === 'K') e.exam(k); });
  if (opts.proxy) ['MED', 'CHART', 'EMS', 'PT'].forEach(s => { if (Object.values(opts.proxy.unsure).includes(s)) e.verify(s); });
  const ddx = [...d.mustDdx, ...d.dx.slice(1).filter(x => !d.mustDdx.includes(x))].slice(0, 3);
  const res = e.report({ dx: d.dx[0], ddx, dispo: d.dispo.options[0], answers: d.boss?.questions.map(q => q.options[0]) || [], next: d.boss?.next?.[0] });
  return { e, res };
}

for (const id of ids) {
  if (!existsSync(path(id))) { results.push(['FAIL', `${id}: file missing`]); continue; }
  const d = JSON.parse(readFileSync(path(id)));
  t(`${id}: schema`, () => {
    assert.equal(d.id, id); assert.equal(d.tier, 'pgy');
    for (const k of ['dex', 'patient', 'vitals', 'target', 'intro', 'history', 'pe', 'labs', 'tx', 'course', 'dx', 'mustDdx', 'dispo', 'trap', 'teaching', 'refs', 'ipass', 'pocus']) assert.ok(d[k] != null, `missing ${k}`);
    d.history.forEach(h => { assert.equal(h.length, 4); assert.ok(['K', 'RF', 'R', 'X'].includes(h[3]), h[0]); });
    assert.ok(d.history.some(h => h[3] === 'RF'), 'needs a red flag');
    assert.ok(d.history.filter(h => h[3] === 'X').length >= 2, 'needs ≥2 X questions');
    Object.keys(d.pe).forEach(k => assert.ok(PE.has(k), `PE ${k}`)); (d.peX || []).forEach(k => assert.ok(PE.has(k) && !d.pe[k], `peX ${k}`));
    Object.keys(d.labs).forEach(k => assert.ok(LAB.has(k), `lab ${k}`)); (d.labX || []).forEach(k => assert.ok(LAB.has(k) && !d.labs[k], `labX ${k}`));
    Object.entries(d.tx).forEach(([k, v]) => {
      assert.ok(TX.has(k), `tx ${k}`); assert.ok(['N', 'O', 'H'].includes(v.cls), `tx cls ${k}`); assert.ok(v.text, `tx text ${k}`);
      if (v.cls === 'H') assert.ok(v.why, `harm why ${k}`);
      (v.needs || []).forEach(l => assert.ok(LAB.has(l) && v.needsWhy, `needs ${k}`));
    });
    assert.ok(Object.values(d.tx).some(v => v.cls === 'N'), 'needs N tx');
    assert.ok(Object.values(d.tx).some(v => v.cls === 'H'), 'needs a harmful tx');
    const c = d.course; ['startS', 'dropPerMin', 'alarmS', 'failS', 'stabilizeBy', 'alarm', 'fail'].forEach(k => assert.ok(c[k] != null, `course.${k}`));
    c.stabilizeBy.forEach(k => assert.equal(d.tx[k]?.cls, 'N', `stabilizeBy ${k} must be N`));
    d.mustDdx.forEach(m => assert.ok(d.dx.includes(m), `mustDdx ${m}`));
    assert.equal(new Set(d.dx).size, d.dx.length);
    assert.equal(d.dispo.options.length, 4); assert.ok(d.dispo.explain);
    ['I', 'P', 'A', 'S', 'err'].forEach(k => assert.equal(d.ipass[k].length, 3, `ipass.${k}`)); assert.ok(d.ipass.said);
    assert.ok(d.refs.length >= 1 && d.teaching.length >= 3);
    if (d.proxy?.conflict) { const q = d.history[d.proxy.conflict.q]; assert.ok(q && ['K', 'RF'].includes(q[3]), 'conflict must be K/RF'); }
    if (d.boss) d.boss.questions.forEach(q => { assert.ok(q.options.length >= 3 && q.explain); });
  });
  t(`${id}: optimal path → S, not taken over`, () => {
    const { e, res } = optimal(d);
    assert.equal(e.ended, null, 'takeover');
    assert.equal(res.grade, 'S', `grade ${res.grade} score ${res.score} kf ${res.kf} t ${res.totalTime}/${d.target} ${JSON.stringify(res.deductions)}`);
  });
  t(`${id}: doing nothing leads to takeover`, () => {
    const e = new ClerkEngine(d);
    for (let k = 0; k < 120 && !e.ended; k++) e._spend(1, 0);
    assert.ok(e.ended?.reason === 'takeover', `S=${e.S}`);
  });
  t(`${id}: harmful treatment is penalised`, () => {
    const [hid] = Object.entries(d.tx).find(([, v]) => v.cls === 'H');
    const e = new ClerkEngine(d); const r = e.treat(hid);
    assert.ok(r.penalty >= 15);
  });
  t(`${id}: skipping a necessary treatment → not S`, () => {
    const [nid] = Object.entries(d.tx).find(([, v]) => v.cls === 'N');
    const e = new ClerkEngine(d);
    Object.entries(d.tx).filter(([k, v]) => v.cls === 'N' && k !== nid).forEach(([k, v]) => { (v.needs || []).forEach(l => e.order(l)); e.treat(k); });
    const r2 = e.report({ dx: d.dx[0], ddx: d.mustDdx, dispo: d.dispo.options[0] });
    assert.notEqual(r2.grade, 'S');
  });
  t(`${id}: wrong disposition costs points`, () => {
    const e = new ClerkEngine(d); const r = e.report({ dx: d.dx[0], ddx: d.mustDdx, dispo: d.dispo.options[1] });
    assert.ok(r.deductions.some(x => x.text.startsWith('Disposition')));
  });
  t(`${id}: proxy — optimal + verification still S`, () => {
    const px = makeProxy(d, seeded(3));
    const { res } = optimal(d, { proxy: px });
    assert.equal(res.grade, 'S', JSON.stringify(res.deductions));
  });
  if (d.proxy?.conflict) t(`${id}: proxy conflict unverified → deduction`, () => {
    const px = makeProxy(d, seeded(5));
    const e = new ClerkEngine(d, { proxy: px });
    e.ask(d.proxy.conflict.q);
    const r = e.report({ dx: d.dx[0], ddx: d.mustDdx, dispo: d.dispo.options[0] });
    assert.ok(r.deductions.some(x => x.text.includes('沒有查證家屬說法')));
  });
}

t('proxy works on every Clerk case too', () => {
  for (const id of CLERK_CASES) {
    const d = JSON.parse(readFileSync(new URL(`../data/cases/clerk/${id}.json`, import.meta.url)));
    const px = makeProxy(d, seeded(11));
    const e = new ClerkEngine(d, { proxy: px });
    d.history.forEach((h, i) => e.ask(i));
    const unsure = Object.keys(px.unsure).map(Number);
    assert.ok(unsure.length >= 1, id);
    const r0 = e.report({ dx: d.dx[0], ddx: d.mustDdx });
    assert.ok(r0.deductions.some(x => x.text.startsWith('家屬不確定')) || unsure.every(i => d.history[i][3] === 'R'), id);
    ['MED', 'CHART', 'EMS', 'PT'].forEach(s => e.verify(s));
    unsure.forEach(i => assert.ok(e.verified.has(i), `${id} verify ${i}`));
  }
});

for (const r of results) console.log(r.join(' | '));
const fail = results.filter(r => r[0] === 'FAIL').length;
console.log(`${results.length - fail}/${results.length} passed`);
if (fail) process.exit(1);
