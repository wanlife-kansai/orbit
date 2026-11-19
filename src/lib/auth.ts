export const AUTH_COOKIE = "orbit_auth";
export const LAST_SHOP_COOKIE = "orbit_last_shop";

/**
 * ログインID・パスワード。
 * .env.local の ADMIN_ID / ADMIN_PASSWORD で設定します。
 * 未設定のときは開発用の初期値（ID 1001 / パスワード orbit-demo）。本番では必ず設定してください。
 */
export function credentials() {
  const id = process.env.ADMIN_ID || "1001";
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "orbit-demo");
  return { id, password };
}

export async function tokenFor(id: string, password: string) {
  const data = new TextEncoder().encode(`orbit:${id}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
