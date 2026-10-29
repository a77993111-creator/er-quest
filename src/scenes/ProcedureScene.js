// Procedure 小遊戲場景：護理師請求 → 小遊戲 → 安全重點題 → 評價與獎勵
import { audio } from '../audio.js';
import { input } from '../input.js';
import { txt, Dialog, chooseLong, makeWindow, wait, shuffle, wrap, W, H, LINE_H } from '../ui.js';
import { state, persist, level, rankTitle } from '../save.js';
import { PROC_BY_ID, PROC_REWARD, procGrade } from '../procedures/data.js';
import { GAMES } from '../procedures/games.js';
import { fx, addCoins } from '../progress.js';

export class ProcedureScene extends Phaser.Scene {
  constructor() { super('Procedure'); }

  create(data) {
    this.d = data;
    this.p = PROC_BY_ID[data.pid];
    this.cameras.main.setBackgroundColor('#1a2234');
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.add.rectangle(0, 0, W, 16, 0x28405a).setOrigin(0).setDepth(50);
    const title = txt(this, 6, 2, `Procedure｜${this.p.name}`, '#ffffff').setDepth(51);
    const en = txt(this, 0, 2, this.p.en, '#a8c8e0').setDepth(51);
    en.setX(W - 6 - en.width);
    if (title.x + title.width + 8 > en.x) en.setVisible(false);
    this.dlg = new Dialog(this);
    audio.play('battle');
    this.run();
  }

  async run() {
    const p = this.p;
    const s = state.save;
    await wait(this, 300);
    await this.dlg.say([`護理師：${this.d.ask || p.asks[0]}`, `【${p.name}】開始！`]);
    const game = await GAMES[p.id](this);
    // 安全重點題
    const op = shuffle(p.quiz.options);
    const k = await chooseLong(this, this.dlg, `安全重點：${p.quiz.q}`, op);
    const quizOk = op[k] === p.quiz.options[0];
    audio.sfx(quizOk ? 'good' : 'bad');
    await this.dlg.say([quizOk ? '○ 答對了！' : `× 正確答案：${p.quiz.options[0]}`, p.quiz.explain]);
    const score = Math.round(game.score * 0.8 + (quizOk ? 20 : 0));
    const grade = procGrade(score);

    // 獎勵與紀錄
    const [c0, exp] = PROC_REWARD[grade];
    const coins = Math.round(c0 * fx.coinMult(s));
    const lvBefore = level();
    addCoins(s, coins);
    s.exp += exp;
    s.energy = Math.max(0, s.energy - 5);
    s.procs = s.procs || {};
    const rec = s.procs[p.id] || { n: 0, best: null };
    const RANK = { S: 5, A: 4, B: 3, C: 2, F: 1 };
    rec.n += 1;
    if (!rec.best || RANK[grade] > RANK[rec.best]) rec.best = grade;
    s.procs[p.id] = rec;
    s.today = s.today || { exp: 0, coins: 0, results: [] };
    s.today.exp += exp;
    s.today.coins = (s.today.coins || 0) + coins;
    s.today.procs = [...(s.today.procs || []), { id: p.id, grade }];
    persist();

    // 結果頁
    audio.sfx(grade === 'F' ? 'fail' : 'win');
    const objs = [makeWindow(this, 2, 18, W - 4, 92, 'paper', 60)];
    const add = o => { objs.push(o.setDepth(61)); return o; };
    add(txt(this, 12, 24, `${p.name}　完成`, '#806040'));
    const lines = [...game.lines, quizOk ? '○ 安全重點答對。' : '× 安全重點答錯。', `分數 ${score}　白袍幣 +${coins}　EXP +${exp}`];
    lines.flatMap(l => wrap(l, 180)).slice(0, 5).forEach((l, i) => add(txt(this, 12, 40 + i * LINE_H, l)));
    add(txt(this, 198, 34, '評價', '#806040'));
    add(txt(this, 200, 50, grade === 'F' ? 'F' : grade, grade === 'F' ? '#808080' : '#c84848', 24));
    const lv = level();
    const tail = lv > lvBefore ? [`升級了！Lv.${lv} ${rankTitle()}`] : [];
    await this.dlg.say(['教學重點：', ...p.teach, ...tail]);
    objs.forEach(o => o.destroy());
    input.flush();
    audio.stop();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map', { fromProc: true }));
  }
}
