---
title: 從零開始：用 Node.js 與 GitHub Pages 發布個人部落格
description: 從選擇靜態網站工具到自動部署，記錄這個部落格如何免費上線，也驗證第一篇文章確實成功產生。
date: 2026-07-27
readingTime: 5
tags:
  - post
  - Node.js
  - GitHub Pages
  - 實作筆記
permalink: /posts/hello-github-pages/
---

這是這個部落格的第一篇文章，也是一次完整的發布驗證。

我希望網站具備三個條件：**免費、沒有廣告、能完全掌握設計與內容**。GitHub Pages 正好提供靜態網站託管，而 Node.js 生態則讓內容建置與日常寫作保持簡單。

## 為什麼選 Eleventy？

Eleventy 是以 Node.js 運作的靜態網站生成器。它讀取 Markdown 文章與 Nunjucks 版型，建置後輸出一般的 HTML、CSS 檔案。

這個選擇帶來幾個好處：

- 文章保留為容易閱讀、容易備份的 Markdown。
- 瀏覽器拿到的是預先產生的 HTML，不需要等待前端框架執行。
- 每一處版型與樣式都在自己的程式碼庫裡，能自由調整。
- GitHub Actions 可以在每次推送後執行相同的 Node.js 建置命令。

## 發布流程

整個網站的發布路徑很短：

1. 在 `src/posts/` 新增一份 Markdown 文章。
2. 本機執行 `npm test`，確認網站能建置且關鍵頁面存在。
3. 將變更推送到 `main` 分支。
4. GitHub Actions 執行 `npm ci`、建置與驗證。
5. 通過後，靜態檔案會自動部署到 GitHub Pages。

> 內容、版型、建置規則與部署設定都在同一個儲存庫裡，因此網站可以被完整重現，而不是被綁在特定寫作平台。

## 第一篇文章如何被驗證？

專案包含一個自動驗證腳本。它不只檢查建置命令是否成功，也會確認：

- 首頁輸出檔 `_site/index.html` 存在。
- 本文輸出檔 `_site/posts/hello-github-pages/index.html` 存在。
- 首頁真的顯示本文標題並能連到本文。
- 本文頁面含有預期標題、內容與樣式資源。
- GitHub Pages 專案子路徑能正確套用在內部連結。

這讓「第一篇文章完成」不只是肉眼看起來有，而是一項能在本機與 GitHub Actions 重複執行的檢查。

## 接下來

現在發布管線已經建立，之後的工作就回到最重要的事：持續寫下值得保留的內容。

下一篇文章只需要複製這份檔案、修改 front matter 與正文，再推送到 GitHub。剩下的建置與部署交給自動化流程。

