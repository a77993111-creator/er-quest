// Procedure 小遊戲：每個回傳 { score: 0–100, lines: [結果說明] }
// 畫面：上方 0–16 標題列（由場景繪製），16–110 遊戲區，110–160 提示框
import { input } from '../input.js';
import { audio } from '../audio.js';
import { txt, makeWindow, menu, multiMenu, shuffle, wrap, W } from '../ui.js';
import { C } from '../art.js';

const hex = s => Phaser.Display.Color.HexStringToColor(s).color;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dbg = o => { if (window.__erqUI) window.__erqUI.proc = o; };

function setup(sc) {
  const objs = [];
  const add = o => { objs.push(o); return o; };
  const g = add(sc.add.graphics().setDepth(10));
  const panel = add(makeWindow(sc, 0, 110, W, 50, 'normal', 20));
  const hint = [0, 1, 2].map(i => add(txt(sc, 9, 114 + i * 13, '').setDepth(21)));
  return {
    g, add,
    T: (x, y, s, c = C.ink, size = 12) => add(txt(sc, x, y, s, c, size).setDepth(12)),
    hint(lines) {
      const ls = (Array.isArray(lines) ? lines : [lines]).flatMap(l => wrap(l, 222));
      hint.forEach((t, i) => t.setText(ls[i] || ''));
    },
    panel(v) { panel.setVisible(v); hint.forEach(t => t.setVisible(v)); },
    done() { objs.forEach(o => o.destroy()); dbg(null); },
  };
}

// 每影格呼叫 fn(dt 秒, 這一格的按鍵)；fn 回傳非 undefined 時結束
function loop(sc, fn) {
  input.flush();
  return new Promise(res => {
    const h = (time, delta) => {
      const r = fn(Math.min(delta, 50) / 1000, input.poll());
      if (r !== undefined) { sc.events.off('update', h); res(r); }
    };
    sc.events.on('update', h);
  });
}

const held = k => !!input.held[k];

// 背景（遊戲區）
function backdrop(g, col = '#e6eef0') {
  g.fillStyle(hex(col), 1).fillRect(0, 16, W, 94);
}

async function pick(sc, prompt, options, correct) {
  sc.dlg.set(prompt);
  const op = shuffle(options);
  const h = Math.min(6, op.length) * 14 + 14;
  const k = await menu(sc, op.map(o => ({ label: o })), { x: 4, w: 232, y: 110 - h, cancel: false, depth: 300, visibleRows: 6 });
  sc.dlg.hide();
  return op[k] === correct;
}

// 沿折線取前 frac 的點
function polyPart(pts, frac) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let left = total * clamp(frac, 0, 1);
  const out = [pts[0]];
  for (let i = 1; i < pts.length && left > 0; i++) {
    const l = seg[i - 1];
    if (left >= l) { out.push(pts[i]); left -= l; } else {
      const t = left / l;
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
      left = 0;
    }
  }
  return out;
}
function thickLine(g, pts, w, col) {
  g.lineStyle(w, hex(col), 1);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.strokePath();
}

