const pathPrefix = process.env.BASE_PATH || "/";

/** 站台保留標記，不視為使用者標籤 */
const RESERVED_TAGS = new Set(["post", "all"]);

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/uploads": "uploads" });
  eleventyConfig.addPassthroughCopy({ "src/admin/config.yml": "admin/config.yml" });
  eleventyConfig.addPassthroughCopy({ "src/admin/preview.js": "admin/preview.js" });

  eleventyConfig.addFilter("readableDate", (value) =>
    new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Taipei"
    }).format(new Date(value))
  );

  eleventyConfig.addFilter("htmlDateString", (value) =>
    new Date(value).toISOString().slice(0, 10)
  );

  eleventyConfig.addFilter("tagSlug", (value) => slugifyTag(value));

  /** sitemap 專用：非 ASCII 路徑需編碼後才是合法的 <loc> */
  eleventyConfig.addFilter("encodePath", (value) => encodeURI(String(value)));

  // 已發佈文章：排除草稿，依日期由新到舊；同日期時以標題排序以確保順序穩定（content.md CHK019）
  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi
      .getFilteredByTag("post")
      .filter((item) => item.data.draft !== true)
      .sort((a, b) => b.date - a.date || a.data.title.localeCompare(b.data.title, "zh-Hant"))
  );

  // 公開標籤：僅含至少一篇已發佈文章的標籤，且排除保留標記
  eleventyConfig.addCollection("publicTags", (collectionApi) => {
    const tags = new Map();
    for (const item of collectionApi.getFilteredByTag("post")) {
      if (item.data.draft === true) continue;
      for (const tag of item.data.tags || []) {
        if (RESERVED_TAGS.has(tag)) continue;
        if (!tags.has(tag)) tags.set(tag, { name: tag, slug: slugifyTag(tag), posts: [] });
        tags.get(tag).posts.push(item);
      }
    }
    for (const entry of tags.values()) {
      entry.posts.sort((a, b) => b.date - a.date);
    }
    return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  });

  return {
    pathPrefix,
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"]
  };
}

/**
 * 標籤名稱轉為網址片段。
 *
 * 刻意**不做**百分比編碼：編碼後的字串會變成實體目錄名（例如 `%E7%AD%86%E8%A8%98`），
 * 而瀏覽器送出請求時會先解碼成 `筆記`，兩者對不上就變成 404。
 * 因此保留原字，只做小寫化、空白轉連字號，並移除檔名不允許的字元；
 * 需要編碼的場合（sitemap）另以 encodeURI 處理。
 */
function slugifyTag(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[\\/:*?"<>|#%]/g, "");
}
