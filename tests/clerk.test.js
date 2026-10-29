// node tests/clerk.test.js — 用每個案例的「標準答案路徑」與幾條錯誤路徑測試 Clerk 引擎
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ClerkEngine, makeVariant, introFor } from '../src/engine/clerkEngine.js';
import { CLERK_CASES, BOSS_CASE, PE_ITEMS, LAB_ITEMS } from '../src/engine/clerkMenus.js';

const load = id => JSON.parse(readFileSync(new URL(`../data/cases/clerk/${id}.json`, import.meta.url)));
const results = [];
const t = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message]); } };

function optimal(d) {
  const e = new ClerkEngine(d);
  // 先開 ECG（升等考有時限），再問診、PE、其餘檢驗
  if (d.labs.ECG?.[1] === 'N') e.order('ECG');
  d.history.forEach((h, i) => { if (h[3] === 'K' || h[3] === 'RF') e.ask(i); });
  Object.entries(d.pe).forEach(([k, v]) => { if (v[1] === 'K') e.exam(k); });
  Object.entries(d.labs).forEach(([k, v]) => { if (v[1] === 'N' && k !== 'ECG') e.order(k); });
  const ddx = [...d.mustDdx, d.dx[1]].slice(0, 3);
  const res = e.report({ dx: d.dx[0], ddx, next: d.boss?.next[0], answers: d.boss?.questions.map(q => q.options[0]) || [] });
  return { e, res };
}

for (const id of [...CLERK_CASES, BOSS_CASE]) {
  const d = load(id);
  t(`${id}: data integrity`, () => {
    assert.equal(d.history.length, 12);
    for (const k of Object.keys(d.pe)) assert.ok(PE_ITEMS.some(p => p.id === k), 'pe ' + k);
    for (const k of [...Object.keys(d.labs), ...d.labX]) assert.ok(LAB_ITEMS.some(l => l.id === k), 'lab ' + k);
    for (const k of d.peX) assert.ok(!d.pe[k], 'peX overlaps ' + k);
    assert.equal(new Set(d.dx).size, 5);
    if (!d.boss) assert.ok(d.ipass && d.ipass.I.length >= 3 && d.ipass.err.length >= 3, 'ipass');
  });
  t(`${id}: optimal path → S, within target time`, () => {
    const { e, res } = optimal(d);
    assert.equal(res.grade, 'S', JSON.stringify({ score: res.score, kf: res.kf, ded: res.deductions }));
    assert.ok(e.t <= d.target, `time ${e.t} > target ${d.target}`);
    assert.equal(res.passed, true);
  });
  t(`${id}: wrong dx → F`, () => {
    const e = new ClerkEngine(d);
    const r = e.report({ dx: d.dx[1], ddx: [] });
    assert.equal(r.grade, 'F');
    assert.equal(r.passed, false);
  });
  t(`${id}: shotgun everything → not S, penalties applied`, () => {
    const e = new ClerkEngine(d);
    d.history.forEach((_, i) => e.ask(i));
    PE_ITEMS.forEach(p => e.exam(p.id));
    LAB_ITEMS.forEach(l => e.order(l.id));
    const r = e.report({ dx: d.dx[0], ddx: d.mustDdx, next: d.boss?.next[0], answers: d.boss?.questions.map(q => q.options[0]) || [] });
    assert.ok(r.score < 70, 'score ' + r.score);
    assert.notEqual(r.grade, 'S');
  });
  t(`${id}: variant keeps diagnosis, changes name`, () => {
    let i = 0; const seq = [0.1, 0.9, 0.3, 0.7, 0.5, 0.2];
    const v = makeVariant(d, () => seq[i++ % seq.length]);
    assert.notEqual(v.variant.name, d.patient.name);
    const intro = introFor(d, v.variant);
    assert.ok(intro.join('').includes(v.variant.name));
  });
}

t('boss: no ECG for a long time → takeover', () => {
  const d = load(BOSS_CASE);
  const e = new ClerkEngine(d);
  d.history.forEach((_, i) => e.ask(i));
  ['CBC', 'CHEM', 'LIP', 'LFT', 'GLU', 'CXR', 'TROP'].forEach(l => e.order(l));
  PE_ITEMS.forEach(p => e.exam(p.id));
  assert.ok(e.ended && e.ended.reason === 'takeover', 'S=' + e.S + ' t=' + e.t);
  const r = e.report({ dx: d.dx[0], ddx: d.mustDdx, next: d.boss.next[0], answers: [] });
  assert.equal(r.grade, 'F');
});

t('missing red flag costs 15', () => {
  const d = load('c01-af');
  const e = new ClerkEngine(d);
  const r = e.report({ dx: d.dx[0], ddx: d.mustDdx });
  assert.ok(r.deductions.some(x => x.pts === 15 && x.text.includes('Red flag')));
});

for (const r of results) console.log(r.join(' | '));
const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(`${results.length - fails}/${results.length} passed`);
if (fails) process.exit(1);
