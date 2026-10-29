import { input } from '../input.js';
import { audio } from '../audio.js';
import { C } from '../art.js';
import { txt, textWidth, Dialog, menu, wait, W, H } from '../ui.js';
import { state, hasSave, load, wipe, persist } from '../save.js';
import { CLERK_CASES, BOSS_CASE } from '../engine/clerkMenus.js';
import { GAME_TITLE, GAME_SUBTITLE, VERSION, AUTHOR } from '../config.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.cameras.main.setBackgroundColor('#18203a');
    // 背景格線（監視器感）
    const grid = this.add.graphics();
    grid.fillStyle(0x223058, 1);
    for (let x = 0; x < W; x += 8) grid.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 8) grid.fillRect(0, y, W, 1);

    // 心電圖掃描線
    this.ecg = this.add.graphics();
    this.ecgX = 0;
    this.ecgPts = new Array(W).fill(96);

    // 標題
    const tw = textWidth(GAME_TITLE, 24);
    const tx = Math.round((W - tw) / 2);
    txt(this, tx + 2, 30, GAME_TITLE, '#a02838', 24);
    txt(this, tx, 28, GAME_TITLE, '#f8f8f8', 24);
    const sw = textWidth(GAME_SUBTITLE);
    txt(this, Math.round((W - sw) / 2), 58, GAME_SUBTITLE, C.tealL);
    this.add.image(tx - 14, 36, 'cross').setOrigin(0, 0).setScale(1);
    this.add.image(tx + tw + 5, 36, 'cross').setOrigin(0, 0).setScale(1);

    // 主角們
    const s = state.save || load();
    this.add.sprite(96, 112, 'p_' + (s.look || 'docA'), 0).setScale(2).setOrigin(0.5, 1);
    this.add.sprite(128, 112, 'p_nurse', 0).setScale(2).setOrigin(0.5, 1);
    this.add.sprite(160, 112, 'p_senior', 0).setScale(2).setOrigin(0.5, 1);

    this.press = txt(this, 0, 122, '按 A 開始', '#f8e070');
    this.press.setX(Math.round((W - this.press.width) / 2));
    this.tweens.add({ targets: this.press, alpha: 0, duration: 500, yoyo: true, repeat: -1, hold: 300 });
    txt(this, 4, H - 15, `${VERSION} · ${AUTHOR}`, '#6a7aa0');
    const edu = '教育用途';
    txt(this, W - textWidth(edu) - 4, H - 15, edu, '#6a7aa0');

    audio.play('title');
    this.run();
  }

  update(time) {
    // 心電圖：每幀推進 2px
    for (let k = 0; k < 2; k++) {
      this.ecgX = (this.ecgX + 1) % W;
      const ph = (time / 4 + this.ecgX * 3) % 120;
      let y = 96;
      if (ph > 40 && ph < 44) y = 92;
      else if (ph >= 50 && ph < 52) y = 100;
      else if (ph >= 52 && ph < 55) y = 78;
      else if (ph >= 55 && ph < 57) y = 104;
      else if (ph > 70 && ph < 78) y = 93;
      this.ecgPts[this.ecgX] = y;
    }
    const g = this.ecg;
    g.clear();
    for (let x = 0; x < W; x++) {
      const age = (this.ecgX - x + W) % W;
      if (age > 200) continue;
      const a = 1 - age / 200;
      g.fillStyle(0x58e078, a);
      const y0 = this.ecgPts[x], y1 = this.ecgPts[(x + 1) % W];
      g.fillRect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1);
    }
  }

  async run() {
    for (;;) { const k = await input.next(); if (k === 'A' || k === 'START') break; }
    audio.sfx('select');
    this.press.setVisible(false);
    for (;;) {
      const items = [{ label: '新遊戲' }];
      if (hasSave()) items.push({ label: '繼續遊戲' });
      items.push({ label: '課堂模式' }, { label: '關於本遊戲' });
      const i = await menu(this, items, { x: 74, y: 80, cancel: false });
      const pick = items[i].label;
      if (pick === '新遊戲') { if (await this.newGame()) return; }
      else if (pick === '繼續遊戲') { load(); this.go('Map', {}); return; }
      else if (pick === '課堂模式') { if (await this.classroom()) return; }
      else await this.about();
    }
  }

  async newGame() {
    const dlg = new Dialog(this);
    if (hasSave()) {
      dlg.set('已有存檔。開始新遊戲會覆蓋舊進度，確定嗎？');
      const ok = await menu(this, [{ label: '確定' }, { label: '取消' }], { x: 170, y: 60 });
      if (ok !== 0) { dlg.destroy(); return false; }
    }
    // 外觀
    const shade = this.add.rectangle(0, 0, W, 110, 0x18203a, 0.92).setOrigin(0).setDepth(250);
    const a = this.add.sprite(84, 70, 'p_docA', 0).setScale(3).setDepth(251);
    const b = this.add.sprite(156, 70, 'p_docB', 0).setScale(3).setDepth(251);
    const pickTxt = txt(this, 0, 8, '選擇你的外觀', '#f8f8f8').setDepth(251);
    pickTxt.setX(Math.round((W - pickTxt.width) / 2));
    const sel = this.add.rectangle(84, 52, 54, 60).setStrokeStyle(1, 0xf8e070).setDepth(251);
    dlg.set('左右選擇，A 確定。');
    let look = 0;
    input.flush();
    for (;;) {
      sel.setX(look === 0 ? 84 : 156);
      (look === 0 ? a : b).setFrame(Math.floor(this.time.now / 300) % 2 ? 1 : 2);
      const k = await input.next();
      if (k === 'LEFT' || k === 'RIGHT') { look = 1 - look; audio.sfx('cursor'); }
      else if (k === 'A') { audio.sfx('select'); break; }
      else if (k === 'B') { audio.sfx('cancel'); [shade, a, b, pickTxt, sel].forEach(o => o.destroy()); dlg.destroy(); return false; }
    }
    [a, b, pickTxt, sel].forEach(o => o.destroy());
    await dlg.say([
      '【開始之前】',
      '本遊戲為醫學教育用途，內容為簡化的教學情境，不能作為臨床決策依據。',
      '所有案例皆為虛構，不含任何真實病人資料。',
      '你將從 Clerk 開始，一天看兩位病人，通過升等考後晉升 PGY。',
    ]);
    wipe();
    state.save.look = look === 0 ? 'docA' : 'docB';
    persist();
    this.go('Map', { newGame: true });
    return true;
  }

  async classroom() {
    const dlg = new Dialog(this);
    await dlg.say(['【課堂模式】', '直接選一個病例進入，不影響存檔。', '適合投影到螢幕上，全班一起討論每一步。'], { keep: true });
    const ids = [...CLERK_CASES, BOSS_CASE];
    const items = ids.map(id => { const c = state.cases[id]; return { label: `${c.dept}｜${c.patient.cc}` }; });
    items.push({ label: '進階預覽｜張力性氣胸（Resident）' });
    dlg.set('選擇病例（B 返回）');
    const i = await menu(this, items, { x: 4, y: 4, w: W - 8, visibleRows: 6 });
    dlg.destroy();
    if (i < 0) return false;
    if (i === ids.length) this.go('Battle', { caseId: 'tension-ptx', mode: 'resident', classroom: true });
    else this.go('ClerkBattle', { caseId: ids[i], classroom: true });
    return true;
  }

  async about() {
    const dlg = new Dialog(this);
    await dlg.say([
      `${GAME_TITLE} ${GAME_SUBTITLE} ${VERSION}`,
      `作者：${AUTHOR}`,
      '急診醫師養成像素 RPG：從 Clerk 一路升到主治醫師。',
      '教育用途，非臨床決策依據；案例皆為虛構。',
      '程式碼 MIT 授權；教學內容 CC BY-NC-SA 4.0。',
      '字型：Cubic 11（SIL OFL）。',
      '遊戲引擎：Phaser 3（MIT）。',
      '美術與音樂皆為原創，由程式即時生成。',
    ]);
    dlg.destroy();
  }

  go(key, data) {
    input.flush();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
