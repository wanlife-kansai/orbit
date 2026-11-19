"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { getSettings, patchSettings, type ShopSettings } from "@/lib/settings";

export async function saveDiary(p: Partial<ShopSettings["diary"]>) {
  const cur = (await getSettings()).diary;
  const next = {
    ...cur,
    ...p,
    sourceUrl: String(p.sourceUrl ?? cur.sourceUrl).trim().slice(0, 300),
    footer: String(p.footer ?? cur.footer).slice(0, 1000),
    fromEmail: String(p.fromEmail ?? cur.fromEmail).trim().slice(0, 200),
  };
  if (next.running && (!next.sourceSite || !next.targets.length)) return { ok: false, message: "取り込み元と転送先を設定してから開始してください" };
  await patchSettings({ diary: next });
  revalidatePath("/diary");
  return { ok: true, message: p.running === true ? "転送を開始しました" : p.running === false ? "転送を止めました" : "保存しました" };
}

export async function deleteDiaryItems(ids: number[]) {
  if (ids.length) await db.delete(schema.diaryItems).where(and(eq(schema.diaryItems.shopId, SHOP_ID), inArray(schema.diaryItems.id, ids)));
  revalidatePath("/diary");
}
