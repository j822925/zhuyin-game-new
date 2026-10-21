# Safari 朗讀與萵苣接續（20261021-farm1）

從農場進入朗讀的 `farmLesson=reading` 會保留至 Safari／捷徑；只傳班級與關卡意圖，不在網址帶學號、密碼、token 或任意返回網址。一般朗讀不額外讀寫雲端農場，保留既有本機橋接。

農場模式完成原登入後，以同班完整學號呼叫既有 `forest-load`，只把開局時已澆水的萵苣 plantId 記入本機票據。登入後不能找到自己的待成長作物時，阻擋開局並提示回農場核對。五題成績先取得既有 `round` saved 確認，再按同一套 `farmRoundScore`／70% 門檻，從最新雲端完整存檔合併原植物批次成熟旗標，以 `forest-save` revision 與 delta=0 保存。星星仍只由原成績端點發放。

保存操作 ID、revision、完整請求在送出前寫入本機 journal；回應中斷時重送同一操作。衝突時重新讀最新雲端、重新合併相同植物批次，不拿舊存檔覆蓋、不成長後來重種的作物。成功前保留待送成績，UI 提示農場尚未確認；成功後才顯示收成入口。舊回合沒有開局票據，不追溯改動任意現有作物。

新增 `reading-farm.js` 與其獨立 `reading-farm.bundle.js`，未重建其他農場／森林 bundle，未部署後端。以既有 esbuild 執行 `reading-farm.js --bundle --format=esm --minify --outfile=reading-farm.bundle.js`；不要從舊 release 複製首頁或共用模組。

測試 `tests/reading-farm.test.js` 涵蓋獨立 Safari 儲存、兩班／完整學號、短路徑與舊系統捷徑、無敏感 query、4/5 門檻、未保存、回應遺失重試、revision 衝突、重植、重送、不變更錢包、非農場零額外請求。瀏覽器模擬五題全對、首次農場保存失敗後重試成功；不等於實體 iPad 或真實學生成績驗收。
