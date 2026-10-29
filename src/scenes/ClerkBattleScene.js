import { audio } from '../audio.js';
import { C, bakePortrait, portraitKey, bakePlayer } from '../art.js';
import { equipFor, fx } from '../progress.js';
import { drawEcg, ecgType } from '../ecg.js';
import { PE_NOTES } from '../engine/clerkMenus.js';
import { txt, Dialog, menu, multiMenu, chooseLong, yesNo, wait, shuffle, W, H } from '../ui.js';
import { state } from '../save.js';
import { ClerkEngine, introFor } from '../engine/clerkEngine.js';

const hex = s => Phaser.Display.Color.HexStringToColor(s).color;
const CMDS = [{ key: 'hx', label: '問診' }, { key: 'pe', label: '理學檢查' }, { key: 'lab', label: '檢查' }, { key: 'report', label: '報告' }];

export class ClerkBattleScene extends Phaser.Scene {
  constructor() { super('ClerkBattle'); }

  create(data) {
    this.args = data;
    this.d = state.cases[data.caseId];
    this.classroom = !!data.classroom;
    const shiftEntry = data.shiftIdx != null ? state.save.shift?.list[data.shiftIdx] : null;
    this.variant = shiftEntry?.variant || null;
    this.engine = new ClerkEngine(this.d, {
      energy: this.classroom ? 100 : state.save.energy,
      variant: this.variant || undefined,
      vitals: shiftEntry?.vitals || undefined,
      energyMult: this.classroom ? 1 : fx.energyMult(state.save),
    });
    this.energyMax = this.classroom ? 100 : fx.energyMax(state.save);
    this.isBoss = !!this.d.boss;
    this.done = false;

    this.drawBackground();
    this.drawSprites();
    this.drawPanels();
    this.dlg = new Dialog(this);
    this.refresh(true);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    audio.play(this.isBoss ? 'battle' : 'map');
    this.run();
  }

  drawBackground() {
    const g = this.add.graphics();
    const wall = this.isBoss ? '#e9e2ea' : '#e2ece6';
    g.fillStyle(hex(wall), 1).fillRect(0, 0, W, 74);
    g.fillStyle(hex('#cfdcd6'), 0.6);
    for (let x = 0; x < W; x += 24) g.fillRect(x, 0, 1, 74);
    g.fillStyle(hex('#b4c4c0'), 1).fillRect(0, 36, W, 2);
    // 診間的布簾與洗手台
    g.fillStyle(hex('#a8d8c0'), 1).fillRect(126, 4, 16, 34);
    for (let x = 128; x < 142; x += 4) { g.fillStyle(hex('#88b8a0'), 1).fillRect(x, 4, 1, 34); }
    g.fillStyle(hex('#d4dce6'), 1).fillRect(0, 74, W, 86);
    g.fillStyle(hex('#c6d0dc'), 1);
    for (let y = 80; y < H; y += 10) g.fillRect(0, y, W, 1);
    g.fillStyle(hex('#b4c0cc'), 1);
    g.fillEllipse(200, 56, 72, 12);
    g.fillEllipse(44, 108, 80, 14);
  }

  drawSprites() {
    const p = { ...this.d.patient, ...(this.variant || {}) };
    const key = portraitKey(p);
    bakePortrait(this, key, { sex: p.sex, old: p.age >= 65, pose: p.pose });
    this.patientX = 176;
    this.patient = this.add.image(-60, 8, key).setOrigin(0, 0);
    const look = state.save.look || 'docA';
    if (!this.classroom) bakePlayer(this, look, equipFor(state.save));
    this.doc = this.add.image(W + 10, 62, this.classroom ? 'back_docA' : 'back_player').setOrigin(0, 0);
  }

