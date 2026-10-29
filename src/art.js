// 全部美術以程式即時繪製（原創像素圖），不使用外部圖檔
import { MAP, MAP_W, MAP_H, TILE, FLOORS } from './mapData.js';

// ---------- 調色盤 ----------
export const C = {
  ink: '#283040',
  white: '#f8f8f8',
  floor: '#e6eaf0', floor2: '#dde3ec', grout: '#c6cedb',
  resus: '#f0d6d6', resus2: '#ead0d0', resusG: '#d8b4b4',
  wait: '#f2e2a2', wait2: '#ecdb96', waitG: '#d6bf6c',
  carpet: '#9cb4e0', carpet2: '#8ea8d8',
  wood: '#d8a868', wood2: '#c89858', woodL: '#b08048',
  wallTop: '#3c4560', wallTopL: '#56607c', wallFace: '#d4dae6', wallLine: '#c0c8d8', base: '#7e88a4',
  teal: '#58a8b0', tealD: '#3e8088', tealL: '#88c8cc',
  red: '#d84848', green: '#48a050', greenD: '#2e7838',
};

// 人物外觀
export const LOOKS = {
  docA:      { hair: '#3a2c24', skin: '#f6cfa6', top: '#f8f8f8', topD: '#c6cedc', pants: '#46587a', shoe: '#2a2a30', acc: '#5a6a80', style: 'short' },
  docB:      { hair: '#5a3424', skin: '#f6cfa6', top: '#f8f8f8', topD: '#c6cedc', pants: '#46587a', shoe: '#2a2a30', acc: '#5a6a80', style: 'long' },
  nurse:     { hair: '#2a2018', skin: '#f2c8a0', top: '#f2a2b8', topD: '#d08098', pants: '#f2a2b8', shoe: '#f8f8f8', acc: '#f8f8f8', style: 'bun', cap: true },
  nurse2:    { hair: '#4a3020', skin: '#eec09a', top: '#80c8d8', topD: '#5aa0b0', pants: '#80c8d8', shoe: '#f8f8f8', acc: '#f8f8f8', style: 'bun' },
  senior:    { hair: '#1e1e24', skin: '#eec49c', top: '#5878c8', topD: '#4060a0', pants: '#5878c8', shoe: '#2a2a30', acc: '#9aa8b8', style: 'short' },
  rad:       { hair: '#3a3028', skin: '#f0c8a0', top: '#70b088', topD: '#508868', pants: '#506070', shoe: '#2a2a30', acc: '#e0d040', style: 'short' },
  attending: { hair: '#6a6a72', skin: '#eec49c', top: '#f8f8f8', topD: '#c6cedc', pants: '#383848', shoe: '#1a1a20', acc: '#c83838', style: 'short', glasses: true, tie: true },
  chief:     { hair: '#2a2420', skin: '#f0c49c', top: '#f8f8f8', topD: '#c6cedc', pants: '#605048', shoe: '#2a2a30', acc: '#4a90d0', style: 'long' },
};

// ---------- 基本繪圖 ----------
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}
function r(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
function dot(ctx, x, y, col) { r(ctx, x, y, 1, 1, col); }
function ellipse(ctx, cx, cy, rx, ry, col) {
  ctx.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(cx - w, cy + y, w * 2, 1);
  }
}

// 對不透明區域外圍描 1px 深色外框
function outline(ctx, w, h, col = C.ink) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (op(x, y)) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) add.push([x, y]);
  }
  ctx.fillStyle = col;
  add.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
}

// ---------- 地圖 tile ----------
const isWall = ch => ch === '#' || ch === 's' || ch === 'L';
const at = (x, y) => (y < 0 || y >= MAP_H || x < 0 || x >= MAP_W ? '#' : MAP[y][x]);

function baseFor(x, y) {
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1], [1, 1], [-1, 1]]) {
    const c = at(x + dx, y + dy);
    if (FLOORS.has(c) && c !== 'd') return c;
  }
  return '.';
}

