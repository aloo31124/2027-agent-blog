# 2027-agent-blog Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-08-13

## Active Technologies

- Node.js 20+（ESM） + `@11ty/eleventy` 3.1.6（建置期）、Decap CMS 3.x（瀏覽器端，以 script 載入）、`wrangler`（僅 OAuth Worker 部署用） (001-admin-editable-blog)

## Project Structure

```text
src/            # Eleventy 來源：版型、文章、後台掛載頁、資源
scripts/        # 內容驗證與建置產物驗證
infra/          # OAuth Worker（部署到 Cloudflare，與站台建置分離）
test/           # node --test 測試
```

## Commands

```bash
npm run dev      # 本機預覽（Eleventy serve）
npm run build    # 建置到 _site
npm run verify   # 內容驗證 + 建置產物驗證（部署前閘門）
npm test         # 建置後執行 node --test
```

## Code Style

Node.js 20+（ESM）: Follow standard conventions

## Recent Changes

- 001-admin-editable-blog: Added Node.js 20+（ESM） + `@11ty/eleventy` 3.1.6（建置期）、Decap CMS 3.x（瀏覽器端，以 script 載入）、`wrangler`（僅 OAuth Worker 部署用）

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
