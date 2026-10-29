// 交班小關卡（I-PASS）：五個欄位各選出最適合的一句
import { audio } from '../audio.js';
import { C } from '../art.js';
import { txt, Dialog, makeWindow, chooseLong, wait, shuffle, W } from '../ui.js';
import { state, recordIpass } from '../save.js';

const SLOTS = [
  { key: 'I', title: 'I — Illness severity（病情嚴重度）', hint: '這位病人目前有多不穩定？' },
  { key: 'P', title: 'P — Patient summary（病人摘要）', hint: '用一兩句話說清楚：誰、什麼問題、目前判斷。' },
  { key: 'A', title: 'A — Action list（待辦事項）', hint: '接班的人接下來要做什麼？' },
  { key: 'S', title: 'S — Situation awareness（狀況預警）', hint: '如果怎樣，要怎麼處理？' },
];

export class IpassScene extends Phaser.Scene {
  constructor() { super('Ipass'); }

  create(data) {
    this.cameras.main.setBackgroundColor('#20283a');
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const s = state.save;
    this.entry = s.shift.list[data.idx ?? 0];
    this.c = state.cases[this.entry.id];
    const name = this.entry.variant?.name || this.c.patient.name;
    // 背景：交班白板
    makeWindow(this, 16, 40, W - 32, 60, 'normal', 5);
    txt(this, 28, 50, `交班白板`, '#5a6a80').setDepth(6);
    txt(this, 28, 66, `${name}｜${this.c.dex.name}`, C.ink).setDepth(6);
    this.dlg = new Dialog(this);
    this.score = 0;
    audio.play('title');
    this.name = name;
    this.run();
  }

  async run() {
    const ip = this.c.ipass;
    await this.dlg.say(['總醫師：「下班前要交班。」', `「用 I-PASS 把 ${this.name} 交給夜班學長。」`, '每一欄選出最適合的一句，游標移動時下方會顯示全文。']);
    for (const slot of SLOTS) {
      const opts = shuffle(ip[slot.key]);
      const k = await chooseLong(this, this.dlg, `${slot.title}\n${slot.hint}`, opts);
      const ok = opts[k] === ip[slot.key][0];
      if (ok) { this.score += 20; audio.sfx('good'); await this.dlg.say(['○ 很好。']); }
      else { audio.sfx('bad'); await this.dlg.say(['× 比較好的說法是：', ip[slot.key][0]]); }
    }
    // Synthesis by receiver
    await this.dlg.say(['夜班學長：', ip.said]);
    const opts = shuffle(ip.err);
    const k = await chooseLong(this, this.dlg, `S — Synthesis by receiver\n學長複述：${ip.said}`, opts);
    if (opts[k] === ip.err[0]) { this.score += 20; audio.sfx('good'); await this.dlg.say(['○ 抓到了！交班就是要確認對方聽懂。']); }
    else { audio.sfx('bad'); await this.dlg.say(['× 錯誤其實是：', ip.err[0]]); }

    const r = recordIpass(this.score);
    audio.sfx(this.score >= 80 ? 'win' : 'save');
    const lines = [`交班完成！I-PASS ${this.score} 分，獲得 ${r.gain} EXP。`];
    if (r.coins) lines.push(`完美交班：白袍幣 +${r.coins}`);
    if (r.notes.length) { lines.push(...r.notes); }
    lines.push('總醫師：「辛苦了，去值班室休息吧。」');
    await this.dlg.say(lines);
    await wait(this, 200);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map', { fromIpass: true }));
  }
}
