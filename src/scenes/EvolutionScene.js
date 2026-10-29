// 進化過場：Clerk → PGY（短白袍換成長白袍）。全部程式即時繪製。
import { audio } from '../audio.js';
import { txt, Dialog, wait, textWidth, W, H } from '../ui.js';
import { state, persist, NEXT_RANK, RANK_LABEL } from '../save.js';
import { bakePlayer } from '../art.js';
import { equipFor } from '../progress.js';

export class EvolutionScene extends Phaser.Scene {
  constructor() { super('Evolution'); }

  create() {
    const s = state.save;
    this.cameras.main.setBackgroundColor('#0e1424');
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.base = s.look.replace(/_[LR]$/, '');
    this.from = s.rank;
    this.to = NEXT_RANK[s.rank] || 'pgy';
    this.toLook = this.base + (this.to === 'pgy' ? '_L' : '_R');
    // 光柱與粒子
    this.beam = this.add.rectangle(W / 2, 0, 40, H * 2, 0xfff4c0, 0).setOrigin(0.5, 0);
    this.glow = this.add.circle(W / 2, 70, 30, 0xfff8d8, 0);
    bakePlayer(this, s.look, equipFor(s), 'p_evo0', null);
    bakePlayer(this, this.toLook, equipFor(s), 'p_evo1', null);
    this.before = this.add.sprite(W / 2, 92, 'p_evo0', 0).setScale(4).setOrigin(0.5, 1);
    this.after = this.add.sprite(W / 2, 92, 'p_evo1', 0).setScale(4).setOrigin(0.5, 1).setAlpha(0);
    this.badge = txt(this, 0, 98, RANK_LABEL[this.from], '#c8d8f0');
    this.badge.setX(Math.round((W - this.badge.width) / 2));
    this.dlg = new Dialog(this);
    audio.stop();
    this.run();
  }

  sparkle(n = 16) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(W / 2 + (Math.random() * 80 - 40), 92, 'spark').setScale(1 + Math.random());
      this.tweens.add({ targets: p, y: 10 + Math.random() * 40, x: p.x + (Math.random() * 60 - 30), alpha: 0, duration: 900 + Math.random() * 700, onComplete: () => p.destroy() });
    }
  }

  async run() {
    await wait(this, 500);
    await this.dlg.say(this.to === 'pgy'
      ? ['主治：「恭喜你通過升等考。」', '主治：「從今天起，你要穿上這件長白袍了。」']
      : ['急診部主任：「恭喜你通過 PGY 升等考。」', '主任：「從今天起你是急診 R1，換上刷手服，急救室見。」']);
    // 光柱升起
    this.tweens.add({ targets: this.beam, fillAlpha: 0.35, duration: 900 });
    this.tweens.add({ targets: this.glow, fillAlpha: 0.5, radius: 46, duration: 1200, yoyo: true, repeat: 2 });
    // 長白袍由上而下披上，閃爍漸快
    audio.sfx('siren');
    let gap = 380;
    for (let i = 0; i < 9; i++) {
      this.after.setAlpha(1); this.before.setAlpha(0);
      audio.sfx('cursor');
      await wait(this, gap * 0.5);
      this.after.setAlpha(0); this.before.setAlpha(1);
      await wait(this, gap * 0.5);
      gap *= 0.78;
      if (i % 2 === 0) this.sparkle(6);
    }
    this.cameras.main.flash(700, 255, 255, 240);
    this.before.setAlpha(0); this.after.setAlpha(1);
    this.badge.setText(RANK_LABEL[this.to]).setColor('#f8e070');
    this.badge.setX(Math.round((W - this.badge.width) / 2));
    this.sparkle(30);
    audio.sfx('heal');
    await wait(this, 400);
    audio.sfx('win');
    this.tweens.add({ targets: this.after, y: 88, duration: 400, yoyo: true, repeat: 1 });
    await wait(this, 900);

    // 寫入存檔
    const s = state.save;
    s.rank = this.to;
    s.look = this.toLook;
    s.flags.evolved = true;
    s.flags['evolved_' + this.to] = true;
    s.flags.examNotified = false;
    if (s.shift && !s.shift.list.some(x => x.done)) s.shift = null;   // 還沒開始看診就改排新職級的班
    s.pos = null;
    persist();

    await this.dlg.say(this.to === 'pgy' ? [
      '★ 恭喜！你從 Clerk 晉升為 PGY！',
      '新指令：處置（給氧、輸液、用藥）與 Disposition。',
      '新區域：急診留觀區（一般診區右邊的紅門）。',
    ] : [
      '★ 恭喜！你從 PGY 晉升為 R1！',
      '新區域：急救室（R1 篇開發中，敬請期待！）',
      '現在可以繼續在急診留觀區值班練習。',
    ]);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map', { evolved: true }));
  }
}
