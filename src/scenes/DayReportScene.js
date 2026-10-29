// 下班日報：當天看診結果、I-PASS、EXP、Mini-CEX 累積、升等考進度
import { input } from '../input.js';
import { audio } from '../audio.js';
import { txt, wrap, makeWindow, wait, W, H, LINE_H } from '../ui.js';
import { state, persist, level, rankTitle, passedCount, minicexAvg, bar9, nextDay, examEligible, snapshotMinicex, examRule } from '../save.js';
import { afterDay, fx } from '../progress.js';
import { MINICEX } from '../engine/clerkMenus.js';

export class DayReportScene extends Phaser.Scene {
  constructor() { super('DayReport'); }

  create() {
    const s = state.save;
    this.cameras.main.setBackgroundColor('#1a2234');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    makeWindow(this, 2, 2, W - 4, H - 4, 'paper', 10);
    this.add.rectangle(7, 7, W - 14, 16, 0x58a8b0).setOrigin(0).setDepth(11);
    txt(this, 12, 9, `第 ${s.day} 天　日報`, '#ffffff').setDepth(12);
    this.pageNo = txt(this, 0, 9, '', '#ffffff').setDepth(12);

    let notes = [];
    if (s.shift && !s.shift.dayDone) {
      notes = afterDay(s);
      snapshotMinicex(s);
      s.shift.dayDone = true;
      s.shift.dayNotes = notes;
      persist();
    } else notes = s.shift?.dayNotes || [];
    const avg = minicexAvg();
    const results = (s.shift?.list || []).map(x => {
      const c = state.cases[x.id];
      const name = x.variant?.name || c.patient.name;
      return `${name}｜${c.dex.name}　${x.grade ? (x.grade === 'F' ? 'M&M' : x.grade) : '—'}`;
    });
    this.pages = [
      [
        ...results,
        `交班 I-PASS：${s.shift?.ipass ?? '—'} 分`,
        `今日 EXP +${s.today.exp}　白袍幣 +${s.today.coins || 0}（持有 ${s.coins}）`,
        `Lv.${level()}　${rankTitle()}　（${s.exp} EXP）`,
        examRule() ? `升等考：Lv ${Math.min(level(), examRule().lv)}/${examRule().lv}、B 以上 ${passedCount()}/${examRule().need} 案` : '',
        examEligible() ? `★ 已取得升等考資格！到${s.rank === 'clerk' ? '主治辦公室' : '急救室'}挑戰。` : '',
      ].filter(Boolean),
      ['Mini-CEX 累積平均（1–9）', ...MINICEX.map(m => `${m.label.padEnd(4, '　')} ${bar9(avg[m.key])} ${avg[m.key].toFixed(1)}`), '', '明天會優先安排還沒通過的案例。'],
    ];
    if (notes.length) this.pages.splice(1, 0, ['今日獎勵', ...notes]);
    if (fx.chiefGlasses(s)) {
      const past = (s.minicexDaily || []).filter(x => x.day <= s.day - 3).pop();
      const tr = MINICEX.map(m => {
        const now = avg[m.key];
        if (!past) return `${m.label.padEnd(4, '　')} ${now.toFixed(1)}`;
        const d = now - (past.avg[m.key] || 0);
        return `${m.label.padEnd(4, '　')} ${now.toFixed(1)}　${d > 0.05 ? '↑' : d < -0.05 ? '↓' : '→'}${d >= 0 ? '+' : ''}${d.toFixed(1)}`;
      });
      this.pages.push([`主任眼鏡：Mini-CEX 趨勢${past ? `（對比第 ${past.day} 天）` : '（第 3 天後可比較）'}`, ...tr]);
    }
    if (fx.neuron(s)) {
      const pts = (s.shift?.list || []).map(x => state.cases[x.id]).filter(Boolean)
        .map(c => `・${c.dex.name}：${c.teaching[0]}`);
      this.pages.push(['神經元喵：今日學習摘要', ...pts.flatMap(l => wrap(l, 212))].slice(0, 9));
    }
    this.pages = this.pages.map(pg => pg.flatMap(l => (l ? wrap(l, 212) : [''])).slice(0, 9));
    this.body = [];
    for (let i = 0; i < 9; i++) this.body.push(txt(this, 12, 28 + i * LINE_H, '').setDepth(12));
    this.hint = txt(this, 12, H - 19, '', '#9a8a70').setDepth(12);
    this.idx = 0;
    this.render();
    audio.play('title');
    this.run();
  }

  render() {
    const p = this.pages[this.idx];
    this.body.forEach((t, i) => t.setText(p[i] || ''));
    this.pageNo.setText(`${this.idx + 1}/${this.pages.length}`);
    this.pageNo.setX(W - 12 - this.pageNo.width);
    this.hint.setText(this.idx < this.pages.length - 1 ? 'A：下一頁' : 'A：進入下一天');
  }

  async run() {
    input.flush();
    for (;;) {
      const k = await input.next();
      if (k === 'A' && this.idx < this.pages.length - 1) { this.idx++; audio.sfx('cursor'); this.render(); }
      else if (k === 'B' && this.idx > 0) { this.idx--; audio.sfx('cursor'); this.render(); }
      else if (k === 'A') break;
    }
    audio.sfx('save');
    nextDay();
    await wait(this, 200);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map', { newDay: true }));
  }
}
