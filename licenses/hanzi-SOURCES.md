# 國字筆畫資料來源與限制

本資料版本：20261115-tw1。候選範圍為康軒一年級上學期六課74字，及預備單元一到十10字，共84字。

## 來源
- 83字由 AnimCJK 的臺灣資料目錄 svgsZhHant 取得，固定提交 c63765b150cbd567c71d05cf4a4f8d00b57045c9。
- 上游：https://github.com/parsimonhi/animCJK/tree/c63765b150cbd567c71d05cf4a4f8d00b57045c9/svgsZhHant
- 保留原作者：AnimCJK 2016-2026 Copyright FM-SH。原始圖形衍生自 Make Me a Hanzi、Arphic PL KaitiM GB 與 Arphic PL KaitiM Big5。
- 使用上游動畫中心線，將1024單位座標除以1024；未翻轉Y軸、未採用中國大陸資料替補、未複製整套字典或程式。中心線資料沿用 Arphic Public License，完整授權在 hanzi-ARPHICPL.txt；上游各類檔案授權說明保留在 hanzi-AnimCJK-COPYING.txt。
- 每字JSON保留上游URL、commit與blob SHA。這些來源連結只供追溯；遊戲按字載入同站JSON，不在孩子作答時請求外站。
- 「蛙」在固定提交的 svgsZhHant 及 svgsZhHantSpecial 均不存在。此字使用為本專案獨立製作的簡單幾何中心線；以使用者提供教材中的筆數、先後順序作教學參考，沒有抽取或描摹教材／教育部路徑，沒有納入教材圖片。它不是AnimCJK資產，沒有冒用其授權。

## 核對範圍
- 六課74字：筆畫數全部與使用者提供的教材核對JSON相符。
- 預備10字：字表含這10字，但不含逐字筆畫數表；與臺灣AnimCJK筆數一致，未宣稱教材有不存在的數據。
- 已額外檢視教材逐步筆順圖並比對新增筆畫順序：左、右、也、比、花、這、那、蛙。
- 其餘76字沒有宣稱已逐筆人工核驗。所附模板也未經兒童真實筆跡或學校iPad試寫驗收。

## 使用界線
全部 readiness 為 practice-only。筆數吻合、來源是臺灣字庫及幾何測試通過，均不代表可作正式小考的可靠評分。
不確定時應待教師複核，保留原始墨跡；不可把模板輪廓替換學生書寫後再評為答對。
