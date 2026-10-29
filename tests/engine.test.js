// node tests/engine.test.js — 模擬多條遊玩路徑，確認引擎與案例資料正確
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { CaseEngine } from '../src/engine/caseEngine.js';

const data = JSON.parse(readFileSync(new URL('../data/cases/tension-ptx.json', import.meta.url)));

function play(mode, script, opts) {
  const e = new CaseEngine(data, mode, opts);
  const all = [];
  for (const step of script) {
    const [id, ...choices] = Array.isArray(step) ? step : [step];
    let r = e.start(id);
    all.push(...r.events);
    for (const c of choices) {
      assert.ok(r.choice, `${id} expected a choice`);
      r = e.choose(c);
      all.push(...r.events);
    }
    assert.equal(r.choice, null, `${id} left a pending choice`);
    if (e.ended) break;
  }
  return { e, res: e.result(), all };
}

const results = [];
function t(name, fn) {
  try { fn(); results.push(['PASS', name]); } catch (err) { results.push(['FAIL', name, err.message]); }
}

// 所有 action 都能被找到、且每個選項都可執行（不 throw）
t('every action runs in both modes', () => {
  for (const mode of ['clerk', 'resident']) {
    for (const cat of ['history', 'pe', 'order', 'treat']) {
      const e0 = new CaseEngine(data, mode);
      for (const a of e0.actions(cat)) {
        const e = new CaseEngine(data, mode);
        let r = e.start(a.id);
        let guard = 0;
        while (r.choice && guard++ < 5) r = e.choose(0);
        assert.equal(r.choice, null);
      }
    }
  }
});

t('resident optimal path → S', () => {
  const { res } = play('resident', ['p_ausc', 'p_percuss', 't_o2', ['t_needle', 0], 't_iv', ['t_tube', 0], ['t_dispo', 0]]);
  assert.equal(res.win, true);
  assert.equal(res.grade, 'S', JSON.stringify(res));
  assert.ok(res.decompressAt <= 10);
});

t('resident CT trap → fail', () => {
  const { res } = play('resident', ['p_ausc', 'o_ct']);
  assert.equal(res.win, false);
  assert.equal(res.reason, 'ct');
});

t('resident intubate before decompression → big drop / alarms', () => {
  const { e, all } = play('resident', ['t_intubate']);
  assert.ok(e.S < 30, 'S=' + e.S);
  assert.ok(all.some(x => x.type === 'alarm'));
});

t('resident dawdling → arrest', () => {
  const { res } = play('resident', ['h_mech', 'h_onset', 'h_pmh', 'h_ample', 'o_ecg', 'o_abg', 'o_lab', 'o_cxr', 'o_cxr', 'p_vs', 'p_vs']);
  assert.equal(res.win, false);
  assert.equal(res.reason, 'arrest');
});

t('resident needle then no tube → recurrence timer fires', () => {
  const { e, all } = play('resident', ['p_ausc', ['t_needle', 0], 'o_ecg', 'o_abg', 'o_abg', 'o_cxr', 'o_lab', 'p_vs', 'p_vs', 'p_vs']);
  assert.ok(e.flags.has('recur'), 'recur flag');
  assert.ok(all.some(x => x.type === 'fx' && x.name === 'alarm'));
});

t('resident wrong side needle', () => {
  const { e, res } = play('resident', [['t_needle', 2]]);
  assert.ok(!e.flags.has('decompressed'));
  assert.ok(res.mistakes.some(m => m.includes('穿錯邊')));
});

t('resident discharge → fail', () => {
  const { res } = play('resident', [['t_needle', 0], ['t_tube', 0], ['t_dispo', 2]]);
  assert.equal(res.win, false);
});

t('clerk good presentation → S/A', () => {
  const { res } = play('clerk', ['h_mech', 'p_ausc', 'p_percuss', 't_o2_c', ['t_present', 0, 0]]);
  assert.equal(res.win, true);
  assert.ok(['S', 'A'].includes(res.grade), JSON.stringify(res));
});

t('clerk thin evidence → win lower grade', () => {
  const { res } = play('clerk', [['t_present', 0, 0]]);
  assert.equal(res.win, true);
  assert.ok(['B', 'C'].includes(res.grade), res.grade + ' ' + res.score);
});

t('clerk wrong dx → fail', () => {
  const { res } = play('clerk', ['p_ausc', ['t_present', 1, 0]]);
  assert.equal(res.win, false);
  assert.equal(res.reason, 'present');
});

t('clerk dawdling → senior takeover', () => {
  const ids = ['h_mech', 'h_onset', 'h_pmh', 'h_ample', 'o_ecg', 'o_abg', 'o_lab', 'o_cxr', 'o_cxr', 'o_cxr', 'o_cxr', 'o_cxr', 'o_cxr'];
  const { res } = play('clerk', ids);
  assert.equal(res.win, false);
  assert.equal(res.reason, 'takeover');
});

t('vitals interpolate sanely', () => {
  const e = new CaseEngine(data, 'resident');
  const v = e.vitals();
  assert.equal(v.sbp, 104);
  e.S = 47.5; const v2 = e.vitals();
  assert.ok(v2.sbp < 90 && v2.sbp > 80);
});

t('fatigue adds time when energy low', () => {
  const e = new CaseEngine(data, 'resident', { energy: 10 });
  const r = e.start('p_ausc');
  assert.equal(e.t, 2);
  assert.ok(r.events.some(x => x.type === 'say' && x.lines[0].includes('累')));
});

for (const r of results) console.log(r.join(' | '));
if (results.some(r => r[0] === 'FAIL')) process.exit(1);
