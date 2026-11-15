# 國字手寫模組：候選驗證紀錄

日期：2026-11-15（臺灣時間）。狀態：本機候選已驗證；未部署，未經學生筆跡或學校 iPad 實測。

## 本次範圍

- `hanzi-stroke-core.js`：無 DOM／網路的純函式 `gradeStrokes`。
- `hanzi-handwriting.js`：以 Pointer Events 收集筆跡的白色大田字格。
- `data/hanzi-strokes/`：84份單字模板及 manifest。
- `licenses/hanzi-*`：資料授權與來源。
- `tests/hanzi-handwriting-core.test.js`、`tests/hanzi-handwriting-browser.test.js`。
- `hanzi.js` 的手寫載入／切題／返回／恢復與示範競態窄修，以及 `tests/hanzi-handwriting-navigation.test.js`。

## 不能超過的判定範圍

這是「已知題目答案」的筆跡與指定模板比較，並非可辨識任意國字的 OCR。座標比對通過不代表已由兒童實際書寫資料驗證準確率。`shape.score` 是幾何相似度指標，**不是小考分數、書寫能力分數或辨識機率**。

學生寫完後才評估；字形與筆順分開回報。墨跡不會吸附成標準字。比對採全字統一等比例縮放，保留整字長寬比例、各筆相對位置與長度；以一對一筆畫配對分離字形與順序，另檢查運筆方向。

**最新授權已採自動判分：** 老師明確要求孩子可在家完成，不等待老師複核。主畫面與服務端顯式傳 `gradingPolicy: "automatic-v1"`；練習和小考只要模板可用、筆跡完整，均自動回 correct 或 incorrect。幾何中間區域以明確門檻（平均距離0.15、最大單筆距離0.29）決定；筆順依最佳配對、方向及其他同筆數字的比較決定。每筆／整字最多2,000點；超限、中斷、空白或壞資料要求重新書寫，不送教師待批改；缺模板須在出題前阻擋。

目前84字的 `readiness: "practice-only"`／`examReady: false` **只記錄尚未經兒童實機校準的來源狀態，不阻擋最新自動判分政策**。輸出 `provisional: true`、`confidence` 和理由供後續處理回報；confidence 是幾何證據等級，不是校準後的正確機率。保留未指定 policy 的舊行為供相容測試，舊 exam 模式仍會等待複核；正式新流程必須明確選 automatic-v1。

## 資料來源與覆蓋

- 83字來自 AnimCJK `svgsZhHant` 臺灣資料，固定 commit `c63765b150cbd567c71d05cf4a4f8d00b57045c9`。
- 「蛙」在該臺灣資料集缺漏，依老師教材12筆順序，獨立製作普通幾何中心線候選。未改用大陸字庫，也未擷取教材或教育部向量圖。
- 六課74字筆數與教材核對一致。預備一至十原字表無筆數欄，manifest 分別記 `countMatchesTextbook: null` 和 `countMatchesExpected: true`。
- 共84個唯一字、2,015點；所有點在0至1，每筆至少2點。含 manifest 的 JSON 約245KB，執行時按單字載入。
- 已視覺比對「左、右、也、比、花、這、那、蛙」逐步新增筆畫的先後。未宣稱其餘76字或所有運筆方向已逐筆人工核准。
- 詳見每字 `source`／`review`、`data/hanzi-strokes/manifest.json`、`licenses/hanzi-SOURCES.md`。

## API 與共用資料約定

```js
import { gradeStrokes, HANDWRITING_MODEL_VERSION } from './hanzi-stroke-core.js';
import { createHandwriting } from './hanzi-handwriting.js';

const board = createHandwriting(container, {
  onChange({ character, strokeCount, strokes, inputInterrupted, inputTooComplex, isDrawing }) {},
  allowDemo: true,
  // 可選，用於測試或受控資料載入；預設按字讀同源JSON。
  // loadReference: async character => reference
});

await board.load('右');      // 成功回 reference；資料缺少回 null，保留待確認提示。
board.getStrokes();          // 深拷貝，供提交／教師重播。
board.restoreStrokes(saved, { inputInterrupted: false }); // 合格 true；不合格 false，原筆跡不動。
board.setDisabled(true);     // 停止輸入，提交後防止畫面筆跡與已存答案不同。
board.setDisabled(false);    // 下一題由呼叫端明確恢復；load 不擅自解除鎖定。
board.undo();                // 移除最後一筆，成功 true，空白 false。
board.clear();
const result = board.grade({ mode: 'practice', gradingPolicy: 'automatic-v1', alternatives: [] });
await board.showDemo();      // 保留原墨跡；完成 true，取消 false。
board.destroy();
```

學生筆跡固定格式：

```json
[
  [{ "x": 0.2, "y": 0.3, "t": 0, "pressure": 0.5 }, { "x": 0.8, "y": 0.3, "t": 410, "pressure": 0.5 }]
]
```

外層陣列順序為筆順；每筆內點順序為運筆方向。`x/y` 為0至1、左上原點，與畫布尺寸無關；`t` 是自本次清空後開始的相對毫秒，可供教師重播；pressure 僅記錄，現行判定不用壓力。

恢復筆跡會驗證 x/y 嚴格在0至1、t非負有限安全數、pressure在0至1；最多64筆、每筆2,000點、整字2,000點。採深拷貝、重畫原墨跡，保留／回報中斷標記，後續書寫的相對時間接續最後一點。`setDisabled(true)` 若正好有未抬起的筆，將其標為中斷；解除鎖定不會清除既有墨跡。捕捉到第2,001點會保留該點作超限證據、停止繼續捕捉並顯示重寫提示，grade 回 `needsRewrite: true`；不靜默抽掉原筆跡點數。

