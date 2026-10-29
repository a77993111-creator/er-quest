// 急診物語 — Clerk 篇引擎：推理值、關鍵特徵（Key features）、Mini-CEX、升等考
import { PE_ITEMS, LAB_ITEMS, PE_LABEL, LAB_LABEL } from './clerkMenus.js';

const PEN = { xq: 3, xpe: 5, xlab: 5, missQ: 8, missRF: 15, missPE: 10, missLab: 8, missDdx: 5, overTime: 5, bossNext: 20, bossQ: 10 };
const EXP = { S: 100, A: 80, B: 60, C: 40, F: 15 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class ClerkEngine {
  constructor(data, opts = {}) {
    this.d = data;
    this.patient = { ...data.patient, ...(opts.variant || {}) };
    this.v0 = { ...data.vitals, ...(opts.vitals || {}) };
    this.t = 0;
    this.energy = opts.energy ?? 100;
    this.asked = new Set();
    this.peDone = new Set();
    this.labsDone = new Set();
    this.live = [];          // 即時扣分 { text, pts }
    this.log = [];
    this.boss = data.boss || null;
    this.S = this.boss ? this.boss.startS : 100;
    this.bossAlarm = false;
    this.ended = null;
    this.fatigueWarned = false;
  }

  // ---------- 查詢 ----------
  score() { return clamp(100 - this.live.reduce((a, x) => a + x.pts, 0), 0, 100); }

  vitals() {
    const v = { ...this.v0 };
    if (this.boss && this.S < 70) {
      const drop = Math.round((70 - this.S) * 0.9);
      v.sbp -= drop; v.dbp -= Math.round(drop * 0.6); v.spo2 -= Math.round(drop / 8);
    }
    return v;
  }

  vitalsText() {
    const v = this.vitals();
    return `HR ${v.hr}${v.note ? `（${v.note}）` : ''}、BP ${v.sbp}/${v.dbp}、RR ${v.rr}、SpO₂ ${v.spo2}%、T ${v.t}℃`;
  }

  historyList() {
    return this.d.history.map((h, i) => ({ i, label: h[0], done: this.asked.has(i) }));
  }
  peList() { return PE_ITEMS.map(p => ({ id: p.id, label: p.label, done: this.peDone.has(p.id) })); }
  labList() { return LAB_ITEMS.map(l => ({ id: l.id, label: l.label, time: l.time, done: this.labsDone.has(l.id) })); }

  // ---------- 動作 ----------
  ask(i) {
    const [label, q, a, cls] = this.d.history[i];
    if (this.asked.has(i)) return this._out([`你：「${q}」`, a, '（剛剛問過了）'], 0);
    this.asked.add(i);
    this.log.push({ t: this.t, label: `問：${label}` });
    const ev = this._spend(1, 1);
    let pen = 0;
    if (cls === 'X') { pen = PEN.xq; this.live.push({ text: `問了無關的問題：${label}`, pts: pen }); }
    return this._out([`你：「${q}」`, a], pen, ev);
  }

  exam(pid) {
    const entry = this.d.pe[pid];
    const isX = (this.d.peX || []).includes(pid);
    let text = entry ? entry[0] : '無特殊發現。';
    if (pid === 'P1' && !entry) text = this.vitalsText();
    const lines = [`【${PE_LABEL[pid]}】`, text];
    if (this.peDone.has(pid)) return this._out(lines, 0);
    this.peDone.add(pid);
    this.log.push({ t: this.t, label: `PE：${PE_LABEL[pid]}` });
    const ev = this._spend(1, 1);
    let pen = 0;
    if (isX) { pen = PEN.xpe; this.live.push({ text: `做了無關的檢查：${PE_LABEL[pid]}`, pts: pen }); }
    return this._out(lines, pen, ev);
  }

  order(lid) {
    const item = LAB_ITEMS.find(l => l.id === lid);
    const entry = this.d.labs[lid];
    const isX = (this.d.labX || []).includes(lid);
    const result = entry ? entry[0] : item.def;
    if (this.labsDone.has(lid)) return this._out([`【${item.label}】`, result, '（已經開過了）'], 0);
    this.labsDone.add(lid);
    this.log.push({ t: this.t, label: `開：${item.label}` });
    const pre = lid === 'CXR' ? ['學長幫你開了 CXR，推去照相…'] : [];
    const ev = this._spend(item.time, 2);
    let pen = 0;
    if (isX) { pen = PEN.xlab; this.live.push({ text: `開了不必要的檢驗：${item.label}`, pts: pen }); }
    return this._out([...pre, `【${item.label}】`, result], pen, ev);
  }

  _spend(min, energy) {
    this.energy = Math.max(0, this.energy - energy);
    const events = [];
    let m = min;
    if (this.energy < 20) {
      m += 1;
      if (!this.fatigueWarned) { this.fatigueWarned = true; events.push({ type: 'say', lines: ['你有點累了，動作變慢…（精神值低：每個動作多 1 分鐘）'] }); }
    }
    for (let k = 0; k < m && !this.ended; k++) {
      this.t += 1;
      if (this.boss && !this.labsDone.has('ECG') && this.t > this.boss.ecgDeadline) {
        this.S -= this.boss.dropPerMin;
        if (!this.bossAlarm && this.S < 60) {
          this.bossAlarm = true;
          events.push({ type: 'alarm', lines: ['※ 病人臉色越來越差，冷汗直流！', `血壓降到 ${this.vitals().sbp}/${this.vitals().dbp}…`] });
        }
        if (this.S <= this.boss.failS) {
          this.ended = { result: 'fail', reason: 'takeover' };
          events.push({ type: 'alarm', lines: ['主治衝了過來：「病人血壓掉了！ECG 呢？！」', '主治接手了病人…'] });
        }
      }
    }
    return events;
  }

  _out(lines, penalty, events = []) {
    return { lines, penalty, events, ended: this.ended };
  }

  // ---------- 報告與結算 ----------
  ddxPool() {
    const set = new Set([...this.d.dx.slice(1), ...this.d.mustDdx]);
    return [...set];
  }

  report({ dx, ddx = [], next = null, answers = [] }) {
    const d = this.d;
    const deductions = [...this.live];
    const missed = [];
    const goods = [];

    // 問診
    const kq = d.history.map((h, i) => ({ h, i })).filter(x => x.h[3] === 'K' || x.h[3] === 'RF');
    let kqDone = 0;
    for (const { h, i } of kq) {
      if (this.asked.has(i)) { kqDone++; goods.push(`問到：${h[0]}`); }
      else {
        const pts = h[3] === 'RF' ? PEN.missRF : PEN.missQ;
        deductions.push({ text: `漏問${h[3] === 'RF' ? ' Red flag' : ''}：${h[0]}`, pts });
        missed.push(h[0]);
      }
    }
    const xq = [...this.asked].filter(i => d.history[i][3] === 'X').length;

    // 理學檢查
    const kpe = Object.entries(d.pe).filter(([, v]) => v[1] === 'K').map(([k]) => k);
    let kpeDone = 0;
    for (const p of kpe) {
      if (this.peDone.has(p)) { kpeDone++; goods.push(`檢查到：${PE_LABEL[p]}`); }
      else { deductions.push({ text: `漏做關鍵 PE：${PE_LABEL[p]}`, pts: PEN.missPE }); missed.push(PE_LABEL[p]); }
    }
    const xpe = [...this.peDone].filter(p => (d.peX || []).includes(p)).length;

    // 檢驗
    const nlab = Object.entries(d.labs).filter(([, v]) => v[1] === 'N').map(([k]) => k);
    let nlabDone = 0;
    for (const l of nlab) {
      if (this.labsDone.has(l)) { nlabDone++; goods.push(`開了：${LAB_LABEL[l]}`); }
      else { deductions.push({ text: `漏開必要檢驗：${LAB_LABEL[l]}`, pts: PEN.missLab }); missed.push(LAB_LABEL[l]); }
    }
    const xlab = [...this.labsDone].filter(l => (d.labX || []).includes(l)).length;

    // 診斷
    const dxOk = dx === d.dx[0];
    const missDdx = d.mustDdx.filter(m => !ddx.includes(m));
    missDdx.forEach(m => deductions.push({ text: `DDx 漏了必排除診斷：${m}`, pts: PEN.missDdx }));
    if (dxOk) goods.push(`主診斷正確：${d.dx[0]}`);

    // 時間
    if (this.t > d.target) deductions.push({ text: `超過目標時間（${this.t} / ${d.target} 分）`, pts: PEN.overTime });

    // 升等考
    let bossNextOk = true, bossQOk = 0;
    if (this.boss) {
      bossNextOk = next === this.boss.next[0];
      if (!bossNextOk) deductions.push({ text: `下一步錯誤：${next || '未選擇'}`, pts: PEN.bossNext });
      else goods.push('下一步正確：啟動 STEMI 流程');
      this.boss.questions.forEach((q, k) => {
        if (answers[k] === q.options[0]) bossQOk++;
        else deductions.push({ text: `考官追問答錯：${q.q}`, pts: PEN.bossQ });
      });
    }

    const kfTotal = kq.length + kpe.length + nlab.length;
    const kfDone = kqDone + kpeDone + nlabDone;
    const kf = kfTotal ? kfDone / kfTotal : 1;
    const score = clamp(100 - deductions.reduce((a, x) => a + x.pts, 0), 0, 100);
    const bossFail = this.ended?.reason === 'takeover';
    let grade;
    if (!dxOk || bossFail) grade = 'F';
    else if (score >= 90 && kf === 1) grade = 'S';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else grade = 'F';
    if (kf < 0.8 && ['S', 'A', 'B'].includes(grade)) grade = 'C';
    const passed = grade !== 'F' && kf >= 0.8;

    const r1 = x => clamp(Math.round(x), 1, 9);
    const minicex = {
      hx: r1(1 + 8 * (kq.length ? kqDone / kq.length : 1) - Math.min(3, xq)),
      pe: r1(1 + 8 * (kpe.length ? kpeDone / kpe.length : 1) - Math.min(3, xpe)),
      judg: r1((dxOk ? 9 : 2) - 2 * (nlab.length - nlabDone) - xlab - 2 * missDdx.length - (bossNextOk ? 0 : 3) - (this.boss ? this.boss.questions.length - bossQOk : 0)),
      eff: r1(this.t <= d.target * 0.7 ? 9 : this.t <= d.target ? 8 : this.t <= d.target * 1.3 ? 6 : 4),
      overall: r1(passed ? 1 + (score / 100) * 8 : Math.min(4, 1 + (score / 100) * 8)),
    };

    return {
      kind: 'clerk',
      caseId: d.id,
      win: passed,
      dxOk, grade, score, passed,
      kf: Math.round(kf * 100),
      exp: EXP[grade],
      reason: bossFail ? 'takeover' : (!dxOk ? 'dx' : null),
      chosenDx: dx,
      correctDx: d.dx[0],
      totalTime: this.t,
      target: d.target,
      goods,
      deductions,
      missed,
      minicex,
      energy: this.energy,
      log: this.log,
      bossAnswers: this.boss ? this.boss.questions.map((q, k) => ({ q: q.q, ok: answers[k] === q.options[0], explain: q.explain })) : null,
    };
  }
}

// 病人變體：再次出現時換姓名、年齡與生命徵象（關鍵特徵與診斷不變）
const SURNAMES = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾', '周', '廖', '徐', '蘇'];
export function makeVariant(data, rnd = Math.random) {
  const p = data.patient;
  const span = p.age < 30 ? 3 : 5;
  const age = p.age + Math.round((rnd() * 2 - 1) * span);
  const sur = SURNAMES[Math.floor(rnd() * SURNAMES.length)];
  const title = p.sex === '男'
    ? (age < 25 ? '同學' : age >= 65 ? '伯伯' : '先生')
    : (age < 40 ? '小姐' : age >= 65 ? '奶奶' : '女士');
  const j = (v, d) => v + Math.round((rnd() * 2 - 1) * d);
  const v = data.vitals;
  return {
    variant: { name: sur + title, age },
    vitals: { hr: j(v.hr, 4), sbp: j(v.sbp, 6), dbp: j(v.dbp, 4), rr: v.rr, spo2: v.spo2, t: v.t },
  };
}

export function introFor(data, variant) {
  // 第一行為旁白（含姓名年齡），其餘照腳本
  if (!variant) return data.intro;
  const p = data.patient;
  return data.intro.map(l => l.split(p.name).join(variant.name).replace(`${p.age} 歲`, `${variant.age} 歲`));
}
