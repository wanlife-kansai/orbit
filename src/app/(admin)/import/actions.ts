"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId, getShop } from "@/lib/shop";
import { decrypt, encrypt } from "@/lib/secret";
import { importContents, importGirl, importSchedules, importTemplates, listGirls, packSession, unpackSession, venreyLogin } from "@/lib/venrey";

type R<T> = ({ ok: true } & T) | { ok: false; message: string };
const fail = (e: unknown) => ({ ok: false as const, message: e instanceof Error ? e.message : String(e) });

/** 接続：Mr.Venrey にログインして、女性の一覧を返す */
export async function connectVenrey(loginId: string, password: string, remember: boolean): Promise<R<{ session: string; girls: { id: number; name: string }[] }>> {
  try {
    const shop = await getShop();
    let id = loginId.trim();
    let pw = password;
    const saved = shop.importSource?.venrey;
    if (!pw && saved?.passwordEnc && (!id || id === saved.loginId)) {
      id = saved.loginId;
      pw = decrypt(saved.passwordEnc);
    }
    if (!id || !pw) return { ok: false, message: "Mr.Venrey の店舗IDとパスワードを入力してください" };
    const s = await venreyLogin(id, pw);
    const girls = (await listGirls(s)).sort((a, b) => a.sortNo - b.sortNo);
    if (remember) {
      await db
        .update(schema.shops)
        .set({ importSource: { ...shop.importSource, venrey: { ...saved, loginId: id, passwordEnc: encrypt(pw) } } })
        .where(eq(schema.shops.id, shop.id));
    }
    return { ok: true, session: packSession(s), girls: girls.map((g) => ({ id: g.id, name: g.name })) };
  } catch (e) {
    return fail(e);
  }
}

/** 女性を数人ずつ取り込む（写真も） */
export async function importGirlsStep(session: string, girlIds: number[]): Promise<R<{ results: { id: number; name: string; created: boolean; photos: number; error?: string }[] }>> {
  try {
    const s = unpackSession(session);
    const shopId = await currentShopId();
    const results = [];
    for (const id of girlIds.slice(0, 5)) {
      try {
        const r = await importGirl(s, shopId, id);
        results.push({ id, name: r.name, created: r.created, photos: r.photos });
      } catch (e) {
        results.push({ id, name: "", created: false, photos: 0, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { ok: true, results };
  } catch (e) {
    return fail(e);
  }
}

export async function importRestStep(session: string, what: "schedules" | "templates" | "contents"): Promise<R<{ message: string; detail?: string[] }>> {
  try {
    const s = unpackSession(session);
    const shopId = await currentShopId();
    if (what === "schedules") {
      const now = new Date(Date.now() + 9 * 3600_000);
      const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
      const y = now.getUTCFullYear(), m = now.getUTCMonth();
      // 先月1日〜再来月末
      const r = await importSchedules(s, shopId, ymd(y, m - 1, 1), ymd(y, m + 3, 0));
      return { ok: true, message: `基本出勤 ${r.base}人、出勤・休み ${r.days}件` };
    }
    if (what === "templates") return { ok: true, message: `テンプレート ${await importTemplates(s, shopId)}件` };
    const r = await importContents(s, shopId);
    return { ok: true, message: `コンテンツ枠 ${r.matched}/${r.total}件（停止中で登録）`, detail: r.unmatched };
  } catch (e) {
    return fail(e);
  }
}

export async function finishImport(summary: string) {
  const shop = await getShop();
  const v = shop.importSource?.venrey;
  await db
    .update(schema.shops)
    .set({ importSource: { ...shop.importSource, venrey: { loginId: v?.loginId ?? "", passwordEnc: v?.passwordEnc ?? "", lastImportAt: new Date().toISOString(), lastSummary: summary.slice(0, 2000) } } })
    .where(eq(schema.shops.id, shop.id));
  revalidatePath("/", "layout");
}
