import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { cookies } from "next/headers";
import { db, ensureSchema, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import { AUTH_COOKIE, verifySession, type Session } from "./auth";

/**
 * いま操作している店舗。
 * - 画面・操作：ログイン時のCookie（署名付き）から店舗IDを取り出す
 * - 定期実行（cron）など画面の外：withShop(店舗ID, 処理) で店舗を指定して動かす
 */
const shopScope = new AsyncLocalStorage<number>();

export function withShop<T>(shopId: number, fn: () => Promise<T>): Promise<T> {
  return shopScope.run(shopId, fn);
}

const sessionFromCookie = cache(async (): Promise<Session | null> => {
  try {
    const jar = await cookies();
    return await verifySession(jar.get(AUTH_COOKIE)?.value);
  } catch {
    return null; // リクエストの外（cron など）
  }
});

export async function currentSession(): Promise<Session | null> {
  const scoped = shopScope.getStore();
  if (scoped) return { shopId: scoped, master: false };
  return sessionFromCookie();
}

/** 操作中の店舗ID（ログインしていなければエラー） */
export async function currentShopId(): Promise<number> {
  const s = await currentSession();
  if (!s) throw new Error("ログインしてください");
  return s.shopId;
}

export async function isMaster() {
  const s = await currentSession();
  return !!s?.master;
}

export async function findShop() {
  await ensureSchema();
  const s = await currentSession();
  if (!s) return null;
  const [shop] = await db.select().from(schema.shops).where(eq(schema.shops.id, s.shopId));
  return shop ?? null;
}

export async function getShop() {
  const shop = await findShop();
  if (!shop) throw new Error("店舗データがありません。ログインし直すか、npm run setup を実行してください。");
  return shop;
}

/** すべての店舗（定期実行・運営画面用） */
export async function allShops() {
  await ensureSchema();
  return db.select().from(schema.shops).orderBy(asc(schema.shops.id));
}

/** 画面の応答のあとで動かす処理（公式サイトへの配信など）を、いまの店舗のまま実行する */
export async function afterForShop(fn: () => Promise<unknown>) {
  const { after } = await import("next/server");
  const id = await currentShopId();
  after(() => withShop(id, async () => void (await fn())));
}
