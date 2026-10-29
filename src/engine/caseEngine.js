// 急診物語 — 案例引擎（純邏輯，不依賴 Phaser，可用 node 測試）
// 案例以 data/cases/*.json 描述；本引擎負責時間、穩定度、旗標、線索、評分。

const CATS = ['history', 'pe', 'order', 'treat'];

export class CaseEngine {
  constructor(data, mode, opts = {}) {
    this.d = data;
    this.mode = mode; // 'clerk' | 'resident'
    this.S = data.start.S;
    this.rate = data.rate[mode];
    this.t = 0;
    this.energy = opts.energy ?? 100;
    this.flags = new Set();
    this.clues = new Set();
    this.used = new Set();
    this.goods = new Map();
    this.mistakes = new Map();
    this.hints = 0;
    this.marks = {};
    this.timers = [];
    this.alarmsFired = new Set();
    this.ended = null;
    this.events = [];
    this.pending = null;
    this.fatigueWarned = false;
    this.log = [];
  }

  // ---------- 查詢 ----------
  vitals() {
    const pts = this.d.vitals;
    const S = Math.max(0, Math.min(100, this.S));
    let a = pts[0], b = pts[pts.length - 1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (S >= pts[i].S && S <= pts[i + 1].S) { a = pts[i]; b = pts[i + 1]; break; }
    }
    const f = b.S === a.S ? 0 : (S - a.S) / (b.S - a.S);
    const lerp = k => Math.round(a[k] + (b[k] - a[k]) * f);
    let spo2 = lerp('spo2');
    if (this.flags.has('o2')) spo2 = Math.min(100, spo2 + (this.d.o2Bonus || 0));
    return { hr: lerp('hr'), sbp: lerp('sbp'), dbp: lerp('dbp'), rr: lerp('rr'), spo2 };
  }

  band() {
    if (this.S >= 60) return 'stable';
    if (this.S >= 30) return 'warn';
    return 'crit';
  }

  actions(cat) {
    return (this.d.categories[cat] || [])
      .filter(a => !a.modes || a.modes.includes(this.mode))
      .map(a => ({ id: a.id, label: a.label, time: a.time || 0, done: !!a.once && this.used.has(a.id) }));
  }

  findAction(id) {
    for (const c of CATS) {
      const a = (this.d.categories[c] || []).find(x => x.id === id);
      if (a) return a;
    }
    return null;
  }

  // ---------- 執行 ----------
  start(id) {
    if (this.ended || this.pending) return this._out();
    const a = this.findAction(id);
    if (!a) throw new Error('unknown action ' + id);
    if (a.once && this.used.has(a.id)) {
      this._say(['（這項已經做過了）']);
      return this._out();
    }
    this.used.add(a.id);
    this.log.push({ t: this.t, label: a.label });
    this.energy = Math.max(0, this.energy - (a.energy || 0));
    const self = this;
    this.pending = (function* () {
      const t0 = self.t;
      if (a.time) self._advance(a.time);
      if (!self.ended) yield* self._exec(a.steps || []);
      // 疲勞：精神值過低時，有花時間的動作會再慢 1 分鐘
      if (!self.ended && self.energy < 20 && self.t > t0) {
        if (!self.fatigueWarned) {
          self._say(['你有點累了，動作變慢…', '（精神值低：每個動作多花 1 分鐘）']);
          self.fatigueWarned = true;
        }
        self._advance(1);
      }
    })();
    return this._step(undefined);
  }

  choose(idx) {
    if (!this.pending) return this._out();
    return this._step(idx);
  }

  _step(val) {
    const r = this.pending.next(val);
    if (r.done) {
      this.pending = null;
      return this._out();
    }
    return this._out(r.value); // r.value = { prompt, options }
  }

  _out(choice = null) {
    const events = this.events;
    this.events = [];
    return { events, choice, ended: this.ended };
  }

  *_exec(steps) {
    for (const s of steps) {
      if (this.ended) return;
      if (s.say) this._say(s.say);
      else if (s.if) {
        const branch = this._cond(s.if) ? s.then : s.else;
        if (branch) yield* this._exec(branch);
      } else if (s.choice) {
        const idx = yield { prompt: s.choice.prompt, options: s.choice.options.map(o => o.label) };
        const opt = s.choice.options[idx] || s.choice.options[0];
        yield* this._exec(opt.steps || []);
      } else if (s.time != null) this._advance(s.time);
      else if (s.clue) this.clues.add(s.clue);
      else if (s.flag) this.flags.add(s.flag);
      else if (s.unflag) this.flags.delete(s.unflag);
      else if (s.stab != null) {
        const before = this.S;
        let v = this.S + s.stab;
        if (s.stab > 0 && s.cap != null) v = Math.max(this.S, Math.min(v, s.cap));
        this.S = Math.max(-5, Math.min(100, v));
        this.events.push({ type: 'vitals', delta: this.S - before });
        if (s.stab < 0) { this._checkAlarms(); this._checkEnd(); }
      } else if (s.rate != null) this.rate = s.rate;
      else if (s.mark) { if (this.marks[s.mark] == null) this.marks[s.mark] = this.t; }
      else if (s.good) { if (!this.goods.has(s.good)) this.goods.set(s.good, s.text); this.events.push({ type: 'good' }); }
      else if (s.mistake) {
        if (!this.mistakes.has(s.mistake)) this.mistakes.set(s.mistake, { text: s.text, w: s.w || 10 });
        this.events.push({ type: 'mistake', text: s.text });
      } else if (s.fx) this.events.push({ type: 'fx', name: s.fx });
      else if (s.hint) this.hints += s.hint;
      else if (s.timer) {
        const def = this.d.timers?.[s.timer.id];
        if (def && (!def.modes || def.modes.includes(this.mode))) {
          this.timers = this.timers.filter(x => x.id !== s.timer.id);
          this.timers.push({ id: s.timer.id, at: this.t + s.timer.in });
        }
      } else if (s.end) this._end(s.end, s.reason);
    }
  }