function drawFloor(ctx, ch, x, y, ox, oy) {
  const alt = (x + y) % 2 === 0;
  switch (ch) {
    case 'R':
      r(ctx, ox, oy, 16, 16, alt ? C.resus : C.resus2);
      r(ctx, ox, oy + 15, 16, 1, C.resusG); r(ctx, ox + 15, oy, 1, 16, C.resusG);
      break;
    case 'y':
      r(ctx, ox, oy, 16, 16, alt ? C.wait : C.wait2);
      r(ctx, ox, oy + 15, 16, 1, C.waitG); r(ctx, ox + 15, oy, 1, 16, C.waitG);
      // 像草叢一樣的小紋理
      [[3, 4], [10, 9], [6, 12], [12, 3]].forEach(([a, b]) => { dot(ctx, ox + a, oy + b, C.waitG); dot(ctx, ox + a + 1, oy + b - 1, C.waitG); });
      break;
    case 'B':
      r(ctx, ox, oy, 16, 16, C.carpet);
      for (let i = 0; i < 16; i += 4) for (let j = (i / 4) % 2 ? 2 : 0; j < 16; j += 4) dot(ctx, ox + j, oy + i, C.carpet2);
      break;
    case 'o':
      r(ctx, ox, oy, 16, 16, C.wood);
      r(ctx, ox, oy + 7, 16, 1, C.woodL); r(ctx, ox, oy + 15, 16, 1, C.woodL);
      r(ctx, ox + ((y % 2) ? 5 : 11), oy, 1, 7, C.woodL); r(ctx, ox + ((y % 2) ? 12 : 3), oy + 8, 1, 7, C.woodL);
      r(ctx, ox + 1, oy + 2, 3, 1, C.wood2);
      break;
    case 'd':
      r(ctx, ox, oy, 16, 16, '#5c6880');
      for (let i = 2; i < 16; i += 3) r(ctx, ox + 1, oy + i, 14, 1, '#76829a');
      break;
    default:
      r(ctx, ox, oy, 16, 16, alt ? C.floor : C.floor2);
      r(ctx, ox, oy + 15, 16, 1, C.grout); r(ctx, ox + 15, oy, 1, 16, C.grout);
      dot(ctx, ox + 1, oy + 1, C.white);
  }
}

function drawWall(ctx, ch, x, y, ox, oy) {
  const below = at(x, y + 1);
  if (isWall(below) || y === MAP_H - 1) {
    r(ctx, ox, oy, 16, 16, C.wallTop);
    r(ctx, ox, oy, 16, 1, C.wallTopL);
    return;
  }
  r(ctx, ox, oy, 16, 4, C.wallTop);
  r(ctx, ox, oy, 16, 1, C.wallTopL);
  r(ctx, ox, oy + 4, 16, 9, C.wallFace);
  r(ctx, ox + ((x % 2) ? 3 : 11), oy + 5, 1, 8, C.wallLine);
  r(ctx, ox, oy + 13, 16, 3, C.base);
  r(ctx, ox, oy + 13, 16, 1, '#98a2bc');
  if (ch === 's') {
    r(ctx, ox + 2, oy + 4, 12, 8, C.ink);
    r(ctx, ox + 3, oy + 5, 10, 6, '#f6eed0');
    r(ctx, ox + 7, oy + 6, 2, 4, C.red); r(ctx, ox + 6, oy + 7, 4, 2, C.red);
  } else if (ch === 'L') {
    r(ctx, ox + 2, oy + 2, 12, 14, C.ink);
    r(ctx, ox + 3, oy + 3, 10, 13, '#8a6040');
    r(ctx, ox + 4, oy + 4, 8, 5, '#9c7050');
    r(ctx, ox + 4, oy + 10, 8, 5, '#9c7050');
    r(ctx, ox + 10, oy + 9, 2, 2, '#e8c860');
    r(ctx, ox + 6, oy + 6, 4, 3, '#c8c8d0'); r(ctx, ox + 7, oy + 5, 2, 1, '#c8c8d0');
  }
}

