// 急診室地圖（30 × 20 tiles，每格 16px）
// 圖例：
//  #牆  s告示牌  L上鎖的門  .地板  R急救室地板  y候診區（會遇到病人）  B值班室地毯  o木地板
//  c櫃台  k電腦桌  b病床  m監視器  x隔簾  p盆栽  h候診椅  T CT機  U CT檢查台  r值班床  d入口地墊
const R = (...parts) => parts.join('');

export const MAP = [
  '##############################',
  R('#', 'mbRRmbRR', '#', 'xb.xb.xb.', '#', '..TTT...k', '#'),
  R('#', 'RRRRRRRR', '#', 'x..x..x..', '#', '...U.....', '#'),
  R('#', 'RRRRRRRR', '#', '.........', '#', '.........', '#'),
  R('#', 'RRRRRRRR', '#', '..kk.....', '#', 'p.......p', '#'),
  R('#', 'RRRRRRRR', '#', '.........', '#', '.........', '#'),
  R('#', 'pRRRRRRp', '#', 'p.......p', '#', '.........', '#'),
  R('#', '##sRR###', '#', '###s.####', '#', '###s.####', '#'),
  '#............................#',
  '#............................#',
  R('#', '..p', '.'.repeat(22), 'p..', '#'),
  R('#', '###s.####', '#', '..........', '#', '##sL###', '#'),
  R('#', 'rBBBBBBkk', '#', 'k...yyyyyy', '#', 'ooooooo', '#'),
  R('#', 'rBBBBBBBB', '#', 'ccccyhhhhy', '#', 'ookkkoo', '#'),
  R('#', 'BBBBBBBBB', '#', '....yyyyyy', '#', 'ooooooo', '#'),
  R('#', 'BBBBBBBBB', '#', '....yhhhhy', '#', 'ooooooo', '#'),
  R('#', 'BBBBBBBBB', '#', '....yyyyyy', '#', 'ooooooo', '#'),
  R('#', 'pBBBBBBBp', '#', 'p...yyyyyy', '#', 'ooooooo', '#'),
  R('#', 'BBBBBBBBB', '#', '..........', '#', 'pooooop', '#'),
  R('#'.repeat(15), 'dd', '#'.repeat(13)),
];

export const MAP_W = 30;
export const MAP_H = 20;
export const TILE = 16;

export const SOLID = new Set(['#', 's', 'L', 'c', 'k', 'b', 'm', 'x', 'p', 'h', 'T', 'U', 'r']);
export const FLOORS = new Set(['.', 'R', 'y', 'B', 'o', 'd']);
export const ENCOUNTER = new Set(['y']);

export const START = { x: 15, y: 17, dir: 'UP' };

// NPC：look = 外觀調色盤名稱
export const NPCS = [
  { id: 'nurse', x: 13, y: 12, dir: 'DOWN', look: 'nurse', name: '檢傷護理師' },
  { id: 'senior', x: 13, y: 5, dir: 'DOWN', look: 'senior', name: '學長' },
  { id: 'resus', x: 5, y: 4, dir: 'LEFT', look: 'nurse2', name: '急救室護理師' },
  { id: 'rad', x: 22, y: 4, dir: 'DOWN', look: 'rad', name: '放射師' },
  { id: 'boss', x: 25, y: 15, dir: 'DOWN', look: 'attending', name: '心臟科主治' },
  { id: 'chief', x: 6, y: 9, dir: 'RIGHT', look: 'chief', name: '總醫師' },
];

// 可調查的物件文字（依 tile 字元，或指定座標）
export const SIGNS = {
  '3,7': ['【急救室 Resuscitation】', '重症病人在這裡處置。'],
  '13,7': ['【診間】'],
  '23,7': ['【影像室 X-ray / CT】'],
  '4,11': ['【值班室】', '在床上休息可以存檔，', '並恢復精神值。'],
  '24,11': ['【胸痛館】館主：心臟科主治', '挑戰條件：治癒 6 位胸痛病人。', '（v0.2 開放）'],
};

export const OBJECT_TEXT = {
  L: ['門鎖著。', '門上貼著：「v0.2 開放挑戰」。'],
  k: ['電腦螢幕上是 HIS 系統…', '待看病人清單還有一長串。'],
  b: ['整理乾淨的病床。'],
  m: ['生理監視器正在待機。'],
  x: ['淡綠色的隔簾。'],
  p: ['一盆綠色植物。', '好像很久沒澆水了…'],
  h: ['候診椅。坐滿了等待的病人。'],
  T: ['CT 機器。', '不穩定的病人送進來，', '這裡就成了「死亡隧道」。'],
  U: ['CT 檢查台。'],
  c: ['檢傷櫃台。'],
  d: ['外面是救護車停車場。', '救護車的警笛聲此起彼落…'],
};

// 執行時自我檢查
MAP.forEach((row, i) => {
  if (row.length !== MAP_W) console.error(`MAP row ${i} length ${row.length}`);
});
