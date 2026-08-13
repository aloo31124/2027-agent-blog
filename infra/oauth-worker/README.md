# 後台登入代理（OAuth Worker）

公開網站是純靜態的，沒有伺服器端可以保管 OAuth 的 client secret，所以登入這一段由這個
Cloudflare Worker 承接。**它只影響後台登入——就算它掛了，讀者端的網站完全不受影響。**

端點與訊息格式的完整定義見
[contracts/oauth-endpoints.md](../../specs/001-admin-editable-blog/contracts/oauth-endpoints.md)。

## 設定步驟（一次性，約 10 分鐘）

### 1. 建立 GitHub OAuth App

到 **Settings → Developer settings → OAuth Apps → New OAuth App**：

| 欄位 | 填什麼 |
| --- | --- |
| Application name | 隨意，例如 `我的部落格後台` |
| Homepage URL | 你的網站網址 |
| Authorization callback URL | 先填 `https://example.com/callback`，第 3 步再回來改 |

建立後記下 **Client ID**，並按 **Generate a new client secret** 產生密鑰——**它只會顯示一次**。

### 2. 部署 Worker

```bash
npm install
```

編輯 `wrangler.toml`，把 `GITHUB_CLIENT_ID` 換成第 1 步的 Client ID，
`ALLOWED_ORIGIN` 換成你的網站來源（不要結尾斜線）。

```bash
npx wrangler deploy
```

把 client secret 存成 secret（**不要**寫進 `wrangler.toml`）：

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
```

部署完成後會得到類似 `https://decap-oauth-proxy.<你的帳號>.workers.dev` 的網址。

### 3. 回填兩個地方

1. 回到 GitHub OAuth App，把 **Authorization callback URL** 改成
   `https://<worker 網址>/callback`
2. 編輯 [`src/admin/config.yml`](../../src/admin/config.yml)，把 `backend.base_url` 改成
   `https://<worker 網址>`

推送後開啟 `https://<你的網站>/admin/`，用 GitHub 帳號登入即可。

## 本機開發

```bash
npx wrangler dev
```

機密放在 `.dev.vars`（已列入 `.gitignore`）：

```text
GITHUB_CLIENT_SECRET=你的密鑰
```

## 安全性說明

- client secret 只存在 Cloudflare 的 secret 儲存區，不進版控
- `state` 以 HttpOnly cookie 保存並於回呼時比對，用來擋 CSRF
- `postMessage` 的目標限定為 `ALLOWED_ORIGIN`，不使用萬用字元
- Worker 不記錄也不保存 access token，只在回應中交給後台視窗
- 授權範圍固定為 `repo`，不索取其他權限

## 疑難排解

| 症狀 | 處理 |
| --- | --- |
| 登入彈窗顯示 `DNS_PROBE_FINISHED_NXDOMAIN`、網址是 `replace-me.workers.dev` | `src/admin/config.yml` 的 `base_url` 還是預留值，照上面第 2、3 步部署並回填。**本機開發**則不需要 Worker，改跑 `npm run dev:cms` 起本機代理即可 |
| 登入彈窗一閃即逝、顯示 Authentication Aborted | 網站的 `Cross-Origin-Opener-Policy` 會破壞 OAuth 彈窗，改為 `same-origin-allow-popups` |
| 顯示「授權狀態驗證失敗」 | cookie 被瀏覽器擋掉，確認未封鎖第三方 cookie，或改用同網域部署 Worker |
| 顯示「GitHub 拒絕了這次授權」 | 確認該帳號對 `backend.repo` 指定的倉庫有寫入權限 |