function drawObject(ctx, ch, x, y, ox, oy) {
  switch (ch) {
    case 'c': // 檢傷櫃台
      r(ctx, ox, oy, 16, 6, C.white); r(ctx, ox, oy + 5, 16, 1, '#c8d0dc');
      r(ctx, ox, oy + 6, 16, 10, C.teal); r(ctx, ox, oy + 6, 16, 1, C.tealL); r(ctx, ox, oy + 14, 16, 2, C.tealD);
      if (x === 12) { r(ctx, ox + 4, oy + 8, 8, 5, C.white); r(ctx, ox + 7, oy + 9, 2, 3, C.red); r(ctx, ox + 6, oy + 10, 4, 1, C.red); }
      break;
    case 'k': // 電腦桌
      r(ctx, ox + 1, oy + 8, 14, 8, '#a07850'); r(ctx, ox + 1, oy + 8, 14, 1, '#b88c60'); r(ctx, ox + 1, oy + 15, 14, 1, '#7a5a3a');
      r(ctx, ox + 4, oy + 1, 9, 7, '#384050'); r(ctx, ox + 5, oy + 2, 7, 4, '#7ad0f0'); dot(ctx, ox + 6, oy + 3, C.white);
      r(ctx, ox + 7, oy + 8, 3, 1, '#384050');
      break;
    case 'b': // 病床
      r(ctx, ox + 2, oy + 1, 12, 15, C.ink);
      r(ctx, ox + 3, oy + 2, 10, 13, C.white);
      r(ctx, ox + 4, oy + 2, 8, 4, '#dce8f8');
      r(ctx, ox + 3, oy + 8, 10, 7, '#88b8e0'); r(ctx, ox + 3, oy + 8, 10, 1, '#a8d0f0');
      break;
    case 'm': // 監視器
      r(ctx, ox + 7, oy + 8, 2, 7, '#8890a0'); r(ctx, ox + 4, oy + 14, 8, 2, '#8890a0');
      r(ctx, ox + 2, oy + 1, 12, 8, C.ink); r(ctx, ox + 3, oy + 2, 10, 6, '#102818');
      r(ctx, ox + 3, oy + 5, 3, 1, '#58e078'); dot(ctx, ox + 6, oy + 3, '#58e078'); dot(ctx, ox + 7, oy + 6, '#58e078'); r(ctx, ox + 8, oy + 5, 5, 1, '#58e078');
      break;
    case 'x': // 隔簾
      r(ctx, ox, oy, 16, 2, '#a0a8b8');
      r(ctx, ox + 1, oy + 2, 14, 13, '#a8d8c0');
      for (let i = 2; i < 15; i += 4) r(ctx, ox + i, oy + 2, 1, 13, '#86b8a0');
      r(ctx, ox + 1, oy + 15, 14, 1, '#86b8a0');
      break;
    case 'p': { // 盆栽
      r(ctx, ox + 5, oy + 10, 6, 6, '#c87848'); r(ctx, ox + 4, oy + 10, 8, 2, '#d88c58');
      ellipse(ctx, ox + 8, oy + 6, 5, 4, C.greenD);
      ellipse(ctx, ox + 7, oy + 5, 3, 3, C.green); ellipse(ctx, ox + 10, oy + 7, 2, 2, C.green);
      dot(ctx, ox + 6, oy + 3, '#78c878');
      break;
    }
    case 'h': // 候診椅
      r(ctx, ox + 1, oy + 2, 14, 6, '#3a5a98'); r(ctx, ox + 1, oy + 2, 14, 1, '#6088c8');
      r(ctx, ox + 1, oy + 8, 14, 5, '#4870b8'); r(ctx, ox + 1, oy + 8, 14, 1, '#78a0d8');
      r(ctx, ox + 2, oy + 13, 2, 3, '#606878'); r(ctx, ox + 12, oy + 13, 2, 3, '#606878');
      r(ctx, ox + 7, oy + 2, 1, 11, '#2a4478');
      break;
    case 'T': { // CT 機
      r(ctx, ox, oy + 1, 16, 15, '#c8ccd6'); r(ctx, ox, oy + 1, 16, 2, '#e4e8ee'); r(ctx, ox, oy + 14, 16, 2, '#a0a6b4');
      if (at(x - 1, y) !== 'T') r(ctx, ox, oy + 1, 1, 15, C.ink);
      if (at(x + 1, y) !== 'T') r(ctx, ox + 15, oy + 1, 1, 15, C.ink);
      r(ctx, ox, oy, 16, 1, C.ink); r(ctx, ox, oy + 15, 16, 1, C.ink);
      if (at(x - 1, y) === 'T' && at(x + 1, y) === 'T') {
        ellipse(ctx, ox + 8, oy + 9, 6, 5, C.ink); ellipse(ctx, ox + 8, oy + 9, 5, 4, '#2a3040');
        r(ctx, ox + 6, oy + 4, 4, 1, '#58c0e8');
      }
      break;
    }
    case 'U':
      r(ctx, ox + 4, oy, 8, 16, C.ink); r(ctx, ox + 5, oy, 6, 15, '#b0b8c8'); r(ctx, ox + 5, oy, 6, 2, C.white);
      break;
    case 'r': { // 值班床
      const top = at(x, y - 1) !== 'r';
      r(ctx, ox + 1, oy, 14, 16, C.ink);
      r(ctx, ox + 2, oy + (top ? 1 : 0), 12, top ? 15 : 15, C.white);
      if (top) r(ctx, ox + 3, oy + 2, 10, 5, '#e8f0f8');
      r(ctx, ox + 2, oy + (top ? 9 : 0), 12, top ? 7 : 15, '#7cbc8c');
      r(ctx, ox + 2, oy + (top ? 9 : 0), 12, 1, '#a0d8b0');
      if (!top) r(ctx, ox + 1, oy + 15, 14, 1, C.ink);
      break;
    }
  }
}

