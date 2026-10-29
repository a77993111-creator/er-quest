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

// 金色聽診器：每項 PE 的教科書小說明
export const PE_NOTES = {
  P1: '【教科書】SBP 下降 ≥ 20 或 DBP 下降 ≥ 10 mmHg 為姿勢性低血壓；HR 上升 ≥ 30 次提示血容不足。',
  P2: '【教科書】先看「病得重不重」：意識、膚色、冒汗、呼吸費力，是最快的分流工具。',
  P3: '【教科書】45° 半坐臥時 JVP 高於胸骨角 > 3 cm 視為升高；結膜蒼白提示貧血。',
  P4: '【教科書】S3 gallop 提示心室充填壓上升；心律不規則時要同時摸脈搏找 pulse deficit。',
  P5: '【教科書】局部 crackles＋支氣管呼吸音＋egophony 提示實質化；雙側肺底 crackles 較常見於肺水腫。',
  P6: '【教科書】叩診濁音：實質化或積液；鼓音：氣胸或肺過度充氣。',
  P7: '【教科書】先聽再觸診，以免改變腸音；腸音消失要警覺腹膜炎或腸阻塞。',
  P8: '【教科書】從不痛的地方開始觸診；反彈痛與 guarding 提示腹膜刺激。',
  P9: "【教科書】深吸氣時按壓右上腹，病人因痛中斷吸氣即為陽性；對急性膽囊炎特異性高，老年人敏感度較低。",
  P10: '【教科書】McBurney 點位於臍與右前上腸骨棘連線的外 1/3；Rovsing：壓左下腹引起右下腹痛。',
  P11: '【教科書】肋脊角叩擊痛支持腎盂腎炎或腎結石，需配合尿液檢查判讀。',
  P12: '【教科書】可確認黑便或鮮血、肛門腫塊；腸胃道出血時是重要的床邊檢查。',
  P13: '【教科書】凹陷性水腫要分級並看是否對稱；摸橈動脈可發現脈搏不規則與 pulse deficit。',
  P14: '【教科書】評估意識、瞳孔、肌力與感覺；局部神經學缺損要想到中風。',
};
