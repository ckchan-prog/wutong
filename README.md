# 梧桐

「鳳凰非梧桐不棲」——以枯黃樹葉色系做一個 App Store 風格的靜態首頁，方便你之後把不同程式集中展示。

## 開始使用

- 可以直接打開 `index.html`（但部分瀏覽器會因為 `fetch` 而限制 `file://` 本機檔案，導致 `apps.json` 無法載入）。
- 建議用本機靜態伺服器啟動專案（以下是常見方式，擇一即可）：

```bash
python3 -m http.server 5173
```

然後打開 `http://localhost:5173/`。

如果你沒有 `python3`，也可以用編輯器外掛（例如 VS Code / Cursor 的 Live Server）或任何你習慣的靜態伺服器工具。

## 點樣加新 App

所有 app 都由 `apps.json` 生成。加一個新物件即可：

```json
{
  "id": "my-app",
  "name": "我的程式",
  "description": "一句簡介（會自動截短）",
  "href": "./apps/my-app/",
  "tag": "工具",
  "icon": "./assets/icons/my-app.png"
}
```

- **id**：唯一識別（方便日後擴充排序／搜尋）
- **name**：顯示名稱
- **description**：簡介
- **href**：連結（可用相對路徑放你的 app，或 https 外部連結）
- **tag**：右上角小標籤（可留空）
- **icon**：圖標圖片路徑（可留空，會使用 fallback 葉形）

## 圖標建議

- 建議尺寸：**256×256** 或以上（正方形）
- 格式：PNG / WebP
- 放置位置建議：`assets/icons/`

## 切換顯示

右上角有「切換：圖標 / 列表」，會記住你的選擇（使用瀏覽器 localStorage）。

