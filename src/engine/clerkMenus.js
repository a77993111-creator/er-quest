// Clerk 篇標準選單：所有案例共用的理學檢查與初步檢驗
export const PE_ITEMS = [
  { id: 'P1', label: '生命徵象複測' },
  { id: 'P2', label: '一般外觀與意識' },
  { id: 'P3', label: '頭頸（結膜、JVD）' },
  { id: 'P4', label: '心臟聽診' },
  { id: 'P5', label: '肺部聽診' },
  { id: 'P6', label: '胸部叩診' },
  { id: 'P7', label: '腹部視診＋聽診' },
  { id: 'P8', label: '腹部觸診' },
  { id: 'P9', label: "Murphy's sign" },
  { id: 'P10', label: 'McBurney＋Rovsing' },
  { id: 'P11', label: 'CVA knocking' },
  { id: 'P12', label: '肛門指診' },
  { id: 'P13', label: '四肢（水腫、脈搏）' },
  { id: 'P14', label: '神經學檢查' },
];

export const LAB_ITEMS = [
  { id: 'CBC', label: 'CBC/DC', time: 1, def: '正常' },
  { id: 'CHEM', label: '生化 BUN/Cr/Na/K', time: 1, def: '正常' },
  { id: 'GLU', label: '血糖', time: 1, def: '正常' },
  { id: 'LFT', label: '肝功能', time: 1, def: '正常' },
  { id: 'LIP', label: 'Lipase', time: 1, def: '正常' },
  { id: 'TROP', label: 'Troponin', time: 1, def: '正常' },
  { id: 'BNP', label: 'NT-proBNP', time: 1, def: '正常' },
  { id: 'COAG', label: '凝血功能', time: 1, def: '正常' },
  { id: 'TSH', label: 'TSH', time: 1, def: '正常' },
  { id: 'BCX', label: '血液培養', time: 1, def: '已送出' },
  { id: 'UA', label: 'UA 尿液檢查', time: 1, def: '正常' },
  { id: 'UCX', label: '尿液培養', time: 1, def: '已送出' },
  { id: 'HCG', label: '尿液 hCG', time: 1, def: '陰性' },
  { id: 'ECG', label: '12-lead ECG', time: 1, def: '竇性心律，無 ST 變化' },
  { id: 'PEFR', label: 'PEFR（床邊）', time: 1, def: '正常' },
  { id: 'CXR', label: 'CXR（請學長開）', time: 2, def: '正常' },
];

export const PE_LABEL = Object.fromEntries(PE_ITEMS.map(p => [p.id, p.label]));
export const LAB_LABEL = Object.fromEntries(LAB_ITEMS.map(l => [l.id, l.label]));

export const CLERK_CASES = [
  'c01-af', 'c02-hf', 'c03-cap', 'c04-asthma', 'c05-pud',
  'c06-panc', 'c07-pyelo', 'c08-aki', 'c09-appy', 'c10-chole',
];
export const BOSS_CASE = 'boss-imi';

export const MINICEX = [
  { key: 'hx', label: '病史詢問' },
  { key: 'pe', label: '身體檢查' },
  { key: 'judg', label: '臨床判斷' },
  { key: 'eff', label: '組織效率' },
  { key: 'overall', label: '整體表現' },
];
