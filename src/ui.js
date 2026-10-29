// UI 元件：視窗、文字框（打字機效果）、選單。全部以 async/await 串接。
import { input } from './input.js';
import { audio } from './audio.js';
import { C } from './art.js';

export const W = 240, H = 160;
// 自動化測試用的狀態旗標（不影響遊戲）
export const uiState = (window.__erqUI = { menu: 0, waiting: false });
export const FONT = 'Cubic11';
export const LINE_H = 14;

const measureCtx = document.createElement('canvas').getContext('2d');
export function textWidth(s, size = 12) {
  measureCtx.font = `${size}px ${FONT}`;
  return measureCtx.measureText(s).width;
}

// 中文逐字換行（英數字詞不拆）
export function wrap(str, maxW, size = 12) {
  const out = [];
  for (const para of String(str).split('\n')) {
    const tokens = para.match(/[A-Za-z0-9₀-₉%./+\-:()（）]+|\s|./gu) || [''];
    let line = '';
    for (const tk of tokens) {
      if (textWidth(line + tk, size) > maxW && line.trim() !== '') {
        out.push(line);
        line = tk.trim() === '' ? '' : tk;
      } else line += tk;
    }
    out.push(line);
  }
  return out;
}

export function txt(scene, x, y, s, color = C.ink, size = 12) {
  const t = scene.add.text(Math.round(x), Math.round(y), s, {
    fontFamily: FONT, fontSize: `${size}px`, color, resolution: 1,
    padding: { top: 1, bottom: 1 },
  });
  t.setOrigin(0, 0);
  return t;
}

// 斜角像素視窗
const THEMES = {
  normal: { edge: C.ink, frame: C.teal, frameL: C.tealL, fill: '#f8f8f8' },
  red: { edge: C.ink, frame: '#c84848', frameL: '#e88080', fill: '#f8f8f8' },
  paper: { edge: C.ink, frame: '#a88858', frameL: '#d8c090', fill: '#fbf6e8' },
  dark: { edge: '#101418', frame: '#3a4a58', frameL: '#5a6a78', fill: '#18222c' },
};
export function drawWindow(g, x, y, w, h, theme = 'normal') {
  const T = THEMES[theme] || THEMES.normal;
  const layer = (dx, col) => {
    g.fillStyle(Phaser.Display.Color.HexStringToColor(col).color, 1);
    g.fillRect(x + dx + 1, y + dx, w - dx * 2 - 2, h - dx * 2);
    g.fillRect(x + dx, y + dx + 1, w - dx * 2, h - dx * 2 - 2);
  };
  layer(0, T.edge);
  layer(1, T.frame);
  g.fillStyle(Phaser.Display.Color.HexStringToColor(T.frameL).color, 1);
  g.fillRect(x + 2, y + 1, w - 4, 1);
  layer(3, T.edge);
  layer(4, T.fill);
  return g;
}

export function makeWindow(scene, x, y, w, h, theme, depth = 100) {
  const g = scene.add.graphics();
  drawWindow(g, x, y, w, h, theme);
  g.setDepth(depth).setScrollFactor(0);
  return g;
}

export function wait(scene, ms) {
  return new Promise(res => scene.time.delayedCall(ms, res));
}

// ---------- 對話框 ----------
export class Dialog {
  constructor(scene, opt = {}) {
    this.scene = scene;
    this.x = opt.x ?? 0; this.y = opt.y ?? 110; this.w = opt.w ?? 240; this.h = opt.h ?? 50;
    this.depth = opt.depth ?? 200;
    this.lines = opt.lines ?? 3;
    this.theme = opt.theme ?? 'normal';
    this.g = scene.add.graphics().setDepth(this.depth).setScrollFactor(0);
    this.texts = [];
    for (let i = 0; i < this.lines; i++) {
      this.texts.push(txt(scene, this.x + 9, this.y + 6 + i * LINE_H, '').setDepth(this.depth + 1).setScrollFactor(0));
    }
    this.more = scene.add.image(this.x + this.w - 13, this.y + this.h - 10, 'more').setOrigin(0, 0)
      .setDepth(this.depth + 1).setScrollFactor(0).setVisible(false);
    scene.tweens.add({ targets: this.more, y: '+=2', duration: 300, yoyo: true, repeat: -1 });
    this.hide();
  }

  setTheme(t) { this.theme = t; this._draw(); }
  _draw() { this.g.clear(); drawWindow(this.g, this.x, this.y, this.w, this.h, this.theme); }

  show() { this._draw(); this.g.setVisible(true); this.texts.forEach(t => t.setVisible(true)); }
  hide() { this.g.setVisible(false); this.texts.forEach(t => t.setText('').setVisible(false)); this.more.setVisible(false); }
  clear() { this.texts.forEach(t => t.setText('')); }

  // 立即顯示（不等待），用於選單提示
  set(str, color = C.ink) {
    this.show();
    const ls = wrap(str, this.w - 20);
    this.texts.forEach((t, i) => t.setText(ls[i] || '').setColor(color));
  }

