/**
 * 檔名 → 公開網址片段的單一規則來源。
 *
 * Eleventy 的 page.fileSlug 會**去掉** `YYYY-MM-DD-` 日期前綴，
 * 所以 `2026-08-13-hello-blog.md` 的網址是 `/posts/hello-blog/`。
 *
 * 這代表檔名唯一**不等於**網址唯一：`2026-08-13-hello.md` 與 `2026-09-01-hello.md`
 * 會產生同一個網址。因此 slug 唯一性必須由 check-content.mjs 明確驗證，
 * 不能倚賴檔案系統。驗證與產出兩邊共用本函式，避免規則各寫一份而漂移。
 */
export function fileNameToSlug(fileName) {
  return fileName
    .replace(/\.md$/, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "");
}
