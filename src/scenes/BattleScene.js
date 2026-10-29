import { input } from '../input.js';
import { audio } from '../audio.js';
import { C } from '../art.js';
import { txt, Dialog, menu, wait, W, H } from '../ui.js';
import { state } from '../save.js';
import { CaseEngine, CATEGORY_KEYS, CATEGORY_LABELS } from '../engine/caseEngine.js';

const hex = s => Phaser.Display.Color.HexStringToColor(s).color;
const BAND_COL = { stable: 0x48c060, warn: 0xe0c040, crit: 0xe04040 };

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  create(data) {
    this.caseId = data.caseId;
    this.mode = data.mode;
    this.classroom = !!data.classroom;
    this.data_ = state.cases[this.caseId];
    const energy = this.classroom ? 100 : state.save.energy;
    this.engine = new CaseEngine(this.data_, this.mode, { energy });
    this.ended = false;

    this.drawBackground();
    this.drawSprites();
    this.drawPanels();
    this.dlg = new Dialog(this);
    this.refresh(true);
    this.cameras.main.fadeIn(200, 0, 0, 0);
    audio.play('battle');

    // 監視器心跳音
    this.beatTimer = null;
    this.scheduleBeat();
    this.events.once('shutdown', () => { if (this.beatTimer) this.beatTimer.remove(); });

    this.run();
  }

  // ---------- 畫面 ----------
  drawBackground() {
    const g = this.add.graphics();
    g.fillStyle(hex('#dfe9e4'), 1).fillRect(0, 0, W, 74);
    g.fillStyle(hex('#cfdcd6'), 1);
    for (let x = 0; x < W; x += 24) g.fillRect(x, 0, 1, 74);
    g.fillStyle(hex('#a8b8b4'), 1).fillRect(0, 34, W, 2);
    g.fillStyle(hex('#c8d4d0'), 1).fillRect(0, 70, W, 4);
    g.fillStyle(hex('#d4dce6'), 1).fillRect(0, 74, W, 86);
    g.fillStyle(hex('#c6d0dc'), 1);
    for (let y = 80; y < H; y += 10) g.fillRect(0, y, W, 1);
    // 牆上的氧氣出口與時鐘
    g.fillStyle(hex('#58a060'), 1).fillRect(140, 40, 6, 6);
    g.fillStyle(hex('#4a78c0'), 1).fillRect(148, 40, 6, 6);
    g.fillStyle(hex('#f8f8f8'), 1).fillCircle(146, 18, 6);
    g.lineStyle(1, hex(C.ink), 1).strokeCircle(146, 18, 6);
    g.fillStyle(hex(C.ink), 1).fillRect(146, 14, 1, 4).fillRect(146, 18, 3, 1);
    // 平台（擔架陰影／站位）
    g.fillStyle(hex('#b4c0cc'), 1);
    g.fillEllipse(200, 56, 72, 12);
    g.fillEllipse(44, 108, 80, 14);
  }

  drawSprites() {
    this.patient = this.add.image(-60, 10, 'patient').setOrigin(0, 0);
    this.mask = this.add.image(-60, 10, 'o2mask').setOrigin(0, 0).setVisible(false);
    this.tube = this.add.image(-60, 10, 'chesttube').setOrigin(0, 0).setVisible(false);
    this.doc = this.add.image(W + 10, 62, 'back_' + (state.save.look || 'docA')).setOrigin(0, 0);
    this.patientX = 176;
  }

  drawPanels() {
    // 病人資訊框（左上）
    const g = this.add.graphics().setDepth(50);
    const panel = (x, y, w, h, fill, edge = C.ink) => {
      g.fillStyle(hex(edge), 1).fillRect(x + 1, y, w - 2, h).fillRect(x, y + 1, w, h - 2);
      g.fillStyle(hex(fill), 1).fillRect(x + 1, y + 1, w - 2, h - 2);
    };
    panel(4, 4, 118, 48, '#f8f6e8');
    g.fillStyle(hex(C.teal), 1).fillRect(5, 5, 3, 46);
    const p = this.data_.patient;
    txt(this, 12, 6, `${p.name}`).setDepth(51);
    txt(this, 60, 6, `${p.sex === '男' ? '♂' : '♀'}${p.age}歲`, '#5a6a80').setDepth(51);
    txt(this, 12, 20, '穩定', '#5a6a80').setDepth(51);
    panel(40, 23, 76, 8, '#384050');
    this.stabBar = this.add.rectangle(42, 25, 72, 4, BAND_COL.stable).setOrigin(0, 0).setDepth(52);
    this.clock = txt(this, 12, 34, '', '#5a6a80').setDepth(51);
    this.modeTag = txt(this, 0, 34, this.mode === 'clerk' ? 'Clerk' : 'Resident', C.tealD).setDepth(51);
    this.modeTag.setX(118 - this.modeTag.width);

    // 精神值（右中）
    panel(122, 58, 114, 14, '#f8f6e8');
    txt(this, 127, 59, '精神', '#5a6a80').setDepth(51);
    panel(154, 61, 78, 8, '#384050');
    this.enBar = this.add.rectangle(156, 63, 74, 4, 0x58a8e0).setOrigin(0, 0).setDepth(52);

    // 生理監視器（右下）
    panel(122, 74, 114, 34, '#0c1810', '#101418');
    this.vHR = txt(this, 127, 77, '', '#58e078').setDepth(51);
    this.vBP = txt(this, 172, 77, '', '#f08080').setDepth(51);
    this.vRR = txt(this, 127, 92, '', '#f0d860').setDepth(51);
    this.vSp = txt(this, 172, 92, '', '#70d8f0').setDepth(51);
    this.heart = this.add.rectangle(229, 80, 3, 3, 0x58e078).setOrigin(0, 0).setDepth(52);

    // 危急時的紅色暈影
    this.vignette = this.add.rectangle(0, 0, W, H, 0xff0000, 0).setOrigin(0, 0).setDepth(40);
  }

  refresh(instant = false) {
    const e = this.engine;
    const v = e.vitals();
    const band = e.band();
    this.vHR.setText(`HR ${v.hr}`);
    this.vBP.setText(`BP ${v.sbp}/${v.dbp}`);
    this.vRR.setText(`RR ${v.rr}`);
    this.vSp.setText(`SpO₂ ${v.spo2}%`);
    this.vBP.setColor(v.sbp < 90 ? '#ff4040' : '#f08080');
    this.vSp.setColor(v.spo2 < 88 ? '#ff4040' : '#70d8f0');
    this.clock.setText(`時間 ${String(e.t).padStart(2, '0')}分`);
    const w = Math.max(0, Math.min(72, (e.S / 100) * 72));
    this.stabBar.setFillStyle(BAND_COL[band]);
    if (instant) this.stabBar.width = w;
    else this.tweens.add({ targets: this.stabBar, width: w, duration: 350 });
    this.enBar.width = Math.max(0, (e.energy / 100) * 74);
    this.enBar.setFillStyle(e.energy < 20 ? 0xe04040 : 0x58a8e0);
    this.mask.setVisible(e.flags.has('o2'));
    this.tube.setVisible(e.flags.has('tube'));

    // 惡化的視覺效果
    const tint = band === 'crit' ? 0xa8b8ff : band === 'warn' ? 0xd8e0ff : null;
    [this.patient, this.mask, this.tube].forEach(o => (tint ? o.setTint(tint) : o.clearTint()));
    if (this.vigTween) { this.vigTween.stop(); this.vigTween = null; this.vignette.setAlpha(0); }
    if (this.shakeTween) { this.shakeTween.stop(); this.shakeTween = null; this.patient.x = this.patientX; }
    if (band === 'crit' && !this.ended) {
      this.vignette.fillAlpha = 1;
      this.vigTween = this.tweens.add({ targets: this.vignette, alpha: { from: 0, to: this.mode === 'resident' ? 0.22 : 0.1 }, duration: 600, yoyo: true, repeat: -1 });
      if (this.mode === 'resident') {
        this.shakeTween = this.tweens.add({ targets: this.patient, x: this.patientX + 1, duration: 60, yoyo: true, repeat: -1, repeatDelay: 500 });
      }
    }
  }

  scheduleBeat() {
    const v = this.engine.vitals();
    const hr = this.engine.ended && this.engine.ended.result === 'fail' ? 0 : v.hr;
    if (hr <= 0) { this.heart.setVisible(false); return; }
    const delay = Math.max(250, 60000 / hr);
    this.beatTimer = this.time.delayedCall(delay, () => {
      this.heart.setVisible(true);
      this.time.delayedCall(90, () => this.heart.setVisible(false));
      const sp = this.engine.vitals().spo2;
      audio.sfx('beep', { f: 600 + Math.max(0, sp - 60) * 12 });
      this.scheduleBeat();
    });
  }

  // ---------- 流程 ----------
  async run() {
    // 進場
    this.tweens.add({ targets: [this.patient, this.mask, this.tube], x: this.patientX, duration: 700, ease: 'Quad.out' });
    this.tweens.add({ targets: this.doc, x: 14, duration: 700, ease: 'Quad.out' });
    await wait(this, 750);
    await this.dlg.say(this.data_.intro);
    if (this.classroom) await this.dlg.say(['【課堂模式】每一步都可以先停下來，讓大家討論再選擇。']);

    while (!this.ended) {
      this.dlg.set('要怎麼做？');
      const cmd = await menu(this, CATEGORY_KEYS.map(k => ({ label: CATEGORY_LABELS[k] })), {
        cols: 2, x: 104, y: 110, w: 136, h: 50, colW: 56, rowH: 18, cancel: false, depth: 300,
      });
      const cat = CATEGORY_KEYS[cmd];
      const acts = this.engine.actions(cat);
      this.dlg.set(`${CATEGORY_LABELS[cat]}：選擇項目（B 返回）`);
      const items = acts.map(a => ({ label: (a.done ? '√' : '') + a.label, right: a.time ? `${a.time}分` : '', dim: a.done }));
      const pick = await menu(this, items, { x: W - 152, w: 150, visibleRows: 6, y: 110 - (Math.min(6, items.length) * 14 + 14), depth: 300 });
      if (pick < 0) continue;
      this.dlg.hide();
      await this.process(this.engine.start(acts[pick].id));
    }
    await wait(this, 500);
    this.finish();
  }

  async process(r) {
    for (const ev of r.events) await this.handle(ev);
    this.refresh();
    if (r.choice) {
      this.dlg.set(r.choice.prompt);
      const items = r.choice.options.map(o => ({ label: o }));
      const h = items.length * 14 + 14;
      const idx = await menu(this, items, { x: 4, w: 232, y: 110 - h, cancel: false, depth: 300 });
      this.dlg.hide();
      await this.process(this.engine.choose(idx));
    }
  }

  async handle(ev) {
    switch (ev.type) {
      case 'say': await this.dlg.say(ev.lines); break;
      case 'vitals': case 'time': this.refresh(); break;
      case 'alarm':
        audio.sfx('alarm');
        this.cameras.main.flash(250, 255, 60, 60);
        this.cameras.main.shake(200, 0.008);
        this.refresh();
        await this.dlg.say(ev.lines, { theme: 'red' });
        this.dlg.setTheme('normal');
        break;
      case 'good': audio.sfx('good'); break;
      case 'mistake': audio.sfx('bad'); this.cameras.main.shake(150, 0.006); break;
      case 'fx': await this.fx(ev.name); break;
      case 'end': this.ended = true; break;
    }
  }

  async fx(name) {
    if (name === 'hiss') {
      audio.sfx('hiss');
      const ps = [];
      for (let i = 0; i < 14; i++) {
        const p = this.add.image(this.patientX + 12, 36, 'spark').setDepth(60);
        ps.push(p);
        this.tweens.add({ targets: p, x: p.x - 10 - Math.random() * 30, y: p.y - 10 - Math.random() * 26, alpha: 0, duration: 600 + Math.random() * 300 });
      }
      await wait(this, 700);
      ps.forEach(p => p.destroy());
    } else if (name === 'heal') {
      audio.sfx('heal');
      this.cameras.main.flash(300, 120, 255, 160);
      await wait(this, 350);
    } else if (name === 'alarm') {
      audio.sfx('alarm');
      this.cameras.main.shake(250, 0.01);
      this.cameras.main.flash(200, 255, 80, 80);
      await wait(this, 300);
    } else if (name === 'arrest') {
      audio.stop();
      audio.sfx('arrest');
      if (this.beatTimer) this.beatTimer.remove();
      this.vHR.setText('HR ---');
      this.cameras.main.flash(500, 255, 0, 0);
      this.patient.setTint(0x8890b0);
      this.tweens.add({ targets: this.patient, x: this.patientX - 2, duration: 40, yoyo: true, repeat: 6 });
      await wait(this, 900);
    }
  }

  finish() {
    audio.stop();
    const res = this.engine.result();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Report', { res, caseId: this.caseId, mode: this.mode, classroom: this.classroom });
    });
  }
}
