import { db, ensureSchema, schema } from "@/db";
import { eq } from "drizzle-orm";

// いまは1店舗のみ。外部販売（ステップ6）でログインした店舗IDに切り替えます。
export const SHOP_ID = 1;

export async function findShop() {
  await ensureSchema();
  const [shop] = await db.select().from(schema.shops).where(eq(schema.shops.id, SHOP_ID));
  return shop ?? null;
}

export async function getShop() {
  const shop = await findShop();
  if (!shop) throw new Error("店舗データがありません。npm run setup を実行してください。");
  return shop;
}
