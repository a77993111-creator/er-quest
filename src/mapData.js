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

// ---------- 急診留觀區（PGY 篇） ----------
// 上方 6 床留觀床（隔簾 x、監視器 m、病床 b），中間護理站，左側紅門回一般診區
const bay = 'mb.x';
export const OBS_MAP = [
  '##############################',
  '#' + bay.repeat(7) + '#',
  '#' + '...x'.repeat(7) + '#',
  '#' + '.'.repeat(28) + '#',
  '#' + '.'.repeat(28) + '#',
  '#' + '.'.repeat(9) + 'ccckkccc' + '.'.repeat(11) + '#',
  '#' + '.'.repeat(28) + '#',
  'E' + '.'.repeat(28) + '#',
  R('#', '..p', '.'.repeat(22), 'p..', '#'),
  R('#', '##s.####', '#', '..........', '#', '##sL####', '#'),
  R('#', 'rBBBBBBB', '#', 'p........p', '#', 'RRRRRRRR', '#'),
  R('#', 'rBBBBBBB', '#', '..hhhhhh..', '#', 'RmbRRbmR', '#'),
  R('#', 'BBBBBBBw', '#', '..........', '#', 'RRRRRRRR', '#'),
  R('#', 'BBBBBBBw', '#', '..hhhhhh..', '#', 'RRRRRRRR', '#'),
  R('#', 'BBBBBBBB', '#', '..........', '#', 'RRRkkRRR', '#'),
  R('#', 'BBBBBBBB', '#', '..hhhhhh..', '#', 'RRRRRRRR', '#'),
  R('#', 'pBBBBBBp', '#', '..........', '#', 'RRRRRRRR', '#'),
  R('#', 'BBBBBBBB', '#', 'p........p', '#', 'pRRRRRRp', '#'),
  R('#', 'BBBBBBBB', '#', '..........', '#', 'RRRRRRRR', '#'),
  '##############################',
];
export const OBS_ROOMS = [0, 1, 2, 3, 4, 5].map(k => ({ no: k + 1, x: 1 + 4 * k }));
export const obsPatientSpot = i => ({ x: OBS_ROOMS[i].x + 2, y: 1 });

export const OBS_NPCS = [
  { id: 'echief', x: 14, y: 6, dir: 'DOWN', look: 'senior', name: '急診總醫師' },
  { id: 'onurse', x: 13, y: 4, dir: 'DOWN', look: 'nurse2', name: '留觀區護理師' },
  { id: 'pboss', x: 24, y: 14, dir: 'DOWN', look: 'chief', name: '急診部主任' },
  { id: 'family', x: 11, y: 12, dir: 'DOWN', look: 'pt_of', name: '等候的家屬' },
];

export const OBS_SIGNS = {
  '3,9': ['【值班室】', '下班後在床上休息，進入下一天。', '右邊的置物櫃可以換裝。'],
  '23,9': ['【急救室】', '升等考在這裡舉行。', 'R1 以上才能獨立負責急救室。'],
};

export const OBS_OBJECT_TEXT = {
  ...OBJECT_TEXT,
  E: ['【一般診區】', '紅門通往一般診區（福利社在那邊）。'],
  x: ['隔簾。病人的隱私很重要。'],
  m: ['監視器上的波形規律地跳動著。'],
  b: ['留觀床。'],
  R: ['急救室的地板擦得很乾淨。'],
};

// 區域設定（MapScene 依此切換）
export const AREAS = {
  clinic: {
    key: 'clinic', name: '一般診區', map: MAP, npcs: NPCS, signs: SIGNS, objectText: OBJECT_TEXT,
    start: START, bed: BED_SPOT, door: { x: 28, y: 8, dir: 'LEFT' }, rooms: ROOMS, spot: roomPatientSpot,
  },
  obs: {
    key: 'obs', name: '急診留觀區', map: OBS_MAP, npcs: OBS_NPCS, signs: OBS_SIGNS, objectText: OBS_OBJECT_TEXT,
    start: { x: 1, y: 7, dir: 'RIGHT' }, bed: { x: 2, y: 11, dir: 'LEFT' }, door: { x: 1, y: 7, dir: 'RIGHT' }, rooms: OBS_ROOMS, spot: obsPatientSpot,
  },
};

for (const [k, a] of Object.entries(AREAS)) {
  if (a.map.length !== MAP_H) console.error(`${k} map has ${a.map.length} rows`);
  a.map.forEach((row, i) => { if (row.length !== MAP_W) console.error(`${k} row ${i} length ${row.length}`); });
}