// ================= NG：抓吞嚥時機推進 =================
export async function NG(sc) {
  const u = setup(sc);
  u.panel(false);
  const lenOk = await pick(sc, '先量置入長度：要怎麼量？', ['鼻尖 → 耳垂 → 劍突（NEX）', '鼻尖 → 下巴', '鼻尖 → 肚臍'], '鼻尖 → 耳垂 → 劍突（NEX）');
  audio.sfx(lenOk ? 'good' : 'bad');
  u.panel(true);
  const path = [[52, 47], [70, 49], [84, 60], [88, 74], [88, 92], [100, 102]];
  let p = 0, mist = 0, t = 0, nextAt = rand(0.8, 1.6), openUntil = -1, shake = 0;
  const STEP = 0.2;
  const r = await loop(sc, (dt, keys) => {
    t += dt; shake = Math.max(0, shake - dt);
    const open = t < openUntil;
    if (!open && t > nextAt) { openUntil = t + 0.7; nextAt = t + 0.7 + rand(0.9, 1.8); audio.sfx('beep', { f: 520 }); }
    if (keys.includes('A')) {
      if (t < openUntil) { p = Math.min(1, p + STEP); openUntil = -1; audio.sfx('good'); }
      else { p = Math.max(0, p - 0.1); mist++; shake = 0.4; audio.sfx('bad'); }
    }
    const g = u.g; g.clear(); backdrop(g, '#f2ead8');
    const sx = shake > 0 ? Math.round(Math.sin(t * 60) * 2) : 0;
    // 側面頭頸
    g.fillStyle(hex('#f2c8a0'), 1).fillCircle(78 + sx, 46, 26).fillRect(76 + sx, 60, 22, 50);
    g.fillTriangle(52 + sx, 44, 58 + sx, 34, 58 + sx, 52);
    g.fillStyle(hex(C.ink), 1).fillRect(66 + sx, 38, 3, 3);
    g.fillStyle(hex('#e8a0a0'), 0.6).fillRect(84 + sx, 58, 8, 50);          // 食道
    g.fillStyle(hex('#f0b0b0'), 1).fillEllipse(104, 104, 26, 12);           // 胃
    const throat = t < openUntil;
    if (throat) { g.fillStyle(hex('#ffe060'), 0.8).fillCircle(88 + sx, 70, 7); }
    thickLine(g, polyPart(path.map(([x, y]) => [x + sx, y]), p), 3, '#f8f8f8');
    thickLine(g, polyPart(path.map(([x, y]) => [x + sx, y]), p), 1, '#60a0d0');
    // 進度
    g.fillStyle(hex('#384050'), 1).fillRect(150, 30, 10, 70);
    g.fillStyle(hex('#58a8e0'), 1).fillRect(150, 30 + 70 * (1 - p), 10, 70 * p);
    u.hint([throat ? '　　　　「吞！」→ 按 A 推進！' : '等病人吞嚥（喉嚨亮黃色）時按 A 推進。', `推進 ${Math.round(p / STEP)}/5　嗆咳 ${mist}　時間 ${Math.max(0, 25 - t).toFixed(0)}`]);
    dbg({ id: 'NG', open: throat, p });
    if (p >= 1) return 'done';
    if (t > 25) return 'timeout';
  });
  u.done();
  const ok = r === 'done';
  const score = (lenOk ? 20 : 0) + (ok ? Math.max(0, 80 - 12 * mist) : Math.max(0, 30 - 5 * mist));
  return { score, lines: [lenOk ? '○ 置入長度正確（NEX）。' : '× 置入長度應為鼻尖→耳垂→劍突。', ok ? `○ 管子順利放到胃內（嗆咳 ${mist} 次）。` : '× 沒有在時間內放好，換學長接手。'] };
}

// ================= Foley：步驟排序＋維持中線 =================
export async function FOLEY(sc) {
  const u = setup(sc);
  u.panel(false);
  const steps = ['手部衛生、戴無菌手套', '鋪無菌洞巾', '由內往外消毒尿道口', '潤滑導管', '插入至見尿', '推到底後打水球 10 mL', '導管固定於大腿'];
  let mistA = 0;
  for (let i = 0; i < steps.length; i++) {
    const rest = shuffle(steps.slice(i));
    for (;;) {
      sc.dlg.set(`第 ${i + 1} 步是？`);
      const h = Math.min(6, rest.length) * 14 + 14;
      const k = await menu(sc, rest.map(s => ({ label: s })), { x: 4, w: 232, y: 110 - h, cancel: false, depth: 300 });
      if (rest[k] === steps[i]) { audio.sfx('good'); break; }
      mistA++; audio.sfx('bad');
    }
  }
  sc.dlg.hide();
  u.panel(true);
  const cx = y => 120 + 18 * Math.sin(y / 16) + 8 * Math.sin(y / 7);
  const HW = 9;
  let y = 104, x = cx(104), t = 0, touch = 0, cool = 0, flash = 0;
  await loop(sc, (dt) => {
    t += dt; cool = Math.max(0, cool - dt); flash = Math.max(0, flash - dt);
    y -= 12 * dt;
    if (held('LEFT')) x -= 50 * dt;
    if (held('RIGHT')) x += 50 * dt;
    if (Math.abs(x - cx(y)) > HW && cool <= 0) { touch++; cool = 0.7; flash = 0.3; x = cx(y); audio.sfx('bad'); }
    const g = u.g; g.clear(); backdrop(g, flash > 0 ? '#f6d0d0' : '#dfe8f2');
    for (let yy = 22; yy < 108; yy += 2) {
      g.fillStyle(hex('#f0c8b8'), 1).fillRect(cx(yy) - HW, yy, HW * 2, 2);
      g.fillStyle(hex('#c88878'), 1).fillRect(cx(yy) - HW - 1, yy, 1, 2).fillRect(cx(yy) + HW, yy, 1, 2);
    }
    g.fillStyle(hex('#f8f8f8'), 1).fillRect(x - 2, y, 4, 108 - y);
    g.fillStyle(hex('#3a6ea8'), 1).fillCircle(x, y, 3);
    if (y < 30) { g.fillStyle(hex('#f0d040'), 1).fillCircle(x, y - 6, 3); }
    u.hint(['按住 ← → 讓導管維持在尿道中線，碰到邊緣就污染重來。', `污染 ${touch} 次`]);
    dbg({ id: 'FOLEY', x, c: cx(y) });
    if (y <= 24) return 'done';
  });
  u.done();
  const score = clamp(40 - 6 * mistA, 0, 40) + clamp(60 - 15 * touch, 0, 60);
  return { score, lines: [mistA ? `× 步驟順序錯了 ${mistA} 次。` : '○ 無菌步驟順序正確。', touch ? `× 置入時碰觸污染 ${touch} 次。` : '○ 置入順利，見尿！'] };
}

