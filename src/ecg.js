// 簡化的 Lead II 心電圖波形（教學示意，非真實訊號）
export function ecgType(caseData) {
  const t = caseData?.labs?.ECG?.[0] || '';
  if (/AF/.test(t)) return 'af';
  if (/ST 上升/.test(t)) return 'stemi';
  return 'sinus';
}

// 回傳一個心跳週期內第 u（0–1）位置的振幅（-1 至 1，向上為正）
function beat(u, type) {
  const g = (c, w, a) => a * Math.exp(-((u - c) ** 2) / (2 * w * w));
  let v = 0;
  if (type !== 'af') v += g(0.16, 0.025, 0.15);          // P
  v += g(0.29, 0.012, -0.12) + g(0.32, 0.016, 1.0) + g(0.355, 0.012, -0.25); // QRS
  if (type === 'stemi') v += (u > 0.35 && u < 0.5 ? 0.3 : 0) + g(0.52, 0.05, 0.35);
  else v += g(0.55, 0.05, 0.28);                        // T
  return v;
}

// 產生 n 個點的波形；hr 決定心跳間距；AF 間距不規則並帶細小顫動
export function ecgPoints(n, hr, type, phase = 0, pxPerSec = 60) {
  const pts = new Array(n).fill(0);
  let rnd = 12345;
  const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  const base = (60 / Math.max(30, hr)) * pxPerSec;
  let x = -(phase % (type === 'af' ? base * 1.5 : base)) - base;
  while (x < n) {
    const len = type === 'af' ? base * (0.6 + rand() * 0.8) : base;
    for (let i = 0; i < len; i++) {
      const xi = Math.floor(x + i);
      if (xi >= 0 && xi < n) pts[xi] = beat(i / len, type);
    }
    x += len;
  }
  if (type === 'af') for (let i = 0; i < n; i++) pts[i] += Math.sin(i * 1.7 + phase) * 0.04;
  return pts;
}

export function drawEcg(g, x, y, w, h, hr, type, phase = 0, color = 0x58e078, pxPerSec = 60) {
  const pts = ecgPoints(w, hr, type, phase, pxPerSec);
  g.fillStyle(color, 1);
  const mid = y + h * 0.62;
  let prev = Math.round(mid - pts[0] * h * 0.5);
  for (let i = 0; i < w; i++) {
    const yy = Math.round(mid - pts[i] * h * 0.5);
    g.fillRect(x + i, Math.min(prev, yy), 1, Math.abs(yy - prev) + 1);
    prev = yy;
  }
}
