# PGY 篇案例撰寫規格（data/cases/pgy/*.json）

PGY 篇場景是「急診留觀區」，病人中度危急。玩家（PGY）可以：問診、理學檢查（PE）、檢查（含 CT、POCUS）、**處置**（會即時改變生命徵象與病程）、報告（主診斷＋3 個 DDx＋**Disposition**）。所有病人都是虛構的。

範例：`data/cases/pgy/p02-dka.json`（請先完整讀過）。

## 欄位

| 欄位 | 說明 |
|---|---|
| `id` `no` `tier` | 檔名 id、編號、固定 `"pgy"` |
| `dept` | 科別（中文，例如 感染、腸胃、胸腔、腎臟、神經、內分泌、過敏免疫、心臟） |
| `dex` | `{name, en, desc}` 圖鑑；desc ≤ 60 字 |
| `patient` | `{name, age, sex: "男"/"女", cc, pose: "chest"/"abdomen"/"back"/"none"}`；name 用「姓＋稱謂」 |
| `vitals` | `{hr, sbp, dbp, rr, spo2, t, note}` 到院生命徵象 |
| `target` | 目標分鐘數（最佳路徑大約 80–95% 的時間） |
| `intro` | 2–3 句。第一句固定「{name}，{age} 歲，主訴{cc}。」 |
| `history` | `[標籤, 問句, 回答, 類別]`。類別：`K` 關鍵、`RF` Red flag（至少 1 個）、`R` 相關但非必要、`X` 無關（至少 2 個）。10–13 題。標籤 ≤ 10 字。回答用病人第一人稱、加「」 |
| `pe` | `{PE_ID: [發現, "K"/"R"]}`；`peX`：做了會扣分的 PE（不可與 pe 重複） |
| `labs` | `{LAB_ID: [結果, "N"/"O"]}`：N 必要、O 可接受；`labX`：不必要（不可與 labs 重複） |
| `tx` | `{TX_ID: {cls, text, deadline?, fx?, S?, needs?, needsWhy?, why?}}` 見下 |
| `course` | 病程：`{startS, dropPerMin, alarmS, failS, stabilizeBy: [TX_ID...], alarm: [..], fail: [..], stableText: [..]}` |
| `dx` | `[正確主診斷, 其他 4 個]`，每個 ≤ 18 個全形字 |
| `mustDdx` | 必排除的 2 個（必須出現在 dx 裡） |
| `dispo` | `{options: [正確, 錯1, 錯2, 錯3], explain}`；每個選項 ≤ 40 字 |
| `trap` `teaching` `refs` | 陷阱一句；教學重點 4–5 條（含指引的具體數字）；參考文獻 1–3 條（真實、最新版指引，寫正確年份） |
| `ipass` | `I P A S err` 各 3 個選項（第一個正確）＋ `said`（夜班學長複述，裡面藏一個錯誤）；err[0] 指出那個錯誤 |
| `proxy` | 家屬代述設定（選填但建議）：`{who, why, conflict?: {q, src, says, truth}}`。q 是 history 的索引（必須是 K 或 RF），src 是查證來源 `MED`（藥袋／雲端藥歷）、`CHART`（過去病歷）、`EMS`（救護紀錄／目擊者）、`PT`（再問病人）；says 是家屬錯誤或不完整的說法；truth 是查證後的真相 |
| `pocus` | 一句：床邊超音波會看到什麼 |

## 處置 `tx`

- `cls`：`N` 必要（沒給扣 10；超過 `deadline` 分鐘才給扣 5）、`O` 可接受（不加不扣）、`H` 有害（扣 15，並寫 `why` 說明為什麼有害）。**沒列在 tx 的處置一律算不必要（扣 5）**。
- `fx`：給藥後生命徵象的變化（例：`{"hr": -10, "sbp": 15, "spo2": 4}`）。
- `S`：對穩定度的影響（N 通常 +10～+20；H 為負）。
- `needs` + `needsWhy`：給之前必須先開的檢查（例如 tPA 需要 `CT_HEAD` 與 `GLU`）；沒開就給會扣 10 並顯示 needsWhy。
- 每個案例至少 1 個 N、至少 1 個 H（常見的錯誤處置），2–4 個 O。

## 病程 `course`

穩定度 S 從 `startS` 開始，每分鐘下降 `dropPerMin`，直到 `stabilizeBy` 的處置全部給完（之後每分鐘 +2）。S < `alarmS` 時跳警報、≤ `failS` 時總醫師接手（失敗）。建議：startS 70–80、dropPerMin 1（升等考可 1.5–2）、alarmS 55、failS 30–35。需確認最佳路徑不會被接手。

## 可用的選單 ID（src/engine/clerkMenus.js）

- PE：P1 生命徵象複測、P2 一般外觀與意識、P3 頭頸、P4 心臟聽診、P5 肺部聽診、P6 胸部叩診、P7 腹部視診＋聽診、P8 腹部觸診、P9 Murphy、P10 McBurney＋Rovsing、P11 CVA knocking、P12 肛門指診、P13 四肢（水腫、脈搏）、P14 神經學檢查、P15 皮膚（灌流、皮疹）、P16 GCS／NIHSS
- 檢查（時間）：CBC、CHEM（生化 BUN/Cr/Na/K）、GLU、LFT、LIP、TROP、BNP、COAG、TSH、BCX、UA、UCX、HCG、ECG、PEFR（各 1 分）；GAS 血液氣體、LAC、KET 血酮、TYPE 備血（各 1）；CXR、POCUS（各 2）；CT_HEAD（8）、CTA CT 血管攝影（10）、CT_ABD（10）
- 處置：O2、NRM、NIV（2 分）、IVF 30 mL/kg（2）、IVF_S 500 mL、ABX、INS、KCL、CAG 葡萄糖酸鈣、SHIFT 胰島素＋葡萄糖、NEB、STER、EPI 0.5 mg IM、H1、D50、THI、PPI、PRBC（2）、LASIX、NTG、TPA（2）、ASA、HEP、BPLOW 靜脈降血壓藥、NE（2）、ANALG、NPO、FOLEY、NG、NA_HCO3

## 驗證

`node tests/pgy.test.js <id>`：格式、最佳路徑必須拿到 S 且不被接手、什麼都不做會被接手、有害處置會扣分、少給必要處置不會是 S、Disposition 錯會扣分、家屬代述＋查證後仍可拿 S。全部 PASS 才算完成。

## 原則

- 內容以台灣急診實務與最新國際指引為準（例如 Surviving Sepsis Campaign 2021、GOLD 2025、AHA/ASA 2019 急性缺血性中風更新、ESC 2021/2023 心衰竭、WAO 2020 過敏性休克、ACG 2021 上消化道出血、2024 ADA 高血糖危象共識、ESC 2024 主動脈疾病）。
- 不使用真實病人資料；不提及醫院名稱。
- 用繁體中文、台灣用語；醫學術語保留英文（如 NIHSS、MAP、Hb）。
