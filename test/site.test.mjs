import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const output = resolve("_site");

test("首頁與第一篇文章皆成功輸出", () => {
  const homepagePath = resolve(output, "index.html");
  const postPath = resolve(output, "posts/hello-github-pages/index.html");

  assert.ok(existsSync(homepagePath));
  assert.ok(existsSync(postPath));

  const homepage = readFileSync(homepagePath, "utf8");
  const post = readFileSync(postPath, "utf8");

  assert.match(homepage, /從零開始：用 Node\.js 與 GitHub Pages 發布個人部落格/);
  assert.match(post, /第一篇文章如何被驗證？/);
});

test("核心頁面的語言、導覽與樣式設定正確", () => {
  for (const page of [
    "index.html",
    "about/index.html",
    "posts/hello-github-pages/index.html",
    "404.html"
  ]) {
    const html = readFileSync(resolve(output, page), "utf8");
    assert.match(html, /<html lang="zh-Hant">/);
    assert.match(html, /href="\/assets\/styles\.css"/);
    assert.match(html, /<nav class="site-nav"/);
  }
});

test("網站不載入廣告、追蹤腳本或第三方樣式資源", () => {
  const files = [
    "index.html",
    "about/index.html",
    "posts/hello-github-pages/index.html",
    "404.html",
    "assets/styles.css"
  ];

  for (const file of files) {
    const content = readFileSync(resolve(output, file), "utf8");

    assert.doesNotMatch(content, /googletagmanager|google-analytics|doubleclick/i);
    assert.doesNotMatch(content, /<script\b/i);
    assert.doesNotMatch(content, /@import\s+url\(\s*["']?https?:\/\//i);
  }
});