  drawPanels() {
    const g = this.add.graphics().setDepth(50);
    const panel = (x, y, w, h, fill, edge = C.ink) => {
      g.fillStyle(hex(edge), 1).fillRect(x + 1, y, w - 2, h).fillRect(x, y + 1, w, h - 2);
      g.fillStyle(hex(fill), 1).fillRect(x + 1, y + 1, w - 2, h - 2);
    };
    const p = this.engine.patient;
    panel(4, 4, 118, 48, '#f8f6e8');
    g.fillStyle(hex(this.isBoss ? '#c84848' : C.teal), 1).fillRect(5, 5, 3, 46);
    txt(this, 12, 6, p.name).setDepth(51);
    const sa = txt(this, 0, 6, `${p.sex === '男' ? '♂' : '♀'}${p.age}歲`, '#5a6a80').setDepth(51);
    sa.setX(118 - sa.width);
    txt(this, 12, 20, '推理', '#5a6a80').setDepth(51);
    panel(40, 23, 76, 8, '#384050');
    this.scoreBar = this.add.rectangle(42, 25, 72, 4, 0x58a8e0).setOrigin(0, 0).setDepth(52);
    this.clock = txt(this, 12, 34, '', '#5a6a80').setDepth(51);

    panel(122, 58, 114, 14, '#f8f6e8');
    txt(this, 127, 59, this.isBoss ? '穩定' : '精神', '#5a6a80').setDepth(51);
    panel(154, 61, 78, 8, '#384050');
    this.sideBar = this.add.rectangle(156, 63, 74, 4, this.isBoss ? 0x48c060 : 0x58a8e0).setOrigin(0, 0).setDepth(52);

    panel(122, 74, 114, 34, '#0c1810', '#101418');
    this.vHR = txt(this, 127, 77, '', '#58e078').setDepth(51);
    this.vBP = txt(this, 172, 77, '', '#f08080').setDepth(51);
    this.vRR = txt(this, 127, 92, '', '#f0d860').setDepth(51);
    this.vSp = txt(this, 172, 92, '', '#70d8f0').setDepth(51);
    // 噗通（迷你心臟君）：床邊監視器 ECG 動畫。ECG 開立前一律畫竇性節律，不洩漏診斷。
    if (!this.classroom && fx.ecgAnim(state.save)) {
      panel(124, 30, 50, 26, '#0c1810', '#101418');
      this.ecgG = this.add.graphics().setDepth(51);
      this.ecgPhase = 0;
      this.ecgKnown = false;
    }
  }

  update(time, dt) {
    if (!this.ecgG) return;
    this.ecgPhase += dt / 1000;
    this.ecgG.clear();
    const type = this.ecgKnown ? ecgType(this.d) : 'sinus';
    drawEcg(this.ecgG, 126, 32, 46, 22, this.engine.vitals().hr, type, this.ecgPhase * 25, 0x58e078, 25);
  }

  refresh(instant = false) {
    const e = this.engine;
    const v = e.vitals();
    this.vHR.setText(`HR ${v.hr}`);
    this.vBP.setText(`BP ${v.sbp}/${v.dbp}`);
    this.vRR.setText(`T ${v.t}`);
    this.vSp.setText(`SpO₂ ${v.spo2}%`);
    this.vBP.setColor(v.sbp < 90 ? '#ff4040' : '#f08080');
    this.vSp.setColor(v.spo2 < 92 ? '#ff4040' : '#70d8f0');
    this.vRR.setColor(v.t >= 38 ? '#ff9040' : '#f0d860');
    this.clock.setText(`時間 ${String(e.t).padStart(2, '0')}/${this.d.target}分`);
    this.clock.setColor(e.t > this.d.target ? '#c84848' : '#5a6a80');
    const sc = e.score();
    const w = Math.max(0, (sc / 100) * 72);
    this.scoreBar.setFillStyle(sc >= 80 ? 0x58a8e0 : sc >= 60 ? 0xe0c040 : 0xe04040);
    if (instant) this.scoreBar.width = w; else this.tweens.add({ targets: this.scoreBar, width: w, duration: 300 });
    if (this.isBoss) {
      const s = Math.max(0, e.S);
      this.sideBar.width = (s / 100) * 74;
      this.sideBar.setFillStyle(s >= 60 ? 0x48c060 : s >= 35 ? 0xe0c040 : 0xe04040);
      if (s < 60) this.patient.setTint(0xc8d0ff);
    } else {
      this.sideBar.width = Math.min(1, e.energy / this.energyMax) * 74;
      this.sideBar.setFillStyle(e.energy < 20 ? 0xe04040 : 0x58a8e0);
    }
  }

