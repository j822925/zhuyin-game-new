# 好友角色動作 SOCIAL-FACING-v2

2026-10-15：本機候選 `20261015-facing2`。12 套服裝的揮手／擁抱／飛吻改為朝向朋友的側身圖，右側角色鏡像朝左；一起跳舞保留原圖。擁抱靠近到合適間距，站位左右依空間位置而非邀請順序，不改保存位置。揮手／飛吻事件新增可選 target，舊客戶端忽略仍可播放；擁抱與跳舞仍須同意。

新圖集 `assets/social-motions/v2/` 共 2,502,368 bytes（2.39 MiB），比 v1 小約 11.5%；按需載入。原 v1 圖保留。完整生成提示見 `facing-prompts.json`，切圖／壓縮證據見 `facing-asset-report.json`。以 `node tools/prepare-social-facing.mjs` 重建，原素材存於 `output/social-motions/facing/`；舞蹈來源固定使用 `facing-base-catalog.json`，避免反覆縮放。

同步修正零體力料理：保留食材、廚房與料理爐檢查，移除能量門檻及介面重導向。窄畫面拜訪工具列下緣改 auto，避免透明背景佔滿畫面攔截按鈕。24 項相關單元通過；實際本機料理 UI 確認 0 體力做湯、食材扣除、到客廳吃完恢復 35。以下 v1 記錄保留供追溯，舊獨立下載動畫仍是 v1；遊戲與互動預覽使用 v2。

## v1 歷史紀錄

2026-10-13，本機已驗證，尚未發布。

棉花兔、橘子狐、蜂蜜熊各 4 套現有服裝；12 套各含揮手、擁抱、一起跳舞、飛吻，共 48 組。沿用現有角色與服裝參考，內建 image_gen 生成每套 3 欄 × 4 列透明圖格。完整提示詞與原始生成路徑見 prompts.json，原圖另保存於 output/social-motions/*-source.png，不替換原走路或戰鬥圖。

## 檔案

- 遊戲使用 assets/social-motions/v1/ 下 12 張 WebP 圖集，總計 2,828,624 bytes（約 2.70 MiB），每套 214,558～256,974 bytes。只載入本人及到場角色的服裝。單一圖集包括四種動作，不逐格下載，也不在雲端保存動作。
- output/social-motions/animated/ 下有 48 個獨立循環動畫 WebP，192 × 224，總計約 3.66 MiB；僅供老師預覽／素材重用，遊戲不引用。
- social-motion-preview.html/js/css：全部服裝、四種動作與双人搭配預覽，可切換減少動態。沒有正式學生 API 或存檔。
- data/social-motions.js、social-motion-model.js、social-motion-art.js：圖集、動作節奏、同意狀態機、按需載入與 Canvas 繪製。
- island-visits-ui.js/peer.js/css：接入既有拜訪畫面。擁抱／一起跳舞需要同房間、相距 170 座標內且雙方停止走動，邀請 30 秒內接受才播放；可取消、拒絕，走開／換房間／離線結束。

## 相容與整合

- 保留原 island 不可靠移動通道。只有雙方回覆 social-cap v1 後，發起端才建立 island-social-v1 有序可靠通道；最多四次能力訊息均走 P2P。舊客戶端仍可移動，不會被未知 DataChannel 取代。
- 動作事件只接受列舉內容，來源由島主按已連線 peer 身分填入，不接受自由文字。無後台、D1、錢包、學生識別／學習規則變動。
- 前端基準 80076d2。主平台另在製作沙發物品選取，未動其工作副本。候選遊戲入口標記 20261013-social1，發布前需重新讀主平台最新交接／正式 HEAD 並重建 bundle。

## 驗證

- 19 項相關單元測試通過：12 套覆蓋／圖集大小、訊息白名單、同意前不播放、三人旁觀、拒絕、取消、逾時、移動／換房／離線、減少動態、舊客戶端握手、來源防冒用、不送雲端動作、既有送禮及雲端合併存檔。
- 本機隔離虛構學生、實際 WebRTC：兔子揮手與雙人跳舞、狐狸星空裝與蜂蜜熊紳士裝邀請及同步動作；未操作正式學生。
- 瀏覽器已查看 12 套透明圖格與可播放預覽；實體學校 iPad／Wi-Fi 尚未測試。

## 重建

從本 checkout 執行 node tools/prepare-social-motions.mjs，需已保存的 12 張原 PNG 與 sharp；再執行 node tools/export-social-motion-previews.mjs 產生獨立循環動畫。原始圖片生成使用內建 image_gen，不使用收費 CLI/API。
