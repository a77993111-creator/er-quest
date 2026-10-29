import { input } from './input.js';
import { audio } from './audio.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { MapScene, syncMuteButton } from './scenes/MapScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { ReportScene } from './scenes/ReportScene.js';
import { ClerkBattleScene } from './scenes/ClerkBattleScene.js';
import { IpassScene } from './scenes/IpassScene.js';
import { DayReportScene } from './scenes/DayReportScene.js';
import { EvolutionScene } from './scenes/EvolutionScene.js';
import { W, H, FONT } from './ui.js';

async function start() {
  // 先載入像素字型，避免文字用到後備字型
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`12px ${FONT}`, '急診物語'), document.fonts.load(`24px ${FONT}`, '急診物語')]),
      new Promise(r => setTimeout(r, 4000)),
    ]);
  } catch (_) {}

  input.attachKeyboard();
  input.attachButtons(document.getElementById('controls'));

  const mute = document.getElementById('mute');
  syncMuteButton();
  mute.addEventListener('click', () => { audio.unlock(); audio.setMuted(!audio.muted); syncMuteButton(); });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'screen',
    width: W,
    height: H,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { keyboard: false, mouse: false, touch: false },
    audio: { noAudio: true },
    banner: false,
    scene: [BootScene, TitleScene, MapScene, BattleScene, ReportScene, ClerkBattleScene, IpassScene, DayReportScene, EvolutionScene],
  });
  window.__game = game;
  document.getElementById('loading')?.remove();
}

start();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
