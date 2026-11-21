export const AUTH_COOKIE = "orbit_auth";
export const LAST_SHOP_COOKIE = "orbit_last_shop";

/**
 * 運営（マスタ）のログインID・パスワード。
 * .env.local の ADMIN_ID / ADMIN_PASSWORD で設定します。
 * 未設定のときは開発用の初期値（ID 1001 / パスワード orbit-demo）。本番では必ず設定してください。
 * このIDでログインすると「運営」としてすべての店舗を管理できます（店舗の追加・切り替え）。
 */
export function credentials() {
  const id = process.env.ADMIN_ID || "1001";
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "orbit-demo");
  return { id, password };
}

/** セッションに署名する鍵（ブラウザに渡さない） */
function sessionSecret() {
  return process.env.ORBIT_SECRET_KEY || process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "orbit-dev-session");
}

export type Session = { shopId: number; master: boolean };

const SESSION_DAYS = 30;

async function hmac(text: string) {
  const secret = sessionSecret();
  if (!secret) return "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`orbit-session:${text}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** ログイン中の店舗をCookieに入れるための署名付きの文字列：店舗ID.運営フラグ.期限.署名 */
export async function signSession(s: Session) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const body = `${s.shopId}.${s.master ? 1 : 0}.${exp}`;
  return `${body}.${await hmac(body)}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [shop, master, exp, sig] = parts;
  const body = `${shop}.${master}.${exp}`;
  const expect = await hmac(body);
  if (!expect || expect.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expect.charCodeAt(i);
  if (diff) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const shopId = Number(shop);
  if (!Number.isInteger(shopId) || shopId <= 0) return null;
  return { shopId, master: master === "1" };
}

export const SESSION_MAX_AGE = SESSION_DAYS * 86400;
