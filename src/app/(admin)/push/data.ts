import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { siteName } from "@/lib/sites";

/** サイトへ更新の画面で使う：女性と、連携済みのサイト */
export async function pushData(category: string) {
  const casts = await db.select().from(schema.casts).where(eq(schema.casts.shopId, SHOP_ID)).orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const photos = await db.select({ castId: schema.castPhotos.castId }).from(schema.castPhotos).where(eq(schema.castPhotos.shopId, SHOP_ID));
  const portals = await db.select().from(schema.portals);
  const accounts = await db.select().from(schema.shopPortalAccounts).where(eq(schema.shopPortalAccounts.shopId, SHOP_ID));
  const logs = await db.select().from(schema.syncLogs).where(eq(schema.syncLogs.shopId, SHOP_ID)).orderBy(desc(schema.syncLogs.id)).limit(500);
  const maps = await db.select().from(schema.castPortalMap).where(eq(schema.castPortalMap.shopId, SHOP_ID));
  const sites = portals
    .filter((p) => accounts.some((a) => a.portalId === p.id && a.loginId))
    .sort((a, b) => (a.kind === "official" ? -1 : b.kind === "official" ? 1 : 0))
    .map((p) => {
      const last = logs.find((l) => l.portalId === p.id && l.category === category && l.ok);
      return { code: p.code, name: p.kind === "official" ? "オフィシャル（公式サイト）" : siteName(p.code), ready: p.kind === "official", lastAt: last?.createdAt.toISOString() ?? null, count: maps.filter((m) => m.portalId === p.id).length };
    });
  const missing = (c: (typeof casts)[number]) => [c.age, c.height, c.bust, c.waist, c.hip, c.cup || null, photos.some((p) => p.castId === c.id) ? 1 : null].filter((x) => x === null || x === undefined).length;
  return { casts: casts.map((c) => ({ id: c.id, name: c.name, isPublished: c.isPublished, missing: missing(c) })), sites };
}
