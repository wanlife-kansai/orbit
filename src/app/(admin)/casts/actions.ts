"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { afterForShop, currentShopId } from "@/lib/shop";
import { removeImage } from "@/lib/storage";
import { autoDeliverCast, autoDeliverCastFields, deliverCast, deliverCastFields, deliverCastRemoved, getConn } from "@/lib/official";

const { casts, castPhotos, castPortalMap, schedules, castStatus } = schema;

async function removeOne(id: number) {
  const [c] = await db.select({ name: casts.name }).from(casts).where(and(eq(casts.id, id), eq(casts.shopId, (await currentShopId()))));
  if (!c) return;
  await deliverCastRemoved(id, c.name); // 消す前に公式サイトで非公開にする
  const photos = await db.select().from(castPhotos).where(eq(castPhotos.castId, id));
  for (const p of photos) await removeImage(p.url);
  await db.delete(castPhotos).where(eq(castPhotos.castId, id));
  await db.delete(schedules).where(eq(schedules.castId, id));
  await db.delete(castStatus).where(eq(castStatus.castId, id));
  await db.delete(castPortalMap).where(eq(castPortalMap.castId, id));
  await db.delete(casts).where(eq(casts.id, id));
}

/** 選択削除 */
export async function deleteCasts(ids: number[]) {
  for (const id of ids) await removeOne(id);
  revalidatePath("/casts");
  revalidatePath("/");
}

export async function togglePublished(id: number, value: boolean) {
  await db.update(casts).set({ isPublished: value }).where(and(eq(casts.id, id), eq(casts.shopId, (await currentShopId()))));
  await afterForShop(() => autoDeliverCastFields([id], value ? "公開に変更" : "非公開に変更"));
  revalidatePath("/casts");
}

export async function toggleNew(id: number, value: boolean) {
  await db.update(casts).set({ isNew: value }).where(and(eq(casts.id, id), eq(casts.shopId, (await currentShopId()))));
  await afterForShop(() => autoDeliverCast(id));
  revalidatePath("/casts");
}

/** 並び順をまとめて保存（ids の順番＝表示順） */
export async function reorderCasts(ids: number[]) {
  const mine = await db.select({ id: casts.id }).from(casts).where(and(eq(casts.shopId, (await currentShopId())), inArray(casts.id, ids)));
  const ok = new Set(mine.map((m) => m.id));
  const order = ids.filter((i) => ok.has(i));
  for (let k = 0; k < order.length; k++) await db.update(casts).set({ sortOrder: k + 1 }).where(eq(casts.id, order[k]));
  await afterForShop(() => deliverCastFields(order, "並び順を変更"));
  revalidatePath("/casts");
}

/** 別名（サイトごとの名前）を保存：site_fields._alias に { [サイトcode]: 別名 } */
export async function saveAliases(site: string, rows: { castId: number; alias: string }[]) {
  for (const r of rows) {
    const [c] = await db.select({ siteFields: casts.siteFields }).from(casts).where(and(eq(casts.id, r.castId), eq(casts.shopId, (await currentShopId()))));
    if (!c) continue;
    const aliases = { ...((c.siteFields._alias as Record<string, string> | undefined) ?? {}) };
    const alias = r.alias.trim().slice(0, 50);
    if (alias) aliases[site] = alias;
    else delete aliases[site];
    await db.update(casts).set({ siteFields: { ...c.siteFields, _alias: aliases } }).where(eq(casts.id, r.castId));
  }
  revalidatePath("/casts/aliases");
}

/** 「サイトへ更新」：選んだ女性（なければ全員）を公式サイトへ送り直す */
export async function pushCastsToSites(ids: number[]) {
  const conn = await getConn();
  if (!conn) return { ok: false, message: "公式サイトが未接続です（連携ポータルで設定してください）" };
  const list = ids.length ? ids : (await db.select({ id: casts.id }).from(casts).where(eq(casts.shopId, (await currentShopId())))).map((c) => c.id);
  for (const id of list) await deliverCast(id);
  revalidatePath("/logs");
  return { ok: true, message: `${list.length}人を公式サイトへ送りました。結果は配信ログで確認できます。ポータルへの配信はロボット接続後に対応します。` };
}

/** 並び替え：固定枠（先頭に固定する女性） */
export async function savePinned(ids: number[]) {
  await db.update(casts).set({ pinned: false }).where(eq(casts.shopId, (await currentShopId())));
  if (ids.length) await db.update(casts).set({ pinned: true }).where(and(eq(casts.shopId, (await currentShopId())), inArray(casts.id, ids)));
}
