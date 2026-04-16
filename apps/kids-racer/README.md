# 兒童賽車（Three.js 3D）

適合 5–8 歲小朋友的簡單賽車小遊戲：按一下放一架車，車會在 **3D 賽道**上前進；每種車有 **唔同嘅 3D 造型**，每架車 **顏色都會略有唔同**。

放車時會自動做 **「拉後 → 衝前」**（像回力車），拉力唔同會造成 **唔同速度**；亦可以 **拖住架車向後拉再放手** 再衝一次。內建簡單 **音效**（Web Audio 合成，毋須額外音檔）。

## 使用方式

此遊戲會透過 `fetch` 載入 `cars.json`，並用 **import map** 由 CDN 載入 **Three.js**，請用靜態伺服器開啟整個專案後瀏覽（唔好用 `file://` 直接開，否則模組同 fetch 可能失敗）：

```bash
cd /path/to/wutong
python3 -m http.server 8080
```

然後開：`http://localhost:8080/apps/kids-racer/`

## 車種資料

車種在 `cars.json` 內定義。新增車種通常要加一筆資料，並在 `kids-racer.js` 的 `makeCarModel()` 內為新 `id` 加對應 3D 造型。

## 技術

- **Three.js**（ES module + import map）
- **Web Audio API**（放車、拉後、衝前音效）
