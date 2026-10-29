import { input } from '../input.js';
import { audio } from '../audio.js';
import { C } from '../art.js';
import { txt, wrap, makeWindow, menu, W, H, LINE_H } from '../ui.js';
import { state, recordResult, level, rankTitle } from '../save.js';
import { FAIL_REASON } from '../config.js';

const BODY_LINES = 8;

export class ReportScene extends Phaser.Scene {
  constructor() { super('Report'); }

  create(data) {
    this.d = data;
    const res = data.res;
    const c = state.cases[data.caseId];
    this.cameras.main.setBackgroundColor(res.win ? '#1c2a3a' : '#2a1c24');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 寫入存檔（課堂模式不影響存檔）
    let levelUp = null, firstDex = false;
    if (!data.classroom) {
      const before = level();
      const prev = state.save.dex[data.caseId];
      firstDex = res.win && !(prev && prev.wins > 0);
      recordResult(data.caseId, res);
      if (level() > before) levelUp = `Lv.${level()} ${rankTitle()}`;
    }

    // ---- 組裝頁面 ----
    const pages = [];
    const summary = [
      `診斷：${c.dex.name}`,
      `　　　${c.dex.en}`,
      res.decompressAt != null ? `減壓時間：第 ${res.decompressAt} 分鐘` : '減壓時間：未完成',
      `總時間：${res.totalTime} 分鐘　分數：${res.score}`,
    ];
    if (!res.win) summary.push(`原因：${FAIL_REASON[res.reason] || '病人狀況惡化。'}`);
    if (!data.classroom) summary.push(`獲得 ${res.exp} EXP`);
    if (firstDex) summary.push(`圖鑑登錄：No.${String(c.dex.no).padStart(3, '0')} ${c.dex.name}！`);
    if (levelUp) summary.push(`升級了！${levelUp}`);
    pages.push({ title: res.win ? '病例完成！' : 'M&M 回顧', lines: summary, grade: res.grade });

    pages.push({ title: '做得好', lines: res.goods.length ? res.goods.map(g => '○ ' + g) : ['（這次沒有特別加分的處置）'] });

    const improve = [...res.mistakes.map(m => '× ' + m)];
    if (res.missed.length) improve.push(`漏掉的線索：${res.missed.join('、')}`);
    res.deductions.forEach(d => improve.push('－ ' + d));
    pages.push({ title: '待改進', lines: improve.length ? improve : ['（沒有明顯的失誤，太棒了！）'] });

    const tl = res.log.map(l => `${String(l.t).padStart(2, '0')}分　${l.label}`);
    pages.push({ title: '你的處置時間軸', lines: tl.length ? tl : ['（沒有任何處置）'] });

    pages.push({ title: '教學重點', lines: c.teaching.map((t, i) => `${i + 1}. ${t}`) });
    pages.push({ title: '參考文獻', lines: c.refs });

    // 依頁面高度自動拆頁
    this.pages = [];
    for (const p of pages) {
      const maxW = p.grade ? 170 : 212;
      const wrapped = [];
      p.lines.forEach(l => wrapped.push(...wrap(l, maxW)));
      for (let i = 0; i < Math.max(1, wrapped.length); i += BODY_LINES) {
        this.pages.push({ ...p, body: wrapped.slice(i, i + BODY_LINES), cont: i > 0 });
      }
    }

    makeWindow(this, 2, 2, W - 4, H - 4, 'paper', 10);
    this.bar = this.add.rectangle(7, 7, W - 14, 16, res.win ? 0x58a8b0 : 0xb85060).setOrigin(0).setDepth(11);
    this.title = txt(this, 12, 9, '', '#ffffff').setDepth(12);
    this.pageNo = txt(this, 0, 9, '', '#ffffff').setDepth(12);
    this.body = [];
    for (let i = 0; i < BODY_LINES; i++) this.body.push(txt(this, 12, 28 + i * LINE_H, '').setDepth(12));
    this.gradeTxt = txt(this, 196, 44, '', '#c84848', 24).setDepth(12);
    this.gradeLbl = txt(this, 192, 30, '評價', '#806040').setDepth(12);
    this.hint = txt(this, 12, H - 19, '', '#9a8a70').setDepth(12);

    audio.sfx(res.win ? 'win' : 'fail');
    this.idx = 0;
    this.render();
    this.run();
  }

  render() {
    const p = this.pages[this.idx];
    this.title.setText(p.title + (p.cont ? '（續）' : ''));
    this.pageNo.setText(`${this.idx + 1}/${this.pages.length}`);
    this.pageNo.setX(W - 12 - this.pageNo.width);
    this.body.forEach((t, i) => t.setText(p.body[i] || ''));
    const showGrade = !!p.grade && !p.cont;
    this.gradeTxt.setVisible(showGrade).setText(p.grade === 'F' ? 'M&M' : p.grade);
    this.gradeTxt.setFontSize(p.grade === 'F' ? 12 : 24);
    this.gradeLbl.setVisible(showGrade);
    this.hint.setText(this.idx < this.pages.length - 1 ? 'B ←　→ A' : 'A：繼續');
  }

  async run() {
    input.flush();
    for (;;) {
      const k = await input.next();
      if ((k === 'A' || k === 'RIGHT') && this.idx < this.pages.length - 1) { this.idx++; audio.sfx('cursor'); this.render(); }
      else if ((k === 'B' || k === 'LEFT') && this.idx > 0) { this.idx--; audio.sfx('cursor'); this.render(); }
      else if (k === 'A' && this.idx === this.pages.length - 1) break;
    }
    const back = this.d.classroom ? '回到標題' : '回到急診室';
    const i = await menu(this, [{ label: '再挑戰一次' }, { label: back }], { x: W - 104, y: H - 52, w: 100, cancel: false, depth: 50 });
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (i === 0) this.scene.start('Battle', { caseId: this.d.caseId, mode: this.d.mode, classroom: this.d.classroom });
      else if (this.d.classroom) this.scene.start('Title');
      else this.scene.start('Map', { fromBattle: true });
    });
  }
}
