// 醫學主題原創寵物（16×16 像素，2 影格上下彈跳）
import { canvas, r, dot, ellipse, outline, C } from './art.js';

const INK = C.ink;
function face(c, x, y, opt = {}) {
  // x,y = 左眼位置；兩眼間距 gap
  const g = opt.gap ?? 3;
  r(c, x, y, 1, 2, INK); r(c, x + g, y, 1, 2, INK);
  dot(c, x, y, '#ffffff');
  dot(c, x + g, y, '#ffffff');
  if (opt.blush !== false) { dot(c, x - 1, y + 2, '#f5a0b0'); dot(c, x + g + 1, y + 2, '#f5a0b0'); }
  if (opt.mouth !== false) { dot(c, x + Math.floor(g / 2), y + 2, INK); if (g >= 3) dot(c, x + Math.ceil(g / 2), y + 2, INK); }
}

const DRAW = {
  pet_rbc(c) { // 紅血球：雙凹圓盤
    ellipse(c, 8, 9, 6, 5, '#d83848'); ellipse(c, 8, 9, 3, 2, '#b82838');
    r(c, 4, 6, 2, 1, '#f07080');
    face(c, 6, 8, { gap: 4 });
    r(c, 5, 14, 2, 1, '#a02030'); r(c, 9, 14, 2, 1, '#a02030');
  },
  pet_plt(c) { // 血小板三兄弟
    ellipse(c, 4, 11, 3, 2, '#e8c070'); ellipse(c, 12, 11, 3, 2, '#e8c070'); ellipse(c, 8, 6, 3, 3, '#f0d080');
    dot(c, 3, 11, INK); dot(c, 5, 11, INK); dot(c, 11, 11, INK); dot(c, 13, 11, INK);
    face(c, 7, 5, { gap: 2, blush: false });
    dot(c, 9, 4, '#fff0c0');
  },
  pet_kidney(c) { // 腎臟豆豆
    ellipse(c, 8, 8, 5, 6, '#b85060'); ellipse(c, 12, 8, 2, 2, 'rgba(0,0,0,0)');
    c.clearRect(11, 7, 3, 3);
    r(c, 10, 7, 1, 3, '#903848');
    r(c, 5, 4, 2, 1, '#d87888');
    face(c, 5, 7, { gap: 3 });
  },
  pet_stomach(c) { // 胃袋寶寶（J 形）
    ellipse(c, 8, 9, 5, 5, '#f0a0a8'); r(c, 10, 2, 3, 5, '#f0a0a8'); r(c, 3, 11, 3, 3, '#f0a0a8');
    r(c, 11, 2, 1, 4, '#f8c8d0');
    face(c, 6, 8, { gap: 3 });
  },
  pet_liver(c) { // 肝臟布丁
    r(c, 2, 7, 12, 7, '#a84838'); r(c, 3, 6, 10, 1, '#a84838'); r(c, 4, 5, 6, 1, '#a84838');
    r(c, 3, 5, 8, 2, '#e8b050'); dot(c, 6, 4, '#f0c870'); dot(c, 8, 4, '#c03030');
    r(c, 3, 13, 10, 1, '#803028');
    face(c, 6, 9, { gap: 3 });
  },
  pet_gb(c) { // 膽汁史萊姆
    ellipse(c, 8, 10, 6, 5, '#68b848'); r(c, 6, 3, 4, 3, '#68b848'); dot(c, 7, 2, '#68b848');
    r(c, 4, 7, 2, 2, '#a8e088');
    face(c, 6, 9, { gap: 3 });
  },
  pet_wbc(c) { // 白血球衛士（分葉核＋小盾牌）
    ellipse(c, 8, 8, 6, 6, '#f4f4fa');
    ellipse(c, 6, 5, 2, 1, '#b090d0'); ellipse(c, 10, 5, 2, 1, '#b090d0'); ellipse(c, 8, 4, 2, 1, '#9878c0');
    face(c, 6, 8, { gap: 3 });
    r(c, 12, 10, 3, 4, '#4878c8'); dot(c, 13, 11, '#f8f8f8');
  },
  pet_lung(c) { // 雙子肺葉
    r(c, 7, 1, 2, 4, '#c8d0dc');
    ellipse(c, 4, 9, 3, 5, '#f0a0b0'); ellipse(c, 12, 9, 3, 5, '#f0a0b0');
    dot(c, 3, 8, INK); dot(c, 5, 8, INK); dot(c, 11, 8, INK); dot(c, 13, 8, INK);
    dot(c, 4, 10, INK); dot(c, 12, 10, INK);
    r(c, 6, 4, 4, 1, '#c8d0dc');
  },
  pet_heart(c) { // 迷你心臟君
    ellipse(c, 5, 7, 4, 4, '#d83848'); ellipse(c, 11, 7, 4, 4, '#d83848');
    for (let i = 0; i < 5; i++) r(c, 3 + i, 9 + i, 10 - i * 2, 1, '#d83848');
    r(c, 6, 1, 2, 3, '#c04050'); r(c, 9, 2, 2, 2, '#4870c0');
    r(c, 3, 5, 2, 1, '#f07080');
    face(c, 6, 7, { gap: 4 });
  },
  pet_neuron(c) { // 神經元喵
    ellipse(c, 8, 8, 5, 4, '#f0d0a0');
    r(c, 3, 2, 2, 3, '#f0d0a0'); r(c, 11, 2, 2, 3, '#f0d0a0'); dot(c, 2, 1, '#f0d0a0'); dot(c, 13, 1, '#f0d0a0');
    r(c, 8, 12, 1, 3, '#e0b880'); r(c, 9, 14, 4, 1, '#e0b880');
    face(c, 6, 7, { gap: 3 });
    dot(c, 3, 9, INK); dot(c, 13, 9, INK);
  },
  pet_ab(c) { // 抗體 Y 仔
    r(c, 7, 8, 3, 7, '#5888e0');
    for (let i = 0; i < 6; i++) { r(c, 2 + i, 2 + i, 2, 1, '#5888e0'); r(c, 12 - i, 2 + i, 2, 1, '#5888e0'); }
    ellipse(c, 8, 8, 3, 3, '#7aa8f0');
    face(c, 7, 7, { gap: 2, blush: false });
    dot(c, 2, 2, '#f0c030'); dot(c, 13, 2, '#f0c030');
  },
  pet_ecg(c) { // 心電蛇（身體是 PQRST 波形）
    const pts = [[1, 11], [3, 11], [4, 10], [5, 11], [6, 12], [7, 3], [8, 13], [9, 11], [11, 9], [12, 11], [14, 11]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) r(c, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 2, '#48c868');
    }
    ellipse(c, 13, 10, 2, 2, '#48c868');
    dot(c, 13, 9, INK); dot(c, 14, 9, '#ffffff'); dot(c, 15, 11, '#e04858');
  },
  pet_pocus(c) { // 超音波海豚（身體像探頭）
    ellipse(c, 8, 9, 6, 4, '#7aa0c8'); r(c, 3, 10, 9, 3, '#e8eef6');
    r(c, 6, 3, 2, 3, '#7aa0c8'); r(c, 13, 6, 2, 2, '#7aa0c8'); r(c, 1, 9, 2, 2, '#7aa0c8');
    face(c, 5, 8, { gap: 3, blush: true });
    dot(c, 15, 4, '#a8e0ff'); dot(c, 14, 3, '#a8e0ff'); dot(c, 15, 2, '#a8e0ff');
  },
  pet_dragon(c) { // 聽診龍（尾巴是聽診器）
    ellipse(c, 7, 8, 5, 5, '#48b0a0'); ellipse(c, 7, 10, 3, 2, '#c8f0e0');
    r(c, 3, 2, 2, 2, '#f0c030'); r(c, 9, 2, 2, 2, '#f0c030');
    r(c, 12, 10, 3, 1, '#506078'); r(c, 14, 11, 1, 2, '#506078'); ellipse(c, 14, 14, 1, 1, '#a8b0bc');
    r(c, 1, 7, 2, 3, '#7ad0c0');
    face(c, 5, 7, { gap: 3 });
  },
};

export function drawPet(ctx, ox, oy, id, frame = 0) {
  const [cv, c] = canvas(16, 16);
  (DRAW[id] || DRAW.pet_rbc)(c);
  outline(c, 16, 16);
  ctx.drawImage(cv, ox, oy + (frame ? -1 : 0));
  ctx.fillStyle = 'rgba(30,36,50,0.22)';
  ctx.fillRect(ox + 4, oy + 15, 8, 1);
}

export function bakePets(scene, ids) {
  for (const id of ids) {
    const [cv, ctx] = canvas(32, 16);
    drawPet(ctx, 0, 0, id, 0);
    drawPet(ctx, 16, 0, id, 1);
    const tex = scene.textures.addCanvas(id, cv);
    tex.add(0, 0, 0, 0, 16, 16); tex.add(1, 0, 16, 0, 16, 16);
  }
}
