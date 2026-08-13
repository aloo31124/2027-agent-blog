# Aloo 的開發手札

一個**有後台可以編輯**的個人部落格。公開網站是純靜態 HTML/CSS，免費託管在 GitHub Pages，
不含廣告、追蹤程式或第三方字型請求；文章則在瀏覽器後台撰寫，手機也能用。

- 規格與設計文件：[`specs/001-admin-editable-blog/`](specs/001-admin-editable-blog/)
- 部署與後台啟用步驟：[quickstart.md](specs/001-admin-editable-blog/quickstart.md)

## 它怎麼運作

```text
在 /admin/ 寫文章
      │
      ▼
送出 → 建立分支與 PR（待審核）
      │
      ▼  管理員核可並合併到 main
GitHub Actions：build → verify → deploy
      │                    │
      │                    └── 驗證沒過就停在這裡，線上維持前一版
      ▼
GitHub Pages 上的公開網站
```

**沒有資料庫，也沒有應用伺服器。** 內容就是 Git 倉庫裡的 Markdown 檔案，
版本歷史天然存在。唯一的額外服務是登入用的 OAuth 代理，而它只影響後台——
就算它掛掉，讀者端完全不受影響。

## 本機開發

需求：Node.js 20 以上。

```bash
npm install
npm run dev
```

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 本機預覽，存檔即時重載 |
| `npm run build` | 建置到 `_site/` |
| `npm run verify` | 內容驗證 + 建置產物驗證（部署前閘門） |
| `npm test` | 建置後執行測試 |

## 新增文章

平常在 `/admin/` 後台寫就好。若要直接改檔案，在 `src/posts/` 建立 Markdown：

```markdown
---
title: 文章標題
description: 會顯示在列表頁的摘要
date: 2026-08-13
author: 你的 GitHub 帳號
draft: false
tags:
  - post
  - 分類名稱
readingTime: 5
---

正文。
```

兩個容易踩到的地方：

- **`tags` 必須包含 `post`**，否則文章不會出現在任何列表（`npm run verify` 會擋下來）。
- **網址由檔名決定，但日期前綴會被去掉**：`2026-08-13-hello.md` 的網址是 `/posts/hello/`。
  所以 `2026-08-13-hello.md` 和 `2026-09-01-hello.md` 會撞在一起——驗證會擋，但值得先知道。

## 部署

推送到 `main` 就會自動建置並發佈。首次使用需到
**Settings → Pages → Build and deployment**，把 Source 設為 **GitHub Actions**。

後台登入需要一次性設定（建立 OAuth App、部署 Worker），
見 [`infra/oauth-worker/README.md`](infra/oauth-worker/README.md)。

## 多作者與審核

預設是單人模式。要開放共筆：

1. **Settings → Collaborators** 邀請作者，權限給 **Write**（管理員為 **Admin**）
2. 對 `main` 設定分支保護：需要 PR、需要核可、需要 Code Owners 審查
3. [`.github/CODEOWNERS`](.github/CODEOWNERS) 已把文章與媒體目錄指給管理員

設定後，作者按下發佈只會產生待審核的 PR，必須由管理員核可才會上線。

**已知限制**：具 Write 權限的作者仍可「提出」針對他人文章的修改 PR，只是無法讓它生效。
要連提出都禁止，需改用 Fork + Open Authoring 模式。

## 幾個刻意的設計決定

- **草稿不是「隱藏」，是根本不產生檔案**。草稿的 `permalink` 為 `false`，
  就算有人猜到網址也只會得到 404。`npm run verify` 會掃描整個 `_site` 確認沒有外洩。
- **不接受 SVG 上傳**。SVG 可內嵌腳本且與網站同源，風險不成比例。
- **權限靠 GitHub 強制，不靠介面隱藏**。靜態網站在執行時沒有任何邏輯可以檢查權限，
  唯一有強制力的是分支保護規則。
- **驗證擋在部署之前**。內容或產物違規時流程停在 verify，線上維持前一個成功版本。

## 已知限制

倉庫是公開的，因此**草稿的原始文字在 GitHub 上仍可被讀取**（雖然網站上沒有）。
若草稿需要保密，倉庫得設為 private，而 private 倉庫發佈 GitHub Pages 需要付費方案。