模板 `reference.strokes` 為相同座標系的 `[[[x,y],...],...]`。每字檔名 `UXXXX.json` 使用大寫十六進位 Unicode，例如右為 `U53F3.json`。

`gradeStrokes(raw, reference, options)` 與 `board.grade(options)` 同格式：

```js
{
  status: 'correct' | 'incorrect' | 'pending',
  correct: true | false | null,
  needsReview: boolean,
  shape: { status, score, meanDistance?, worstDistance? },
  order: { status, wrongPositions: [], reversedStrokes: [], ambiguousPositions?: [] },
  reasons: [],
  strokeCount, expectedStrokeCount, character,
  modelVersion: 'tw-template-20261115-v2',
  referenceVersion,
  gradingPolicy: 'automatic-v1',
  provisional: true,
  confidence: 'high' | 'medium' | 'low' | 'unavailable',
  confidenceBasis: 'template-geometry-not-calibrated-probability',
  needsRewrite: false,
  requiresTemplate: false,
  gradingScope: 'specified-character-template',
  calibratedOnChildren: false
}
```

畫布抬筆／方向需靠原始筆跡；不能由手寫鍵盤轉出的文字重建。automatic-v1 的 Pointer cancel、中斷、空白、疑似誤觸、過小字或超限資料回 pending 加 `needsRewrite: true`、`needsReview: false`，由學生重新書寫。無模板回 `requiresTemplate: true`，不可任意判字。完整筆跡的模糊字形則自動決定。重播和事後改分保留原始答案，不能以模板筆跡取代學生筆跡。

服務端須自行決定可信作業模式與 `gradingPolicy`，讀取可信模板並重算；不得接受前端提交的 `correct`、`shape.score` 或讓學生指定 policy／thresholds 覆蓋作業設定。可傳入同筆數其他字模板 `alternatives`，較像另一個字時不直接放行。可調參數在 `AUTOMATIC_GRADING_DEFAULTS`；只允許可信程式以 `automaticThresholds` 有界調整。

## 已做驗證

執行：

```text
node --test tests/hanzi-handwriting-browser.test.js tests/hanzi-handwriting-core.test.js
```

結果：18項通過，0失敗，0略過。

核心測試包括：

- 全84字模板的練習比對，原始墨跡輸入不被修改。
- 右、手、這、花、那的平移／等比例縮放及小幅抖動。
- 逆筆順保留字形通過但筆順失敗；倒方向獨立辨識。
- 缺筆、多筆、空白、誤觸、中斷、過小字。
- 本教材540組同筆數的不同字模板互相比對，沒有誤判為 correct；這不是所有可能兒童寫法的測試。
- 形近字較像另一候選、非有限數／越界／非數字／過量筆畫資料、缺模板與筆數不一致。
- 舊政策的未審核 exam 模板維持相容行為；automatic-v1 的84字 exam 模板自動判定。
- 自動政策的中間區域採可調門檻，逆序／反向／540組同筆數錯字均自動判錯；缺模板不亂判。
- 每字／每筆2,000點上限，中斷與超限要求重寫，沒有教師等待佇列；輸出可重現並保留候選標示。

瀏覽器測試使用本機 headless Chrome、Playwright，以記憶體路由供應本工作副本檔案，沒有外部網路、正式站台或學生資料。驗證實際 mouse 拖曳寫「右」的筆跡取得與判定、畫板縮小後筆跡完全相同、上一筆／清空、synthetic pen pointercancel 待確認、恢復筆跡／深拷貝／拒絕壞資料且保留原筆跡、鎖定後拖曳不新增墨跡、筆順示範自然結束／取消的 Promise 回傳與元件銷毀。頁面無 JavaScript 例外。

原先 localhost 導覽被執行環境拒絕，改為上述記憶體路由後通過；未繞過正式帳號或修改網路／防火牆設定。

另執行 `node --test tests/hanzi-handwriting-navigation.test.js`，2項真實 Chrome 整合回歸通過（0失敗／略過）。在原學生程式上，以記憶體路由故意延遲筆順資料及回傳一次503，驗證載入中返回／連按下一題與繼續無法跳題，舊題示範取消後不會重新啟用新題按鈕；缺資料後可返回營地重新載入，同一回合第二題沒有第一題墨跡，第一題已提交答案仍保留。另確認落筆中 reload 保存中斷旗標、原座標恢復、先撤銷半筆後可繼續，以及提交後畫布鎖定。

另一整合案例令 sessionStorage getter 直接拋 SecurityError，試玩仍可載入並顯示無法保存進度的提示。主程式以 generation、固定 board／題目／index 判斷非同步結果歸屬；busy/loading 使用明確終態，失敗的模板快取移除供重試，成功模板仍按字快取。這些測試未對正式API或學生資料發出請求。

## 尚待驗證

- 學校實際 iPad Safari、觸控筆、手指、橫直向切換、手掌誤觸與網路。
- 孩子的不同字形、筆畫長短、連筆／斷筆與寫字速度；容錯門檻須依測試調整。
- 全84字逐筆運筆方向與可接受變體的老師確認。
- 學生主畫面、後台、作業、小考、獎勵與班級隔離整合驗收；不在獨立手寫元件測試範圍。
- 正式部署與線上驗證。
