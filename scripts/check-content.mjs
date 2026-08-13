/**
 * 內容驗證（建置前閘門）。
 *
 * 契約來源：
 *   specs/001-admin-editable-blog/contracts/content-schema.md
 *   specs/001-admin-editable-blog/data-model.md（驗證規則表）
 *
 * 任一項不合規即以非零結束碼中止，讓 CI 停在 verify、不進到 deploy，
 * 線上因此維持前一個成功版本（FR-031、FR-032）。
 * 錯誤訊息一律指出**檔名**與**違反的規則**，不得只說「驗證失敗」。
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { fileNameToSlug } from "./lib/slug.mjs";

const POSTS_DIR = "src/posts";
const UPLOADS_DIR = "src/uploads";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const problems = [];

function fail(file, rule, detail) {
  problems.push({ file, rule, detail });
}

/** 極簡 front matter 解析：只需支援本專案實際用到的純量、清單與區塊 */
function parseFrontMatter(raw, file) {
  if (!raw.startsWith("---")) {
    fail(file, "front matter", "檔案開頭必須是 --- 分隔的 front matter");
    return null;
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    fail(file, "front matter", "找不到結束的 --- 分隔線");
    return null;
  }

  const head = raw.slice(3, end);
  const body = raw.slice(end + 4).trim();
  const data = {};
  let currentListKey = null;

  for (const line of head.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentListKey) {
      data[currentListKey].push(unquote(listItem[1].trim()));
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!pair) continue;

    const [, key, rawValue] = pair;
    const value = rawValue.trim();
    if (value === "") {
      currentListKey = key;
      data[key] = [];
    } else {
      currentListKey = null;
      data[key] = coerce(unquote(value));
    }
  }

  return { data, body };
}

function unquote(value) {
  return value.replace(/^["'](.*)["']$/, "$1");
}

function coerce(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

function checkPosts() {
  if (!existsSync(POSTS_DIR)) {
    fail(POSTS_DIR, "目錄", "找不到文章目錄");
    return;
  }

  const files = readdirSync(POSTS_DIR).filter((name) => name.endsWith(".md"));
  const seenSlugs = new Map();

  for (const name of files) {
    const file = join(POSTS_DIR, name);
    const parsed = parseFrontMatter(readFileSync(file, "utf8"), file);
    if (!parsed) continue;

    const { data, body } = parsed;
    const slug = fileNameToSlug(name);

    // 公開網址的格式與唯一性 —— FR-014
    // 注意：日期前綴會被去掉，所以不同日期但同名的兩個檔案會撞到同一個網址，
    // 檔案系統不會擋，只能在這裡擋。
    if (!SLUG_PATTERN.test(slug)) {
      fail(file, "FR-014 網址格式", `網址片段 "${slug}" 只允許小寫英數與連字號`);
    }
    if (seenSlugs.has(slug)) {
      fail(
        file,
        "FR-014 網址唯一",
        `與 ${seenSlugs.get(slug)} 產生相同的公開網址 /posts/${slug}/（日期前綴不影響網址）`
      );
    }
    seenSlugs.set(slug, file);

    // 必填欄位 —— FR-024
    for (const key of ["title", "description", "author", "readingTime"]) {
      if (data[key] === undefined || data[key] === "") {
        fail(file, "FR-024 必填欄位", `缺少 ${key}`);
      }
    }
    if (!body) {
      fail(file, "FR-024 必填欄位", "內文不得為空");
    }

    // 日期 —— FR-009
    if (data.date === undefined) {
      fail(file, "FR-009 發佈日期", "缺少 date");
    } else if (Number.isNaN(new Date(data.date).getTime())) {
      fail(file, "FR-009 發佈日期", `date "${data.date}" 無法解析為日期`);
    }

    // 草稿旗標必須是真正的布林值，字串 "false" 會被判為真 —— FR-010
    if (typeof data.draft !== "boolean") {
      fail(file, "FR-010 草稿狀態", `draft 必須是 true 或 false，目前為 ${JSON.stringify(data.draft)}`);
    }

    // 標籤必含 post，否則文章不會進入任何列表 —— FR-018
    if (!Array.isArray(data.tags)) {
      fail(file, "FR-018 標籤", "tags 必須是清單");
    } else if (!data.tags.includes("post")) {
      fail(file, "FR-018 標籤", 'tags 必須包含 "post"，否則這篇文章不會出現在列表與標籤頁');
    }

    // 封面圖存在性與替代文字 —— FR-021
    if (data.coverImage) {
      const target = join("src", String(data.coverImage).replace(/^\//, ""));
      const alternative = join(UPLOADS_DIR, basename(String(data.coverImage)));
      if (!existsSync(target) && !existsSync(alternative)) {
        fail(file, "FR-021 封面圖", `找不到圖片 ${data.coverImage}`);
      }
      if (!data.coverImageAlt) {
        fail(file, "FR-021 替代文字", "有封面圖時 coverImageAlt 為必填");
      }
    }
  }

  return files.length;
}

function checkUploads() {
  if (!existsSync(UPLOADS_DIR)) return;

  for (const name of readdirSync(UPLOADS_DIR)) {
    const file = join(UPLOADS_DIR, name);
    const stats = statSync(file);
    if (!stats.isFile()) continue;
    if (name === ".gitkeep") continue;

    const extension = extname(name).toLowerCase();

    // FR-020a：SVG 可內嵌腳本，且與網站同源，一律不接受
    if (extension === ".svg") {
      fail(file, "FR-020a 圖片格式", "不接受 SVG（可內嵌腳本）");
      continue;
    }
    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      fail(file, "FR-020 圖片格式", `不支援的副檔名 ${extension || "（無）"}，僅接受 JPEG／PNG／WebP／GIF`);
    }
    if (stats.size > MAX_IMAGE_BYTES) {
      const mb = (stats.size / 1024 / 1024).toFixed(2);
      fail(file, "FR-020 圖片大小", `${mb} MB 超過 5 MB 上限`);
    }
  }
}

const postCount = checkPosts();
checkUploads();

if (problems.length > 0) {
  console.error(`\n✗ 內容驗證未通過，共 ${problems.length} 項問題：\n`);
  for (const { file, rule, detail } of problems) {
    console.error(`  ${file}`);
    console.error(`    [${rule}] ${detail}`);
  }
  console.error("\n修正後重新執行 npm run verify。線上版本在修正前維持不變。\n");
  process.exit(1);
}

console.log(`✓ 內容驗證通過：${postCount} 篇文章、front matter 與圖片皆符合規範。`);
