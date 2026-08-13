# 契約：公開網站路由與建置產物

**適用對象**：Eleventy 版型、`scripts/verify-build.mjs`、`.github/workflows/deploy-pages.yml`

## 目錄

- [路由表](#路由表)
- [建置產物必要檔案](#建置產物必要檔案)
- [路徑前綴](#路徑前綴)
- [驗證條件](#驗證條件)

## 路由表

| 路由 | 內容 | 對應需求 |
|---|---|---|
| `/` | 首頁，已發佈文章依 `date` 由新到舊，每頁 `postsPerPage` 篇 | FR-025 |
| `/page/{n}/` | 第 n 頁列表（n ≥ 2） | FR-025 |
| `/posts/{slug}/` | 單篇文章頁，含標題、日期、作者、標籤、正文 | FR-025 |
| `/tags/` | 所有公開標籤總覽 | FR-018 |
| `/tags/{slug}/` | 該標籤下的已發佈文章 | FR-018 |
| `/about/` | 關於頁 | FR-025 |
| `/admin/` | 後台掛載頁（含發佈狀態列） | FR-001、FR-030 |
| `/404.html` | 找不到頁面 | FR-025 |
| `/sitemap.xml` | 僅含已發佈頁面 | FR-027 |
| `/robots.txt` | 檢索規則 | FR-027 |
| `/uploads/{file}` | 上傳的媒體檔 | FR-021 |
| `/.nojekyll` | 停用 Jekyll 處理 | — |

**不變條件**：`draft: true` 的文章不得在上表任何位置出現，包含 `/posts/{slug}/` 直接存取（應回 404）。

## 建置產物必要檔案

`_site/` 建置後必須存在（沿用並擴充既有 `verify-build.mjs` 的清單）：

```text
index.html
about/index.html
posts/<最新一篇>/index.html
tags/index.html
admin/index.html
admin/config.yml
assets/styles.css
404.html
sitemap.xml
robots.txt
.nojekyll
```

## 路徑前綴

- 建置時讀取環境變數 `BASE_PATH`（由 GitHub Pages 的 `configure-pages` 提供），作為 Eleventy 的 `pathPrefix`。
- 所有站內連結與資源路徑必須經過 `pathPrefix` 處理，不得寫死 `/`。
- `SITE_URL` 用於 sitemap 的絕對網址。

## 驗證條件

`npm run verify` 必須確認：

1. 上述必要檔案全部存在。
2. 首頁含最新一篇已發佈文章的標題，且連結為 `{BASE_PATH}/posts/{slug}/`。
3. 文章頁引用的樣式路徑為 `{BASE_PATH}/assets/styles.css`。
4. **`_site` 全域搜尋不得命中任何 `draft: true` 文章的標題或路徑**（FR-011）。
5. `sitemap.xml` 內的網址數量等於已發佈文章數 + 靜態頁數，且不含 `/admin/`。

任一項失敗即以非零結束碼中止，deploy 步驟不執行（FR-032）。
