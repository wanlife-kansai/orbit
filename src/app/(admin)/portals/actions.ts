"use server";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { encrypt } from "@/lib/secret";
import { getOfficialPortal, importFromOfficial, resetLinks, testConnection } from "@/lib/official";
import { and, eq } from "drizzle-orm";

export type Msg = { ok: boolean; message: string; n: number };

export async function saveOfficial(prev: Msg, fd: FormData): Promise<Msg> {
  const portal = await getOfficialPortal();
  if (!portal) return { ok: false, message: "公式サイトの設定がありません（npm run setup を実行してください）", n: prev.n + 1 };
  const url = String(fd.get("url") ?? "").trim().replace(/\/+$/, "");
  const key = String(fd.get("key") ?? "").trim();
  if (!/^https?:\/\/[^\s]+$/.test(url)) return { ok: false, message: "URLは https:// から入力してください", n: prev.n + 1 };
  const set: Partial<typeof schema.shopPortalAccounts.$inferInsert> = { loginId: url };
  if (key) {
    if (key.length < 24) return { ok: false, message: "APIキーは24文字以上です", n: prev.n + 1 };
    try {
      set.passwordEnc = encrypt(key);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "暗号化できませんでした", n: prev.n + 1 };
    }
  }
  const [before] = await db
    .select()
    .from(schema.shopPortalAccounts)
    .where(and(eq(schema.shopPortalAccounts.shopId, (await currentShopId())), eq(schema.shopPortalAccounts.portalId, portal.id)));
  const urlChanged = !!before?.loginId && before.loginId !== url;
  if (urlChanged) await resetLinks(portal.id); // 別のサイトにつなぎ替えたら、女性のつながりは作り直す
  await db
    .insert(schema.shopPortalAccounts)
    .values({ shopId: (await currentShopId()), portalId: portal.id, loginId: url, passwordEnc: set.passwordEnc ?? "" })
    .onConflictDoUpdate({ target: [schema.shopPortalAccounts.shopId, schema.shopPortalAccounts.portalId], set });
  revalidatePath("/portals");
  const t = await testConnection();
  await recordCheck(portal.id, t.ok, t.message);
  const note = urlChanged ? "接続先が変わったので、女性のつながりをリセットしました。「公式サイトから取り込む」をやり直してください。" : "";
  return { ...t, message: `保存しました。${t.message}${note ? ` ${note}` : ""}`, n: prev.n + 1 };
}

async function recordCheck(portalId: number, ok: boolean, message: string) {
  const { and, eq, sql } = await import("drizzle-orm");
  await db
    .update(schema.shopPortalAccounts)
    .set({ lastCheckAt: sql`now()`, lastCheckResult: ok ? "OK" : message })
    .where(and(eq(schema.shopPortalAccounts.shopId, (await currentShopId())), eq(schema.shopPortalAccounts.portalId, portalId)));
}

export async function testOfficial(prev: Msg): Promise<Msg> {
  const t = await testConnection();
  const portal = await getOfficialPortal();
  if (portal) await recordCheck(portal.id, t.ok, t.message);
  revalidatePath("/portals");
  return { ...t, n: prev.n + 1 };
}

export async function importOfficial(prev: Msg, fd: FormData): Promise<Msg> {
  const r = await importFromOfficial({ replaceAll: fd.get("replaceAll") === "on" });
  revalidatePath("/", "layout");
  return { ...r, n: prev.n + 1 };
}

export async function saveTargetSites(codes: string[]) {
  const { SITES } = await import("@/lib/sites");
  const known = new Set(SITES.map((s) => s.code));
  await db
    .update(schema.shops)
    .set({ targetSites: codes.filter((c) => known.has(c)) })
    .where(eq(schema.shops.id, (await currentShopId())));
  revalidatePath("/", "layout");
}

/** ポータル（風俗DXなど）のログインID・パスワードを保存して接続テスト */
export async function savePortalAccount(portalId: number, prev: Msg, fd: FormData): Promise<Msg> {
  const loginId = String(fd.get("loginId") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!loginId) return { ok: false, message: "ログインIDを入力してください", n: prev.n + 1 };
  const set: Partial<typeof schema.shopPortalAccounts.$inferInsert> = { loginId };
  if (password) {
    try {
      set.passwordEnc = encrypt(password);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "暗号化できませんでした", n: prev.n + 1 };
    }
  }
  await db
    .insert(schema.shopPortalAccounts)
    .values({ shopId: (await currentShopId()), portalId, loginId, passwordEnc: set.passwordEnc ?? "" })
    .onConflictDoUpdate({ target: [schema.shopPortalAccounts.shopId, schema.shopPortalAccounts.portalId], set });
  revalidatePath("/portals");
  revalidatePath("/accounts");
  const [portal] = await db.select().from(schema.portals).where(eq(schema.portals.id, portalId));
  if (portal?.code !== "fuzokudx") {
    return { ok: true, message: "保存しました。このサイトの自動ログイン確認は、接続ができ次第おこないます。", n: prev.n + 1 };
  }
  const { testDx } = await import("@/lib/portals/dx");
  const t = await testDx();
  await recordCheck(portalId, t.ok, t.message);
  return { ok: t.ok, message: t.ok ? `保存しました。風俗DXにログインできました（お店速報 ${t.data}件）` : `保存しました。${t.message}`, n: prev.n + 1 };
}
