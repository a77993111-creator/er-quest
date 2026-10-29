// 白袍幣商店：裝備與寵物目錄（全部原創，不使用真實品牌）
// rarity：N 普通 / R 稀有 / L 傳說；unlock：成就限定（不能購買）
// fx：額外功能（只提升體驗，不影響評分、提示或升等考資格）

export const SLOTS = [
  { key: 'steth', label: '聽診器' },
  { key: 'scrub', label: '刷手服' },
  { key: 'head', label: '頭部' },
  { key: 'chest', label: '胸前配件' },
  { key: 'shoes', label: '鞋子' },
];

export const RARITY = { N: { label: '普通', color: '#7a8494' }, R: { label: '稀有', color: '#3e80d0' }, L: { label: '傳說', color: '#d89020' } };

const RAINBOW = ['#e84848', '#f0a030', '#e8d840', '#48b860', '#4878e0'];

export const ITEMS = [
  // 聽診器
  { id: 'st_silver', slot: 'steth', name: '銀色聽診器', rarity: 'N', price: 50, color: '#a8b0bc' },
  { id: 'st_black', slot: 'steth', name: '黑色聽診器', rarity: 'N', price: 60, color: '#303038' },
  { id: 'st_wine', slot: 'steth', name: '酒紅聽診器', rarity: 'N', price: 80, color: '#8a2838' },
  { id: 'st_navy', slot: 'steth', name: '海軍藍聽診器', rarity: 'N', price: 80, color: '#28407a' },
  { id: 'st_mint', slot: 'steth', name: '薄荷聽診器', rarity: 'N', price: 100, color: '#58c8a8' },
  { id: 'st_rainbow', slot: 'steth', name: '彩虹聽診器', rarity: 'R', price: 300, color: RAINBOW },
  { id: 'st_rose', slot: 'steth', name: '玫瑰金聽診器', rarity: 'R', price: 350, color: '#e0a090' },
  { id: 'st_gold', slot: 'steth', name: '金色聽診器', rarity: 'L', unlock: 'kf5', color: '#f0c030', fx: 'PE 結果附上一句教科書說明' },
  // 刷手服
  { id: 'sc_blue', slot: 'scrub', name: '藍色刷手服', rarity: 'N', price: 80, color: '#4878c8' },
  { id: 'sc_green', slot: 'scrub', name: '綠色刷手服', rarity: 'N', price: 80, color: '#48a070' },
  { id: 'sc_purple', slot: 'scrub', name: '紫色刷手服', rarity: 'N', price: 100, color: '#8058b8' },
  { id: 'sc_pink', slot: 'scrub', name: '粉紅刷手服', rarity: 'N', price: 100, color: '#e888a8' },
  { id: 'sc_gray', slot: 'scrub', name: '灰色刷手服', rarity: 'N', price: 80, color: '#7a8090' },
  { id: 'sc_camo', slot: 'scrub', name: '迷彩刷手服', rarity: 'R', price: 300, color: '#607848' },
  { id: 'sc_star', slot: 'scrub', name: '星空刷手服', rarity: 'R', price: 350, color: '#283068' },
  { id: 'sc_glow', slot: 'scrub', name: '夜光刷手服', rarity: 'L', unlock: 'ipass5', color: '#48e0c0', fx: '每天免費一杯咖啡' },
  // 頭部
  { id: 'hd_cap_blue', slot: 'head', name: '素色手術帽', rarity: 'N', price: 60, head: { kind: 'cap', color: '#5890d8' } },
  { id: 'hd_cap_flower', slot: 'head', name: '小花手術帽', rarity: 'N', price: 100, head: { kind: 'cap', color: '#f0f0f8', dots: [[5, 1, '#e86888'], [8, 0, '#f0c030'], [10, 1, '#e86888']] } },
  { id: 'hd_cap_dino', slot: 'head', name: '恐龍手術帽', rarity: 'N', price: 120, head: { kind: 'cap', color: '#78c050', dots: [[6, 0, '#f8f8f8'], [9, 0, '#f8f8f8'], [7, 1, '#3a7028']] } },
  { id: 'hd_cap_heart', slot: 'head', name: '愛心手術帽', rarity: 'N', price: 120, head: { kind: 'cap', color: '#f8d8e0', dots: [[6, 1, '#e04858'], [9, 1, '#e04858']] } },
  { id: 'hd_cap_ecg', slot: 'head', name: '心電圖手術帽', rarity: 'R', price: 300, head: { kind: 'cap', color: '#283048', dots: [[5, 1, '#58e078'], [6, 1, '#58e078'], [7, 0, '#58e078'], [8, 2, '#58e078'], [9, 1, '#58e078'], [10, 1, '#58e078']] } },
  { id: 'hd_glass_round', slot: 'head', name: '圓框眼鏡', rarity: 'N', price: 80, head: { kind: 'glasses', color: '#6a4830' } },
  { id: 'hd_glass_square', slot: 'head', name: '方框眼鏡', rarity: 'N', price: 80, head: { kind: 'glasses', color: '#202028' } },
  { id: 'hd_band', slot: 'head', name: '運動髮帶', rarity: 'N', price: 60, head: { kind: 'band', color: '#e04848' } },
  { id: 'hd_clip', slot: 'head', name: '愛心髮夾', rarity: 'N', price: 50, head: { kind: 'clip', color: '#f06888', color2: '#f8b8c8' } },
  { id: 'hd_chief', slot: 'head', name: '主任眼鏡', rarity: 'L', unlock: 'exam', head: { kind: 'glasses', color: '#c09020', lens: '#a8d8f0' }, fx: '日報顯示 Mini-CEX 與前 3 天的進步趨勢' },
  // 胸前配件
  { id: 'ch_penlight', slot: 'chest', name: '筆燈', rarity: 'N', price: 30, px: [[5, 9, '#e8e8f0'], [5, 10, '#f0d040']] },
  { id: 'ch_hammer', slot: 'chest', name: '反射槌', rarity: 'N', price: 50, px: [[5, 9, '#e05050'], [5, 10, '#a0a8b8']] },
  { id: 'ch_tag', slot: 'chest', name: '名牌吊飾', rarity: 'N', price: 40, px: [[10, 10, '#4878c8'], [10, 11, '#f8f8f8']] },
  { id: 'ch_heart', slot: 'chest', name: '心臟別針', rarity: 'N', price: 60, px: [[5, 9, '#d83848'], [5, 10, '#a02030']] },
  { id: 'ch_kidney', slot: 'chest', name: '腎豆別針', rarity: 'N', price: 60, px: [[5, 9, '#a85058'], [5, 10, '#a85058']] },
  { id: 'ch_bear', slot: 'chest', name: '小熊吊飾', rarity: 'N', price: 80, px: [[10, 10, '#b07840'], [10, 11, '#b07840']] },
  { id: 'ch_cpr', slot: 'chest', name: 'CPR 別針', rarity: 'N', price: 70, px: [[5, 9, '#f8f8f8'], [5, 10, '#e04848']] },
  { id: 'ch_rainbow', slot: 'chest', name: '彩虹筆燈', rarity: 'R', price: 400, px: [[5, 9, '#e84848'], [5, 10, '#48b860'], [5, 11, '#4878e0']], fx: '精神值上限 +10' },
  // 鞋子
  { id: 'sh_white', slot: 'shoes', name: '白色護士鞋', rarity: 'N', price: 40, color: '#f0f0f4' },
  { id: 'sh_black', slot: 'shoes', name: '黑色皮鞋', rarity: 'N', price: 40, color: '#202024' },
  { id: 'sh_red', slot: 'shoes', name: '紅色球鞋', rarity: 'N', price: 60, color: '#d83838' },
  { id: 'sh_blue', slot: 'shoes', name: '藍色球鞋', rarity: 'N', price: 60, color: '#3868d0' },
  { id: 'sh_croc', slot: 'shoes', name: '洞洞鞋', rarity: 'R', price: 250, color: '#f0a030', extra: 'croc' },
  { id: 'sh_wing', slot: 'shoes', name: '飛毛腿', rarity: 'L', unlock: 'days10', color: '#f8f8f8', extra: 'wing', fx: '地圖走路速度 ×1.5' },
];

