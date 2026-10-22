# 2026-10-22 魚、作物與料理擴充

本機候選，尚未發布。保留原有魚、作物、食譜及保存規則。

- 新增 12 種作物與種子，各關 3 種；種子維持 1～2 星幣，免費三種不變。學習仍驗證開局播種批次與 70% 門檻，朗讀仍需 4/5。
- 新增 12 種魚，原 3 種仍能釣到。原三種合計機率 50%；新增常見六種各 5%、少見四種各 4%、稀有兩種各 2%。原圓圓鯽魚／金尾魚／星點魚分別 25%、17.5%、7.5%。仍每次一魚餌，不耗體力；售魚維持 1～2 星幣。
- 新增 6 道自製料理及暖沙小吃店 12 道外帶餐（8～16 星幣、恢復 50～95 體力）。外帶食物不能免費製作。田園燉飯增含茄子，使新栽種的茄子有料理用途。
- 馬鈴薯、地瓜、洋蔥、花椰菜、茄子、稻米及小麥用於食譜；甜椒、甜豌豆、西瓜、香瓜、白蘿蔔可直接食用。進食圖像使用對應食譜圖集，會出現在餐桌再移到嘴邊；新餐桌遵循其桌面高度。
- 新圖以內建 image_gen 製作，提示詞在 food-prompts.json；來源與四張 WebP 圖格在 food-art-report.json。原 PNG 已複製至工作區 output/home-collection-20261022/collection*-source.png。原始圖片不隨遊戲下載。
- 四圖共 1,709,232 bytes，均有真實 alpha；42 個圖格已檢查沒有邊界截斷。料理／魚圖按需載入，未持有的外帶餐不提前載入其圖集。

驗證：tests/collection-foods.test.js 的 5 項涵蓋播種→重載→成長→採收、15 魚種釣起與發現記錄、六食譜零體力料理→重載→餐桌食用、12 外帶餐滿體力不扣庫存，以及新魚使用正確圖格。連同原 adventure-life、zero-energy-cooking、reading-farm、farm-class-entry 共 35 項通過。此紀錄不代表實體 iPad 或正式版本已驗收。

整合已重建 adventure entry/play、farm-learning 與 reading-farm，所有相關入口快取為 20261022-collection1；沿 d1ad050 保留 Safari 農場交接。朗讀成功提示改為通用「作物長大了」，避免新作物誤稱萵苣。

發行回歸：tests/collection-release.test.js 直接核對四個已編譯 bundle 的完整新目錄；從已編譯 farm bridge 驗證小老師追加複習仍只計原本十題（6/10 不成熟、7/10 成熟），並從已編譯 reading bridge 驗證 main／grade2 的三種新朗讀作物、delta=0、重送不重複存檔。首頁／Safari／捷徑快取鏈及核准新ㄅ音檔皆通過；連同 reading-launch、reading-farm、farm-class-entry、tutor-gap 共 34 項通過。此為本機與虛構資料驗證。
