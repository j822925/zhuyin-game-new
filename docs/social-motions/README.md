# 好友角色動作 SOCIAL-MOTION-v1

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