// ================= ABG：找脈搏＋抓搏動時機 =================
export async function ABG(sc) {
  const u = setup(sc);
  const bx = rand(80, 170), by = rand(44, 90);
  let cx = 120, cy = 66, t = 0, beat = 0, ring = 0;
  const strength = () => Math.max(0, 1 - Math.hypot(cx - bx, cy - by) / 55);
  await loop(sc, (dt, keys) => {
    t += dt; beat += dt;
    if (held('LEFT')) cx -= 40 * dt; if (held('RIGHT')) cx += 40 * dt;
    if (held('UP')) cy -= 40 * dt; if (held('DOWN')) cy += 40 * dt;
    cx = clamp(cx, 40, 200); cy = clamp(cy, 30, 102);
    if (beat > 0.8) { beat = 0; ring = 0.01; const s = strength(); if (s > 0.05) audio.sfx('beep', { f: 400 + 900 * s }); }
    if (ring > 0) ring += dt;
    if (ring > 0.5) ring = 0;
    const g = u.g; g.clear(); backdrop(g, '#e8e0f0');
    g.fillStyle(hex('#f2c8a0'), 1).fillRoundedRect(30, 26, 190, 80, 18);
    g.fillStyle(hex('#e2b090'), 1).fillRect(30, 60, 190, 2);
    g.fillStyle(hex('#a8c8e8'), 1).fillRect(200, 26, 20, 80);
    if (ring > 0) { const s = strength(); g.lineStyle(1 + Math.round(2 * s), hex('#d04848'), 1 - ring * 1.6).strokeCircle(cx, cy, 3 + 16 * s * (ring / 0.5) + 2); }
    g.lineStyle(1, hex(C.ink), 1).strokeCircle(cx, cy, 3);
    u.hint(['用方向鍵移動指尖找脈搏最強的地方（圈圈最大、聲音最高），按 A 決定穿刺點。', `時間 ${Math.max(0, 15 - t).toFixed(0)}`]);
    dbg({ id: 'ABG', phase: 1, d: Math.hypot(cx - bx, cy - by) });
    if (keys.includes('A') || t > 15) return true;
  });
  const d = Math.hypot(cx - bx, cy - by);
  const sA = d < 6 ? 40 : d < 12 ? 28 : d < 20 ? 15 : 5;
  audio.sfx(sA >= 28 ? 'good' : 'bad');
  // 第二階段：隨搏動進針
  const zone = d < 6 ? 20 : d < 12 ? 15 : 11;
  let miss = 0, hit = false, ph = 0, cool = 0;
  t = 0;
  await loop(sc, (dt, keys) => {
    t += dt; ph = (ph + dt / 1.4) % 1; cool = Math.max(0, cool - dt);
    const mx = 40 + 160 * ph;
    const inZone = Math.abs(mx - 150) <= zone / 2;
    if (keys.includes('A') && cool <= 0) {
      if (inZone) { hit = true; audio.sfx('good'); }
      else { miss++; cool = 0.4; audio.sfx('bad'); }
    }
    const g = u.g; g.clear(); backdrop(g, '#e8e0f0');
    g.fillStyle(hex('#384050'), 1).fillRect(36, 40, 168, 14);
    g.fillStyle(hex('#58c070'), 1).fillRect(150 - zone / 2, 40, zone, 14);
    g.fillStyle(hex('#f8f8f8'), 1).fillRect(mx - 1, 36, 3, 22);
    // 脈搏波形
    g.lineStyle(1, hex('#d04848'), 1); g.beginPath();
    for (let x = 36; x <= 204; x += 2) { const q = (x - 40) / 160; const v = Math.exp(-((q - 0.69) ** 2) / 0.004) * 22 + Math.exp(-((q - 0.82) ** 2) / 0.003) * 6; x === 36 ? g.moveTo(x, 96 - v) : g.lineTo(x, 96 - v); }
    g.strokePath();
    if (hit) { g.fillStyle(hex('#d02828'), 1).fillCircle(120, 76, 6); }
    u.hint(['搏動最強時進針：白線進入綠區時按 A。', `失敗 ${miss}/3`]);
    dbg({ id: 'ABG', phase: 2, inZone });
    if (hit || miss >= 3 || t > 15) return true;
  });
  u.done();
  const sB = hit ? Math.max(0, 60 - 20 * miss) : 0;
  return { score: sA + sB, lines: [d < 12 ? '○ 找到脈搏最強點。' : '× 穿刺點離脈搏最強處有點遠。', hit ? `○ 鮮紅血液隨脈搏流入針筒！（失敗 ${miss} 次）` : '× 三次都沒抽到，請學長接手。'] };
}

