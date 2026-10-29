# 急診物語 ER Quest

> 急診住院醫師養成像素 RPG：在時間壓力下問診、理學檢查、下 Order、做處置，救回病人。
> **醫學教育用途，非臨床決策依據。所有案例皆為虛構，不含任何病人資料。**

GBA 時代風格的原創像素 RPG。所有美術、角色與音樂都是原創，由程式即時生成，不使用任何商業遊戲素材。

## 怎麼玩

| 操作 | 鍵盤 | 手機 |
|---|---|---|
| 移動 / 選擇 | 方向鍵 或 WASD | 十字鍵 |
| 確認 / 對話（A） | Z、Enter、空白鍵 | A |
| 取消（B） | X、Esc | B |
| 選單（START） | Shift、M | START |

- 在急診室走進**黃色候診區**，或跟**檢傷護理師**說話，就會遇到病人。
- 「對戰」就是診療：**問診 / 理學檢查 / 檢查 / 處置**。每個動作都會消耗時間，病人不會等你。
- 去**值班室**的床上休息，可以存檔並恢復精神值。

## 遊戲模式

| 模式 | 對象 | 重點 | 時間壓力 | 失敗處理 |
|---|---|---|---|---|
| Clerk | 醫學生 | 問診、理學檢查、DDx，最後向學長報告 | 寬鬆 | M&M 回顧後重試 |
| Resident | 住院醫師 | Order、處置、Disposition | 嚴格 | M&M 回顧＋惡化動畫 |
| 課堂模式 | 教學現場 | 直接進入病例，不影響存檔，適合投影討論 | 依所選模式 | 同上 |

## v0.1 內容

- 急診室地圖：檢傷站、診間、急救室、影像室、值班室、胸痛館（v0.2 開放）
- 案例 No.001：**張力性氣胸**（含 CXR 延誤、送 CT、未減壓插管、穿錯邊等教學陷阱）
- M&M 回顧：做得好、待改進、處置時間軸、教學重點、參考文獻

## 教學設計框架

| 維度 | 框架 | 在遊戲中的落點 |
|---|---|---|
| 定義元素 | ACGME EM Milestones / EPA | 徽章、等級門檻 |
| 解釋因果 | Dual-process theory、Cognitive Load Theory | 時間壓力、精神值 |
| 設計教學 | Deliberate practice＋即時回饋、Self-Determination Theory | 重玩、M&M 回顧、自主選路線 |
| 評估測量 | Kirkpatrick Level 1–2、遊戲內行為紀錄 | 評價、時間軸、漏掉的線索 |

## 新增案例

案例是獨立的 JSON 檔（`data/cases/*.json`），不需要改程式碼。格式請參考 `data/cases/tension-ptx.json` 與 [docs/GDD.md](docs/GDD.md)。新增後請到 `src/config.js` 的 `CASES` 登錄，並更新 `sw.js` 的快取清單。

## 本機執行

純靜態網站，不需要建置：

```bash
python3 -m http.server 8000   # 然後打開 http://localhost:8000
npm test                      # 用 node 模擬多條遊玩路徑，檢查案例引擎
```

## 技術

- 遊戲引擎：[Phaser 3](https://phaser.io)（MIT，`lib/phaser.min.js`）
- 字型：[Cubic 11 俐方體 11 號](https://github.com/ACh-K/Cubic-11)（SIL OFL 1.1，`fonts/`）
- PWA：可加到主畫面、離線遊玩
- 存檔只存在本機瀏覽器（localStorage），不收集任何個資

## 授權

- 程式碼：MIT（見 `LICENSE`）
- 教學內容（`data/cases/`、`docs/`）：CC BY-NC-SA 4.0（見 `CONTENT-LICENSE.md`）
- 第三方：Phaser（MIT）、Cubic 11（OFL）

作者：Dr. Lo
