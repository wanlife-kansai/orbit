"use server";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { postContent } from "@/lib/connectors";

const B = schema.bulkPosts;

export async function sendBulk(input: { title: string; body: string; contentIds: number[] }) {
  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, message: "タイトルを入力してください" };
  if (!input.contentIds.length) return { ok: false, message: "更新するコンテンツを選んでください" };
  const targets = await db
    .select()
    .from(schema.contents)
    .where(and(eq(schema.contents.shopId, (await currentShopId())), inArray(schema.contents.id, input.contentIds)))
    .orderBy(asc(schema.contents.name));
  const results: { contentId: number; name: string; ok: boolean; message: string }[] = [];
  for (const c of targets) {
    const r = await postContent(c.site, c.slot, { title, body: input.body.slice(0, 5000) });
    results.push({ contentId: c.id, name: c.name, ok: r.ok, message: r.message });
    await db.update(schema.contents).set({ lastRunAt: new Date(), lastResult: r.ok ? `成功：${title}` : `失敗：${r.message}` }).where(eq(schema.contents.id, c.id));
  }
  await db.insert(B).values({ shopId: (await currentShopId()), title, body: input.body, targets: input.contentIds, results });
  // 100件を超えたら古いものから削除
  const old = await db.select({ id: B.id }).from(B).where(eq(B.shopId, (await currentShopId()))).orderBy(desc(B.id)).offset(100).limit(1);
  if (old[0]) await db.delete(B).where(and(eq(B.shopId, (await currentShopId())), lt(B.id, old[0].id + 1)));
  revalidatePath("/bulk");
  revalidatePath("/logs");
  const ok = results.filter((r) => r.ok).length;
  return { ok: ok > 0, message: `${results.length}件中 ${ok}件を更新しました${ok < results.length ? "（失敗・未対応の内容は履歴で確認できます）" : ""}` };
}

export async function deleteBulk(ids: number[]) {
  if (ids.length) await db.delete(B).where(and(eq(B.shopId, (await currentShopId())), inArray(B.id, ids)));
  revalidatePath("/bulk");
}