export function bakeMap(scene) {
  const [cv, ctx] = canvas(MAP_W * TILE, MAP_H * TILE);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const ch = MAP[y][x];
    const ox = x * TILE, oy = y * TILE;
    if (isWall(ch)) { drawWall(ctx, ch, x, y, ox, oy); continue; }
    drawFloor(ctx, FLOORS.has(ch) ? ch : baseFor(x, y), x, y, ox, oy);
    if (!FLOORS.has(ch)) drawObject(ctx, ch, x, y, ox, oy);
  }
  // 牆面下方的陰影
  for (let y = 1; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (!isWall(MAP[y][x]) && isWall(MAP[y - 1][x])) {
      ctx.fillStyle = 'rgba(40,48,64,0.18)';
      ctx.fillRect(x * TILE, y * TILE, TILE, 3);
    }
  }
  scene.textures.addCanvas('map', cv);
}

// ---------- 人物（16×16，四方向 × 3 影格） ----------
function person(ctx, ox, oy, dir, frame, L) {
  const [cv2, c] = canvas(16, 16);
  const side = dir === 'LEFT' || dir === 'RIGHT';
  // 腿
  const legL = frame === 1 ? 2 : 3, legR = frame === 2 ? 2 : 3;
  if (side) {
    r(c, 6, 12, 2, frame === 0 ? 3 : 2, L.pants); r(c, 8, 12, 2, frame === 0 ? 3 : 3, L.pants);
    if (frame === 1) r(c, 5, 13, 2, 2, L.pants);
    if (frame === 2) r(c, 9, 14, 2, 1, L.pants);
    r(c, 5, 14, 3, 1, L.shoe); r(c, 8, 14, 3, 1, L.shoe);
  } else {
    r(c, 5, 12, 2, legL, L.pants); r(c, 9, 12, 2, legR, L.pants);
    r(c, 5, 11 + legL + 1, 2, 1, L.shoe); r(c, 9, 11 + legR + 1, 2, 1, L.shoe);
  }
  // 身體
  if (side) {
    r(c, 5, 8, 6, 5, L.top); r(c, 5, 11, 6, 2, L.topD);
    const armY = frame === 0 ? 9 : 8;
    r(c, 7, armY, 2, 3, L.topD); r(c, 7, armY + 3, 2, 1, L.skin);
  } else {
    r(c, 4, 8, 8, 5, L.top); r(c, 4, 12, 8, 1, L.topD);
    r(c, 3, 9, 1, 3, L.top); r(c, 12, 9, 1, 3, L.top);
    r(c, 3, 12, 1, 1, L.skin); r(c, 12, 12, 1, 1, L.skin);
    if (dir === 'DOWN') {
      r(c, 7, 8, 2, 4, L.topD);
      if (L.tie) r(c, 7, 9, 2, 3, L.acc);
      else if (L.acc && L.top === '#f8f8f8') { dot(c, 6, 9, L.acc); dot(c, 9, 9, L.acc); dot(c, 6, 10, L.acc); dot(c, 9, 10, L.acc); dot(c, 7, 11, L.acc); }
    }
  }
  // 頭
  if (side) r(c, 5, 2, 7, 6, L.skin); else r(c, 4, 2, 8, 6, L.skin);
  // 頭髮
  if (dir === 'UP') {
    r(c, 4, 1, 8, 6, L.hair);
    if (L.style === 'long') r(c, 4, 6, 8, 3, L.hair);
  } else if (dir === 'DOWN') {
    r(c, 4, 1, 8, 2, L.hair); r(c, 4, 3, 1, 2, L.hair); r(c, 11, 3, 1, 2, L.hair); r(c, 5, 3, 2, 1, L.hair);
    if (L.style === 'long') { r(c, 3, 3, 1, 6, L.hair); r(c, 12, 3, 1, 6, L.hair); }
    dot(c, 6, 5, C.ink); dot(c, 9, 5, C.ink);
    if (L.glasses) { r(c, 5, 4, 3, 1, C.ink); r(c, 8, 4, 3, 1, C.ink); }
  } else {
    // 面向右（左方向會整張鏡像）
    r(c, 5, 1, 7, 2, L.hair); r(c, 5, 3, 3, 3, L.hair);
    if (L.style === 'long') r(c, 4, 3, 3, 6, L.hair);
    dot(c, 10, 5, C.ink);
    if (L.glasses) r(c, 9, 4, 3, 1, C.ink);
  }
  if (L.style === 'bun' && dir !== 'DOWN') r(c, 6, 0, 4, 2, L.hair);
  if (L.cap) { r(c, 5, 0, 6, 2, C.white); dot(c, 7, 0, C.red); dot(c, 8, 1, C.red); }
  outline(c, 16, 16);
  ctx.save();
  if (dir === 'LEFT') { ctx.translate(ox + 16, oy); ctx.scale(-1, 1); ctx.drawImage(cv2, 0, 0); }
  else ctx.drawImage(cv2, ox, oy);
  ctx.restore();
  // 影子
  ctx.fillStyle = 'rgba(30,36,50,0.22)';
  ctx.fillRect(ox + 4, oy + 15, 8, 1);
}

