# 契約：後台登入與發佈狀態介面

**適用對象**：`infra/oauth-worker/`、`src/admin/index.njk` 的發佈狀態列

## 目錄

- [OAuth 代理端點](#oauth-代理端點)
  - [GET /auth](#get-auth)
  - [GET /callback](#get-callback)
- [代理設定與機密](#代理設定與機密)
- [發佈狀態查詢](#發佈狀態查詢)
- [失效行為](#失效行為)

## OAuth 代理端點

Decap CMS 的 GitHub backend 在非 Netlify 環境下，需要一個提供下列兩個端點的外部服務；`config.yml` 的 `backend.base_url` 指向它的網域。

### GET /auth

| 項目 | 內容 |
|---|---|
| 查詢參數 | `provider=github`、`scope=repo`、`site_id`（選用） |
| 行為 | 產生一次性 `state` 並以 302 導向 GitHub 授權頁 |
| 回應 | `302 Location: https://github.com/login/oauth/authorize?...` |

### GET /callback

| 項目 | 內容 |
|---|---|
| 查詢參數 | `code`、`state` |
| 行為 | 驗證 `state`，以 `code` 向 GitHub 換取 access token |
| 回應 | `200 text/html`，頁面內以 `window.postMessage` 將結果回傳給開啟者視窗後自行關閉 |

回傳訊息格式（Decap 規定）：

```text
成功：authorization:github:success:{"token":"<access_token>","provider":"github"}
失敗：authorization:github:error:{"message":"<原因>"}
```

**約束**

- `postMessage` 的目標來源必須限定為站台網域，不得使用 `*`。
- `state` 必須驗證，防止 CSRF。
- Worker **不得**記錄或保存 access token。

## 代理設定與機密

| 名稱 | 來源 | 說明 |
|---|---|---|
| `GITHUB_CLIENT_ID` | GitHub OAuth App | 可公開 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App | **僅存於 Worker secret，不得進版控** |
| `ALLOWED_ORIGIN` | 站台公開網址 | 限制 `postMessage` 目標與 CORS |

GitHub OAuth App 的 **Authorization callback URL** 必須設為 `https://<worker-網域>/callback`。

## 發佈狀態查詢

後台狀態列以未認證請求查詢公開倉庫的最近一次建置：

```http
GET https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page=1&branch=main
Accept: application/vnd.github+json
```

取用欄位與顯示對應：

| API 欄位 | 顯示 | 對應需求 |
|---|---|---|
| `workflow_runs[0].status` | `queued`/`in_progress` → 「發佈中」 | FR-030 |
| `workflow_runs[0].conclusion` | `success` → 「發佈成功」；`failure` → 「發佈失敗」 | FR-030、FR-031 |
| `workflow_runs[0].updated_at` | 完成時間 | FR-030 |
| `workflow_runs[0].html_url` | 「查看原因」連結 | FR-031 |

**約束**

- 未認證額度為每 IP 每小時 60 次；輪詢間隔不得短於 15 秒，且僅在後台頁面開啟時輪詢。
- 查詢失敗時狀態列顯示「無法取得發佈狀態」，**不得**阻擋後台其他功能。

## 失效行為

| 情境 | 後台 | 公開網站 |
|---|---|---|
| Worker 無法連線 | 無法登入，顯示可理解的錯誤 | **完全不受影響**（讀者端不經過 Worker） |
| GitHub API 額度用盡 | 狀態列顯示無法取得，其餘功能正常 | 不受影響 |
| 使用者登出 | 清除瀏覽器中的憑證，需重新登入 | 不受影響 |