// ================= Wet dressing：由內往外擦 =================
export async function DRESS(sc) {
  const u = setup(sc);
  const COLS = 11, ROWS = 7, CW = 12, OX = 54, OY = 22;
  const ring = (c, r) => Math.round(Math.sqrt(((c - 5) / 1.4) ** 2 + (r - 3) ** 2));
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ring(c, r) <= 3) cells.push({ c, r, ring: ring(c, r), clean: false });
  const at = (c, r) => cells.find(x => x.c === c && x.r === r);
  let c = 5, r = 3, maxRing = 0, mist = 0, t = 0, rep = 0, gauze = 1, flash = 0;
  at(c, r).clean = true;
  await loop(sc, (dt, keys) => {
    t += dt; rep -= dt; flash = Math.max(0, flash - dt);
    let d = keys.find(k => ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(k));
    if (!d && rep <= 0) d = input.heldDir();
    if (d) {
      rep = 0.14;
      const nc = c + (d === 'LEFT' ? -1 : d === 'RIGHT' ? 1 : 0), nr = r + (d === 'UP' ? -1 : d === 'DOWN' ? 1 : 0);
      const cell = at(nc, nr);
      if (cell) {
        c = nc; r = nr;
        if (cell.ring <= maxRing - 2) { mist++; flash = 0.3; audio.sfx('bad'); maxRing = cell.ring; }
        maxRing = Math.max(maxRing, cell.ring);
        if (!cell.clean) { cell.clean = true; audio.sfx('cursor'); }
      }
    }
    if (keys.includes('A')) { c = 5; r = 3; maxRing = 0; gauze++; audio.sfx('select'); }
    const g = u.g; g.clear(); backdrop(g, flash > 0 ? '#f6d0d0' : '#e8efe6');
    g.fillStyle(hex('#f2c8a0'), 1).fillRoundedRect(OX - 8, OY - 4, COLS * CW + 16, ROWS * CW + 8, 10);
    for (const x of cells) {
      const px = OX + x.c * CW, py = OY + x.r * CW;
      const base = x.ring === 0 ? '#d05050' : x.ring === 1 ? '#e07868' : '#eab090';
      g.fillStyle(hex(base), 1).fillRect(px, py, CW, CW);
      if (!x.clean) { g.fillStyle(hex('#8a6a3a'), 1).fillRect(px + 3, py + 3, 2, 2).fillRect(px + 7, py + 7, 2, 2).fillRect(px + 8, py + 2, 1, 1); }
    }
    g.lineStyle(2, hex('#f8f8f8'), 1).strokeRect(OX + c * CW, OY + r * CW, CW, CW);
    const left = cells.filter(x => !x.clean).length;
    u.hint(['從傷口中心往外繞圈擦，往回擦會把髒污帶回傷口。按 A 換一塊新紗布（回到中心）。', `未清潔 ${left}　回擦 ${mist}　紗布 ${gauze}　時間 ${Math.max(0, 25 - t).toFixed(0)}`]);
    dbg({ id: 'DRESS', c, r, left });
    if (left === 0 || t > 25) return true;
  });
  u.done();
  const frac = cells.filter(x => x.clean).length / cells.length;
  const score = clamp(Math.round(60 * frac + 40 - 10 * mist), 0, 100);
  return { score, lines: [`清潔範圍 ${Math.round(frac * 100)}%。`, mist ? `× 往回擦了 ${mist} 次，可能把污染帶回傷口。` : '○ 每次都由內往外擦。'] };
}