  floatPenalty(n) {
    const t = txt(this, 96, 18, `-${n}`, '#e04040').setDepth(60);
    this.tweens.add({ targets: t, y: 6, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    audio.sfx('bad');
    this.cameras.main.shake(120, 0.004);
  }

  // ---------- 流程 ----------
  async run() {
    this.tweens.add({ targets: this.patient, x: this.patientX, duration: 700, ease: 'Quad.out' });
    this.tweens.add({ targets: this.doc, x: 14, duration: 700, ease: 'Quad.out' });
    await wait(this, 750);
    await this.dlg.say(introFor(this.d, this.variant));
    if (this.classroom) await this.dlg.say(['【課堂模式】每一步都可以先停下來討論，再決定要怎麼做。']);

    let last = 0;
    while (!this.done) {
      this.dlg.set('要怎麼做？');
      const cmd = await menu(this, CMDS.map(c => ({ label: c.label })), {
        cols: 2, x: 104, y: 110, w: 136, h: 50, colW: 56, rowH: 18, cancel: false, depth: 300, start: last,
      });
      last = cmd;
      const key = CMDS[cmd].key;
      if (key === 'report') { if (await this.report()) break; continue; }
      let items, ids;
      if (key === 'hx') {
        const l = this.engine.historyList();
        items = l.map(x => ({ label: (x.done ? '√' : '') + x.label, dim: x.done })); ids = l.map(x => x.i);
        this.dlg.set('問診：要問什麼？（B 返回）');
      } else if (key === 'pe') {
        const l = this.engine.peList();
        items = l.map(x => ({ label: (x.done ? '√' : '') + x.label, dim: x.done })); ids = l.map(x => x.id);
        this.dlg.set('理學檢查：要檢查哪裡？（B 返回）');
      } else {
        const l = this.engine.labList();
        items = l.map(x => ({ label: (x.done ? '√' : '') + x.label, right: `${x.time}分`, dim: x.done })); ids = l.map(x => x.id);
        this.dlg.set('檢查：要開什麼？（B 返回）');
      }
      const h = Math.min(6, items.length) * 14 + 14;
      const pick = await menu(this, items, { x: 4, w: 232, visibleRows: 6, y: 110 - h, depth: 300, start: this[`last_${key}`] || 0 });
      if (pick < 0) continue;
      this[`last_${key}`] = pick;
      this.dlg.hide();
      const id = ids[pick];
      const r = key === 'hx' ? this.engine.ask(id) : key === 'pe' ? this.engine.exam(id) : this.engine.order(id);
      this.refresh();
      if (r.penalty) this.floatPenalty(r.penalty);
      if (key === 'lab' && id === 'ECG') this.ecgKnown = true;
      const extra = key === 'pe' && !this.classroom && fx.goldSteth(state.save) && PE_NOTES[id] ? [PE_NOTES[id]] : [];
      await this.dlg.say([...r.lines, ...extra]);
      for (const ev of r.events) {
        if (ev.type === 'alarm') {
          audio.sfx('alarm');
          this.cameras.main.flash(250, 255, 60, 60);
          this.refresh();
          await this.dlg.say(ev.lines, { theme: 'red' });
          this.dlg.setTheme('normal');
        } else await this.dlg.say(ev.lines);
      }
      if (this.engine.ended) {
        const res = this.engine.report({ dx: null, ddx: [] });
        return this.finish(res);
      }
    }
  }

  async report() {
    this.dlg.set('要向學長報告了嗎？報告後就不能再問診或檢查。');
    if (!(await yesNo(this))) return false;
    const d = this.d;
    const who = this.isBoss ? '主治' : '學長';
    await this.dlg.say([`你：「${who}，我來報告這位病人。」`, `${who}：「好，你的診斷是什麼？」`], { keep: true });

    this.dlg.set('主診斷是？');
    const dxOpts = shuffle(d.dx);
    const di = await menu(this, dxOpts.map(x => ({ label: x })), { x: 4, w: 232, y: 110 - (dxOpts.length * 14 + 14), cancel: false, depth: 300 });
    const dx = dxOpts[di];

    this.dlg.set(`${who}：「鑑別診斷呢？」請選 3 個（A 勾選）。`);
    const pool = shuffle(this.engine.ddxPool().filter(x => x !== dx));
    const ddx = await multiMenu(this, pool, { x: 4, w: 232, visibleRows: 6, y: 110 - (Math.min(6, pool.length + 1) * 14 + 14), depth: 300, need: 3 });

    let next = null; const answers = [];
    if (this.isBoss) {
      const nx = shuffle(d.boss.next);
      next = nx[await chooseLong(this, this.dlg, '主治：「那下一步呢？」', nx)];
      for (const q of d.boss.questions) {
        await this.dlg.say([`主治：「${q.q}」`]);
        const op = shuffle(q.options);
        const a = op[await chooseLong(this, this.dlg, `主治：「${q.q}」`, op)];
        answers.push(a);
        if (a === q.options[0]) { audio.sfx('good'); await this.dlg.say(['主治：「沒錯。」', q.explain]); }
        else { audio.sfx('bad'); await this.dlg.say(['主治：「不對喔。」', q.explain]); }
      }
    }

    const res = this.engine.report({ dx, ddx, next, answers });
    if (res.dxOk) {
      audio.sfx('good');
      await this.dlg.say([`${who}：「診斷正確！」`, res.score >= 80 ? `${who}：「依據也很完整，做得好。」` : `${who}：「不過還有一些地方可以更好，我們來看看。」`]);
    } else {
      audio.sfx('bad');
      await this.dlg.say([`${who}：「嗯……其實這位病人是「${d.dx[0]}」。」`, `${who}：「我們來做 M&M 回顧。」`]);
    }
    this.finish(res);
    return true;
  }

  finish(res) {
    this.done = true;
    audio.stop();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Report', { res, caseId: this.d.id, classroom: this.classroom, shiftIdx: this.args.shiftIdx ?? null, kind: 'clerk' });
    });
  }
}
