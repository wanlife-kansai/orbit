"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { patchSettings, type ShopSettings } from "@/lib/settings";

export type ShopBasics = { name: string; officialUrl: string; email: string; dayChangeHour: number };

export async function saveSettings(basics: ShopBasics | null, patch: Partial<ShopSettings>) {
  if (basics) {
    const h = Number(basics.dayChangeHour);
    await db
      .update(schema.shops)
      .set({
        name: basics.name.trim().slice(0, 100) || "店舗",
        officialUrl: basics.officialUrl.trim().slice(0, 200),
        email: basics.email.trim().slice(0, 100),
        dayChangeHour: Number.isInteger(h) && h >= 0 && h <= 12 ? h : 3,
      })
      .where(eq(schema.shops.id, (await currentShopId())));
  }
  await patchSettings(patch);
  revalidatePath("/", "layout");
  return { ok: true, message: "設定を保存しました" };
}
