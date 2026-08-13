import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const outputDirectory = resolve("_site");
const basePath = process.env.BASE_PATH
  ? `/${process.env.BASE_PATH.replace(/^\/|\/$/g, "")}`
  : "";

const expectedFiles = [
  "index.html",
  "about/index.html",
  "posts/hello-github-pages/index.html",
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
const post = readFileSync(
  resolve(outputDirectory, "posts/hello-github-pages/index.html"),
  "utf8"
);

const postTitle = "從零開始：用 Node.js 與 GitHub Pages 發布個人部落格";
const postUrl = `${basePath}/posts/hello-github-pages/`;
const stylesheetUrl = `${basePath}/assets/styles.css`;

assert.match(home, new RegExp(postTitle), "首頁未顯示第一篇文章標題");
assert.ok(
  home.includes(`href="${postUrl}"`),
  `首頁未連到第一篇文章：${postUrl}`
);
assert.match(post, new RegExp(postTitle), "第一篇文章頁缺少正確標題");
assert.match(post, /這是這個部落格的第一篇文章/, "第一篇文章內容不完整");
assert.ok(
  post.includes(`href="${stylesheetUrl}"`),
  `文章頁未使用正確的樣式路徑：${stylesheetUrl}`
);

console.log(
  `✓ 建置輸出完整；第一篇文章已成功產生並可由 ${postUrl} 存取。`
);

