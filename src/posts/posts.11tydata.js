/**
 * src/posts/ 的目錄層級預設值。
 *
 * 使用 .11tydata.js 而非 posts.json，因為草稿排除需要計算式欄位（JSON 無法承載函式）。
 *
 * 草稿處理採雙重排除（FR-011）：
 *   1. permalink 設為 false —— 根本不產生任何輸出檔案，直接存取預期網址會得到 404
 *   2. eleventyExcludeFromCollections —— 不進入任何 collection，列表頁與標籤頁都不會出現
 */
export default {
  layout: "layouts/post.njk",
  tags: ["post"],

  eleventyComputed: {
    /*
      網址由**檔名**推導，而非讓作者手動填寫（偏離 plan 的原始設計，理由如下）：
        - 檔名在檔案系統中天然唯一，FR-014 的站內唯一性因此無法被違反
        - 作者不必手打 /posts/.../，少一個打錯就壞連結的地方
        - 檔名建立後不會因標題修改而變動，網址天然穩定（FR-014a）
      仍保留 check-content.mjs 的 slug 格式檢查作為第二道防線。
    */
    permalink: (data) =>
      data.draft === true ? false : `/posts/${data.page.fileSlug}/index.html`,

    eleventyExcludeFromCollections: (data) =>
      data.draft === true ? true : data.eleventyExcludeFromCollections || false
  }
};