// 成就徽章（顯示在醫師卡，不能購買）
export const BADGES = [
  { id: 'b_redflag', name: 'Red flag 獵人', desc: '連續 5 案沒有漏問 Red flag' },
  { id: 'b_nodx', name: '零誤診', desc: '連續 10 案主診斷正確' },
  { id: 'b_ipass', name: 'I-PASS 達人', desc: '交班滿分 5 次' },
  { id: 'b_full', name: '全勤', desc: '連續 5 天兩位病人都 A 以上' },
  { id: 'b_firsts', name: '首日 S', desc: '第一天就拿到 S' },
  { id: 'b_all10', name: '十案全通', desc: '10 案全部通過' },
  { id: 'b_exam', name: '升等合格', desc: '通過升等考' },
  { id: 'b_class', name: '課堂之星', desc: '在課堂模式完成 5 案' },
];

export const PETS = [
  { id: 'pet_rbc', name: '小紅', sub: '紅血球精靈', rarity: 'N', price: 300 },
  { id: 'pet_plt', name: '板板', sub: '血小板三兄弟', rarity: 'N', price: 300 },
  { id: 'pet_kidney', name: '腎豆', sub: '腎臟豆豆', rarity: 'N', price: 400 },
  { id: 'pet_stomach', name: '胃寶', sub: '胃袋寶寶', rarity: 'N', price: 400 },
  { id: 'pet_liver', name: '小肝', sub: '肝臟布丁', rarity: 'N', price: 500 },
  { id: 'pet_gb', name: '膽綠綠', sub: '膽汁史萊姆', rarity: 'N', price: 500 },
  { id: 'pet_wbc', name: '白白', sub: '白血球衛士', rarity: 'R', price: 800, fx: '每天第一位病人看完，精神值 +10' },
  { id: 'pet_lung', name: '肺泡泡', sub: '雙子肺葉', rarity: 'R', price: 800, fx: '精神值消耗 −20%' },
  { id: 'pet_heart', name: '噗通', sub: '迷你心臟君', rarity: 'R', price: 900, fx: '看診時顯示 ECG 波形動畫' },
  { id: 'pet_neuron', name: '神經元喵', sub: '神經細胞貓', rarity: 'R', price: 900, fx: '日報多一頁「今日學習摘要」' },
  { id: 'pet_ab', name: 'Y 仔', sub: '抗體小精靈', rarity: 'R', price: 1000, fx: '白袍幣獲得 +10%' },
  { id: 'pet_ecg', name: '心電蛇', sub: 'ECG 波浪蛇', rarity: 'L', unlock: 'ecg20', fx: '回顧時畫出本案 ECG 波形' },
  { id: 'pet_pocus', name: 'POCUS 豚', sub: '超音波海豚', rarity: 'L', unlock: 'allA', fx: '回顧多一頁「床邊超音波會看到什麼」' },
  { id: 'pet_dragon', name: '聽診龍', sub: '聽診器小龍', rarity: 'L', unlock: 'redflag5', fx: '白袍幣 +20%，地圖專屬光環' },
];

export const UNLOCK_TEXT = {
  kf5: '關鍵特徵連續 5 案 100%',
  ipass5: 'I-PASS 滿分 5 次',
  exam: '通過升等考',
  days10: '累計上班 10 天',
  ecg20: '累計 20 次在 10 分鐘內開立 ECG',
  allA: '10 案全部 A 以上',
  redflag5: '連續 5 案沒有漏問 Red flag',
};
