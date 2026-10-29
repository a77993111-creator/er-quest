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

- 每天早上先找**總醫師晨會**，再到診間幫病人看診。
- 「對戰」就是看診：**問診 / 理學檢查 / 檢查 / 報告**。每個動作都會花時間，要問得有重點。
- 看完找總醫師**交班**，再去**值班室**休息進入下一天。

## 遊戲進程（v0.2：Clerk 篇）

| 職級 | 狀態 | 指令 | 場景 |
|---|---|---|---|
| **Clerk** | ✅ 可遊玩 | 問診、理學檢查、初步檢驗、報告（主診斷＋DDx） | 一般診區 |
| PGY | 開發中 | ＋影像、常規處置、Disposition | 急診留觀區 |
| R1–R3 | 規劃中 | ＋POCUS、CT、侵入性處置、CPR | 急救室、CPR 室／Trauma Blue |
| 主治醫師 | 規劃中 | ＋團隊指揮、大量傷患 | 導管室／手術房 |

- **班表**：每天晨會分配 2 位病人，看完用 I-PASS 交班，下班看日報。
- **推理值**：問無關問題 −3、做無關 PE −5、開不必要檢驗 −5；漏問關鍵題 −8、漏問 Red flag −15、漏做關鍵 PE −10、漏開必要檢驗 −8；主診斷錯誤直接進 M&M 回顧。
- **評量**：結算對應 Mini-CEX 五面向（1–9 分），關鍵特徵需 ≥ 80% 才算通過。
- **升等考**：Lv 10 且 10 案中 8 案 B 以上 → 主治辦公室 Boss 戰 → 進化成 PGY。
- **課堂模式**：直接選任一病例，不影響存檔，適合投影討論。

## Clerk 篇案例

心臟（AF、心衰竭惡化）、胸腔（社區型肺炎、氣喘）、消化（潰瘍出血、胰臟炎）、腎臟（腎盂腎炎、腎前性 AKI）、外科（闌尾炎、膽囊炎），以及升等考（以上腹痛表現的 Inferior STEMI）。案例腳本已由臨床教師審定。

## 教學設計框架

| 維度 | 框架 | 在遊戲中的落點 |
|---|---|---|
| 定義元素 | ACGME EM Milestones / EPA | 徽章、等級門檻 |
| 解釋因果 | Dual-process theory、Cognitive Load Theory | 時間壓力、精神值 |
| 設計教學 | Deliberate practice＋即時回饋、Self-Determination Theory | 重玩、M&M 回顧、自主選路線 |
| 評估測量 | Kirkpatrick Level 1–2、遊戲內行為紀錄 | 評價、時間軸、漏掉的線索 |

## 新增案例

Clerk 案例是獨立的 JSON 檔（`data/cases/clerk/*.json`），不需要改程式碼：`history` 每題為 `[選單短標, 問題, 病人回答, K/RF/R/X]`，`pe`／`labs` 只列關鍵與相關項目，其餘自動視為正常。新增後在 `src/engine/clerkMenus.js` 的 `CLERK_CASES` 登錄，並更新 `sw.js` 快取清單。

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