// ================= 石膏夾板：疊層節奏＋維持功能位 =================
export async function CAST(sc) {
  const u = setup(sc);
  let layers = 0, mistA = 0, t = 0, ph = 0, sp = 0.55;
  await loop(sc, (dt, keys) => {
    t += dt; ph += dt * sp;
    const mx = 120 + 88 * Math.sin(ph * Math.PI);
    const inZone = Math.abs(mx - 120) <= 13;
    if (keys.includes('A')) {
      if (inZone) { layers++; sp += 0.04; audio.sfx('good'); } else { mistA++; audio.sfx('bad'); }
    }
    const g = u.g; g.clear(); backdrop(g, '#e8eef4');
    g.fillStyle(hex('#384050'), 1).fillRect(30, 30, 180, 12);
    g.fillStyle(hex('#58c070'), 1).fillRect(107, 30, 26, 12);
    g.fillStyle(hex('#f8f8f8'), 1).fillRect(mx - 1, 26, 3, 20);
    // 前臂與石膏層
    g.fillStyle(hex('#f2c8a0'), 1).fillRoundedRect(50, 70, 140, 18, 8);
    for (let i = 0; i < layers; i++) g.fillStyle(hex(i % 2 ? '#f4f4f4' : '#e2e6ee'), 1).fillRect(56, 86 - i * 2, 120, 2).fillRect(56, 88 + i, 120, 1);
    u.hint(['白線到綠區時按 A 疊一層石膏（要 8 層，節奏會越來越快）。', `層數 ${layers}/8　不平整 ${mistA}　時間 ${Math.max(0, 20 - t).toFixed(0)}`]);
    dbg({ id: 'CAST', phase: 1, inZone });
    if (layers >= 8 || t > 20) return true;
  });
  const sA = clamp(Math.round(Math.min(8, layers) / 8 * 40) - 4 * mistA, 0, 40);
  audio.sfx('select');
  // 第二階段：維持手腕背屈 20–30°
  let a = 0, v = 0, inT = 0;
  t = 0;
  await loop(sc, (dt) => {
    t += dt;
    v += rand(-60, 60) * dt; v = clamp(v, -25, 25);
    a += v * dt;
    if (held('LEFT')) a -= 30 * dt;
    if (held('RIGHT')) a += 30 * dt;
    a = clamp(a, -40, 70);
    const ok = a >= 20 && a <= 30;
    if (ok) inT += dt;
    const g = u.g; g.clear(); backdrop(g, '#e8eef4');
    // 量角器
    const ox = 120, oy = 100, R = 60;
    g.lineStyle(6, hex('#c8d0dc'), 1); g.beginPath(); g.arc(ox, oy, R, Math.PI, 2 * Math.PI); g.strokePath();
    const ang = d => Math.PI + (d + 40) / 110 * Math.PI;
    g.lineStyle(6, hex('#58c070'), 1); g.beginPath(); g.arc(ox, oy, R, ang(20), ang(30)); g.strokePath();
    g.lineStyle(2, hex(ok ? '#2a8a40' : '#c84848'), 1);
    g.lineBetween(ox, oy, ox + Math.cos(ang(a)) * (R - 4), oy + Math.sin(ang(a)) * (R - 4));
    g.fillStyle(hex('#f2c8a0'), 1).fillCircle(ox, oy, 6);
    u.hint(['石膏硬化前，按住 ← → 讓手腕維持在功能位（背屈 20–30°，綠色區）。', `角度 ${Math.round(a)}°　維持 ${inT.toFixed(1)}/6 秒`]);
    dbg({ id: 'CAST', phase: 2, a });
    if (inT >= 6 || t > 10) return true;
  });
  u.done();
  const sB = Math.round(60 * Math.min(1, inT / 6));
  return { score: sA + sB, lines: [`疊了 ${Math.min(8, layers)} 層，不平整 ${mistA} 次。`, inT >= 6 ? '○ 固定在功能位。' : `× 只維持功能位 ${inT.toFixed(1)} 秒。`] };
}

