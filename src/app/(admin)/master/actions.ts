"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { AUTH_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth";
import { isMaster } from "@/lib/shop";
import { hashPassword } from "@/lib/password";

const { shops, templates } = schema;

async function guard() {
  if (!(await isMaster())) throw new Error("運営アカウントでログインしてください");
}

const PW_MIN = 8;

/** 次の店舗ID（1001, 1002, … の続き番号） */
async function nextLoginId() {
  const [r] = await db.select({ m: sql<number>`coalesce(max((login_id)::int), 1000)` }).from(shops).where(sql`login_id ~ '^[0-9]+$'`);
  return String(Number(r?.m ?? 1000) + 1);
}

export type MasterResult = { ok: boolean; message: string };

/** 店舗を追加（量産）。店舗IDは続き番号で自動発行。 */
export async function createShop(_: MasterResult, fd: FormData): Promise<MasterResult> {
  await guard();
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  const pw = String(fd.get("password") ?? "");
  const copyTemplatesFrom = Number(fd.get("copyFrom") || 0);
  if (!name) return { ok: false, message: "店舗名を入力してください" };
  if (pw && pw.length < PW_MIN) return { ok: false, message: `パスワードは${PW_MIN}文字以上にしてください` };
  const loginId = await nextLoginId();
  const [row] = await db
    .insert(shops)
    .values({ name, loginId, passwordHash: pw ? hashPassword(pw) : "", dayChangeHour: 6, memo: "業務連絡など、ご自由にお使いください" })
    .returning({ id: shops.id });
  if (copyTemplatesFrom) {
    const src = await db.select().from(templates).where(eq(templates.shopId, copyTemplatesFrom));
    if (src.length)
      await db.insert(templates).values(src.map((t) => ({ shopId: row.id, title: t.title, body: t.body, label: t.label, memo: t.memo, groupName: t.groupName, sortOrder: t.sortOrder })));
  }
  revalidatePath("/master");
  return { ok: true, message: `「${name}」を店舗ID ${loginId} で作成しました${pw ? "" : "（パスワード未設定：運営からのみ開けます）"}` };
}

export async function setShopPassword(shopId: number, pw: string): Promise<MasterResult> {
  await guard();
  if (pw.length < PW_MIN) return { ok: false, message: `パスワードは${PW_MIN}文字以上にしてください` };
  await db.update(shops).set({ passwordHash: hashPassword(pw) }).where(eq(shops.id, shopId));
  revalidatePath("/master");
  return { ok: true, message: "パスワードを設定しました" };
}

export async function setShopActive(shopId: number, active: boolean): Promise<MasterResult> {
  await guard();
  await db.update(shops).set({ active }).where(eq(shops.id, shopId));
  revalidatePath("/master");
  return { ok: true, message: active ? "利用中にしました" : "停止しました（ログイン・定期更新が止まります）" };
}

/** 運営のまま、別の店舗の管理画面を開く */
export async function openShop(shopId: number) {
  await guard();
  const [s] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, shopId));
  if (!s) throw new Error("店舗が見つかりません");
  const jar = await cookies();
  jar.set(AUTH_COOKIE, await signSession({ shopId: s.id, master: true }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}
