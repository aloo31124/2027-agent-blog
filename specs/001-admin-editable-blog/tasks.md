---
description: "Task list for 有後台可編輯、可快速部屬的部落格網站"
---

# Tasks: 有後台可編輯、可快速部屬的部落格網站

**Input**: Design documents from `/specs/001-admin-editable-blog/`
**Prerequisites**: [plan.md](./plan.md)、[spec.md](./spec.md)、[research.md](./research.md)、[data-model.md](./data-model.md)、[contracts/](./contracts/)、[quickstart.md](./quickstart.md)

**Tests**: 本功能**有**測試任務，但不是 TDD 慣例的產物——FR-032 明文要求「部署前必須自動驗證關鍵頁面，驗證未過即不得取代線上版本」，因此 `check-content.mjs` 與 `verify-build.mjs` 是**需求本體**，不是選配。`test/*.test.mjs` 則為輔助的單元測試。

**Organization**: 任務依 User Story 分組，每一組結束都是可獨立驗收的增量。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案、無未完成相依）
- **[Story]**: 對應的 User Story（US1～US6）
- 每個任務都標明確切檔案路徑

## 目錄

- [Phase 1: Setup](#phase-1-setup-shared-infrastructure)
- [Phase 2: Foundational](#phase-2-foundational-blocking-prerequisites)
- [Phase 3: US1 站長寫出並發佈第一篇文章 (P1) 🎯 MVP](#phase-3-user-story-1---站長寫出並發佈第一篇文章-priority-p1--mvp)
- [Phase 4: US2 快速部屬上線 (P1)](#phase-4-user-story-2---快速部屬上線-priority-p1)
- [Phase 5: US3 完整寫作流程 (P2)](#phase-5-user-story-3---完整寫作流程草稿標籤與圖片-priority-p2)
- [Phase 6: US4 讀者導覽與探索 (P2)](#phase-6-user-story-4---讀者導覽與探索-priority-p2)
- [Phase 7: US5 多作者與角色權限 (P3)](#phase-7-user-story-5---多作者與角色權限-priority-p3)
- [Phase 8: US6 編輯體驗 (P3)](#phase-8-user-story-6---編輯體驗即時預覽與防止誤失-priority-p3)
- [Phase 9: Polish & Cross-Cutting](#phase-9-polish--cross-cutting-concerns)
- [Dependencies & Execution Order](#dependencies--execution-order)
- [Implementation Strategy](#implementation-strategy)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化與目錄骨架

- [X] T001 建立 `package.json`：`type: module`、`engines.node >= 20`、scripts（`build` / `dev` / `verify` / `test`），devDependency `@11ty/eleventy@3.1.6`
- [X] T002 [P] 建立 `.nvmrc` 內容為 `20`
- [X] T003 [P] 建立 `.gitignore`：忽略 `node_modules/`、`_site/`、`.env`、`infra/oauth-worker/.dev.vars`
- [X] T004 建立 `eleventy.config.js`：輸入 `src`、輸出 `_site`、`pathPrefix` 取自 `process.env.BASE_PATH`、passthrough `src/assets` 與 `src/uploads`、模板引擎設為 njk（可參考 git 歷史 `git show 3334c01:eleventy.config.js`）
- [X] T005 [P] 建立目錄骨架：`src/_data/`、`src/_includes/layouts/`、`src/posts/`、`src/uploads/`、`src/admin/`、`src/assets/`、`test/`、`infra/oauth-worker/`
- [X] T006 執行 `npm install` 並確認 `npx eleventy --version` 可運作

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 User Story 都依賴的最小可建置網站；沒有它，任何故事都無法展示

**⚠️ CRITICAL**: 本階段完成前，不得開始任何 User Story

- [X] T007 建立 `src/_data/site.js`：`title`、`description`、`author`、`url`、`postsPerPage`（預設 10）、`repo`（`owner/name`），欄位定義依 [data-model.md](./data-model.md) 的 SiteSettings
- [X] T008 建立 `src/_includes/layouts/base.njk`：HTML 外框、`lang="zh-Hant"`、樣式連結需經 `pathPrefix`、頁首頁尾導覽
- [X] T009 建立 `src/_includes/layouts/post.njk`：繼承 base，呈現標題、日期、作者、標籤、正文（依 [contracts/site-routes.md](./contracts/site-routes.md) 的文章頁定義）
- [X] T010 [P] 建立 `src/posts/posts.json`：目錄層級預設值（`layout: layouts/post.njk`、`tags: ["post"]`）
- [X] T011 在 `eleventy.config.js` 加入 `readableDate` / `htmlDateString` 過濾器與 `posts` collection（依日期新到舊排序）
- [X] T012 [P] 建立 `src/assets/styles.css`：基本排版、行寬與字級，不使用第三方字型
- [X] T013 [P] 建立 `src/nojekyll.njk`、`src/robots.njk`、`src/sitemap.njk`，輸出 `.nojekyll`、`robots.txt`、`sitemap.xml`
- [X] T014 建立第一篇種子文章 `src/posts/2026-08-13-hello-blog.md`，front matter 欄位完全依 [contracts/content-schema.md](./contracts/content-schema.md)（含 `author`、`draft: false`、`permalink`）

**Checkpoint**: `npm run build` 產出 `_site` 且首頁與文章頁可在本機開啟 — User Story 可開始

---

## Phase 3: User Story 1 - 站長寫出並發佈第一篇文章 (Priority: P1) 🎯 MVP

**Goal**: 站長能在瀏覽器登入後台、新增文章、發佈，讀者不需登入即可在公開網址讀到

**Independent Test**: 登入 `/admin/` → 新增文章 → 發佈 → 用無痕視窗開公開網址讀到該文；另以無痕視窗直接開 `/admin/` 應被導向登入

### Implementation for User Story 1

- [X] T015 [P] [US1] 建立 `src/index.njk`：首頁列出已發佈文章（標題、日期、摘要），連結需經 `pathPrefix`
- [X] T016 [P] [US1] 建立 `src/404.njk`：說明性的找不到頁面，含回首頁連結
- [X] T017 [US1] 建立 `src/admin/config.yml`：`backend.name: github`、`repo`、`branch: main`、`base_url`、`publish_mode: editorial_workflow`、`media_folder: src/uploads`、`public_folder: /uploads`、posts collection 欄位完全比照 [contracts/content-schema.md](./contracts/content-schema.md)
- [X] T018 [US1] 建立 `src/admin/index.njk`：載入 Decap CMS、掛載後台、`permalink: /admin/index.html`，並確保 `config.yml` 一併複製到 `_site/admin/`
- [X] T019 [US1] 在 `src/admin/config.yml` 將 `author` 設為 hidden widget 並以登入者帳號帶入，作為 FR-008 的權限判斷依據
- [X] T020 [P] [US1] 建立 `infra/oauth-worker/package.json` 與 `infra/oauth-worker/wrangler.toml`（含 `GITHUB_CLIENT_ID`、`ALLOWED_ORIGIN` 變數宣告）
- [X] T021 [US1] 建立 `infra/oauth-worker/src/index.js`：實作 `/auth` 與 `/callback`，含 `state` 驗證、`postMessage` 目標限定為站台網域、不得記錄權杖（依 [contracts/oauth-endpoints.md](./contracts/oauth-endpoints.md)）
- [X] T022 [US1] 在 `infra/oauth-worker/README.md` 記錄 GitHub OAuth App 建立步驟、`wrangler secret put GITHUB_CLIENT_SECRET`、callback URL 回填順序
- [ ] T023 [US1] 確認站台回應標頭不含會破壞 OAuth 彈窗的 `Cross-Origin-Opener-Policy: same-origin`，必要時於 `src/admin/index.njk` 說明限制（見 [quickstart.md](./quickstart.md) 疑難排解）
- [ ] T024 [US1] 端到端驗證：登入後台 → 新增並發佈一篇文章 → 無痕視窗確認公開網址可讀、且 `/admin/` 未登入時導向登入

**Checkpoint**: 後台發文端到端可用，US1 可獨立驗收

---

## Phase 4: User Story 2 - 快速部屬上線 (Priority: P1)

**Goal**: 從倉庫到線上網站不需自架伺服器；每次發佈自動建置驗證部署，失敗時線上維持舊版且後台看得到原因

**Independent Test**: 在乾淨環境依 quickstart 階段一操作，量測到首頁可讀的時間；再故意讓驗證失敗並推送，確認線上仍是舊版

### Implementation for User Story 2

- [X] T025 [US2] 在 `package.json` 串接 scripts：`build` → `eleventy`、`verify` → `node scripts/check-content.mjs && node scripts/verify-build.mjs`、`test` → `npm run build && node --test`
- [X] T026 [US2] 建立 `scripts/check-content.mjs` 骨架：讀取 `src/posts/*.md`，驗證必填欄位、`date` 可解析、`permalink` 格式與站內唯一性，違規時輸出**檔名與違反規則**並以非零碼結束（依 [data-model.md](./data-model.md) 驗證規則表）
- [X] T027 [US2] 擴充 `scripts/verify-build.mjs`：必要檔案清單改為 [contracts/site-routes.md](./contracts/site-routes.md) 的版本（新增 `tags/index.html`、`admin/index.html`、`admin/config.yml`）
- [X] T028 [US2] 在 `scripts/verify-build.mjs` 加入 sitemap 檢查：網址數等於已發佈文章數加靜態頁數，且不得含 `/admin/`
- [X] T029 [US2] 確認 `.github/workflows/deploy-pages.yml` 無需修改即可運作（build → verify → deploy 順序、`BASE_PATH`／`SITE_URL` 傳遞），如有落差僅補最小修正
- [X] T030 [US2] 在 `src/admin/index.njk` 加入發佈狀態列：查詢 GitHub Actions 最近一次 run，顯示進行中／成功／失敗與完成時間，失敗時提供「查看原因」連結；輪詢不得短於 15 秒，查詢失敗僅顯示提示不得阻擋後台（依 [contracts/oauth-endpoints.md](./contracts/oauth-endpoints.md)）**（相依：T018）**
- [ ] T031 [US2] 失敗情境驗證：故意讓 `verify` 失敗並推送，確認 deploy 未執行、線上維持前一版可讀、後台狀態列顯示失敗

**Checkpoint**: 自動發佈與部署前閘門成立，US2 可獨立驗收

---

## Phase 5: User Story 3 - 完整寫作流程：草稿、標籤與圖片 (Priority: P2)

**Goal**: 草稿不對外可見、可加標籤、可上傳圖片插入文中

**Independent Test**: 存一篇草稿後登出，確認公開網站列表、標籤頁、sitemap 與直接網址皆取不到；再加標籤與圖片發佈，確認公開頁面三者皆正確

### Implementation for User Story 3

- [X] T032 [US3] 在 `eleventy.config.js` 的 `posts` collection 過濾掉 `draft: true` 的文章
- [X] T033 [US3] 在 `src/posts/posts.json` 加入 `eleventyComputed`，令 `draft: true` 的文章 `permalink` 為 `false` 且 `eleventyExcludeFromCollections` 為 true，確保**根本不產生檔案**（FR-011）
- [X] T034 [P] [US3] 在 `src/admin/config.yml` 加入 `draft` boolean 欄位（預設 `true`）與 `tags` list 欄位（預設含 `post`）
- [X] T035 [P] [US3] 在 `src/admin/config.yml` 設定 `media_library.config.max_file_size: 5242880` 與允許的副檔名清單（FR-020）
- [X] T036 [US3] 在 `scripts/check-content.mjs` 加入：`draft` 必為布林值、`tags` 必含 `post`、`coverImage` 非空時檔案需存在
- [X] T037 [US3] 在 `scripts/check-content.mjs` 加入 `src/uploads/` 掃描：單檔 ≤ 5 MB 且副檔名合法，超標時指出檔名與大小
- [X] T038 [US3] 在 `scripts/verify-build.mjs` 加入草稿外洩掃描：`_site` 全域搜尋不得命中任何 `draft: true` 文章的標題或路徑
- [X] T039 [P] [US3] 建立 `test/site.test.mjs` 的草稿排除測試：含草稿的內容集合建置後，該文章不出現在 collection 與輸出中
- [X] T040 [US3] 建立一篇草稿文章 `src/posts/2026-08-14-draft-sample.md`（`draft: true`）作為長期回歸樣本，並確認 `npm run verify` 通過

**Checkpoint**: 草稿不外洩、圖片與標籤可用，US3 可獨立驗收

---

## Phase 6: User Story 4 - 讀者導覽與探索 (Priority: P2)

**Goal**: 首頁分頁列表、標籤頁、關於頁、404、行動裝置可讀、sitemap 僅含已發佈內容

**Independent Test**: 以行動裝置尺寸走訪首頁、第二頁、文章頁、標籤頁、關於頁與不存在的網址，皆可正常閱讀且不需水平捲動

### Implementation for User Story 4

- [X] T041 [US4] 改寫 `src/index.njk` 使用 Eleventy pagination，每頁 `site.postsPerPage` 篇，第 2 頁起輸出到 `/page/{n}/`
- [X] T042 [US4] 在 `src/index.njk` 加入上一頁／下一頁導覽連結（經 `pathPrefix`）
- [X] T043 [P] [US4] 建立 `src/tags.njk`：以 pagination 對標籤集合產生 `/tags/{slug}/`，排除保留字 `post`，且僅為含已發佈文章的標籤產頁
- [X] T044 [P] [US4] 建立 `src/tags/index.njk`（或於 `tags.njk` 內處理）產生 `/tags/` 標籤總覽頁
- [X] T045 [P] [US4] 建立 `src/about/index.njk` 關於頁
- [X] T046 [US4] 在 `src/index.njk` 與 `src/tags.njk` 加入空狀態呈現（站上尚無文章、標籤下無文章時顯示說明而非錯誤）
- [X] T047 [US4] 在 `src/assets/styles.css` 加入行動裝置樣式：內容不需水平捲動、圖片 `max-width: 100%`
- [X] T048 [P] [US4] 在 `test/site.test.mjs` 加入標籤彙整與分頁測試（標籤頁數量、每頁篇數、保留字排除）
- [X] T049 [US4] 以行動裝置、平板、桌機三種寬度實地走訪各頁面，確認 SC-009

**Checkpoint**: 讀者端導覽完整，US4 可獨立驗收

---

## Phase 7: User Story 5 - 多作者與角色權限 (Priority: P3)

**Goal**: 管理員可編輯全部並核可發佈；作者只能編輯自己的文章，其變更需經核可才生效

**Independent Test**: 以作者帳號送出自己的文章（應進入待審核）、嘗試改動他人文章（應無法自行合併）；再以管理員核可（應對外出現）

### Implementation for User Story 5

- [X] T050 [US5] 建立 `.github/CODEOWNERS`：`/src/posts/` 與 `/src/uploads/` 指定給管理員帳號
- [X] T051 [US5] 在 `README.md` 與 [quickstart.md](./quickstart.md) 階段三記錄 `main` 分支保護設定步驟（需 PR、需核可、需 Code Owners 審查）
- [ ] T052 [US5] 驗證 editorial workflow：以作者帳號在後台送出審核，確認產生 `cms/posts/{slug}` 分支與 PR，且無法自行合併
- [ ] T053 [US5] 驗證管理員核可與退回：核可後合併並上線；退回後文章回到草稿且作者看得到說明
- [X] T054 [US5] 在 `src/admin/config.yml` 的文章列表加入依 `author` 的檢視方式（`view_groups` 或 `view_filters`），讓作者容易分辨自己的文章
- [X] T055 [US5] 在 `README.md` 記錄已知限制：作者仍可「提出」針對他人文章的變更，僅無法使其生效（對應 [plan.md](./plan.md) Complexity Tracking）

**Checkpoint**: 審核流程與權限強制成立，US5 可獨立驗收

---

## Phase 8: User Story 6 - 編輯體驗：即時預覽與防止誤失 (Priority: P3)

**Goal**: 編輯時即時看到排版結果；有未儲存變更時離開會被提醒

**Independent Test**: 在編輯畫面輸入 Markdown，確認停止輸入 1 秒內預覽更新；有未儲存變更時嘗試離開，確認出現提醒

### Implementation for User Story 6

- [X] T056 [US6] 建立 `src/admin/preview.js`：以 `registerPreviewTemplate` 註冊文章預覽樣板，呈現標題、日期、標籤與正文
- [X] T057 [US6] 在 `src/admin/preview.js` 以 `registerPreviewStyle` 載入 `/assets/styles.css`，使預覽與正式頁面樣式一致
- [X] T058 [US6] 在 `src/admin/index.njk` 載入 `preview.js`，並確認它一併輸出到 `_site/admin/`
- [ ] T059 [US6] 驗證未儲存離開提醒行為；若預設提示不足以辨識，於 `src/admin/index.njk` 補強說明文字
- [X] T060 [US6] 在 `src/admin/config.yml` 為必填欄位加上 `required` 與 `pattern`（slug 格式 `^[a-z0-9]+(-[a-z0-9]+)*$`），讓缺漏在儲存前即被指出（FR-024）
- [ ] T061 [US6] 量測預覽延遲，確認停止輸入後 1 秒內更新（FR-022）

**Checkpoint**: 六個 User Story 全部可獨立驗收

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事的收尾、文件與規格回修

- [X] T062 [P] 建立 `README.md`：專案簡介、本機開發、新增文章、部署與後台啟用（連向 [quickstart.md](./quickstart.md)）
- [X] T063 [P] 在 `test/site.test.mjs` 補齊過濾器單元測試（`readableDate`、`htmlDateString`、時區為 Asia/Taipei）
- [X] T064 依 [checklists/deployment.md](./checklists/deployment.md) CHK017 修訂 `spec.md` 的 SC-001：明確定義起算點，並區分「站台上線」與「後台啟用」兩階段
- [X] T065 依 [checklists/deployment.md](./checklists/deployment.md) CHK019 修訂 `spec.md` 的 SC-002：釐清多作者情境下含管理員核可等待時間後該標準是否仍成立
- [X] T066 依 [checklists/security.md](./checklists/security.md) CHK019 裁決 `spec.md` FR-020 的 SVG 上傳風險：或移除 SVG、或補上內容安全需求
- [X] T067 依 [checklists/content.md](./checklists/content.md) CHK001／CHK002 補上 `spec.md` 需求：網址代稱變更與文章下架後，既有外部連結的行為
- [X] T068 依 [checklists/ux.md](./checklists/ux.md) CHK008 裁決無障礙需求範圍：納入 `spec.md` 或明確列入 Out of Scope
- [X] T069 執行 [quickstart.md](./quickstart.md) 的完整驗收流程表，逐條核對 US1～US6
- [X] T070 回填四份檢核表的勾選狀態與結論（`specs/001-admin-editable-blog/checklists/`）

---

## 尚未完成的任務（需要真實環境，無法在本機代為執行）

以下 7 項全部需要「已部署的站台 + 真實 GitHub 帳號與授權」，程式碼與設定都已就緒，
但驗證動作必須由你在實際環境操作。每一項都附上確切的做法與預期結果。

| 任務 | 為何卡住 | 你要做什麼 | 預期結果 |
|---|---|---|---|
| T023 | 需要實際的 HTTP 回應標頭 | 部署後開 DevTools 看 `/admin/` 的回應標頭 | 不應出現 `Cross-Origin-Opener-Policy: same-origin`；GitHub Pages 預設不送這個標頭，若出現才需處理 |
| T024 | 需要 OAuth App 與 Worker | 依 [infra/oauth-worker/README.md](../../infra/oauth-worker/README.md) 完成設定後登入 `/admin/` 發一篇文 | 無痕視窗讀得到該文；未登入開 `/admin/` 會被導向 GitHub 登入 |
| T031 | 需要真實的 CI 執行 | 故意把某篇文章的 `tags` 移除 `post` 後推送 | Actions 停在 verify、deploy 未執行、線上維持舊版、後台狀態列顯示失敗 |
| T052 | 需要第二個 GitHub 帳號 | 邀請一位 Write 權限協作者，請他在後台送出審核 | 產生 `cms/posts/{slug}` 分支與 PR，且該帳號無法自行合併 |
| T053 | 同上 | 以管理員身分核可與退回各一次 | 核可後合併上線；退回後文章回到草稿且作者看得到說明 |
| T059 | 需要登入後的後台 | 在編輯畫面改動內容後直接關閉分頁 | 瀏覽器出現未儲存提醒 |
| T061 | 需要登入後的後台 | 在編輯器輸入 Markdown 並觀察右側預覽 | 停止輸入後 1 秒內預覽更新，且樣式與正式頁面一致 |

**本機已實際驗證過的部分**：建置、內容驗證閘門（含重複網址、SVG、超大圖片三種違規的實測攔截）、
草稿不外洩（實際請求回 404）、子路徑部署、320 px 無水平捲動、12 項自動化測試。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 — **阻擋所有 User Story**
- **User Stories (Phase 3～8)**: 全部依賴 Foundational 完成
- **Polish (Phase 9)**: 依賴所有要交付的故事完成

### User Story Dependencies

- **US1 (P1)**: Foundational 完成後即可開始，不依賴其他故事
- **US2 (P1)**: Foundational 完成後即可開始。**例外：T030（後台發佈狀態列）需要 US1 的 T018 後台掛載頁**。US2 的核心價值（自動建置、驗證閘門、失敗不壞站）不受此影響，仍可獨立驗證
- **US3 (P2)**: 依賴 Foundational；與 US1 共用 `src/admin/config.yml`，建議排在 US1 之後以免同檔衝突
- **US4 (P2)**: 依賴 Foundational；會改寫 US1 建立的 `src/index.njk`
- **US5 (P3)**: 依賴 US1（需有可運作的後台與 editorial workflow 才驗得了審核流程）
- **US6 (P3)**: 依賴 US1（預覽與必填驗證都掛在後台上）

### Within Each User Story

- 模型／資料層 → 版型 → 後台設定 → 驗證 → 端到端確認
- 標記 `[P]` 者為不同檔案，可平行進行
- 每個故事完成後先驗收，再進下一個優先序

### Parallel Opportunities

- Phase 1 的 T002／T003／T005 可平行
- Phase 2 的 T010／T012／T013 可平行
- US1 的 T015／T016／T020 可平行
- US3 的 T034／T035 可平行（皆改 `config.yml`，需注意同檔衝突，建議先後進行）
- US4 的 T043／T044／T045／T048 可平行
- Phase 9 的 T062／T063 可平行

---

## Parallel Example: User Story 4

```bash
# 這四項分屬不同檔案，可同時進行：
Task: "建立 src/tags.njk 產生各標籤頁"
Task: "建立 src/tags/index.njk 標籤總覽頁"
Task: "建立 src/about/index.njk 關於頁"
Task: "在 test/site.test.mjs 加入標籤彙整與分頁測試"
```

---

## Implementation Strategy

### MVP First（只做 US1）

1. 完成 Phase 1 Setup
2. 完成 Phase 2 Foundational（**關鍵，阻擋所有故事**）
3. 完成 Phase 3 US1
4. **停下來驗收**：登入後台發一篇文章，無痕視窗讀得到
5. 此時已是一個可用的部落格，可對外展示

### Incremental Delivery

1. Setup + Foundational → 網站骨架可建置
2. + US1 → **MVP：後台發文端到端可用**
3. + US2 → 自動部署與驗證閘門，失敗不壞站
4. + US3 → 草稿、標籤、圖片，可持續經營
5. + US4 → 讀者導覽完整
6. + US5 → 多作者與審核
7. + US6 → 編輯體驗打磨
8. + Phase 9 → 文件與規格回修

### 建議的交付停損點

若時間有限，**做完 US1 + US2 + US3 即為一個完整可用的單人部落格**；US5 只有在真的要共筆時才需要。

---

## Notes

- `[P]` 任務 = 不同檔案、無相依
- `[Story]` 標籤讓每個任務都能追溯到對應的 User Story
- 每完成一個任務或一組邏輯相關任務就 commit
- Phase 9 的 T064～T068 是 `/speckit-checklist` 盤點出的**規格缺口回修**，其中 T064／T065 針對的是 spec 本身的真實瑕疵，建議在動手實作前先處理
- 完成 `tasks.md` 後先停在此步驟，詢問：`是否要繼續執行 /speckit.implement？`
