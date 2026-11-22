import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { decrypt } from "@/lib/secret";
import { DxError, FuzokuDx, type DxNews } from "@/lib/robots/fuzokudx";

const { portals, shopPortalAccounts, syncLogs } = schema;

export async function dxPortal() {
  const [p] = await db.select().from(portals).where(eq(portals.code, "fuzokudx"));
  return p ?? null;
}

async function account() {
  const p = await dxPortal();
  if (!p) throw new DxError("風俗DXの設定がありません", "内容");
  const [a] = await db
    .select()
    .from(shopPortalAccounts)
    .where(and(eq(shopPortalAccounts.shopId, (await currentShopId())), eq(shopPortalAccounts.portalId, p.id)));
  if (!a?.loginId || !a.passwordEnc) throw new DxError("風俗DXのログインID・パスワードが未登録です（サイトのログイン情報で登録してください）", "ログイン");
  return { portal: p, loginId: a.loginId, password: decrypt(a.passwordEnc) };
}

async function log(portalId: number, ok: boolean, message: string, kind = "") {
  await db.insert(syncLogs).values({ shopId: (await currentShopId()), portalId, ok, errorKind: ok ? "" : kind, message, category: message.includes("接続テスト") ? "" : "content" });
}

/** ログインして処理し、結果を配信ログに残す */
async function withDx<T>(what: string, fn: (dx: FuzokuDx) => Promise<T>, logSuccess = true): Promise<{ ok: true; data: T; message: string } | { ok: false; message: string }> {
  let portalId = (await dxPortal())?.id ?? 0;
  try {
    const a = await account();
    portalId = a.portal.id;
    const dx = new FuzokuDx(a.loginId, a.password);
    await dx.login();
    const data = await fn(dx);
    if (logSuccess) await log(portalId, true, what);
    return { ok: true, data, message: what };
  } catch (e) {
    const err = e instanceof DxError ? e : new DxError(e instanceof Error ? e.message : "うまくいきませんでした", "接続");
    if (portalId) await log(portalId, false, `${what}：${err.message}`, err.kind);
    else console.error("[fuzokudx]", e);
    return { ok: false, message: err.message };
  }
}

export async function testDx() {
  return withDx("風俗DX 接続テスト", async (dx) => (await dx.listNews()).length);
}

export async function listDxNews() {
  return withDx("風俗DX お店速報の一覧", (dx) => dx.listNews(), false);
}

export async function postDxNews(p: { title: string; content: string; reserveAt?: { y: number; m: number; d: number; h: number; mi: number } }) {
  const when = p.reserveAt ? `（予約 ${p.reserveAt.y}/${p.reserveAt.m}/${p.reserveAt.d} ${String(p.reserveAt.h).padStart(2, "0")}:${String(p.reserveAt.mi).padStart(2, "0")}）` : "";
  return withDx(`風俗DX お店速報「${p.title}」を登録${when}`, (dx) => dx.createNews(p));
}

export async function deleteDxNews(id: string, title: string) {
  return withDx(`風俗DX お店速報「${title}」を削除`, (dx) => dx.deleteNews(id));
}

export type { DxNews };