export const DIR_ORDER = ['DOWN', 'UP', 'LEFT', 'RIGHT'];

export function bakePeople(scene) {
  for (const [name, L] of Object.entries(LOOKS)) {
    const [cv, ctx] = canvas(16 * 12, 16);
    DIR_ORDER.forEach((d, di) => {
      for (let f = 0; f < 3; f++) person(ctx, (di * 3 + f) * 16, 0, d, f, L);
    });
    const tex = scene.textures.addCanvas('p_' + name, cv);
    for (let i = 0; i < 12; i++) tex.add(i, 0, i * 16, 0, 16, 16);
  }
}

// ---------- 對戰用大圖（48×48） ----------
function bakePatient(scene) {
  const [cv, c] = canvas(48, 48);
  const skin = '#f0c8a8', skinD = '#d8a888', gown = '#a8c8e8', gownD = '#88a8d0', hair = '#2a2420';
  // 擔架
  r(c, 2, 38, 44, 6, '#e8ecf2'); r(c, 2, 38, 44, 1, C.white); r(c, 2, 43, 44, 1, '#b8c0cc');
  r(c, 5, 44, 2, 4, '#7a8494'); r(c, 41, 44, 2, 4, '#7a8494');
  // 身體（病人服）
  r(c, 10, 24, 28, 15, gown);
  r(c, 12, 22, 24, 3, gown);
  r(c, 22, 24, 4, 14, gownD);
  for (const [x, y] of [[14, 28], [18, 33], [30, 27], [33, 34], [15, 36], [29, 36]]) dot(c, x, y, '#ffffff');
  // 右胸擦傷（病人的右側＝畫面左側）
  r(c, 13, 26, 5, 1, '#d05050'); r(c, 14, 28, 4, 1, '#d05050'); r(c, 15, 30, 3, 1, '#c04848');
  // 手按住胸口
  r(c, 15, 27, 9, 4, skin); r(c, 15, 27, 9, 1, '#f8d8c0'); r(c, 16, 31, 6, 1, skinD);
  r(c, 23, 30, 4, 8, gown); r(c, 24, 31, 2, 6, gownD);
  // 另一隻手
  r(c, 34, 26, 4, 10, gown); r(c, 34, 36, 4, 2, skin);
  // 脖子
  r(c, 20, 19, 8, 4, skin); r(c, 20, 21, 8, 1, skinD);
  // 頭
  ellipse(c, 24, 12, 8, 9, skin);
  r(c, 16, 5, 16, 4, hair); r(c, 16, 9, 2, 4, hair); r(c, 30, 9, 2, 4, hair);
  r(c, 18, 4, 12, 2, hair);
  // 痛苦表情：皺眉、閉眼、張口
  r(c, 19, 10, 3, 1, C.ink); r(c, 26, 10, 3, 1, C.ink);
  dot(c, 21, 9, C.ink); dot(c, 26, 9, C.ink);
  r(c, 19, 12, 3, 1, C.ink); r(c, 26, 12, 3, 1, C.ink);
  r(c, 22, 16, 4, 3, '#802830'); r(c, 22, 16, 4, 1, C.ink);
  // 臉色蒼白＋冒汗
  r(c, 17, 13, 2, 1, '#e8b8b0'); r(c, 29, 13, 2, 1, '#e8b8b0');
  for (const [x, y] of [[14, 8], [33, 11], [31, 5]]) { dot(c, x, y, '#78c0f0'); dot(c, x, y + 1, '#a8e0ff'); }
  outline(c, 48, 48);
  scene.textures.addCanvas('patient', cv);

  // 氧氣面罩（疊在臉上）
  const [mv, m] = canvas(48, 48);
  ellipse(m, 24, 16, 5, 4, 'rgba(220,240,255,0.85)');
  r(m, 20, 15, 8, 1, '#9ab8d0');
  r(m, 15, 15, 4, 1, '#9ab8d0'); r(m, 29, 15, 4, 1, '#9ab8d0');
  r(m, 23, 20, 2, 8, '#58b058');
  scene.textures.addCanvas('o2mask', mv);

  // 胸管（處置後顯示）
  const [tv, t] = canvas(48, 48);
  r(t, 8, 30, 2, 12, '#d0e8f0'); r(t, 8, 30, 2, 1, '#a0c0d0'); r(t, 6, 41, 6, 6, '#e0f0f8'); r(t, 6, 41, 6, 1, '#9ab8d0');
  scene.textures.addCanvas('chesttube', tv);
}

