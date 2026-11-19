"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, LAST_SHOP_COOKIE, credentials, tokenFor } from "@/lib/auth";

export type LoginState = { error: string; id: string; n: number };

export async function login(prev: LoginState, fd: FormData): Promise<LoginState> {
  const id = String(fd.get("id") ?? "").trim();
  const pw = String(fd.get("password") ?? "");
  const c = credentials();
  const fail = (error: string) => ({ error, id, n: prev.n + 1 });
  if (!c.password) return fail("サーバーにパスワードが設定されていません（ADMIN_PASSWORD）");
  if (id !== c.id || pw !== c.password) return fail("IDまたはパスワードが違います");
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(AUTH_COOKIE, await tokenFor(c.id, c.password), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 30 });
  jar.set(LAST_SHOP_COOKIE, id, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/");
}

/** 「別アカウントでログイン」：覚えている店舗を忘れる */
export async function forgetShop() {
  (await cookies()).delete(LAST_SHOP_COOKIE);
  redirect("/login");
}
