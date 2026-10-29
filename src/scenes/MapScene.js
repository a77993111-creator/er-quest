import { input } from '../input.js';
import { audio } from '../audio.js';
import { C, DIR_ORDER } from '../art.js';
import { MAP, MAP_W, MAP_H, TILE, SOLID, START, BED_SPOT, NPCS, SIGNS, OBJECT_TEXT, roomPatientSpot } from '../mapData.js';
import { txt, Dialog, menu, yesNo, makeWindow, wait, W, H } from '../ui.js';
import {
  state, persist, wipe, level, rankTitle, RANK_LABEL, passedCount, examEligible, generateShift, shiftComplete,
  roomNo, minicexAvg, bar9,
} from '../save.js';
import { CLERK_CASES, BOSS_CASE, MINICEX } from '../engine/clerkMenus.js';

const DELTA = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
const OPP = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
const frameOf = (dir, f) => DIR_ORDER.indexOf(dir) * 3 + f;
const ptLook = p => (p.age >= 65 ? (p.sex === '男' ? 'pt_om' : 'pt_of') : (p.sex === '男' ? 'pt_m' : 'pt_f'));

export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create(data) {
    this.s = state.save;
    this.busy = true;
    this.moving = false;
    this.stepParity = 0;
    this.turnUntil = 0;
    if (!this.s.shift) generateShift();

    this.add.image(0, 0, 'map').setOrigin(0, 0).setDepth(0);

    this.npcs = NPCS.map(n => this.addNpc(n));
    // 今天班表上的病人
    this.s.shift.list.forEach((e, idx) => {
      if (e.done) return;
      const c = state.cases[e.id];
      const p = { ...c.patient, ...(e.variant || {}) };
      const spot = roomPatientSpot(e.room);
      this.npcs.push(this.addNpc({ id: 'pt', idx, x: spot.x, y: spot.y, dir: 'DOWN', look: ptLook(p), name: p.name }));
    });

    let p = this.s.pos || START;
    if (data?.newDay || data?.newGame) p = data.newGame ? START : BED_SPOT;
    this.px = p.x; this.py = p.y; this.dir = p.dir || 'UP';
    this.player = this.add.sprite(this.px * TILE, this.py * TILE, 'p_' + this.s.look, frameOf(this.dir, 0))
      .setOrigin(0, 0).setDepth(10 + this.py);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.startFollow(this.player, true, 1, 1, -8, -8);
    cam.setRoundPixels(true);
    cam.fadeIn(300, 0, 0, 0);

    this.dlg = new Dialog(this);
    this.hud = txt(this, 4, 3, '', '#ffffff').setScrollFactor(0).setDepth(400);
    this.hudBg = this.add.rectangle(0, 0, W, 18, 0x18203a, 0.75).setOrigin(0).setScrollFactor(0).setDepth(399);
    this.updateHud();
    audio.play('map');

    this.time.addEvent({
      delay: 2400, loop: true, callback: () => {
        if (this.busy) return;
        const n = Phaser.Utils.Array.GetRandom(this.npcs.filter(x => x.id === 'chief' || x.id === 'pt'));
        if (!n) return;
        n.dir = Phaser.Utils.Array.GetRandom(DIR_ORDER);
        n.sp.setFrame(frameOf(n.dir, 0));
      },
    });

    this.intro(data || {});
  }

  addNpc(n) {
    const sp = this.add.sprite(n.x * TILE, n.y * TILE, 'p_' + n.look, frameOf(n.dir, 0)).setOrigin(0, 0).setDepth(10 + n.y);
    return { ...n, sp };
  }

  updateHud() {
    const s = this.s;
    const left = s.shift.list.filter(x => !x.done).length;
    const task = !s.shift.briefed ? '找總醫師晨會' : left ? `待看病人 ${left} 位` : s.shift.ipass == null ? '找總醫師交班' : '去值班室休息';
    this.hud.setText(`第${s.day}天 ${RANK_LABEL[s.rank]} Lv.${level()}｜${task}`);
  }

  async intro(data) {
    await wait(this, 350);
    if (data.newGame) {
      await this.dlg.say([
        '（一般診區的早晨，候診椅已經坐了不少人…）',
        '總醫師：「歡迎！你是這梯的 Clerk 吧？」',
        '「每天早上先來找我晨會，我會分配今天要看的病人。」',
        '【操作】方向鍵移動　A：對話／確認　B：取消　START：選單',
      ]);
    } else if (data.newDay) {
      await this.dlg.say([`第 ${this.s.day} 天早上。精神值完全恢復了！`, '先去找總醫師晨會吧。']);
    } else if (data.evolved) {
      await this.dlg.say(['長白袍穿起來，感覺就是不一樣。', '總醫師：「恭喜升上 PGY！PGY 篇正在準備中。」']);
    } else if (data.fromIpass) {
      // 交班後直接回到地圖
    } else if (data.fromBattle) {
      if (shiftComplete()) await this.dlg.say(['今天的病人都看完了！', '下班前記得找總醫師交班。']);
      else if (this.s.energy < 30) await this.dlg.say(['（好累…還有病人要看，撐住！）']);
    }
    if (examEligible() && !this.s.flags.examNotified) {
      this.s.flags.examNotified = true;
      persist();
      await this.dlg.say(['總醫師：「你已經有資格參加升等考了！」', '「準備好就去右下的主治辦公室。」']);
    }
    this.busy = false;
  }

  tileAt(x, y) { return y < 0 || y >= MAP_H || x < 0 || x >= MAP_W ? '#' : MAP[y][x]; }
  npcAt(x, y) { return this.npcs.find(n => n.x === x && n.y === y); }
  blocked(x, y) { return SOLID.has(this.tileAt(x, y)) || !!this.npcAt(x, y); }

  update(time) {
    if (this.busy || this.moving) return;
    const presses = input.poll();
    if (presses.includes('START')) { this.run(() => this.startMenu()); return; }
    if (presses.includes('A')) { this.run(() => this.interact()); return; }
    const taps = presses.filter(k => DELTA[k]);
    const tap = taps[taps.length - 1] || null;
    const held = input.heldDir();
    const d = held || tap;
    if (!d) { this.player.setFrame(frameOf(this.dir, 0)); return; }
    if (!held && tap) {
      if (tap === this.dir) this.step(tap);
      else { this.dir = tap; this.player.setFrame(frameOf(tap, 0)); }
      return;
    }
    if (d !== this.dir) {
      this.dir = d;
      this.player.setFrame(frameOf(d, 0));
      this.turnUntil = time + 90;
      return;
    }
    if (time < this.turnUntil) return;
    this.step(d);
  }

  step(d) {
    const [dx, dy] = DELTA[d];
    const nx = this.px + dx, ny = this.py + dy;
    if (this.blocked(nx, ny)) {
      if (!this.lastBump || this.time.now - this.lastBump > 300) { audio.sfx('bump'); this.lastBump = this.time.now; }
      return;
    }
    this.moving = true;
    this.stepParity = 1 - this.stepParity;
    this.player.setFrame(frameOf(d, 1 + this.stepParity));
    this.player.setDepth(10 + Math.max(this.py, ny));
    this.tweens.add({
      targets: this.player, x: nx * TILE, y: ny * TILE, duration: 150,
      onUpdate: (tw) => { if (tw.progress > 0.5) this.player.setFrame(frameOf(d, 0)); },
      onComplete: () => { this.px = nx; this.py = ny; this.player.setDepth(10 + ny); this.moving = false; },
    });
  }

  async run(fn) {
    this.busy = true;
    try { await fn(); } finally { this.busy = false; this.updateHud(); input.flush(); }
  }

  savePos() { this.s.pos = { x: this.px, y: this.py, dir: this.dir }; }

  go(key, data) {
    this.busy = true;
    this.savePos();
    persist();
    audio.stop();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }

  // ---------- 調查 / 對話 ----------
  async interact() {
    const [dx, dy] = DELTA[this.dir];
    let tx = this.px + dx, ty = this.py + dy;
    let npc = this.npcAt(tx, ty);
    if (!npc && this.tileAt(tx, ty) === 'c') npc = this.npcAt(tx + dx, ty + dy);
    if (npc) {
      npc.dir = OPP[this.dir];
      npc.sp.setFrame(frameOf(npc.dir, 0));
      audio.sfx('cursor');
      await this.talk(npc);
      return;
    }
    const ch = this.tileAt(tx, ty);
    const key = `${tx},${ty}`;
    if (SIGNS[key]) { await this.dlg.say(SIGNS[key]); return; }
    if (ch === 'r') { await this.rest(); return; }
    if (ch === 'L') { await this.examDoor(); return; }
    if (OBJECT_TEXT[ch]) await this.dlg.say(OBJECT_TEXT[ch]);
  }

  patientLine(e) {
    const c = state.cases[e.id];
    const p = { ...c.patient, ...(e.variant || {}) };
    return `第 ${roomNo(e.room)} 診間：${p.name}，${p.age} 歲，${c.patient.cc}。`;
  }

  async talk(npc) {
    const s = this.s;
    const sh = s.shift;
    if (npc.id === 'pt') {
      if (!sh.briefed) { await this.dlg.say(['病人：「醫生，我在等看診…」', '（先去找總醫師晨會，確認今天負責的病人。）']); return; }
      const e = sh.list[npc.idx];
      this.dlg.set(`要幫 ${npc.name} 看診嗎？`);
      if (await yesNo(this)) { this.dlg.hide(); this.go('ClerkBattle', { caseId: e.id, shiftIdx: npc.idx }); }
      else this.dlg.hide();
      return;
    }
    switch (npc.id) {
      case 'chief': {
        if (!sh.briefed) {
          await this.dlg.say([
            `總醫師：「早安！第 ${s.day} 天晨會開始。」`,
            '「今天你負責兩位病人：」',
            ...sh.list.map(e => this.patientLine(e)),
            '「問診、PE 要有重點，檢查不要亂開。看完要跟學長報告診斷和鑑別診斷。」',
          ]);
          sh.briefed = true;
          persist();
        } else if (!shiftComplete()) {
          const left = sh.list.filter(e => !e.done);
          await this.dlg.say(['總醫師：「還有病人在等你喔。」', ...left.map(e => this.patientLine(e))]);
        } else if (sh.ipass == null) {
          this.dlg.set('總醫師：「病人都看完了。要交班了嗎？」');
          if (await yesNo(this)) {
            this.dlg.hide();
            const idx = Math.floor(Math.random() * sh.list.length);
            this.go('Ipass', { idx });
          } else this.dlg.hide();
        } else {
          await this.dlg.say(['總醫師：「今天辛苦了！去值班室的床上休息吧。」']);
        }
        break;
      }
      case 'nurse':
        await this.dlg.say([
          '診區護理師：「Clerk 加油！」',
          '「聽說學長最在意的是：紅旗症狀有沒有問、PE 有沒有做到重點。」',
          '「檢查開太多也會被念喔。」',
        ]);
        break;
      case 'boss':
        await this.dlg.say(['（主治在辦公室裡看論文。）']);
        break;
    }
  }

  async examDoor() {
    const s = this.s;
    if (s.rank !== 'clerk') { await this.dlg.say(['【主治辦公室】', '升等考已經通過了！']); return; }
    if (!examEligible()) {
      await this.dlg.say(['【主治辦公室】升等考', `資格：Lv.10（目前 Lv.${level()}）`, `　　　10 案中 8 案拿到 B 以上（目前 ${passedCount()} 案）`]);
      return;
    }
    this.dlg.set('門上寫著「升等考」。要挑戰嗎？');
    if (await yesNo(this)) { this.dlg.hide(); this.go('ClerkBattle', { caseId: BOSS_CASE }); }
    else this.dlg.hide();
  }

  async rest() {
    if (shiftComplete() && this.s.shift.ipass != null) {
      this.dlg.set('今天的工作都完成了。要下班休息嗎？');
      if (await yesNo(this)) {
        this.dlg.hide();
        this.s.pos = { ...BED_SPOT };
        persist();
        audio.stop();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('DayReport'));
        await wait(this, 2000);
      } else this.dlg.hide();
      return;
    }
    this.dlg.set('還有工作沒完成。要先存檔嗎？');
    if (await yesNo(this)) {
      this.dlg.hide();
      this.savePos();
      persist();
      audio.sfx('save');
      await this.dlg.say(['進度已經存檔。']);
    } else this.dlg.hide();
  }

  // ---------- START 選單 ----------
  async startMenu() {
    audio.sfx('select');
    for (;;) {
      const i = await menu(this, [{ label: '疾病圖鑑' }, { label: '醫師卡' }, { label: '存檔' }, { label: '設定' }, { label: '關閉' }],
        { x: W - 82, y: 20, w: 78 });
      if (i === 0) await this.dex();
      else if (i === 1) await this.card();
      else if (i === 2) {
        this.savePos();
        if (persist()) { audio.sfx('save'); await this.dlg.say(['進度已經存檔！']); }
        else await this.dlg.say(['存檔失敗（瀏覽器可能封鎖了儲存空間）。']);
      } else if (i === 3) { if (await this.settings()) return; }
      else return;
    }
  }

  async dex() {
    const ids = [...CLERK_CASES, BOSS_CASE];
    const items = ids.map((id, k) => {
      const c = state.cases[id];
      const d = this.s.cases[id];
      const caught = d && d.wins > 0;
      return { label: `No.${String(k + 1).padStart(3, '0')} ${caught ? c.dex.name : '？？？？'}`, right: d?.best ? d.best : (d ? '遇過' : ''), id, caught };
    });
    const objs = [makeWindow(this, 2, 2, W - 4, 20, 'paper', 280)];
    objs.push(txt(this, 10, 6, '疾病圖鑑・一般診區', C.ink).setScrollFactor(0).setDepth(281));
    const got = items.filter(x => x.caught).length;
    const cnt = txt(this, 0, 6, `${got}/${items.length}`, '#806040').setScrollFactor(0).setDepth(281);
    cnt.setX(W - 12 - cnt.width);
    objs.push(cnt);
    for (;;) {
      const i = await menu(this, items, { x: 2, y: 24, w: W - 4, visibleRows: 6, depth: 290 });
      if (i < 0) break;
      const it = items[i];
      const c = state.cases[it.id];
      if (it.caught) await this.dlg.say([`${c.dex.name}　${c.dex.en}`, c.dex.desc, `科別：${c.dept}　最佳評價：${this.s.cases[it.id].best}`]);
      else await this.dlg.say(['尚未登錄。', '成功診斷這種疾病（通過）後，就會登錄到圖鑑。']);
    }
    objs.forEach(o => o.destroy());
  }

  async card() {
    const s = this.s;
    const objs = [makeWindow(this, 4, 4, W - 8, H - 8, 'paper', 280)];
    const add = o => { objs.push(o.setScrollFactor(0).setDepth(281)); return o; };
    add(txt(this, 14, 10, '醫師卡', '#806040'));
    add(this.add.sprite(40, 64, 'p_' + s.look, 0).setScale(3));
    const avg = minicexAvg();
    const lines = [
      `職級　${RANK_LABEL[s.rank]}（${rankTitle()}）`,
      `等級　Lv.${level()}　${s.exp} EXP`,
      `天數　第 ${s.day} 天　看診 ${s.plays} 次`,
      `通過　${passedCount()}/10 案（B 以上）`,
      ...MINICEX.map(m => `${m.label.slice(0, 2)}　${bar9(avg[m.key])}`),
    ];
    lines.forEach((l, i) => add(txt(this, 76, 26 + i * 14, l)));
    input.flush();
    for (;;) { const k = await input.next(); if (k === 'A' || k === 'B') break; }
    audio.sfx('cancel');
    objs.forEach(o => o.destroy());
  }

  async settings() {
    for (;;) {
      const items = [{ label: '音效', right: audio.muted ? '關' : '開' }, { label: '刪除存檔' }, { label: '返回' }];
      const i = await menu(this, items, { x: W - 110, y: 20, w: 106 });
      if (i === 0) { audio.setMuted(!audio.muted); syncMuteButton(); }
      else if (i === 1) {
        this.dlg.set('確定要刪除存檔嗎？無法復原。');
        const ok = await menu(this, [{ label: '刪除' }, { label: '取消' }], { x: W - 60, y: 60 });
        this.dlg.hide();
        if (ok === 0) { wipe(); this.scene.start('Title'); return true; }
      } else return false;
    }
  }
}

export function syncMuteButton() {
  const b = document.getElementById('mute');
  if (b) b.textContent = audio.muted ? '✕♪' : '♪';
}
