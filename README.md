# Aloo 的開發手札

一個以 Node.js 與 Eleventy 建置的個人部落格。網站輸出為純靜態 HTML/CSS，可免費部署到 GitHub Pages，不包含廣告、追蹤程式或第三方字型請求。

## 本機啟動

需求：Node.js 20 以上版本。

```bash
npm install
npm run dev
```

開啟 Eleventy 顯示的本機網址即可預覽。

## 建置與驗證

```bash
npm test
npm run verify
```

`npm test` 會建置網站並執行測試；`npm run verify` 會再次確認首頁、關於頁、第一篇文章、404、sitemap、樣式與 `.nojekyll` 等關鍵輸出存在。

建置結果位於 `_site/`。

## 新增文章

在 `src/posts/` 建立 Markdown 檔案，格式如下：

```markdown
---
title: 文章標題
description: 文章摘要
date: 2026-07-27
readingTime: 5
tags:
  - post
  - 分類名稱
permalink: /posts/article-slug/
---

文章正文。
```

`post` 標籤不可省略，否則文章不會出現在首頁列表。

## 部署至 GitHub Pages

專案已包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 後，GitHub Actions 會：

1. 安裝 Node.js 與專案相依套件。
2. 取得 GitHub Pages 的正確根路徑。
3. 建置並驗證網站。
4. 將 `_site/` 發布到 GitHub Pages。

第一次使用時，前往儲存庫的 **Settings → Pages → Build and deployment**，將 Source 設為 **GitHub Actions**。

### 個人首頁模式

若要讓網站網址成為 `https://aloo31124.github.io/`，請建立公開儲存庫：

```text
aloo31124/aloo31124.github.io
```

再將此專案推送到該儲存庫。部署流程會自動使用網站根路徑。

### 目前儲存庫模式

目前儲存庫為 `aloo31124/2027-agent-blog`，也可直接啟用 Pages，網址會是：

```text
https://aloo31124.github.io/2027-agent-blog/
```

工作流程會自動加入 `/2027-agent-blog/`，不需要手動修改文章連結或 CSS 路徑。

## 主要目錄

```text
src/
├── _data/          # 網站名稱、作者與網址資料
├── _includes/      # 共用版型
├── assets/         # 網站樣式
├── posts/          # Markdown 文章
├── about/          # 關於頁
└── index.njk       # 首頁
```

## 授權

程式碼採用 MIT License。文章內容的著作權由作者保留。
