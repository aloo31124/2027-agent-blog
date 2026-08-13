# Phase 0 研究：有後台可編輯、可快速部屬的部落格網站

**Feature**: `specs/001-admin-editable-blog` | **Date**: 2026-08-13
**Spec**: [spec.md](./spec.md)

## 目錄

- [研究目標](#研究目標)
- [R1. 靜態網站產生器](#r1-靜態網站產生器)
- [R2. 線上後台（Git-based CMS）](#r2-線上後台git-based-cms)
- [R3. 後台登入與 OAuth 代理](#r3-後台登入與-oauth-代理)
- [R4. 角色權限的真正強制點](#r4-角色權限的真正強制點)
- [R5. 草稿／待審核／已發佈的狀態模型](#r5-草稿待審核已發佈的狀態模型)
- [R6. 發佈狀態回報（FR-030）](#r6-發佈狀態回報fr-030)
- [R7. 圖片上傳限制](#r7-圖片上傳限制)
- [R8. 測試與建置驗證策略](#r8-測試與建置驗證策略)
- [未完全滿足的需求與對策](#未完全滿足的需求與對策)
- [已知風險](#已知風險)
- [參考來源](#參考來源)

## 研究目標

規格已定調「線上後台 + 純靜態公開網站 + 多作者角色」，Phase 0 要解決的未知數：

1. 用哪個靜態網站產生器，才能沿用倉庫既有的部署流程？
2. 哪一套 Git-based CMS 能同時滿足「線上可用、手機可用、免費」與 **FR-007 的待審核／核可流程**？
3. 純靜態託管下，後台登入怎麼做？
4. 「作者只能改自己的文章」在哪一層才真正擋得住？
5. 三種文章狀態如何對應到 Git 上的實體？

---

## R1. 靜態網站產生器

- **Decision**: **Eleventy 3.1.6**（Node.js 20+，輸出 `_site`）
- **Rationale**:
  - 倉庫既有的 [deploy-pages.yml](../../.github/workflows/deploy-pages.yml) 已寫死 `npm ci` → `npm run build` → `npm run verify` → 上傳 `_site`，而 [verify-build.mjs](../../scripts/verify-build.mjs) 也已針對 `_site` 的檔案結構撰寫。選 Eleventy 可讓這兩份既有資產零修改續用，直接壓縮交付時間（呼應 SC-001）。
  - 被退版的第一版部落格（commit `3334c01`）本來就用 Eleventy 3.1.2，`eleventy.config.js`、Nunjucks 版型與 `pathPrefix`／`BASE_PATH` 的處理都可從 git 歷史取回改寫，不必從零重寫。
  - 純 Markdown + front matter 的內容模型，正好是所有 Git-based CMS 的原生格式。
  - 3.1.6 為目前穩定版；v4 仍在 alpha，不採用。
- **Alternatives considered**:
  - **Astro**：功能更強、生態更大，但會使既有 workflow 與 verify 腳本失效，且本專案沒有任何需要元件島嶼（islands）的互動需求，屬過度設計。
  - **Next.js 靜態輸出**：同上，且引入 React 建置鏈對一個純文字部落格是不成比例的複雜度。
  - **Hugo**：建置最快，但團隊既有資產與 git 歷史都是 Node.js 生態，換語言得不償失。

## R2. 線上後台（Git-based CMS）

- **Decision**: **Decap CMS 3.x**（掛載於 `/admin/`，GitHub backend，`publish_mode: editorial_workflow`）
- **Rationale**:
  - **關鍵決定因素是 FR-007（作者送審 → 管理員核可）**。Decap 的 editorial workflow 會為每一筆未發佈的 entry「建立 `cms/<collection>/<slug>` 分支並開一個 pull request」，後續編輯 push 到同一分支，核可即合併分支並刪除。這正好是規格要的待審核流程，且由 Git 原生機制承載，不需自己寫審核系統。
  - Decap 為 MIT 授權、無付費層級、無編輯席次限制，2026 年仍在維護（3.11.x）。
  - 框架無關：只是一個掛在 `/admin/` 的 JS 應用，對 Eleventy 完全無侵入。
  - 內建預覽窗格（`registerPreviewTemplate` / `registerPreviewStyle`）可直接滿足 FR-022 的即時預覽。
- **Alternatives considered**:
  - **Sveltia CMS**：UX 現代、效能佳、行動裝置支援更好，且設定檔與 Decap 相容（可一行切換）。**但 editorial workflow 目前尚未實作**，官方將其列為 v1.0 前的待辦（v1.0 預計 2026 年中）。少了它就無法在不自建審核系統的前提下滿足 FR-007，故本次不採用。
    → **保留升級路徑**：因設定檔相容，待 Sveltia 補上 editorial workflow 後，可用近乎一行的改動切換過去。設計時刻意不使用 Decap 專有的擴充 API。
  - **Keystatic**：GitHub App 認證乾淨，但版型與 Eleventy 整合度低（偏 Astro/Next），且審核流程不如 Decap 直接。
  - **PagesCMS**：後台由第三方託管、零基礎設施，部署最快；但沒有審核工作流，且把內容控制權交給外部服務，不採用。

## R3. 後台登入與 OAuth 代理

- **Decision**: **GitHub OAuth App + 自架 Cloudflare Worker OAuth 代理**（部署於 `infra/oauth-worker/`），Decap 設定 `backend.base_url` 指向該 Worker。
- **Rationale**:
  - 公開網站託管在 GitHub Pages（純靜態，無伺服器端），Decap 的 GitHub backend 在非 Netlify 環境下必須自備一個提供 `/auth` 與 `/callback` 兩個端點的 OAuth 代理——`/auth` 導向 GitHub 授權頁，`/callback` 收下授權碼並以 `window.postMessage` 回傳給 CMS。這是官方文件明載的標準做法，且官方即以 Cloudflare Worker 範本為例。
  - Cloudflare Workers 免費額度對單人部落格綽綽有餘，且部署為單一指令（`wrangler deploy`），可寫進 quickstart 的一次性設定步驟。
  - 這是唯一需要「額外服務」的地方，且**不影響 SC-001**：SC-001 量測的是「公開網址可讀取首頁」，讀者端完全不經過 OAuth。後台啟用屬第二階段的一次性設定，quickstart 會把兩階段分開說明。
- **Alternatives considered**:
  - **Netlify Git Gateway / Netlify Identity**：需把站台或身分服務綁到 Netlify，與「沿用 GitHub Pages」的既定方向衝突。
  - **改用個人存取權杖（PAT）登入**：Sveltia 支援、可省掉 Worker，但 Decap 不支援此路徑，且要求使用者手動保管長期權杖，安全性較差。
  - **改把站台整個搬到 Cloudflare Pages**（後台與 OAuth Function 同源、少一個服務）：技術上更順，但會廢掉既有的 GitHub Pages workflow，違背「沿用既有部署資產」的前提。**列為日後若嫌 Worker 麻煩時的替代路線。**

## R4. 角色權限的真正強制點

- **Decision**: 權限由 **GitHub 倉庫存取控制 + `main` 分支保護規則 + CODEOWNERS** 強制，CMS 介面僅作輔助呈現。
  - 管理員 = 倉庫 Admin 權限；作者 = 倉庫 Write 權限。
  - `main` 啟用分支保護：禁止直接 push、合併前需至少 1 位 CODEOWNERS（管理員）核可。
  - `.github/CODEOWNERS` 將 `src/posts/**`、`src/uploads/**` 指定給管理員。
- **Rationale**:
  - 公開網站是靜態產物，執行時沒有任何伺服器邏輯可以檢查權限；把權限畫在 CMS 介面上等於只是「隱藏」，具備倉庫存取權的人可繞過。唯一有強制力的那一層是 GitHub 本身。
  - 搭配 editorial workflow：作者的每一次變更都只能落在 PR 分支上，作者按下「發佈」時的合併動作會被分支保護擋下，必須由管理員核可合併——**FR-006／FR-007 因此在「生效」這一層被真正擋住**。
- **殘留缺口（誠實記錄）**：具 Write 權限的作者**仍可提出**針對他人文章的修改 PR，只是無法讓它生效。要連「提出」都禁止，需把作者降為 Fork + PR 的外部貢獻者模式，代價是 Decap 的 Open Authoring 模式體驗較差。**目前接受此缺口**，並在 plan 的 Complexity Tracking 記錄。

## R5. 草稿／待審核／已發佈的狀態模型

- **Decision**: 採**「front matter `draft` 欄位」與「editorial workflow PR 狀態」雙軌**組合：

  | 規格狀態 | Git 上的實體 | 公開網站 |
  |---|---|---|
  | 草稿 | `draft: true`（不論在 PR 分支或已合併到 `main`） | 建置期即被濾除，不產生任何頁面 |
  | 待審核 | entry 位於未合併的 `cms/**` PR 分支 | 內容根本不在 `main`，不會被建置 |
  | 已發佈 | 已合併到 `main` 且 `draft: false` | 正常產生頁面並列入列表與 sitemap |

- **Rationale**:
  - 只靠 PR 分支表示草稿的話，**FR-012（已發佈文章下架回草稿）沒有對應動作**——文章已在 `main`，沒有「退回分支」這種操作。加上 `draft` 欄位後，下架就只是把 `draft` 改成 `true` 再走一次審核合併，語意乾淨。
  - Eleventy 端以 `eleventyExcludeFromCollections` 搭配 `permalink: false` 雙重排除，確保草稿不只是從列表消失，而是**根本不產生檔案**，直接滿足 FR-011（連猜網址都拿不到）。
- **重要限制**：倉庫為公開倉庫時，草稿的 Markdown 原文在 GitHub 上仍可被讀取（雖然網站上沒有）。若草稿內容需保密，倉庫必須設為 private，而 **private 倉庫要發佈 GitHub Pages 需付費方案**。已列入風險。

## R6. 發佈狀態回報（FR-030）

- **Decision**: 在 `/admin/` 掛載頁上方自製一條**發佈狀態列**，以未經認證的 GitHub REST API 查詢最近一次 workflow run（`GET /repos/{owner}/{repo}/actions/runs?per_page=1`），顯示 `status`（queued／in_progress／completed）、`conclusion`（success／failure）與完成時間。
- **Rationale**:
  - Decap 本身不知道站台部署結果，沒有原生的部署狀態顯示；FR-030 與 FR-031 需要它。
  - 公開倉庫的 Actions run 資訊可匿名讀取，無需再發一組權杖；未認證額度為每 IP 每小時 60 次，對單人後台足夠。
  - 實作成本低（一段 fetch + 輪詢），且與 Decap 解耦，未來換 CMS 也能沿用。
- **Alternatives considered**：直接嵌入 GitHub 的 workflow 狀態徽章圖片——最省事，但只有成功／失敗兩態、看不到「進行中」與時間，無法完整滿足 FR-030。

## R7. 圖片上傳限制

- **Decision**: Decap 預設媒體庫，`media_folder: src/uploads`、`public_folder: /uploads`，於設定中限制 `max_file_size`（5 MB）與可接受副檔名。上傳的圖片與文章一起進版控。
- **Rationale**: 符合 FR-019～FR-021，且不需外部圖床服務，維持「零額外服務」的方向（OAuth Worker 已是唯一例外）。
- **限制**: 圖片進 git 會讓倉庫隨時間變大；個人部落格規模（假設 < 1000 篇）可接受，超出後可改接外部媒體庫。

## R8. 測試與建置驗證策略

- **Decision**: 三層，全部掛進 `npm test` 與 CI：
  1. **內容驗證** `scripts/check-content.mjs`（新增）：slug 站內唯一、必填 front matter 齊備、圖片大小與格式合規、`draft` 值合法。
  2. **建置產物驗證** `scripts/verify-build.mjs`（沿用既有並擴充）：關鍵頁面存在且互相連結正確、**草稿不得出現在 `_site` 任何位置**。
  3. **單元／整合測試** `test/*.test.mjs`（`node --test`，Node 內建）：Eleventy 過濾器、草稿排除邏輯、標籤彙整、分頁。
- **Rationale**:
  - FR-032 要求「驗證未過即不得取代線上版本」，而既有 workflow 已是 build → verify → deploy 的順序，verify 失敗即中止，天然滿足；只要把新檢查掛進 `npm run verify` 即可。
  - 內容驗證放在建置期，正是 R4／FR-014 中「編輯期查重做不到」的補位。
  - 不引入 Playwright 等瀏覽器 E2E：後台是第三方套件、登入需真實 GitHub OAuth，自動化投報比極低，與個人部落格的規模不成比例。

---

## 未完全滿足的需求與對策

| 需求 | 現況 | 對策 |
|---|---|---|
| **FR-014** slug 儲存前查重 | Decap 無跨 entry 唯一性驗證 | slug 樣板含日期前綴大幅降低碰撞 + 建置期硬性失敗（`check-content.mjs`）。純編輯期即時查重需自訂 widget，列為後續改善。 |
| **FR-016** 並行編輯衝突提示 | Decap 於送交時偵測 SHA 不符並報錯 | 可滿足「不得無提示覆蓋」，但錯誤訊息偏技術性；實作時包裝為可理解的說明。 |
| **FR-003** 工作階段逾期 | 登出可清除本機憑證；OAuth App 權杖預設不自動過期 | 登出行為滿足規格主體；「逾期」部分改以文件說明如何在 GitHub 端撤銷授權。若需強制過期，須改用 GitHub App（user-to-server token 8 小時過期），列為後續選項。 |
| **FR-006** 禁止作者改動他人文章 | 可擋下「生效」，擋不住「提出」 | 見 R4 殘留缺口；如需完全禁止，改採 Fork + Open Authoring 模式。 |

## 已知風險

1. **公開倉庫下草稿並非真正私密**（R5）——草稿不會出現在網站，但 Markdown 原文在 GitHub 倉庫可被讀取。若不可接受，需 private 倉庫 + 付費方案，或改用非 Git 的後台架構。
2. **OAuth Worker 是唯一的額外基礎設施**（R3）——若 Worker 掛掉，後台無法登入，但**公開網站完全不受影響**（讀者端不經過它），故不影響 SC-006／SC-007。
3. **Decap 的長期維護動能**——目前活躍，但為降低鎖定風險，設計上刻意只用與 Sveltia 相容的設定與功能，保留一行切換的退路（R2）。
4. **Sveltia v1.0 若在本專案實作期間釋出**——屆時可重新評估切換，但不應因此延後本次交付。

## 參考來源

- [Editorial Workflows — Decap CMS](https://decapcms.org/docs/editorial-workflows/)
- [Backends Overview — Decap CMS](https://decapcms.org/docs/backends-overview/)
- [External OAuth Clients — Decap CMS](https://decapcms.org/docs/external-oauth-clients/)
- [decap-proxy — Cloudflare Worker OAuth proxy for Decap CMS](https://github.com/sterlingwes/decap-proxy)
- [Roadmap — Sveltia CMS](https://sveltiacms.app/en/docs/roadmap)
- [Editorial Workflow — Sveltia CMS](https://sveltiacms.app/en/docs/workflows/editorial)
- [sveltia-cms-auth — Cloudflare Workers 認證腳本](https://github.com/sveltia/sveltia-cms-auth)
- [@11ty/eleventy — npm](https://www.npmjs.com/package/@11ty/eleventy)
- [Eleventy v3.0.0 發布公告](https://www.11ty.dev/blog/eleventy-v3/)