// ================= 縫合：等距入針、出針 =================
export async function SUTURE(sc) {
  const u = setup(sc);
  const IN = 108, OUT = 132;
  const done = [];
  let total = 0;
  for (let k = 0; k < 5; k++) {
    const y = 34 + k * 15;
    let t = 0, entry = null, exit = null, speed = 0.55 + 0.07 * k;
    const pts = e => (e <= 3 ? 10 : e <= 6 ? 8 : e <= 10 ? 5 : 2);
    await loop(sc, (dt, keys) => {
      t += dt;
      const x = 120 + 44 * Math.sin(t * speed * Math.PI);
      if (keys.includes('A')) {
        if (entry == null) { entry = x; audio.sfx('cursor'); }
        else { exit = x; audio.sfx('select'); }
      }
      const g = u.g; g.clear(); backdrop(g, '#f0e6dc');
      g.fillStyle(hex('#f2c8a0'), 1).fillRoundedRect(60, 24, 120, 84, 10);
      g.fillStyle(hex('#c83838'), 1).fillRect(119, 28, 3, 76);
      g.fillStyle(hex('#e8a0a0'), 0.5).fillRect(116, 28, 9, 76);
      for (const s of done) { g.lineStyle(2, hex('#283c78'), 1).lineBetween(s.a, s.y, s.b, s.y); g.fillStyle(hex('#283c78'), 1).fillRect(s.b - 1, s.y - 2, 3, 3); }
      g.fillStyle(hex('#58c070'), 0.5).fillRect(IN - 2, y - 4, 5, 8).fillRect(OUT - 2, y - 4, 5, 8);
      if (entry != null) g.fillStyle(hex('#283c78'), 1).fillCircle(entry, y, 2);
      g.lineStyle(1, hex('#606878'), 1).lineBetween(x, y - 8, x, y + 8);
      g.fillStyle(hex('#a8b0c0'), 1).fillTriangle(x - 3, y - 8, x + 3, y - 8, x, y - 2);
      u.hint([entry == null ? '針移到左邊綠點（入針）時按 A。' : '針移到右邊綠點（出針）時按 A。', `第 ${k + 1}/5 針　目前得分 ${total}`]);
      dbg({ id: 'SUTURE', x, target: entry == null ? IN : OUT });
      if (exit != null || t > 9) return true;
    });
    const e1 = entry == null ? 99 : Math.abs(entry - IN), e2 = exit == null ? 99 : Math.abs(exit - OUT);
    total += pts(e1) + pts(e2);
    done.push({ y, a: entry ?? IN - 10, b: exit ?? OUT + 10 });
  }
  u.done();
  return { score: total, lines: [`5 針等距、等深的得分：${total}/100。`, total >= 80 ? '○ 創緣對齊、微微外翻，很漂亮。' : '× 針距不一致，癒合後疤痕會比較明顯。'] };
}

