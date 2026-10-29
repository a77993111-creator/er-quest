import { input } from '../input.js';
import { audio } from '../audio.js';
import { C } from '../art.js';
import { txt, wrap, makeWindow, menu, W, H, LINE_H } from '../ui.js';
import { state, recordClerk, level, rankTitle, bar9 } from '../save.js';
import { FAIL_REASON } from '../config.js';
import { MINICEX } from '../engine/clerkMenus.js';
import { fx } from '../progress.js';
import { drawEcg, ecgType } from '../ecg.js';

const BODY_LINES = 8;

export class ReportScene extends Phaser.Scene {
  constructor() { super('Report'); }

  create(data) {
    this.d = data;
    const res = data.res;
    const c = state.cases[data.caseId];
    this.cameras.main.setBackgroundColor(res.win ? '#1c2a3a' : '#2a1c24');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const pages = data.kind === 'clerk' ? this.clerkPages(data, res, c) : this.legacyPages(data, res, c);

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

  clerkPages(data, res, c) {
    let levelUp = null, firstDex = false, rec = null;
    const isBoss = !!c.boss;
    if (!data.classroom) {
      const prev = state.save.cases[data.caseId];
      firstDex = res.passed && !(prev && prev.wins > 0);
      rec = recordClerk(res, data.shiftIdx, isBoss);
      if (rec.levelUp) levelUp = `Lv.${rec.levelUp} ${rankTitle()}`;
    }
    const summary = [];
    if (res.reason === 'takeover') summary.push('結果：ECG 太晚，病人惡化，主治接手。');
    else if (!res.dxOk) summary.push(`你的診斷：${res.chosenDx || '未報告'}`);
    summary.push(`正確診斷：${res.correctDx}`);
    summary.push(`推理值 ${res.score}　關鍵特徵 ${res.kf}%`);
    summary.push(`時間 ${res.totalTime}／${res.target} 分`);
    if (isBoss) summary.push(res.passed ? '★ 升等考通過！' : '升等考未通過，隨時可以再挑戰。');
    else if (!res.passed) summary.push(res.dxOk ? '關鍵特徵未達 80% 或分數不足，未通過。' : '診斷錯誤，未通過。');
    if (!data.classroom) summary.push(`獲得 ${res.exp} EXP`);
    if (firstDex) summary.push(`圖鑑登錄：${c.dex.name}！`);
    if (levelUp) summary.push(`升級了！${levelUp}`);
    if (rec) summary.push(`白袍幣 +${rec.coins.coins}（持有 ${state.save.coins}）`);
    const pages = [{ title: res.passed ? '看診完成！' : 'M&M 回顧', lines: summary, grade: res.grade }];
    if (rec && (rec.coins.lines.length || rec.notes.length)) pages.push({ title: '獎勵', lines: [...rec.coins.lines, ...rec.notes] });
    pages.push({ title: 'Mini-CEX 評量（1–9）', lines: MINICEX.map(m => `${m.label.padEnd(4, '　')} ${bar9(res.minicex[m.key])} ${res.minicex[m.key]}`) });
    pages.push({ title: '做得好', lines: res.goods.length ? res.goods.map(g => '○ ' + g) : ['（這次沒有做到關鍵項目）'] });
    pages.push({ title: '待改進', lines: res.deductions.length ? res.deductions.map(d => `－${d.pts}　${d.text}`) : ['（沒有扣分，太棒了！）'] });
    if (res.bossAnswers) pages.push({ title: '考官追問', lines: res.bossAnswers.map(b => `${b.ok ? '○' : '×'} ${b.q}　${b.explain}`) });
    const tl = res.log.map(l => `${String(l.t).padStart(2, '0')}分　${l.label}`);
    pages.push({ title: '你的看診時間軸', lines: tl.length ? tl : ['（沒有任何動作）'] });
    const s = state.save;
    if (fx.ecgStrip(s) && ecgType(c) !== 'sinus') pages.push({ title: '心電蛇：本案 ECG 波形', lines: [], ecg: ecgType(c), hr: c.vitals?.hr || 80 });
    if (fx.pocus(s) && c.pocus) pages.push({ title: 'POCUS 豚：床邊超音波會看到什麼', lines: [c.pocus] });
    pages.push({ title: '教學重點', lines: [`陷阱：${c.trap}`, ...c.teaching.map((t, i) => `${i + 1}. ${t}`)] });
    pages.push({ title: '參考文獻', lines: c.refs });
    return pages;
  }

  legacyPages(data, res, c) {
    const summary = [
      `診斷：${c.dex.name}`,
      `　　　${c.dex.en}`,
      res.decompressAt != null ? `減壓時間：第 ${res.decompressAt} 分鐘` : '減壓時間：未完成',
      `總時間：${res.totalTime} 分鐘　分數：${res.score}`,
    ];
    if (!res.win) summary.push(`原因：${FAIL_REASON[res.reason] || '病人狀況惡化。'}`);
    const pages = [{ title: res.win ? '病例完成！' : 'M&M 回顧', lines: summary, grade: res.grade }];
    pages.push({ title: '做得好', lines: res.goods.length ? res.goods.map(g => '○ ' + g) : ['（這次沒有特別加分的處置）'] });
    const improve = [...res.mistakes.map(m => '× ' + m)];
    if (res.missed.length) improve.push(`漏掉的線索：${res.missed.join('、')}`);
    res.deductions.forEach(d => improve.push('－ ' + d));
    pages.push({ title: '待改進', lines: improve.length ? improve : ['（沒有明顯的失誤，太棒了！）'] });
    const tl = res.log.map(l => `${String(l.t).padStart(2, '0')}分　${l.label}`);
    pages.push({ title: '你的處置時間軸', lines: tl.length ? tl : ['（沒有任何處置）'] });
    pages.push({ title: '教學重點', lines: c.teaching.map((t, i) => `${i + 1}. ${t}`) });
    pages.push({ title: '參考文獻', lines: c.refs });
    return pages;
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
    if (this.ecgG) { this.ecgG.destroy(); this.ecgG = null; }
    if (p.ecg && !p.cont) {
      this.ecgG = this.add.graphics().setDepth(12);
      this.ecgG.fillStyle(0x10201a, 1).fillRect(12, 34, W - 24, 70);
      drawEcg(this.ecgG, 14, 36, W - 28, 66, p.hr, p.ecg, 0, 0x60f080);
      this.body[6].setText(p.ecg === 'af' ? '不規則的 RR 間隔、沒有 P 波 → AF' : 'II、III、aVF ST 上升 → Inferior STEMI');
    }
  }

  async run() {
    input.flush();
    for (;;) {
      const k = await input.next();
      if ((k === 'A' || k === 'RIGHT') && this.idx < this.pages.length - 1) { this.idx++; audio.sfx('cursor'); this.render(); }
      else if ((k === 'B' || k === 'LEFT') && this.idx > 0) { this.idx--; audio.sfx('cursor'); this.render(); }
      else if (k === 'A' && this.idx === this.pages.length - 1) break;
    }
    const d = this.d;
    const res = d.res;
    const isBossPass = d.kind === 'clerk' && !d.classroom && res.passed && state.cases[d.caseId]?.boss;
    let i = 1;
    if (d.classroom) i = await menu(this, [{ label: '再挑戰一次' }, { label: '回到標題' }], { x: W - 104, y: H - 52, w: 100, cancel: false, depth: 50 });
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (d.classroom && i === 0) {
        if (d.kind === 'clerk') this.scene.start('ClerkBattle', { caseId: d.caseId, classroom: true });
        else this.scene.start('Battle', { caseId: d.caseId, mode: d.mode || 'resident', classroom: true });
      } else if (d.classroom) this.scene.start('Title');
      else if (isBossPass) this.scene.start('Evolution', {});
      else this.scene.start('Map', { fromBattle: true, caseId: d.caseId });
    });
  }
}
