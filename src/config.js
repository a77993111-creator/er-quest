export const GAME_TITLE = '急診物語';
export const GAME_SUBTITLE = 'ER QUEST';
export const VERSION = 'v0.1.0';
export const AUTHOR = 'Dr. Lo';
export const CASES = ['tension-ptx'];

// 胸痛館圖鑑槽位（v0.1 只有 No.001 可遊玩）
export const DEX_SLOTS = [
  { no: 1, id: 'tension-ptx' },
  { no: 2, id: 'stemi-rv' },
  { no: 3, id: 'aortic-dissection' },
  { no: 4, id: 'massive-pe' },
  { no: 5, id: 'tamponade' },
  { no: 6, id: 'msk-chest-pain' },
];

export const FAIL_REASON = {
  takeover: '病人惡化到學長必須接手。',
  arrest: '病人發生心跳停止（PEA）。',
  ct: '不穩定的病人被送去 CT，在掃描台上惡化。',
  present: '報告的診斷或下一步不正確。',
  dispo: '病人去向（Disposition）不安全。',
};
