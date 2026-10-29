// 一般診區地圖（Clerk 篇，30 × 20 tiles，每格 16px）
// 圖例：
//  #牆  s告示牌  L上鎖的門（主治辦公室）  E急診大門（PGY 以上）
//  .地板  B值班室地毯  o木地板  d入口地墊
//  c櫃台  k電腦桌  b病床  m監視器  p盆栽  h候診椅  r值班床
const R = (...parts) => parts.join('');
const room6 = ['kk.mb.', '......', '......', '......', 'p.....'];
const room7 = ['kk.mb..', '.......', '.......', '.......', 'p......'];

export const MAP = [
  '##############################',
  ...room6.map((_, i) => R('#', room6[i], '#', room6[i], '#', room6[i], '#', room7[i], '#')),
  R('#', '##s.##', '#', '##s.##', '#', '##s.##', '#', '##s.###', '#'),
  '#' + '.'.repeat(28) + '#',
  '#' + '.'.repeat(28) + 'E',
  R('#', '..p', '.'.repeat(22), 'p..', '#'),
  R('#', '##s.####', '#', '..........', '#', '##sL####', '#'),
  R('#', 'rBBBBBkk', '#', 'ccc.......', '#', 'oooooooo', '#'),
  R('#', 'rBBBBBBB', '#', '.......ccc', '#', 'ookkkooo', '#'),
  R('#', 'BBBBBBBw', '#', '..hhhhhh..', '#', 'oooooooo', '#'),
  R('#', 'BBBBBBBw', '#', '..........', '#', 'oooooooo', '#'),
  R('#', 'BBBBBBBB', '#', '..hhhhhh..', '#', 'oooooooo', '#'),
  R('#', 'BBBBBBBB', '#', '..........', '#', 'oooooooo', '#'),
  R('#', 'pBBBBBBp', '#', 'p........p', '#', 'oooooooo', '#'),
  R('#', 'BBBBBBBB', '#', '..........', '#', 'poooooop', '#'),
  R('#'.repeat(14), 'dd', '#'.repeat(14)),
];

export const MAP_W = 30;
export const MAP_H = 20;
export const TILE = 16;

export const SOLID = new Set(['#', 's', 'L', 'E', 'c', 'k', 'b', 'm', 'x', 'p', 'h', 'T', 'U', 'r', 'w']);
export const FLOORS = new Set(['.', 'R', 'y', 'B', 'o', 'd']);
export const ENCOUNTER = new Set([]);

export const START = { x: 14, y: 17, dir: 'UP' };
export const BED_SPOT = { x: 2, y: 12, dir: 'LEFT' };

// 診間：左上角 x（病人站在 x+4, y=2）
export const ROOMS = [
  { no: 1, x: 1 }, { no: 2, x: 8 }, { no: 3, x: 15 }, { no: 4, x: 22 },
];
export const roomPatientSpot = i => ({ x: ROOMS[i].x + 4, y: 2 });

export const NPCS = [
  { id: 'chief', x: 14, y: 8, dir: 'DOWN', look: 'chief', name: '總醫師' },
  { id: 'nurse', x: 13, y: 11, dir: 'DOWN', look: 'nurse', name: '診區護理師' },
  { id: 'boss', x: 24, y: 13, dir: 'DOWN', look: 'attending', name: '一般診區主治' },
  { id: 'shop', x: 18, y: 11, dir: 'DOWN', look: 'shop', name: '福利社阿姨' },
];

export const SIGNS = {
  '3,6': ['【第 1 診間】'],
  '10,6': ['【第 2 診間】'],
  '17,6': ['【第 3 診間】'],
  '24,6': ['【第 4 診間】'],
  '3,10': ['【值班室】', '下班後在床上休息，進入下一天。', '右邊的置物櫃可以換裝。'],
  '23,10': ['【主治辦公室】', '升等考在這裡舉行。'],
};

export const OBJECT_TEXT = {
  E: ['【急診】', '通往留觀區與急救室。', '需要 PGY 以上才能進入。'],
  k: ['電腦螢幕上是 HIS 系統…', '待看病人清單還有一長串。'],
  b: ['整理乾淨的診療床。'],
  m: ['生理監視器正在待機。'],
  p: ['一盆綠色植物。', '好像很久沒澆水了…'],
  h: ['候診椅。坐滿了等待的病人。'],
  c: ['診區服務台。'],
  d: ['外面是醫院大廳。'],
};

MAP.forEach((row, i) => {
  if (row.length !== MAP_W) console.error(`MAP row ${i} length ${row.length}`);
});
