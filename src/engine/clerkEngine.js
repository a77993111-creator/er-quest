// 急診物語 — 看診引擎：推理值、關鍵特徵（Key features）、Mini-CEX、升等考
// Clerk 篇：問診／PE／檢驗；PGY 篇（tier: 'pgy'）再加上處置、病程變化與 Disposition
// 家屬代述（proxy）：問診對象改為家屬，部分答案需要查證
import {
  PE_ITEMS, LAB_ITEMS, PE_LABEL, LAB_LABEL,
  PGY_PE_ITEMS, PGY_LAB_ITEMS, PGY_PE_LABEL, PGY_LAB_LABEL, PGY_TX_ITEMS, TX_LABEL, VERIFY_SOURCES,
} from './clerkMenus.js';

const PEN = {
  xq: 3, xpe: 5, xlab: 5, missQ: 8, missRF: 15, missPE: 10, missLab: 8, missDdx: 5, overTime: 5, bossNext: 20, bossQ: 10,
  xtx: 5, harm: 15, needs: 10, missTx: 10, lateTx: 5, dispo: 10, comm: 5, conflict: 8,
};
const EXP = { S: 100, A: 80, B: 60, C: 40, F: 15 };
const EXP_PGY = { S: 150, A: 120, B: 90, C: 60, F: 20 };
const SRC_LABEL = Object.fromEntries(VERIFY_SOURCES.map(v => [v.id, v.label]));
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
    this.energyMult = opts.energyMult ?? 1;
    this.ecgAt = null;
    // PGY
    this.pgy = data.tier === 'pgy';
    this.peItems = this.pgy ? PGY_PE_ITEMS : PE_ITEMS;
    this.labItems = this.pgy ? PGY_LAB_ITEMS : LAB_ITEMS;
    this.peLabel = this.pgy ? PGY_PE_LABEL : PE_LABEL;
    this.labLabel = this.pgy ? PGY_LAB_LABEL : LAB_LABEL;
    this.course = data.course || null;
    if (this.course && !this.boss?.ecgDeadline) this.S = this.course.startS;
    this.txDone = new Map();   // id → 給藥時間
    this.txFx = {};
    this.stable = !this.course;
    this.courseAlarm = false;
    // 家屬代述
    this.proxy = opts.proxy || null;
    this.verified = new Set();
    this.srcUsed = new Set();
  }

  // ---------- 查詢 ----------
  score() { return clamp(100 - this.live.reduce((a, x) => a + x.pts, 0), 0, 100); }

  vitals() {
    const v = { ...this.v0 };
    for (const [k, d] of Object.entries(this.txFx)) if (typeof v[k] === 'number') v[k] = Math.round((v[k] + d) * 10) / 10;
    if ((this.boss || this.course) && this.S < 70) {
      const drop = Math.round((70 - this.S) * 0.9);
      v.sbp -= drop; v.dbp -= Math.round(drop * 0.6); v.spo2 -= Math.round(drop / 8); v.hr += Math.round(drop / 3);
    }
    v.spo2 = clamp(Math.round(v.spo2), 50, 100);
    v.sbp = Math.max(40, Math.round(v.sbp)); v.dbp = Math.max(20, Math.round(v.dbp)); v.hr = Math.round(v.hr);
    return v;
  }

  vitalsText() {
    const v = this.vitals();
    return `HR ${v.hr}${v.note ? `（${v.note}）` : ''}、BP ${v.sbp}/${v.dbp}、RR ${v.rr}、SpO₂ ${v.spo2}%、T ${v.t}℃`;
  }

  historyList() {
    return this.d.history.map((h, i) => ({ i, label: h[0], done: this.asked.has(i) }));
  }
  peList() { return this.peItems.map(p => ({ id: p.id, label: p.label, done: this.peDone.has(p.id) })); }
  labList() { return this.labItems.map(l => ({ id: l.id, label: l.label, time: l.time, done: this.labsDone.has(l.id) })); }
  txList() { return PGY_TX_ITEMS.map(t => ({ id: t.id, label: t.label, time: t.time || 1, done: this.txDone.has(t.id) })); }
  verifyList() { return VERIFY_SOURCES.map(v => ({ ...v, done: this.srcUsed.has(v.id) })); }

  // ---------- 動作 ----------
  // 家屬代述時的回答
  answerOf(i) {
    const a = this.d.history[i][2];
    const px = this.proxy;
    if (!px) return a;
    if (px.unsure[i] && !this.verified.has(i)) return `${px.who}：${px.says[i]}`;
    return `${px.who}：${proxyVoice(a, this.patient.sex)}`;
  }

  ask(i) {
    const [label, q, , cls] = this.d.history[i];
    const you = this.proxy ? `你（問${this.proxy.who}）：「${q}」` : `你：「${q}」`;
    if (this.asked.has(i)) return this._out([you, this.answerOf(i), '（剛剛問過了）'], 0);
    this.asked.add(i);
    this.log.push({ t: this.t, label: `問：${label}` });
    const ev = this._spend(1, 1);
    let pen = 0;
    if (cls === 'X') { pen = PEN.xq; this.live.push({ text: `問了無關的問題：${label}`, pts: pen }); }
    const lines = [you, this.answerOf(i)];
    if (this.proxy?.unsure[i] && !this.verified.has(i)) lines.push(`（家屬說法不確定，可以用「查證」確認：${SRC_LABEL[this.proxy.unsure[i]]}）`);
    return this._out(lines, pen, ev);
  }

  // 查證：藥袋／雲端藥歷、過去病歷、救護紀錄、再問病人
  verify(src) {
    const item = VERIFY_SOURCES.find(v => v.id === src);
    const px = this.proxy;
    const lines = [`【查證：${item.label}】`];
    const first = !this.srcUsed.has(src);
    this.srcUsed.add(src);
    const ev = first ? this._spend(item.time, 1) : [];
    if (first) this.log.push({ t: this.t, label: `查證：${item.label}` });
    const hits = px ? Object.entries(px.unsure).filter(([, s]) => s === src).map(([i]) => +i) : [];
    if (!hits.length) lines.push('沒有找到新的資訊。');
    for (const i of hits) {
      this.verified.add(i);
      this.asked.add(i);
      const truth = px.truth[i] || (src === 'PT' ? `病人：${this.d.history[i][2]}` : proxyVoice(this.d.history[i][2], this.patient.sex));
      lines.push(`${this.d.history[i][0]}：${truth}`);
      if (px.conflict === i) lines.push(`※ 跟${px.who}剛才說的不一樣！`);
    }
    return this._out(lines, 0, ev);
  }

  // 家屬溝通（開場、說明病情）：ok = 是否選到同理、清楚的說法
  comm(stage, ok) {
    if (ok) return;
    this.live.push({ text: stage === 'open' ? '家屬溝通：沒有先自我介紹、確認關係並同理家屬的擔心' : '向家屬說明：沒有清楚說明病情、計畫與下一步', pts: PEN.comm, comm: true });
  }

  exam(pid) {
    const entry = this.d.pe[pid];
    const isX = (this.d.peX || []).includes(pid);
    let text = entry ? entry[0] : '無特殊發現。';
    if (pid === 'P1' && !entry) text = this.vitalsText();
    const lines = [`【${this.peLabel[pid]}】`, text];
    if (this.peDone.has(pid)) return this._out(lines, 0);
    this.peDone.add(pid);
    this.log.push({ t: this.t, label: `PE：${this.peLabel[pid]}` });
    const ev = this._spend(1, 1);
    let pen = 0;
    if (isX) { pen = PEN.xpe; this.live.push({ text: `做了無關的檢查：${this.peLabel[pid]}`, pts: pen }); }
    return this._out(lines, pen, ev);
  }

  order(lid) {
    const item = this.labItems.find(l => l.id === lid);
    const entry = this.d.labs[lid];
    const isX = (this.d.labX || []).includes(lid);
    const result = entry ? entry[0] : item.def;
    if (this.labsDone.has(lid)) return this._out([`【${item.label}】`, result, '（已經開過了）'], 0);
    this.labsDone.add(lid);
    if (lid === 'ECG' && this.ecgAt == null) this.ecgAt = this.t;
    this.log.push({ t: this.t, label: `開：${item.label}` });
    const pre = lid === 'CXR' && !this.pgy ? ['學長幫你開了 CXR，推去照相…'] : /^CT/.test(lid) ? ['病人推去做 CT…'] : [];
    const ev = this._spend(item.time, 2);
    let pen = 0;
    if (isX) { pen = PEN.xlab; this.live.push({ text: `開了不必要的檢驗：${item.label}`, pts: pen }); }
    return this._out([...pre, `【${item.label}】`, result], pen, ev);
  }

  _spend(min, energy) {
    this.energy = Math.max(0, this.energy - energy * this.energyMult);
    const events = [];
    let m = min;
    if (this.energy < 20) {
      m += 1;
      if (!this.fatigueWarned) { this.fatigueWarned = true; events.push({ type: 'say', lines: ['你有點累了，動作變慢…（精神值低：每個動作多 1 分鐘）'] }); }
    }
    for (let k = 0; k < m && !this.ended; k++) {
      this.t += 1;
      if (this.course) this._courseTick(events);
      if (this.boss?.ecgDeadline && !this.labsDone.has('ECG') && this.t > this.boss.ecgDeadline) {
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

  _courseTick(events) {
    const c = this.course;
    if (this.stable) { this.S = Math.min(100, this.S + 2); return; }
    this.S -= c.dropPerMin;
    this._courseCheck(events);
  }

  _courseCheck(events) {
    const c = this.course;
    if (!c || this.ended) return;
    if (!this.courseAlarm && this.S < c.alarmS) {
      this.courseAlarm = true;
      const v = this.vitals();
      events.push({ type: 'alarm', lines: [...c.alarm, `HR ${v.hr}、BP ${v.sbp}/${v.dbp}、SpO₂ ${v.spo2}%`] });
    }
    if (this.S <= c.failS) {
      this.ended = { result: 'fail', reason: 'takeover' };
      events.push({ type: 'alarm', lines: c.fail });
    }
  }

  // 處置
  treat(id) {
    const item = PGY_TX_ITEMS.find(t => t.id === id);
    const entry = this.d.tx?.[id];
    if (this.txDone.has(id)) return this._out([`【${item.label}】`, '（已經給過了）'], 0);
    const at = this.t;
    this.txDone.set(id, at);
    this.log.push({ t: at, label: `處置：${item.label}` });
    const lines = [`【${item.label}】`];
    let pen = 0;
    const evPre = [];
    if (entry) {
      const missing = (entry.needs || []).filter(l => !this.labsDone.has(l));
      if (missing.length) {
        pen += PEN.needs;
        this.live.push({ text: `${item.label}：${entry.needsWhy || '給之前應先確認檢驗結果'}`, pts: PEN.needs });
        this.S -= 10;
      }
      if (entry.cls === 'H') {
        pen += PEN.harm;
        this.live.push({ text: `有害的處置：${item.label}`, pts: PEN.harm, harm: true });
      }
      for (const [k, d] of Object.entries(entry.fx || {})) this.txFx[k] = (this.txFx[k] || 0) + d;
      this.S = Math.min(100, this.S + (entry.S || 0));
      lines.push(entry.text);
      if (entry.cls === 'H' || missing.length) lines.push(`※ ${entry.cls === 'H' ? entry.why : entry.needsWhy}`);
    } else {
      pen += PEN.xtx;
      this.live.push({ text: `不必要的處置：${item.label}`, pts: PEN.xtx });
      lines.push('病人狀況沒有明顯變化。');
    }
    const ev = this._spend(item.time || 1, 2);
    if (this.course && !this.stable && (this.course.stabilizeBy || []).every(x => this.txDone.has(x))) {
      this.stable = true;
      if (this.course.stableText) ev.push({ type: 'say', lines: this.course.stableText });
    }
    this._courseCheck(evPre);
    return this._out(lines, pen, [...evPre, ...ev]);
  }

  _out(lines, penalty, events = []) {
    return { lines, penalty, events, ended: this.ended };
  }

  // ---------- 報告與結算 ----------
  ddxPool() {
    const set = new Set([...this.d.dx.slice(1), ...this.d.mustDdx]);
    return [...set];
  }

  report({ dx, ddx = [], next = null, answers = [], dispo = null }) {
    const d = this.d;
    const deductions = [...this.live];
    const missed = [];
    const goods = [];

    // 問診
    const kq = d.history.map((h, i) => ({ h, i })).filter(x => x.h[3] === 'K' || x.h[3] === 'RF');
    let kqDone = 0;
    const px = this.proxy;
    for (const { h, i } of kq) {
      if (this.asked.has(i) && px?.unsure[i] && !this.verified.has(i)) {
        deductions.push({ text: `家屬不確定、沒有查證：${h[0]}`, pts: h[3] === 'RF' ? PEN.missRF : PEN.missQ });
        missed.push(h[0]);
      } else if (this.asked.has(i)) { kqDone++; goods.push(`問到：${h[0]}`); }
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
      if (this.peDone.has(p)) { kpeDone++; goods.push(`檢查到：${this.peLabel[p]}`); }
      else { deductions.push({ text: `漏做關鍵 PE：${this.peLabel[p]}`, pts: PEN.missPE }); missed.push(this.peLabel[p]); }
    }
    const xpe = [...this.peDone].filter(p => (d.peX || []).includes(p)).length;

    // 檢驗
    const nlab = Object.entries(d.labs).filter(([, v]) => v[1] === 'N').map(([k]) => k);
    let nlabDone = 0;
    for (const l of nlab) {
      if (this.labsDone.has(l)) { nlabDone++; goods.push(`開了：${this.labLabel[l]}`); }
      else { deductions.push({ text: `漏開必要檢驗：${this.labLabel[l]}`, pts: PEN.missLab }); missed.push(this.labLabel[l]); }
    }
    const xlab = [...this.labsDone].filter(l => (d.labX || []).includes(l)).length;

    // 處置（PGY）
    const ntx = Object.entries(d.tx || {}).filter(([, v]) => v.cls === 'N');
    let ntxDone = 0;
    for (const [id, v] of ntx) {
      if (!this.txDone.has(id)) { deductions.push({ text: `漏了必要處置：${TX_LABEL[id]}`, pts: PEN.missTx }); missed.push(TX_LABEL[id]); continue; }
      ntxDone++;
      const at = this.txDone.get(id);
      if (v.deadline != null && at > v.deadline) deductions.push({ text: `處置延遲：${TX_LABEL[id]}（第 ${at} 分，應在 ${v.deadline} 分內）`, pts: PEN.lateTx });
      else goods.push(`處置及時：${TX_LABEL[id]}`);
    }
    const harms = this.live.filter(x => x.harm).length;

    // 家屬代述：矛盾說法未查證
    if (px && px.conflict != null && !this.verified.has(px.conflict)) {
      deductions.push({ text: `沒有查證家屬說法：${d.history[px.conflict][0]}（${SRC_LABEL[px.unsure[px.conflict]]}）`, pts: PEN.conflict });
    }
    if (px && px.conflict != null && this.verified.has(px.conflict)) goods.push(`查證出家屬說法的出入：${d.history[px.conflict][0]}`);
    const commFails = this.live.filter(x => x.comm).length;

    // Disposition（PGY）
    let dispoOk = true;
    if (d.dispo) {
      dispoOk = dispo === d.dispo.options[0];
      if (dispoOk) goods.push(`Disposition 正確：${d.dispo.options[0]}`);
      else deductions.push({ text: `Disposition 不適當：${dispo || '未決定'}`, pts: PEN.dispo });
    }

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
      if (this.boss.next) {
        bossNextOk = next === this.boss.next[0];
        if (!bossNextOk) deductions.push({ text: `下一步錯誤：${next || '未選擇'}`, pts: PEN.bossNext });
        else goods.push(`下一步正確：${this.boss.next[0]}`);
      }
      this.boss.questions.forEach((q, k) => {
        if (answers[k] === q.options[0]) bossQOk++;
        else deductions.push({ text: `考官追問答錯：${q.q}`, pts: PEN.bossQ });
      });
    }

    const kfTotal = kq.length + kpe.length + nlab.length + ntx.length;
    const kfDone = kqDone + kpeDone + nlabDone + ntxDone;
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
      hx: r1(1 + 8 * (kq.length ? kqDone / kq.length : 1) - Math.min(3, xq) - 2 * commFails),
      pe: r1(1 + 8 * (kpe.length ? kpeDone / kpe.length : 1) - Math.min(3, xpe)),
      judg: r1((dxOk ? 9 : 2) - 2 * (nlab.length - nlabDone) - xlab - 2 * missDdx.length - (bossNextOk ? 0 : 3) - (this.boss ? this.boss.questions.length - bossQOk : 0)
        - 2 * (ntx.length - ntxDone) - 3 * harms - (dispoOk ? 0 : 2)),
      eff: r1(this.t <= d.target * 0.7 ? 9 : this.t <= d.target ? 8 : this.t <= d.target * 1.3 ? 6 : 4),
      overall: r1(passed ? 1 + (score / 100) * 8 : Math.min(4, 1 + (score / 100) * 8)),
    };

    return {
      kind: 'clerk',
      caseId: d.id,
      win: passed,
      dxOk, grade, score, passed,
      kf: Math.round(kf * 100),
      exp: (this.pgy ? EXP_PGY : EXP)[grade],
      tier: this.pgy ? 'pgy' : 'clerk',
      proxy: px ? px.who : null,
      dispo, dispoOk,
      S: this.S,
      reason: bossFail ? 'takeover' : (!dxOk ? 'dx' : null),
      harms,
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
      missedRedFlag: kq.some(({ h, i }) => h[3] === 'RF' && !this.asked.has(i)),
      ecgAt: this.ecgAt,
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

// ---------- 家屬代述 ----------
const PRONOUN = { 男: '他', 女: '她' };
// 病人第一人稱的回答改成家屬口吻（我 → 他／她）
export function proxyVoice(a, sex) {
  return a.replace(/我(?!們)/g, PRONOUN[sex] || '他');
}

function srcOf(label) {
  if (/藥|抗凝|過敏|吃什麼|用什麼/.test(label)) return 'MED';
  if (/病史|住院|開刀|手術|糖尿|高血壓|洗腎|透析|心臟病|癌|肝|腎功能|疫苗/.test(label)) return 'CHART';
  if (/發現|昏倒|倒下|最後|何時|幾點|目擊|跌倒|抽搐|意識/.test(label)) return 'EMS';
  return 'PT';
}

const UNSURE = {
  MED: ['「他有在吃藥，可是藥袋在家裡，我不知道是什麼藥…」', '「藥都是外傭在顧，我不太清楚。」'],
  CHART: ['「以前好像有看過什麼病…我不太記得了。」', '「這要問我哥，他比較清楚。」'],
  EMS: ['「我是後來才到的，沒有看到當時的情形。」', '「確切時間…我不確定耶。」'],
  PT: ['「這個…他沒跟我說過。」', '「好像有、又好像沒有…我不確定。」'],
};

function defaultWho(p, rnd) {
  if (p.age >= 65) return { who: p.sex === '男' ? '女兒' : '兒子', why: '病人重聽又有點混亂，說不太清楚' };
  if (p.age < 25) return { who: '媽媽', why: '病人很不舒服，由媽媽陪同說明' };
  return rnd() < 0.5 ? { who: p.sex === '男' ? '太太' : '先生', why: '病人很不舒服，由家屬代為說明' } : { who: '同事', why: '病人很不舒服，由陪同的同事說明' };
}

// 建立家屬代述設定：最多 2 題家屬不確定＋案例可指定 1 題說法矛盾
export function makeProxy(data, rnd = Math.random) {
  const cfg = data.proxy || {};
  const base = defaultWho(data.patient, rnd);
  const who = cfg.who || base.who;
  const why = cfg.why || base.why;
  const unsure = {}, says = {}, truth = {};
  let conflict = null;
  if (cfg.conflict && data.history[cfg.conflict.q]) {
    conflict = cfg.conflict.q;
    unsure[conflict] = cfg.conflict.src || srcOf(data.history[conflict][0]);
    says[conflict] = cfg.conflict.says;
    if (cfg.conflict.truth) truth[conflict] = cfg.conflict.truth;
  }
  const cand = data.history.map((h, i) => ({ h, i }))
    .filter(x => ['K', 'RF', 'R'].includes(x.h[3]) && x.i !== conflict)
    .map(x => ({ ...x, r: rnd() + (x.h[3] === 'R' ? 0 : 0.3) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, 2);
  for (const { h, i } of cand) {
    const src = srcOf(h[0]);
    unsure[i] = src;
    const pool = UNSURE[src];
    says[i] = pool[Math.floor(rnd() * pool.length)].replace(/他/g, PRONOUN[data.patient.sex] || '他');
  }
  return { who, why, unsure, says, truth, conflict };
}
