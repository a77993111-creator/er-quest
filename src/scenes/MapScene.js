import { input } from '../input.js';
import { audio } from '../audio.js';
import { C, DIR_ORDER } from '../art.js';
import { MAP, MAP_W, MAP_H, TILE, SOLID, ENCOUNTER, START, NPCS, SIGNS, OBJECT_TEXT } from '../mapData.js';
import { txt, Dialog, menu, yesNo, makeWindow, wait, W, H, wrap } from '../ui.js';
import { state, persist, wipe, level, rankTitle, MODE_LABEL } from '../save.js';
import { DEX_SLOTS } from '../config.js';

const DELTA = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
const OPP = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
const frameOf = (dir, f) => DIR_ORDER.indexOf(dir) * 3 + f;

export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create(data) {
    this.s = state.save;
    this.busy = true;
    this.moving = false;
    this.stepParity = 0;
    this.turnUntil = 0;

    this.add.image(0, 0, 'map').setOrigin(0, 0).setDepth(0);

    this.npcs = NPCS.map(n => {
      const sp = this.add.sprite(n.x * TILE, n.y * TILE, 'p_' + n.look, frameOf(n.dir, 0)).setOrigin(0, 0).setDepth(10 + n.y);
      return { ...n, sp };
    });

    const p = this.s.pos || START;
    this.px = p.x; this.py = p.y; this.dir = p.dir || 'UP';
    this.player = this.add.sprite(this.px * TILE, this.py * TILE, 'p_' + this.s.look, frameOf(this.dir, 0))
      .setOrigin(0, 0).setDepth(10 + this.py);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.startFollow(this.player, true, 1, 1, -8, -8);
    cam.setRoundPixels(true);
    cam.fadeIn(300, 0, 0, 0);

    this.dlg = new Dialog(this);
    audio.play('map');

    // 偶爾讓 NPC 轉頭，讓畫面有生氣
    this.time.addEvent({
      delay: 2200, loop: true, callback: () => {
        if (this.busy) return;
        const n = Phaser.Utils.Array.GetRandom(this.npcs.filter(x => x.id !== 'nurse'));
        n.dir = Phaser.Utils.Array.GetRandom(DIR_ORDER);
        n.sp.setFrame(frameOf(n.dir, 0));
      },
    });

    this.intro(data || {});
  }

  async intro(data) {
    await wait(this, 350);
    if (data.newGame) {
      await this.dlg.say([
        '（急診的自動門打開了…）',
        '總醫師：「歡迎來到急診！今天起你就是急診的一員。」',
        '「先去入口旁的檢傷站，找護理師報到吧！」',
        '【操作】方向鍵移動　A：對話／確認　B：取消　START：選單',
      ]);
    } else if (data.fromBattle) {
      if (this.s.energy < 30) await this.dlg.say(['（好累…去值班室休息一下吧。）']);
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
    // 按住方向鍵：連續走；快速點一下：面向同方向就走一格，否則只轉身
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
      onComplete: () => {
        this.px = nx; this.py = ny;
        this.player.setDepth(10 + ny);
        this.moving = false;
        this.afterStep();
      },
    });
  }

  afterStep() {
    const t = this.tileAt(this.px, this.py);
    if (ENCOUNTER.has(t) && this.s.flags.tutorial && Math.random() < 0.12) {
      this.run(() => this.encounter());
    }
  }

  async run(fn) {
    this.busy = true;
    try { await fn(); } finally { this.busy = false; input.flush(); }
  }

  // ---------- 調查 / 對話 ----------
  async interact() {
    const [dx, dy] = DELTA[this.dir];
    let tx = this.px + dx, ty = this.py + dy;
    let npc = this.npcAt(tx, ty);
    if (!npc && this.tileAt(tx, ty) === 'c') npc = this.npcAt(tx + dx, ty + dy); // 隔著櫃台說話
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
    if (OBJECT_TEXT[ch]) await this.dlg.say(OBJECT_TEXT[ch]);
  }

  async talk(npc) {
    const s = this.s;
    const won = Object.values(s.dex).some(d => d.wins > 0);
    switch (npc.id) {
      case 'nurse':
        if (!s.flags.tutorial) {
          await this.dlg.say([
            '檢傷護理師：「你就是新來的醫師吧？」',
            '「入口這邊的黃色區域是候診區，走進去隨時會有病人找上你。」',
            '「也可以直接跟我說，我幫你叫下一位病人。」',
          ]);
          s.flags.tutorial = true;
          persist();
        }
        this.dlg.set('檢傷護理師：「要看下一位病人嗎？」');
        if (await yesNo(this)) { this.dlg.hide(); await this.encounter(); }
        else await this.dlg.say(['「好，準備好再跟我說。」']);
        break;
      case 'senior':
        await this.dlg.say(won
          ? ['學長：「聽說你處理了張力性氣胸，做得不錯！」', '「記住：臨床診斷，不等影像。」']
          : [
            '學長：「急診看病就像一場對戰。」',
            '「問診、理學檢查、檢查、處置——每個指令都會花時間。」',
            '「病人不會等你。監視器上的數字要一直盯著。」',
            '「卡住就按『呼叫學長』，不過會扣分喔。」',
          ]);
        break;
      case 'resus':
        await this.dlg.say(['急救室護理師：「胸管包、穿刺針、插管盤都準備好了！」', '「需要的話隨時把病人推進來。」']);
        break;
      case 'rad':
        await this.dlg.say(['放射師：「不穩定的病人不要送來 CT 喔。」', '「這台機器被叫作『死亡隧道』不是沒有原因的。」']);
        break;
      case 'chief':
        await this.dlg.say([
          '總醫師：「按 START 可以打開選單：圖鑑、醫師卡、存檔。」',
          `「你現在的精神值是 ${s.energy}／100。」`,
          s.energy < 50 ? '「看起來很累了，去左下的值班室休息吧。」' : '「看起來還很有精神！」',
        ]);
        break;
      case 'boss':
        await this.dlg.say(['心臟科主治：「胸痛館的挑戰還沒開放。」']);
        break;
    }
  }

  async rest() {
    this.dlg.set('要休息一下嗎？（恢復精神值並存檔）');
    if (!(await yesNo(this))) { this.dlg.hide(); return; }
    this.dlg.hide();
    const cam = this.cameras.main;
    cam.fadeOut(400, 0, 0, 0);
    await wait(this, 500);
    this.s.energy = 100;
    this.savePos();
    persist();
    audio.sfx('heal');
    await wait(this, 600);
    cam.fadeIn(400, 0, 0, 0);
    await wait(this, 400);
    audio.sfx('save');
    await this.dlg.say(['精神值完全恢復了！', '進度已經存檔。']);
  }

  savePos() { this.s.pos = { x: this.px, y: this.py, dir: this.dir }; }

  // ---------- 遇到病人 ----------
  async encounter() {
    this.busy = true;
    this.savePos();
    persist();
    audio.stop();
    audio.sfx('siren');
    const mark = txt(this, this.player.x + 5, this.player.y - 14, '！', C.red).setDepth(500);
    await wait(this, 500);
    mark.destroy();
    const cam = this.cameras.main;
    for (let i = 0; i < 3; i++) { cam.flash(120, 255, 255, 255); await wait(this, 180); }
    // 橫條轉場
    const g = this.add.graphics().setScrollFactor(0).setDepth(900);
    for (let k = 0; k <= 10; k++) {
      g.clear(); g.fillStyle(0x000000, 1);
      for (let row = 0; row < H; row += 16) {
        const w = (W * k) / 10;
        if ((row / 16) % 2) g.fillRect(W - w, row, w, 16); else g.fillRect(0, row, w, 16);
      }
      await wait(this, 30);
    }
    this.scene.start('Battle', { caseId: 'tension-ptx', mode: this.s.mode });
  }

  // ---------- START 選單 ----------
  async startMenu() {
    audio.sfx('select');
    for (;;) {
      const i = await menu(this, [{ label: '疾病圖鑑' }, { label: '醫師卡' }, { label: '存檔' }, { label: '設定' }, { label: '關閉' }],
        { x: W - 82, y: 4, w: 78, keep: false });
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
    const items = DEX_SLOTS.map(slot => {
      const d = this.s.dex[slot.id];
      const c = state.cases[slot.id];
      const caught = d && d.wins > 0 && c;
      const no = 'No.' + String(slot.no).padStart(3, '0');
      return { label: `${no} ${caught ? c.dex.name : '？？？？'}`, right: caught ? (d.best || '') : (d ? '遇過' : ''), slot, caught };
    });
    const objs = [makeWindow(this, 2, 2, W - 4, 20, 'paper', 280)];
    objs.push(txt(this, 10, 6, '疾病圖鑑・胸痛館', C.ink).setScrollFactor(0).setDepth(281));
    const got = items.filter(x => x.caught).length;
    objs.push(txt(this, W - 52, 6, `${got}/${items.length}`, '#806040').setScrollFactor(0).setDepth(281));
    for (;;) {
      const i = await menu(this, items, { x: 2, y: 24, w: W - 4, visibleRows: 6, depth: 290 });
      if (i < 0) break;
      const it = items[i];
      if (it.caught) {
        const c = state.cases[it.slot.id];
        await this.dlg.say([`${c.dex.name} ${c.dex.en}`, c.dex.desc, `最佳評價：${this.s.dex[it.slot.id].best}　治療次數：${this.s.dex[it.slot.id].wins}`]);
      } else await this.dlg.say(['尚未登錄。', '成功治療這種疾病的病人，就會登錄到圖鑑。']);
    }
    objs.forEach(o => o.destroy());
  }

  async card() {
    const s = this.s;
    const objs = [makeWindow(this, 8, 8, W - 16, H - 16, 'paper', 280)];
    const add = o => { objs.push(o.setScrollFactor(0).setDepth(281)); return o; };
    add(txt(this, 18, 14, '醫師卡', '#806040'));
    add(this.add.sprite(52, 64, 'p_' + s.look, 0).setScale(3));
    const caught = Object.values(s.dex).filter(d => d.wins > 0).length;
    const lines = [
      `模式　${MODE_LABEL[s.mode]}`,
      `等級　Lv.${level()} ${rankTitle()}`,
      `經驗　${s.exp} EXP`,
      `精神　${s.energy}／100`,
      `圖鑑　${caught}／${DEX_SLOTS.length}`,
      `看診　${s.plays} 位病人`,
    ];
    lines.forEach((l, i) => add(txt(this, 92, 32 + i * 15, l)));
    add(txt(this, 18, 112, '徽章'));
    add(this.add.image(52, 118, 'badge0').setOrigin(0, 0));
    add(txt(this, 70, 112, '胸痛館（尚未取得）', '#9a8a70'));
    input.flush();
    for (;;) { const k = await input.next(); if (k === 'A' || k === 'B') break; }
    audio.sfx('cancel');
    objs.forEach(o => o.destroy());
  }

  // 回傳 true 表示已離開場景
  async settings() {
    for (;;) {
      const s = this.s;
      const items = [
        { label: '切換模式', right: s.mode === 'clerk' ? 'Clerk' : 'Resident' },
        { label: '音效', right: audio.muted ? '關' : '開' },
        { label: '刪除存檔' },
        { label: '返回' },
      ];
      const i = await menu(this, items, { x: W - 130, y: 4, w: 126 });
      if (i === 0) {
        s.mode = s.mode === 'clerk' ? 'resident' : 'clerk';
        persist();
        await this.dlg.say([`已切換為 ${MODE_LABEL[s.mode]}。`, s.mode === 'clerk' ? '著重問診、理學檢查與報告。' : '親自處置，時間壓力更大！']);
      } else if (i === 1) {
        audio.setMuted(!audio.muted);
        syncMuteButton();
      } else if (i === 2) {
        this.dlg.set('確定要刪除存檔嗎？無法復原。');
        const ok = await menu(this, [{ label: '刪除' }, { label: '取消' }], { x: W - 60, y: 60 });
        this.dlg.hide();
        if (ok === 0) {
          wipe();
          this.scene.start('Title');
          return true;
        }
      } else return false;
    }
  }
}

export function syncMuteButton() {
  const b = document.getElementById('mute');
  if (b) b.textContent = audio.muted ? '✕♪' : '♪';
}