// ================= 轉送病人：出發前檢查＋推床閃避 =================
export async function TRANSPORT(sc) {
  const u = setup(sc);
  u.panel(false);
  const need = ['氧氣筒（存量足夠）', '攜帶式監視器', '點滴與輸液幫浦', '先電話通知接收單位'];
  const decoy = ['幫病人拿拖鞋', '先拔掉點滴比較好推', '順路買一杯咖啡'];
  sc.dlg.set('出發前要準備哪 4 項？（A 勾選）');
  const chosen = await multiMenu(sc, shuffle([...need, ...decoy]), { x: 4, w: 232, visibleRows: 6, y: 110 - (6 * 14 + 14), depth: 300, need: 4 });
  sc.dlg.hide();
  const wrong = chosen.filter(c => !need.includes(c)).length;
  audio.sfx(wrong ? 'bad' : 'good');
  u.panel(true);
  const LANES = [46, 70, 94];
  let lane = 1, t = 0, obs = [], spawn = 0.8, coll = 0, flash = 0, ev = null, missed = 0, fixed = 0;
  const evAt = [rand(5, 9), rand(13, 18)];
  const DUR = 22;
  await loop(sc, (dt, keys) => {
    t += dt; spawn -= dt; flash = Math.max(0, flash - dt);
    if (keys.includes('UP')) lane = Math.max(0, lane - 1);
    if (keys.includes('DOWN')) lane = Math.min(2, lane + 1);
    if (spawn <= 0 && t < DUR - 2) { obs.push({ x: 250, lane: Math.floor(rand(0, 3)), kind: Math.floor(rand(0, 3)) }); spawn = rand(0.8, 1.3); }
    for (const o of obs) o.x -= 72 * dt;
    for (const o of obs) if (!o.hit && o.lane === lane && o.x < 66 && o.x > 30) { o.hit = true; coll++; flash = 0.3; audio.sfx('bump'); }
    obs = obs.filter(o => o.x > -20 && !o.hit);
    if (!ev && evAt.length && t > evAt[0]) { evAt.shift(); ev = { until: t + 2.5 }; audio.sfx('alarm'); }
    if (ev && keys.includes('A')) { ev = null; fixed++; audio.sfx('good'); }
    if (ev && t > ev.until) { ev = null; missed++; audio.sfx('bad'); }
    const g = u.g; g.clear(); backdrop(g, flash > 0 ? '#f6d0d0' : '#dfe4ea');
    for (let i = 0; i < 3; i++) g.fillStyle(hex(i % 2 ? '#d0d6de' : '#d8dee6'), 1).fillRect(0, LANES[i] - 10, W, 22);
    const off = (t * 72) % 24;
    g.fillStyle(hex('#c0c8d2'), 1); for (let x = -off; x < W; x += 24) g.fillRect(x, 33, 12, 2);
    // 推床
    const sy = LANES[lane];
    g.fillStyle(hex('#606878'), 1).fillRect(36, sy + 6, 28, 3);
    g.fillStyle(hex('#f8f8f8'), 1).fillRect(34, sy - 4, 32, 10);
    g.fillStyle(hex('#f2c8a0'), 1).fillCircle(58, sy - 3, 4);
    g.fillStyle(hex('#88b8e0'), 1).fillRect(36, sy - 2, 18, 7);
    for (const o of obs) {
      const oy = LANES[o.lane];
      if (o.kind === 0) { g.fillStyle(hex('#707888'), 1).fillRect(o.x, oy - 6, 14, 12); g.fillCircle(o.x + 4, oy + 7, 4); }
      else if (o.kind === 1) { g.fillStyle(hex('#f0c030'), 1).fillTriangle(o.x, oy + 8, o.x + 12, oy + 8, o.x + 6, oy - 8); }
      else { g.fillStyle(hex('#c06060'), 1).fillRect(o.x + 3, oy - 4, 8, 12); g.fillStyle(hex('#f2c8a0'), 1).fillCircle(o.x + 7, oy - 7, 4); }
    }
    // 進度與氧氣
    g.fillStyle(hex('#384050'), 1).fillRect(80, 20, 150, 6);
    g.fillStyle(hex('#58a8e0'), 1).fillRect(80, 20, 150 * Math.min(1, t / DUR), 6);
    if (ev) { g.fillStyle(hex('#c84848'), 1).fillRect(6, 18, 70, 12); }
    u.hint([ev ? '※ SpO₂ 掉到 88%！按 A 調高氧氣！' : '↑ ↓ 換車道閃開障礙物，把病人安全送到 CT 室。', `碰撞 ${coll}　氧氣處理 ${fixed}/${fixed + missed}`]);
    dbg({ id: 'TRANSPORT', lane, ev: !!ev, obs: obs.map(o => [o.x, o.lane]) });
    if (t > DUR) return true;
  });
  u.done();
  const score = clamp(30 - 10 * wrong, 0, 30) + clamp(70 - 12 * coll - 15 * missed, 0, 70);
  return { score, lines: [wrong ? `× 出發前準備錯了 ${wrong} 項。` : '○ 出發前準備齊全。', `推床碰撞 ${coll} 次；SpO₂ 下降處理 ${fixed}/${fixed + missed}。`] };
}

export const GAMES = { NG, FOLEY, ABG, DRESS, CAST, SUTURE, TRANSPORT };