  // 依序顯示多行文字，自動分頁；每頁等待 A/B
  async say(lines, opt = {}) {
    const color = opt.color || C.ink;
    if (opt.theme) this.setTheme(opt.theme);
    this.show();
    const wrapped = [];
    for (const l of Array.isArray(lines) ? lines : [lines]) wrapped.push(...wrap(l, this.w - 20));
    for (let p = 0; p < wrapped.length; p += this.lines) {
      const page = wrapped.slice(p, p + this.lines);
      this.texts.forEach(t => t.setText('').setColor(color));
      // 打字機效果；打字中按 A/B 直接顯示整頁
      let skip = false;
      for (let i = 0; i < page.length; i++) {
        const chars = [...page[i]];
        for (let c = 0; c < chars.length && !skip; c++) {
          this.texts[i].setText(chars.slice(0, c + 1).join(''));
          if (c % 2 === 0) audio.sfx('text');
          await wait(this.scene, 16);
          const q = input.poll();
          if (q.includes('A') || q.includes('B')) skip = true;
        }
        this.texts[i].setText(page[i]);
      }
      if (opt.noWait && p + this.lines >= wrapped.length) break;
      this.more.setVisible(true);
      uiState.waiting = true;
      for (;;) {
        const k = await input.next();
        if (k === 'A' || k === 'B') break;
      }
      uiState.waiting = false;
      audio.sfx('cursor');
      this.more.setVisible(false);
    }
    if (opt.keep !== true) this.hide();
  }

  destroy() { this.g.destroy(); this.texts.forEach(t => t.destroy()); this.more.destroy(); }
}

// ---------- 選單 ----------
// items: [{label, right?, dim?}]；cols 1 或 2；回傳 index，取消回傳 -1
export async function menu(scene, items, opt = {}) {
  const cols = opt.cols || 1;
  const rowH = opt.rowH || LINE_H;
  const visible = Math.min(opt.visibleRows || 6, Math.ceil(items.length / cols));
  const pad = 6;
  const colW = opt.colW || Math.ceil(Math.max(...items.map(it => textWidth(it.label) + (it.right ? textWidth(it.right) + 10 : 0)))) + 14;
  const w = opt.w || Math.min(236, colW * cols + pad * 2 + 4);
  const h = opt.h || visible * rowH + pad * 2 + 2;
  const x = opt.x != null ? opt.x : W - w - 2;
  const y = opt.y != null ? opt.y : H - h - 52;
  const depth = opt.depth || 300;
  const cancel = opt.cancel !== false;
  const objs = [];
  const g = makeWindow(scene, x, y, w, h, opt.theme || 'normal', depth);
  objs.push(g);
  const cursor = scene.add.image(0, 0, 'cursor').setOrigin(0, 0).setDepth(depth + 2).setScrollFactor(0);
  objs.push(cursor);
  scene.tweens.add({ targets: cursor, alpha: 0.35, duration: 380, yoyo: true, repeat: -1 });
  const up = txt(scene, x + w - 12, y + 1, '▲', C.tealD, 12).setDepth(depth + 2).setScrollFactor(0).setVisible(false);
  const dn = txt(scene, x + w - 12, y + h - 13, '▼', C.tealD, 12).setDepth(depth + 2).setScrollFactor(0).setVisible(false);
  objs.push(up, dn);
  const rows = [];
  for (let i = 0; i < visible * cols; i++) {
    const tl = txt(scene, 0, 0, '').setDepth(depth + 1).setScrollFactor(0);
    const tr = txt(scene, 0, 0, '', '#7a8494').setDepth(depth + 1).setScrollFactor(0);
    rows.push([tl, tr]);
    objs.push(tl, tr);
  }
  let idx = Math.min(opt.start || 0, items.length - 1);
  let top = 0;
  const render = () => {
    const rowOf = Math.floor(idx / cols);
    if (rowOf < top) top = rowOf;
    if (rowOf >= top + visible) top = rowOf - visible + 1;
    rows.forEach(([tl, tr], i) => {
      const it = items[top * cols + i];
      const cx = x + pad + 10 + (i % cols) * colW;
      const cy = y + pad + Math.floor(i / cols) * rowH;
      tl.setPosition(cx, cy).setText(it ? it.label : '').setColor(it && it.dim ? '#9aa2b0' : C.ink);
      tr.setText(it && it.right ? it.right : '');
      tr.setPosition(Math.round(x + w - pad - 6 - tr.width - (cols > 1 ? (cols - 1 - (i % cols)) * colW : 0)), cy);
    });
    const vi = idx - top * cols;
    cursor.setPosition(x + pad + 2 + (vi % cols) * colW, y + pad + 3 + Math.floor(vi / cols) * rowH);
    up.setVisible(top > 0);
    dn.setVisible((top + visible) * cols < items.length);
    if (opt.onMove) opt.onMove(idx);
  };
  render();
  input.flush();
  uiState.menu += 1;
  let result;
  for (;;) {
    const k = await input.next();
    const prev = idx;
    if (k === 'UP') idx = idx - cols >= 0 ? idx - cols : idx;
    else if (k === 'DOWN') idx = idx + cols < items.length ? idx + cols : idx;
    else if (k === 'LEFT' && cols > 1 && idx % cols > 0) idx -= 1;
    else if (k === 'RIGHT' && cols > 1 && idx % cols < cols - 1 && idx + 1 < items.length) idx += 1;
    else if (k === 'A') { audio.sfx('select'); result = idx; break; }
    else if (k === 'B' && cancel) { audio.sfx('cancel'); result = -1; break; }
    if (idx !== prev) { audio.sfx('cursor'); render(); }
  }
  uiState.menu -= 1;
  if (!opt.keep) objs.forEach(o => o.destroy());
  else menu.lastObjs = objs;
  return result;
}

export async function yesNo(scene, opt = {}) {
  const r = await menu(scene, [{ label: '是' }, { label: '否' }], { x: W - 52, y: 110 - 46, cancel: true, ...opt });
  return r === 0;
}
