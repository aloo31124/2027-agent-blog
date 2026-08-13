const repository = process.env.GITHUB_REPOSITORY || "aloo31124/2027-agent-blog";
const [owner, repositoryName] = repository.split("/");
const normalizedBasePath = process.env.BASE_PATH
  ? `/${process.env.BASE_PATH.replace(/^\/|\/$/g, "")}`
  : "";
const defaultOrigin = `https://${owner}.github.io`;
const origin = (process.env.SITE_URL || defaultOrigin).replace(/\/$/, "");

export default {
  title: "Aloo 的開發手札",
  shortTitle: "Aloo / Notes",
  description: "記錄軟體開發、AI 協作與把想法做成作品的過程。",
  author: "Aloo",
  language: "zh-Hant",
  locale: "zh_TW",
  repository,
  repositoryName,
  origin,
  basePath: normalizedBasePath,
  url: `${origin}${normalizedBasePath}`,
  currentYear: new Date().getFullYear()
};

