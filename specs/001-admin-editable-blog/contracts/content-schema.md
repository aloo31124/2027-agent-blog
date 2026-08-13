# 契約：內容結構與 CMS 設定

**適用對象**：文章 Markdown 檔、`src/admin/config.yml`、`scripts/check-content.mjs`

## 目錄

- [文章 front matter 契約](#文章-front-matter-契約)
- [CMS collection 契約](#cms-collection-契約)
- [媒體庫契約](#媒體庫契約)
- [違約行為](#違約行為)

## 文章 front matter 契約

檔案位置：`src/posts/{yyyy-mm-dd}-{slug}.md`

```yaml
title:          string        # 必填，不得為空白
description:    string        # 必填
date:           YYYY-MM-DD    # 必填，需可被 Date 解析
author:         string        # 必填，GitHub login
draft:          boolean       # 必填，true | false（不接受字串）
tags:           string[]      # 必填，且必含 "post"
readingTime:    number        # 必填，正整數
coverImage:     string        # 選填；非空時需存在於 src/uploads/
coverImageAlt:  string        # coverImage 非空時必填（FR-021 替代文字為必填）
```

> **網址不是 front matter 欄位**：公開網址由**檔名**推導為 `/posts/{檔名}/`。
> 這是實作階段對 plan 的刻意調整——檔名在檔案系統中天然唯一，站內唯一性（FR-014）因此無法被違反；
> 作者也不需要手動輸入網址，少一處打錯就壞連結的地方。檔案建立後檔名不隨標題變動，網址天然穩定（FR-014a）。

**不變條件**

1. 檔名（即 slug）在 `src/posts/` 中唯一，由檔案系統保證；`check-content.mjs` 另行驗證格式。
2. slug 僅允許小寫英數與連字號：`^[a-z0-9]+(-[a-z0-9]+)*$`。
3. `draft: true` 的文章**不得**產生任何 `_site` 輸出，也不得出現在任何列表、標籤頁或 sitemap。
4. `author` 一經建立不由 CMS 變更，作為權限判斷依據。
5. 圖片僅接受 JPEG／PNG／WebP／GIF；**不接受 SVG**（FR-020a，SVG 可內嵌腳本）。

## CMS collection 契約

`src/admin/config.yml` 必須滿足下列結構（欄位名稱需與上方 front matter 完全一致）：

```yaml
backend:
  name: github
  repo: <owner>/<repo>
  branch: main
  base_url: <OAuth Worker 網址>      # 見 oauth-endpoints.md
  auth_endpoint: auth

publish_mode: editorial_workflow      # 必要：FR-007 的審核流程來源

media_folder: src/uploads
public_folder: /uploads

collections:
  - name: posts
    label: 文章
    folder: src/posts
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    path: "{{slug}}"
    preview_path: "posts/{{fields.slug}}"
    fields:
      - { name: title,          label: 標題,        widget: string }
      - { name: description,    label: 摘要,        widget: text }
      - { name: date,           label: 發佈日期,     widget: datetime }
      - { name: author,         label: 作者,        widget: hidden }
      - { name: draft,          label: 草稿,        widget: boolean, default: true }
      - { name: tags,           label: 標籤,        widget: list,    default: ["post"] }
      - { name: permalink,      label: 網址,        widget: string }
      - { name: readingTime,    label: 閱讀分鐘,     widget: number,  value_type: int }
      - { name: coverImage,     label: 封面圖,      widget: image,   required: false }
      - { name: coverImageAlt,  label: 封面替代文字, widget: string,  required: false }
      - { name: body,           label: 內文,        widget: markdown }
```

**約束**

- `publish_mode: editorial_workflow` 為 FR-007 的唯一來源，**不得移除**。
- 僅使用 Decap 與 Sveltia CMS 共通的設定與 widget，以保留日後一行切換的退路（見 research.md R2）。
- `slug` 樣板必須含日期前綴，以降低 `permalink` 碰撞機率（FR-014 的第一道防線）。

## 媒體庫契約

```yaml
media_library:
  config:
    max_file_size: 5242880      # 5 MB，對應 FR-020
```

> **不可加 `name: default`**：Decap 會把它當成要載入的「外部」媒體庫，找不到就整個後台崩潰
> （[decap-cms#4094](https://github.com/decaporg/decap-cms/issues/4094)，官方文件的舊寫法有誤）。
> 內建媒體庫只要直接給 `config` 即可。

允許副檔名：`.jpg` `.jpeg` `.png` `.webp` `.gif` `.svg`。

## 違約行為

任一違約由 `scripts/check-content.mjs` 在 `npm run verify` 階段偵測，並以**非零結束碼**中止流程；CI 因此不會進到 deploy 步驟，線上版本維持不變（FR-031、FR-032）。錯誤訊息須指出**檔名**與**違反的規則**，不得只回報「驗證失敗」。
