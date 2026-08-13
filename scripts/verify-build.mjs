/**
 * 建置產物驗證（部署前閘門）。
 *
 * 契約來源：specs/001-admin-editable-blog/contracts/site-routes.md
 *
 * 這一步跑在 build 之後、deploy 之前。任一項失敗即以非零結束碼中止，
 * GitHub Actions 因此不會進到部署，線上維持前一個成功版本（FR-031、FR-032）。
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileNameToSlug } from "./lib/slug.mjs";

const outputDirectory = resolve("_site");
const postsDirectory = resolve("src/posts");
const basePath = process.env.BASE_PATH
  ? `/${process.env.BASE_PATH.replace(/^\/|\/$/g, "")}`
  : "";

const expectedFiles = [
  "index.html",
  "about/index.html",
  "tags/index.html",
  "admin/index.html",
  "admin/config.yml",
  "assets/styles.css",
  "404.html",
  "sitemap.xml",
  "robots.txt",
  ".nojekyll"
];

for (const file of expectedFiles) {
  assert.ok(
    existsSync(resolve(outputDirectory, file)),
    `缺少建置輸出：_site/${file}`
  );
}

const home = readFileSync(resolve(outputDirectory, "index.html"), "utf8");
const sitemap = readFileSync(resolve(outputDirectory, "sitemap.xml"), "utf8");

// --- 已發佈文章：首頁看得到、頁面產生得出來 -------------------------------

const posts = readPosts();
const published = posts.filter((post) => post.draft === false);
const drafts = posts.filter((post) => post.draft === true);

assert.ok(published.length > 0, "站上至少要有一篇已發佈文章才能驗證輸出");

const newest = published.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
const newestUrl = `${basePath}/posts/${newest.slug}/`;

assert.ok(
  existsSync(resolve(outputDirectory, `posts/${newest.slug}/index.html`)),
  `最新一篇文章未產生頁面：_site/posts/${newest.slug}/index.html`
);
assert.match(home, new RegExp(escapeRegExp(newest.title)), "首頁未顯示最新文章標題");
assert.ok(home.includes(`href="${newestUrl}"`), `首頁未連到最新文章：${newestUrl}`);

const post = readFileSync(
  resolve(outputDirectory, `posts/${newest.slug}/index.html`),
  "utf8"
);
assert.ok(
  post.includes(`href="${basePath}/assets/styles.css"`),
  `文章頁未使用正確的樣式路徑：${basePath}/assets/styles.css`
);

// --- 草稿不得外洩（FR-011） -----------------------------------------------

const outputFiles = listFiles(outputDirectory);
const textOutput = outputFiles
  .filter((file) => /\.(html|xml|txt|json)$/.test(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

for (const draft of drafts) {
  assert.ok(
    !existsSync(resolve(outputDirectory, `posts/${draft.slug}/index.html`)),
    `草稿產生了頁面：_site/posts/${draft.slug}/index.html`
  );
  assert.ok(
    !textOutput.includes(draft.slug),
    `草稿的網址代稱出現在建置輸出中：${draft.slug}`
  );
  assert.ok(
    !textOutput.includes(draft.title),
    `草稿的標題出現在建置輸出中：${draft.title}`
  );
}

// --- sitemap 只含已發佈的公開頁面（FR-027） -------------------------------

const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const staticPageCount = 3; // 首頁、關於、標籤總覽
const tagPageCount = countTagPages();
const expectedUrlCount = staticPageCount + tagPageCount + published.length;

assert.equal(
  sitemapUrls.length,
  expectedUrlCount,
  `sitemap 網址數不符：預期 ${expectedUrlCount}（靜態 ${staticPageCount} + 標籤 ${tagPageCount} + 文章 ${published.length}），實際 ${sitemapUrls.length}`
);
assert.ok(
  !sitemapUrls.some((url) => url.includes("/admin/")),
  "sitemap 不得包含後台頁面"
);

console.log(
  `✓ 建置輸出完整：${published.length} 篇已發佈文章、${tagPageCount} 個標籤頁；` +
    `${drafts.length} 篇草稿確認未外洩。最新一篇可由 ${newestUrl} 存取。`
);

// --- 後台登入設定：只警告，不中止 ------------------------------------------
//
// base_url 還是 REPLACE-ME 的話，線上後台按登入會連到不存在的網域
// （DNS_PROBE_FINISHED_NXDOMAIN）。但這只影響後台登入，讀者端的網站完全正常，
// 所以這裡刻意「不」讓 assert 失敗——為了尚未設定的後台而擋掉整包部署，
// 反而會讓讀者看不到新文章，比原本的問題更糟。
const adminConfig = readFileSync(resolve(outputDirectory, "admin/config.yml"), "utf8");
if (/REPLACE-ME/.test(adminConfig)) {
  console.warn(
    "⚠ src/admin/config.yml 的 backend.base_url 仍是預留值，線上後台將無法登入。\n" +
      "  部署 OAuth Worker 後回填即可，步驟見 infra/oauth-worker/README.md。\n" +
      "  （本機開發不需要 Worker：npm run dev:cms 另開本機代理即可。）"
  );
}

// --- 輔助 ------------------------------------------------------------------

function readPosts() {
  return readdirSync(postsDirectory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const raw = readFileSync(join(postsDirectory, name), "utf8");
      return {
        slug: fileNameToSlug(name),
        title: matchField(raw, "title"),
        date: matchField(raw, "date"),
        draft: matchField(raw, "draft") === "true"
      };
    });
}

function matchField(raw, key) {
  const match = raw.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["'](.*)["']$/, "$1") : "";
}

function countTagPages() {
  const tagsDirectory = resolve(outputDirectory, "tags");
  if (!existsSync(tagsDirectory)) return 0;
  return readdirSync(tagsDirectory).filter((name) =>
    statSync(join(tagsDirectory, name)).isDirectory()
  ).length;
}

function listFiles(directory) {
  const results = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) results.push(...listFiles(full));
    else results.push(full);
  }
  return results;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