function bakeDoctorBack(scene, look, key) {
  const L = LOOKS[look];
  const [cv, c] = canvas(48, 48);
  // 肩膀與白袍
  r(c, 6, 30, 36, 18, L.top);
  r(c, 8, 27, 32, 4, L.top);
  r(c, 23, 30, 2, 18, L.topD);
  r(c, 6, 44, 36, 4, L.topD);
  // 聽診器
  r(c, 16, 26, 2, 8, '#506078'); r(c, 30, 26, 2, 8, '#506078');
  r(c, 17, 33, 1, 4, '#506078'); r(c, 30, 33, 1, 4, '#506078');
  // 脖子
  r(c, 19, 22, 10, 6, L.skin);
  // 頭（後腦）
  ellipse(c, 24, 13, 10, 11, L.hair);
  r(c, 13, 13, 2, 5, L.skin); r(c, 33, 13, 2, 5, L.skin);
  if (L.style === 'long') r(c, 15, 18, 18, 10, L.hair);
  else r(c, 17, 20, 14, 3, L.hair);
  r(c, 19, 5, 6, 2, '#ffffff30');
  outline(c, 48, 48);
  scene.textures.addCanvas(key, cv);
}

// ---------- UI 小圖 ----------
function bakeUi(scene) {
  // 選單游標 ▶
  const [cv, c] = canvas(6, 9);
  for (let i = 0; i < 5; i++) r(c, i, i, 1, 9 - i * 2, C.ink);
  scene.textures.addCanvas('cursor', cv);
  // 繼續指示 ▼
  const [dv, d] = canvas(7, 5);
  for (let i = 0; i < 4; i++) r(d, i, i, 7 - i * 2, 1, C.red);
  scene.textures.addCanvas('more', dv);
  // 小紅十字
  const [xv, x] = canvas(9, 9);
  r(x, 3, 0, 3, 9, C.red); r(x, 0, 3, 9, 3, C.red);
  scene.textures.addCanvas('cross', xv);
  // 徽章（空）
  const [bv, b] = canvas(12, 12);
  ellipse(b, 6, 6, 5, 5, '#c0c8d8'); ellipse(b, 6, 6, 3, 3, '#e8ecf2');
  scene.textures.addCanvas('badge0', bv);
  // 粒子
  const [pv, p] = canvas(3, 3);
  r(p, 0, 1, 3, 1, C.white); r(p, 1, 0, 1, 3, C.white);
  scene.textures.addCanvas('spark', pv);
}

export function bakeAll(scene) {
  bakeMap(scene);
  bakePeople(scene);
  bakePatient(scene);
  bakeDoctorBack(scene, 'docA', 'back_docA');
  bakeDoctorBack(scene, 'docB', 'back_docB');
  bakeUi(scene);
}
