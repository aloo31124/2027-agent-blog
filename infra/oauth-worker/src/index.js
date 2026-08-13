/**
 * Decap CMS 的 GitHub OAuth 代理（Cloudflare Worker）。
 *
 * 契約：specs/001-admin-editable-blog/contracts/oauth-endpoints.md
 *
 * 公開網站託管在 GitHub Pages，沒有伺服器端可以保管 client secret，
 * 因此由這個 Worker 承接授權碼交換。它只做兩件事：
 *   GET /auth      導向 GitHub 授權頁
 *   GET /callback  以授權碼換 access token，再以 postMessage 交回後台視窗
 *
 * 安全約束：
 *   - client secret 只存在 Worker secret，不進版控
 *   - state 一律驗證，擋 CSRF
 *   - postMessage 目標限定 ALLOWED_ORIGIN，不使用 "*"
 *   - 不記錄、不保存 access token
 */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

/** 後台只需要讀寫倉庫內容，不索取其他權限（最小化授權範圍） */
const SCOPE = "repo";

const STATE_COOKIE = "decap_oauth_state";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") return handleAuth(url, env);
    if (url.pathname === "/callback") return handleCallback(request, url, env);
    if (url.pathname === "/") return new Response("Decap CMS OAuth proxy", { status: 200 });

    return new Response("Not found", { status: 404 });
  }
};

function handleAuth(url, env) {
  const provider = url.searchParams.get("provider") || "github";
  if (provider !== "github") {
    return new Response("僅支援 github provider", { status: 400 });
  }

  const state = crypto.randomUUID();
  const authorizeUrl = new URL(GITHUB_AUTHORIZE);
  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("scope", SCOPE);
  authorizeUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      // HttpOnly + SameSite=Lax：state 只在回呼時比對，前端不需要讀它
      "Set-Cookie": `${STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      "Cache-Control": "no-store"
    }
  });
}

async function handleCallback(request, url, env) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request.headers.get("Cookie"), STATE_COOKIE);

  if (!code) {
    return postMessageResponse(env, { error: "GitHub 未回傳授權碼，請重新登入。" });
  }
  if (!state || !expectedState || state !== expectedState) {
    return postMessageResponse(env, { error: "授權狀態驗證失敗，請重新登入。" });
  }

  let payload;
  try {
    const tokenResponse = await fetch(GITHUB_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    payload = await tokenResponse.json();
  } catch (error) {
    return postMessageResponse(env, { error: "無法與 GitHub 交換權杖，請稍後再試。" });
  }

  if (!payload || !payload.access_token) {
    // 刻意不回傳 GitHub 的原始錯誤內容，避免洩漏設定細節
    return postMessageResponse(env, { error: "GitHub 拒絕了這次授權，請確認你有這個倉庫的存取權。" });
  }

  return postMessageResponse(env, { token: payload.access_token });
}

/**
 * 產生回呼頁面：以 postMessage 把結果交給開啟它的後台視窗後自行關閉。
 * 訊息格式由 Decap CMS 規定。
 */
function postMessageResponse(env, result) {
  const message = result.token
    ? `authorization:github:success:${JSON.stringify({ token: result.token, provider: "github" })}`
    : `authorization:github:error:${JSON.stringify({ message: result.error })}`;

  const allowedOrigin = env.ALLOWED_ORIGIN;

  const html = `<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>登入處理中</title></head>
<body>
<p>${result.token ? "登入成功，正在返回後台…" : escapeHtml(result.error)}</p>
<script>
  (function () {
    var message = ${JSON.stringify(message)};
    var target = ${JSON.stringify(allowedOrigin)};
    function send(event) {
      window.opener.postMessage(message, target);
    }
    if (!window.opener) {
      document.body.textContent = "找不到後台視窗，請關閉這個分頁後重新登入。";
      return;
    }
    window.addEventListener("message", send, { once: true });
    window.opener.postMessage("authorizing:github", target);
    setTimeout(function () { window.close(); }, 1000);
  })();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // 用過即失效
      "Set-Cookie": `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
    }
  });
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
