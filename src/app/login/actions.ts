"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, ensureSchema, schema } from "@/db";
import { AUTH_COOKIE, LAST_SHOP_COOKIE, SESSION_MAX_AGE, credentials, signSession } from "@/lib/auth";
import { checkPassword } from "@/lib/password";

export type LoginState = { error: string; id: string; n: number };

/**
 * ログイン。
 * - 店舗ID（例：1002）＋ その店舗のパスワード → その店舗の管理画面
 * - 運営ID（ADMIN_ID）＋ ADMIN_PASSWORD → 運営としてログイン（同じIDの店舗を開き、運営画面ですべての店舗を切り替えられる）
 */
export async function login(prev: LoginState, fd: FormData): Promise<LoginState> {
  const id = String(fd.get("id") ?? "").trim();
  const pw = String(fd.get("password") ?? "");
  const fail = (error: string) => ({ error, id, n: prev.n + 1 });
  if (!id || !pw) return fail("IDとパスワードを入力してください");
  await ensureSchema();
  const [shop] = await db.select().from(schema.shops).where(eq(schema.shops.loginId, id));
  const master = credentials();

  let session: { shopId: number; master: boolean } | null = null;
  if (master.password && id === master.id && pw === master.password) {
    const [first] = shop ? [shop] : await db.select().from(schema.shops).orderBy(schema.shops.id).limit(1);
    if (!first) return fail("店舗データがありません");
    session = { shopId: first.id, master: true };
  } else if (shop && shop.active && shop.passwordHash && checkPassword(pw, shop.passwordHash)) {
    session = { shopId: shop.id, master: false };
  }
  if (!session) return fail("IDまたはパスワードが違います");

  const token = await signSession(session);
  if (!token) return fail("サーバーに鍵が設定されていません（ORBIT_SECRET_KEY）");
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(AUTH_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_MAX_AGE });
  jar.set(LAST_SHOP_COOKIE, id, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/");
}

/** 「別アカウントでログイン」：覚えている店舗を忘れる */
export async function forgetShop() {
  (await cookies()).delete(LAST_SHOP_COOKIE);
  redirect("/login");
}
