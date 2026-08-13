/**
 * 站台單元／整合測試。
 * 以 `npm test` 執行（會先 build 再跑 node --test）。
 *
 * 這裡測的是「規則本身」與「建置產物」，
 * 部署前閘門另由 scripts/check-content.mjs 與 scripts/verify-build.mjs 負責。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { fileNameToSlug } from "../scripts/lib/slug.mjs";
import eleventyConfig from "../eleventy.config.js";
import site from "../src/_data/site.js";

/** 以樁物件收集 eleventy.config.js 註冊的過濾器與集合，供直接測試 */
function loadConfig() {
  const filters = new Map();
  const collections = new Map();
  const stub = {
    addPassthroughCopy() {},
    addFilter(name, fn) { filters.set(name, fn); },
    addCollection(name, fn) { collections.set(name, fn); },
    configureErrorReporting() {}
  };
  const returned = eleventyConfig(stub);
  return { filters, collections, returned };
}

/** 模擬 Eleventy 的 collectionApi，只需支援 getFilteredByTag */
function fakeCollectionApi(items) {
  return {
    getFilteredByTag: (tag) =>
      items.filter((item) => (item.data.tags || []).includes(tag))
  };
}

function fakePost({ title, tags = ["post"], draft = false, date = "2026-01-01" }) {
  return { date: new Date(date), data: { title, tags, draft } };
}

test("fileNameToSlug 去掉日期前綴，因此網址不含日期", () => {
  assert.equal(fileNameToSlug("2026-08-13-hello-blog.md"), "hello-blog");
  assert.equal(fileNameToSlug("no-date-prefix.md"), "no-date-prefix");
});

test("不同日期但同名的檔案會撞到同一個網址（唯一性不能靠檔案系統）", () => {
  assert.equal(
    fileNameToSlug("2026-08-13-hello.md"),
    fileNameToSlug("2026-09-01-hello.md")
  );
});

test("posts 集合排除草稿並依日期由新到舊", () => {
  const { collections } = loadConfig();
  const items = [
    fakePost({ title: "舊文", date: "2026-01-01" }),
    fakePost({ title: "新文", date: "2026-06-01" }),
    fakePost({ title: "草稿", date: "2026-07-01", draft: true })
  ];

  const result = collections.get("posts")(fakeCollectionApi(items));

  assert.equal(result.length, 2);
  assert.equal(result[0].data.title, "新文");
  assert.equal(result[1].data.title, "舊文");
  assert.ok(!result.some((p) => p.data.draft));
});

test("同日期的文章排序是確定的，不隨輸入順序改變", () => {
  const { collections } = loadConfig();
  const posts = collections.get("posts");

  // 刻意不斷言「哪一篇在前」——那取決於 ICU 的中文定序，
  // 真正要保證的是同日期時輸出順序穩定，不會每次建置跳動。
  const forward = posts(fakeCollectionApi([
    fakePost({ title: "乙文", date: "2026-05-01" }),
    fakePost({ title: "甲文", date: "2026-05-01" })
  ]));
  const reversed = posts(fakeCollectionApi([
    fakePost({ title: "甲文", date: "2026-05-01" }),
    fakePost({ title: "乙文", date: "2026-05-01" })
  ]));

  assert.deepEqual(
    forward.map((p) => p.data.title),
    reversed.map((p) => p.data.title),
    "同日期文章的順序會隨輸入順序改變，代表排序不穩定"
  );
});

test("publicTags 排除保留標記，且不含只有草稿使用的標籤", () => {
  const { collections } = loadConfig();
  const items = [
    fakePost({ title: "已發佈", tags: ["post", "筆記"] }),
    fakePost({ title: "草稿", tags: ["post", "只在草稿裡"], draft: true })
  ];

  const tags = collections.get("publicTags")(fakeCollectionApi(items));
  const names = tags.map((t) => t.name);

  assert.deepEqual(names, ["筆記"]);
  assert.ok(!names.includes("post"));
  assert.ok(!names.includes("只在草稿裡"));
});

test("tagSlug 不做百分比編碼，否則實體目錄名與請求路徑會對不上", () => {
  const { filters } = loadConfig();
  const tagSlug = filters.get("tagSlug");

  assert.equal(tagSlug("筆記"), "筆記");
  assert.equal(tagSlug("Hello World"), "hello-world");
  assert.ok(!tagSlug("筆記").includes("%"));
});

test("日期過濾器以 Asia/Taipei 呈現", () => {
  const { filters } = loadConfig();

  assert.equal(filters.get("htmlDateString")("2026-08-13T00:00:00Z"), "2026-08-13");
  assert.match(filters.get("readableDate")("2026-08-13T00:00:00Z"), /2026/);
});

test("首頁分頁篇數與 site.postsPerPage 一致（防止兩處設定漂移）", () => {
  const indexTemplate = readFileSync("src/index.njk", "utf8");
  const match = indexTemplate.match(/^\s*size:\s*(\d+)\s*$/m);

  assert.ok(match, "src/index.njk 的 pagination 缺少 size 設定");
  assert.equal(
    Number(match[1]),
    site.postsPerPage,
    "src/index.njk 的 pagination.size 與 src/_data/site.js 的 postsPerPage 不一致"
  );
});

test("建置產物：草稿不產生頁面，也不出現在任何輸出檔案中", { skip: !existsSync("_site") }, () => {
  const drafts = readdirSync("src/posts")
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({
      slug: fileNameToSlug(name),
      raw: readFileSync(join("src/posts", name), "utf8")
    }))
    .filter((post) => /^draft:\s*true\s*$/m.test(post.raw));

  assert.ok(drafts.length > 0, "應保留至少一篇草稿樣本作為回歸測試");

  const textOutput = listFiles("_site")
    .filter((file) => /\.(html|xml|txt)$/.test(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  for (const draft of drafts) {
    assert.ok(
      !existsSync(join("_site", "posts", draft.slug, "index.html")),
      `草稿產生了頁面：${draft.slug}`
    );
    assert.ok(!textOutput.includes(draft.slug), `草稿網址出現在輸出中：${draft.slug}`);
  }
});

test("建置產物：sitemap 不含後台頁面", { skip: !existsSync("_site/sitemap.xml") }, () => {
  const sitemap = readFileSync("_site/sitemap.xml", "utf8");
  assert.ok(!sitemap.includes("/admin/"));
});

test("建置產物：後台頁面帶 noindex，且設定檔一併輸出", { skip: !existsSync("_site/admin/index.html") }, () => {
  const admin = readFileSync("_site/admin/index.html", "utf8");

  assert.match(admin, /name="robots"\s+content="noindex"/);
  assert.ok(existsSync("_site/admin/config.yml"), "config.yml 未複製到 _site/admin/");
});

test("建置產物：每個頁面都有跳過導覽連結與語言標記", { skip: !existsSync("_site/index.html") }, () => {
  for (const page of ["_site/index.html", "_site/about/index.html", "_site/404.html"]) {
    const html = readFileSync(page, "utf8");
    assert.match(html, /<html lang="zh-Hant">/, `${page} 缺少語言標記`);
    assert.match(html, /class="skip-link"/, `${page} 缺少跳過導覽連結`);
  }
});

function listFiles(directory) {
  const results = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) results.push(...listFiles(full));
    else results.push(full);
  }
  return results;
}
