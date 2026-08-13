/**
 * 站台層級設定（data-model.md 的 SiteSettings）。
 * v1 不開放後台編輯，由本檔直接維護。
 */
export default {
  title: "Aloo 的開發手札",
  description: "一個有後台可編輯、可快速部屬的個人部落格。",
  author: "aloo31124",
  language: "zh-Hant",

  /** 公開網站的來源網域；CI 由 GitHub Pages 提供 SITE_URL */
  url: process.env.SITE_URL || "https://aloo31124.github.io",

  /** 首頁與標籤頁每頁文章數（FR-025） */
  postsPerPage: 10,

  /** owner/name，供後台發佈狀態列查詢建置狀態（FR-030） */
  repo: "aloo31124/2027-agent-blog"
};
