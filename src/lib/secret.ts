import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * ポータル・公式サイトのパスワードやAPIキーを暗号化して保存するための道具（AES-256-GCM）。
 * 鍵は環境変数 ORBIT_SECRET_KEY（DBとは別の場所に置く）。開発中だけ固定の仮の鍵を使います。
 */
function key() {
  const k = process.env.ORBIT_SECRET_KEY;
  if (!k) {
    if (process.env.NODE_ENV === "production") throw new Error("ORBIT_SECRET_KEY を設定してください");
    return createHash("sha256").update("orbit-dev-only-key").digest();
  }
  return createHash("sha256").update(k).digest();
}

export function encrypt(plain: string) {
  if (!plain) return "";
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(token: string) {
  if (!token) return "";
  const [v, iv, tag, enc] = token.split(".");
  if (v !== "v1") throw new Error("暗号の形式が違います");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}
