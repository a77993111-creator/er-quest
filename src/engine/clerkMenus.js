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

// ---------- PGY 篇：急診留觀區（在 Clerk 選單之上擴充） ----------
export const PGY_PE_ITEMS = [
  ...PE_ITEMS,
  { id: 'P15', label: '皮膚（灌流、皮疹）' },
  { id: 'P16', label: 'GCS／NIHSS' },
];

export const PGY_LAB_ITEMS = [
  ...LAB_ITEMS.filter(l => l.id !== 'CXR'),
  { id: 'GAS', label: '血液氣體 VBG/ABG', time: 1, def: 'pH 7.40、PCO₂ 40、HCO₃⁻ 24' },
  { id: 'LAC', label: 'Lactate', time: 1, def: '1.2 mmol/L' },
  { id: 'KET', label: '血酮 β-OHB', time: 1, def: '0.2 mmol/L' },
  { id: 'TYPE', label: '備血 Type & Screen', time: 1, def: '已送備血' },
  { id: 'CXR', label: 'CXR', time: 2, def: '正常' },
  { id: 'POCUS', label: '床邊超音波 POCUS', time: 2, def: '心臟收縮正常，IVC 正常，無心包膜積液' },
  { id: 'CT_HEAD', label: '頭部 CT（非顯影）', time: 8, def: '無出血、無明顯病灶' },
  { id: 'CTA', label: 'CT 血管攝影', time: 10, def: '無異常' },
  { id: 'CT_ABD', label: '腹部 CT', time: 10, def: '無異常' },
];

// 處置：time 為分鐘；cls 由各案例決定（N 必要、O 可接受、H 有害；未列出＝不必要）
export const PGY_TX_ITEMS = [
  { id: 'O2', label: '氧氣（鼻導管）' },
  { id: 'NRM', label: '非再呼吸面罩' },
  { id: 'NIV', label: 'BiPAP 非侵襲通氣', time: 2 },
  { id: 'IVF', label: '輸液 30 mL/kg 晶體液', time: 2 },
  { id: 'IVF_S', label: '輸液 500 mL 試量' },
  { id: 'ABX', label: '廣效抗生素 IV' },
  { id: 'INS', label: '胰島素連續滴注' },
  { id: 'KCL', label: '靜脈補鉀' },
  { id: 'CAG', label: '葡萄糖酸鈣 IV' },
  { id: 'SHIFT', label: '胰島素＋葡萄糖（降鉀）' },
  { id: 'NEB', label: 'β2 吸入（SABA＋SAMA）' },
  { id: 'STER', label: '全身性類固醇' },
  { id: 'EPI', label: '腎上腺素 0.5 mg IM' },
  { id: 'H1', label: '抗組織胺 IV' },
  { id: 'D50', label: '50% 葡萄糖 IV' },
  { id: 'THI', label: 'Thiamine IV' },
  { id: 'PPI', label: 'PPI 靜脈注射' },
  { id: 'PRBC', label: '輸血 PRBC', time: 2 },
  { id: 'LASIX', label: 'Furosemide IV' },
  { id: 'NTG', label: '硝化甘油 NTG' },
  { id: 'TPA', label: '血栓溶解劑 IV tPA', time: 2 },
  { id: 'ASA', label: 'Aspirin 口服' },
  { id: 'HEP', label: 'Heparin 抗凝血' },
  { id: 'BPLOW', label: '靜脈降血壓藥' },
  { id: 'NE', label: '升壓劑 Norepinephrine', time: 2 },
  { id: 'ANALG', label: '止痛（Fentanyl）' },
  { id: 'NPO', label: '禁食＋監測血糖' },
  { id: 'FOLEY', label: '導尿（監測尿量）' },
  { id: 'NG', label: '鼻胃管' },
  { id: 'NA_HCO3', label: '碳酸氫鈉 IV' },
];

export const PGY_PE_LABEL = Object.fromEntries(PGY_PE_ITEMS.map(p => [p.id, p.label]));
export const PGY_LAB_LABEL = Object.fromEntries(PGY_LAB_ITEMS.map(l => [l.id, l.label]));
export const TX_LABEL = Object.fromEntries(PGY_TX_ITEMS.map(t => [t.id, t.label]));

export const PGY_CASES = [
  'p01-urosepsis', 'p02-dka', 'p03-ugib', 'p04-copd', 'p05-hyperk',
  'p06-stroke', 'p07-hypogly', 'p08-anaphylaxis', 'p09-adhf', 'p10-cellulitis',
];
export const PGY_BOSS = 'boss-dissection';

// 家屬代述：查證來源
export const VERIFY_SOURCES = [
  { id: 'MED', label: '藥袋／雲端藥歷', time: 2 },
  { id: 'CHART', label: '過去病歷', time: 2 },
  { id: 'EMS', label: '救護紀錄／目擊者', time: 1 },
  { id: 'PT', label: '再問病人本人', time: 1 },
];

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
