"use server";
import { patchSettings, type ShopSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { deliverWait } from "@/lib/official";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { afterForShop, currentShopId } from "@/lib/shop";

type Patch = { status?: "none" | "waiting" | "serving"; until?: string; comment?: string; excluded?: boolean };

export async function setStatus(castId: number, date: string, patch: Patch) {
  const base = { status: "none", until: "", comment: "", excluded: false, ...patch };
  const set: Record<string, unknown> = { updatedAt: sql`now()` };
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.until !== undefined) set.until = patch.until;
  if (patch.comment !== undefined) set.comment = patch.comment;
  if (patch.excluded !== undefined) set.excluded = patch.excluded;
  await db
    .insert(schema.castStatus)
    .values({ shopId: (await currentShopId()), castId, date, ...base })
    .onConflictDoUpdate({ target: [schema.castStatus.castId, schema.castStatus.date], set });
  // 状態・終了時刻・除外が変わったときだけ公式サイトへ（コメントだけの変更は送らない）
  if (patch.status !== undefined || patch.until !== undefined || patch.excluded !== undefined) await afterForShop(() => deliverWait(castId, date));
  revalidatePath("/sokuhime");
  revalidatePath("/");
}

export async function saveSokuhimeSettings(p: Pick<ShopSettings, "sokuhimeOrder" | "sokuhimeBatch" | "sokuhimePriority" | "sokuhimeIntervalMin" | "sokuhimeActive">) {
  await patchSettings({
    sokuhimeOrder: p.sokuhimeOrder === "random" ? "random" : "priority",
    sokuhimeBatch: Math.min(5, Math.max(0, Math.round(p.sokuhimeBatch))),
    sokuhimePriority: ["early", "late", "list"].includes(p.sokuhimePriority) ? p.sokuhimePriority : "early",
    sokuhimeIntervalMin: Math.min(240, Math.max(10, Math.round(p.sokuhimeIntervalMin) || 30)),
    sokuhimeActive: !!p.sokuhimeActive,
  });
  revalidatePath("/sokuhime");
  return { ok: true, message: p.sokuhimeActive ? "自動更新の設定を保存しました" : "自動更新を止めました" };
}
