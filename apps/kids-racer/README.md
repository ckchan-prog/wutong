# 兒童賽車（方案 A：Canvas + 原生 JavaScript）

適合 5–8 歲小朋友的簡單賽車小遊戲：按一下就放一架車出來，車會自動沿賽道前進，並配合簡單中文介紹協助認字。

## 使用方式

此遊戲會透過 `fetch` 載入 `cars.json`，建議以靜態伺服器開啟整個專案後瀏覽：

- `index.html`：梧桐首頁
- `apps/kids-racer/`：遊戲入口

## 車種資料

車種在 `cars.json` 內定義。新增車種通常只要加一筆資料（`name`、`sentences`、`color` 等），不需要改遊戲程式。

