import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** 店舗のログインパスワードを保存用に変換（scrypt）。元のパスワードはDBに残しません。 */
export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function checkPassword(pw: string, stored: string) {
  const [kind, salt, hash] = (stored || "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64");
  const got = scryptSync(pw, Buffer.from(salt, "base64"), want.length);
  return want.length === got.length && timingSafeEqual(want, got);
}
