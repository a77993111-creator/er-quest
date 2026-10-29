# 急診物語 遊戲設計文件（GDD）v0.1

## 核心循環

檢傷區遭遇病人 → 診療對戰 → 回饋 / M&M → 經驗與圖鑑 → 挑戰館主 → 徽章

## 診療對戰

| 元素 | 設計 |
|---|---|
| 指令 | 問診 / 理學檢查 / 檢查 / 處置 |
| 時間 | 每個動作消耗分鐘；病人穩定度（S, 0–100）每分鐘下降 `rate` |
| 生命徵象 | 由穩定度內插 `vitals` 錨點；給氧時 SpO₂ 加 `o2Bonus` |
| 精神值 | 每個動作扣 `energy`；低於 20 時每個動作多花 1 分鐘 |
| 結束 | Clerk：S ≤ 15 學長接手；Resident：S ≤ 0 心跳停止；或案例中的 `end` |

## 評分

100 分起算，扣除：失誤權重 `w`、求助學長每次 5 分、減壓時間（Resident > 10 分鐘 −10，> 20 分鐘 −20）、Clerk 漏掉核心線索每項 −8。
S ≥ 95、A ≥ 85、B ≥ 70、其餘 C；失敗為 M&M（F）。

## 案例 JSON 格式

```jsonc
{
  "id": "tension-ptx",
  "dex": { "no": 1, "name": "…", "en": "…", "desc": "…" },
  "patient": { "name": "…", "age": 35, "sex": "男" },
  "intro": ["…"],
  "start": { "S": 70 },
  "rate": { "clerk": 1.0, "resident": 2.0 },
  "endAt": { "clerk": { "S": 15, "text": [], "reason": "takeover" }, "resident": { … } },
  "vitals": [ { "S": 0, "hr": …, "sbp": …, "dbp": …, "rr": …, "spo2": … }, … ],
  "alarms": [ { "below": 45, "text": ["…{bp}…"] } ],
  "timers": { "recur": { "unless": "tube", "modes": ["resident"], "steps": [] } },
  "clues": { "bs": "右側呼吸音消失" },
  "coreClues": ["mech", "bs", "percuss"],
  "categories": { "history": [], "pe": [], "order": [], "treat": [] },
  "teaching": ["…"],
  "refs": ["…"]
}
```

### 動作（action）

`{ "id", "label", "time", "energy", "modes"?: ["clerk"|"resident"], "once"?: true, "steps": [] }`

### 步驟（step）

| 步驟 | 作用 |
|---|---|
| `{"say": [..]}` | 顯示文字；可用 `{hr}` `{bp}` `{rr}` `{spo2}` `{t}` `{cluesList}` |
| `{"if": 條件, "then": [..], "else": [..]}` | 條件分支 |
| `{"choice": {"prompt", "options": [{"label","steps"}]}}` | 讓玩家選擇 |
| `{"time": n}` | 經過 n 分鐘 |
| `{"clue": id}` / `{"flag": id}` / `{"unflag": id}` | 記錄線索、設定旗標 |
| `{"stab": ±n, "cap"?: n}` / `{"rate": n}` | 改變穩定度、惡化速度 |
| `{"good": id, "text"}` / `{"mistake": id, "text", "w"}` | 回饋項目 |
| `{"mark": "decompress"}` | 記錄關鍵處置的時間點 |
| `{"timer": {"id", "in": n}}` | n 分鐘後觸發 `timers` |
| `{"fx": "hiss"|"heal"|"alarm"}` | 演出效果 |
| `{"hint": 1}` | 求助次數 +1 |
| `{"end": "win"|"fail", "reason"}` | 結束病例 |

條件：`flag` `notFlag` `clue` `notClue` `stabBelow` `stabAtLeast` `mode` `cluesAtLeast` `anyClue`，可用 `all` / `any` 組合。

## 路線圖

| 版本 | 內容 |
|---|---|
| v0.1 | 急診室地圖、張力性氣胸、雙模式、課堂模式、PWA |
| v0.2 | 胸痛館其餘 5 案例（Inferior STEMI＋RV、Type A dissection、High-risk PE、Tamponade、低風險胸痛）、館主戰、徽章 |
| v0.3 | 主角名稱輸入、更多地圖區域、教師端匯出 |