  _runInline(steps) {
    const g = this._exec(steps);
    const r = g.next();
    if (!r.done) throw new Error('choice not allowed inside timer');
  }

  _advance(min) {
    for (let i = 0; i < min && !this.ended; i++) {
      this.t += 1;
      if (this.rate) {
        this.S -= this.rate;
        this.events.push({ type: 'vitals', delta: -this.rate, tick: true });
      }
      for (const tm of [...this.timers]) {
        if (this.t >= tm.at) {
          this.timers = this.timers.filter(x => x !== tm);
          const def = this.d.timers[tm.id];
          if (def.unless && this.flags.has(def.unless)) continue;
          this._runInline(def.steps);
        }
      }
      this._checkAlarms();
      this._checkEnd();
    }
    this.events.push({ type: 'time', t: this.t });
  }

  _checkAlarms() {
    for (const al of this.d.alarms || []) {
      if (this.S < al.below && !this.alarmsFired.has(al.below)) {
        this.alarmsFired.add(al.below);
        this.events.push({ type: 'alarm', lines: al.text.map(l => this._fill(l)) });
      }
    }
  }

  _checkEnd() {
    if (this.ended) return;
    const e = this.d.endAt[this.mode];
    if (this.S <= e.S) {
      this.events.push({ type: 'fx', name: 'arrest' });
      this._say(e.text);
      this._end('fail', e.reason);
    }
  }

  _end(result, reason) {
    if (this.ended) return;
    this.ended = { result, reason: reason || null, t: this.t };
    this.events.push({ type: 'end', result, reason });
  }

  _say(lines) {
    this.events.push({ type: 'say', lines: lines.map(l => this._fill(l)) });
  }

  _fill(line) {
    const v = this.vitals();
    return line
      .replace('{hr}', v.hr)
      .replace('{bp}', `${v.sbp}/${v.dbp}`)
      .replace('{rr}', v.rr)
      .replace('{spo2}', v.spo2)
      .replace('{t}', this.t)
      .replace('{cluesList}', [...this.clues].map(c => this.d.clues[c]).join('、'));
  }

  _cond(c) {
    if (c.all) return c.all.every(x => this._cond(x));
    if (c.any) return c.any.some(x => this._cond(x));
    if (c.flag) return this.flags.has(c.flag);
    if (c.notFlag) return !this.flags.has(c.notFlag);
    if (c.clue) return this.clues.has(c.clue);
    if (c.notClue) return !this.clues.has(c.notClue);
    if (c.stabBelow != null) return this.S < c.stabBelow;
    if (c.stabAtLeast != null) return this.S >= c.stabAtLeast;
    if (c.mode) return this.mode === c.mode;
    if (c.cluesAtLeast != null) return this.clues.size >= c.cluesAtLeast;
    if (c.anyClue) return c.anyClue.some(x => this.clues.has(x));
    return false;
  }

  // ---------- 結算 ----------
  result() {
    const win = this.ended?.result === 'win';
    let score = 100;
    const deductions = [];
    for (const m of this.mistakes.values()) score -= m.w;
    if (this.hints) { score -= this.hints * 5; deductions.push(`求助學長 ${this.hints} 次`); }
    const dt = this.marks.decompress;
    if (this.mode === 'resident') {
      if (dt == null) score -= 20;
      else if (dt > 20) { score -= 20; deductions.push('減壓時間超過 20 分鐘'); }
      else if (dt > 10) { score -= 10; deductions.push('減壓時間超過 10 分鐘'); }
    } else if (dt != null && dt > 20) { score -= 10; deductions.push('報告時間超過 20 分鐘'); }
    const missed = (this.d.coreClues || []).filter(c => !this.clues.has(c));
    if (this.mode === 'clerk') score -= missed.length * 8;
    score = Math.max(0, score);
    const grade = !win ? 'F' : score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : 'C';
    const exp = { S: 100, A: 80, B: 60, C: 40, F: 20 }[grade];
    return {
      win, grade, score, exp,
      reason: this.ended?.reason || null,
      decompressAt: dt ?? null,
      totalTime: this.t,
      goods: [...this.goods.values()],
      mistakes: [...this.mistakes.values()].map(m => m.text),
      deductions,
      missed: missed.map(c => this.d.clues[c]),
      found: [...this.clues].map(c => this.d.clues[c]),
      energy: this.energy,
      log: this.log,
    };
  }
}

export const CATEGORY_KEYS = CATS;
export const CATEGORY_LABELS = { history: '問診', pe: '理學檢查', order: '檢查', treat: '處置' };
