# Quickstart：部署與啟用後台

**Feature**: `specs/001-admin-editable-blog` | **Date**: 2026-08-13

## 目錄

- [兩個階段](#兩個階段)
- [階段一：讓網站上線（目標 ≤ 10 分鐘）](#階段一讓網站上線目標--10-分鐘)
- [階段二：啟用線上後台（一次性）](#階段二啟用線上後台一次性)
- [階段三：設定多作者與審核（選用）](#階段三設定多作者與審核選用)
- [本機開發](#本機開發)
- [驗收流程](#驗收流程)
- [疑難排解](#疑難排解)

## 兩個階段

| 階段 | 產出 | 誰需要 |
|---|---|---|
| 一 | 公開網站上線、讀者讀得到 | 所有人，對應 SC-001 |
| 二 | 線上後台可登入撰稿 | 站長，一次性設定 |
| 三 | 多作者與審核流程 | 需要共筆時才做 |

**階段一不依賴階段二**：讀者端完全不經過登入或 OAuth，所以就算後台還沒設定好，網站也已經是可用的。

## 階段一：讓網站上線（目標 ≤ 10 分鐘）

1. 確認 Node.js 20 以上。

```bash
node --version
```

2. 安裝相依套件並確認本機可建置。

```bash
npm ci && npm run build && npm run verify
```

3. 在 GitHub 倉庫開啟 Pages：**Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。

4. 推送到 `main`，既有的 [deploy-pages.yml](../../.github/workflows/deploy-pages.yml) 會自動執行 build → verify → deploy。

```bash
git push origin main
```

5. 到 **Actions** 分頁確認流程綠燈，開啟 Pages 顯示的公開網址，應能看到首頁與第一篇文章。

> 若 verify 步驟失敗，deploy 不會執行，線上維持前一版——這是刻意的設計（FR-031、FR-032）。

## 階段二：啟用線上後台（一次性）

### 2.1 建立 GitHub OAuth App

1. **Settings → Developer settings → OAuth Apps → New OAuth App**。
2. Authorization callback URL 先填 `https://example.com/callback`，稍後改成 Worker 網址。
3. 記下 **Client ID**，並產生一組 **Client Secret**（只會顯示一次）。

### 2.2 部署 OAuth Worker

```bash
cd infra/oauth-worker && npm install && npx wrangler deploy
```

設定機密（不要寫進版控）：

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
```

部署完成後會得到 `https://<name>.<account>.workers.dev`。

### 2.3 回填設定

1. 回到 OAuth App，把 callback URL 改成 `https://<worker-網域>/callback`。
2. 編輯 `src/admin/config.yml`，把 `backend.base_url` 設成 Worker 網域、`backend.repo` 設成 `<owner>/<repo>`。
3. 推送後，開啟 `https://<你的站台>/admin/`，以 GitHub 帳號登入。

端點與參數的完整定義見 [contracts/oauth-endpoints.md](./contracts/oauth-endpoints.md)。

## 階段三：設定多作者與審核（選用）

1. **Settings → Collaborators**：邀請作者，權限給 **Write**（管理員為 **Admin**）。
2. **Settings → Branches → Add branch protection rule**，對 `main`：
   - 勾選 Require a pull request before merging
   - 勾選 Require approvals（至少 1）
   - 勾選 Require review from Code Owners
3. 建立 `.github/CODEOWNERS`：

```text
/src/posts/    @<管理員帳號>
/src/uploads/  @<管理員帳號>
```

完成後，作者在後台按下發佈只會產生待審核的 PR，必須由管理員核可合併才會真的上線（FR-006、FR-007）。

## 本機開發

```bash
npm run dev
```

Eleventy 會啟動本機預覽伺服器並即時重載。本機不需要 OAuth Worker；若要在本機試後台，另開一個終端機執行 Decap 的本機代理，並在 `config.yml` 暫時加上 `local_backend: true`。

## 驗收流程

依 spec 的 User Story 逐條驗證：

| 驗收項目 | 做法 | 對應 |
|---|---|---|
| 發佈一篇文章讀者看得到 | 後台新增 → 發佈 → 用無痕視窗開公開網址 | US1 |
| 未登入進不了後台 | 無痕視窗開 `/admin/` | US1、SC-004 |
| 草稿不外洩 | 存一篇 `draft: true`，確認列表、sitemap、直接網址皆無 | US3、SC-004 |
| 圖片超標被擋 | 上傳 > 5 MB 的圖片 | US3 |
| 標籤頁正確 | 發佈兩篇同標籤文章，開 `/tags/{slug}/` | US4 |
| 手機可讀 | 以行動裝置尺寸瀏覽各頁面 | US4、SC-009 |
| 作者改不動他人文章 | 以作者帳號送出 PR，確認無法自行合併 | US5、SC-005 |
| 發佈失敗不壞站 | 故意讓 verify 失敗並推送，確認線上仍是舊版 | US2、SC-006 |

自動化部分：

```bash
npm test
```

## 疑難排解

| 症狀 | 原因與處理 |
|---|---|
| 登入彈窗一閃即逝、顯示 Authentication Aborted | 站台的 `Cross-Origin-Opener-Policy` 會破壞 OAuth 彈窗流程，改為 `same-origin-allow-popups` |
| 後台顯示「無法取得發佈狀態」 | GitHub API 未認證額度（每 IP 每小時 60 次）用盡，稍候即可；不影響其他功能 |
| 建置成功但頁面樣式跑掉 | 站內連結未套 `pathPrefix`，檢查是否寫死了 `/` 開頭路徑 |
| 文章沒出現在首頁 | `tags` 少了 `post`，或 `draft` 仍為 `true` |
| 作者按發佈沒有反應 | 正常：分支保護擋下合併，需管理員核可 |
