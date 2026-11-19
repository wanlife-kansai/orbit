import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { getSettings } from "@/lib/settings";
import { CATALOG } from "@/lib/contentCatalog";
import { ALL_SITES } from "@/lib/sites";
import { DiaryPanel } from "./DiaryPanel";

export default async function DiaryPage() {
  const s = await getSettings();
  const items = await db.select().from(schema.diaryItems).where(eq(schema.diaryItems.shopId, SHOP_ID)).orderBy(desc(schema.diaryItems.id)).limit(300);
  const casts = await db.select({ id: schema.casts.id, name: schema.casts.name }).from(schema.casts).where(eq(schema.casts.shopId, SHOP_ID)).orderBy(asc(schema.casts.sortOrder));
  const diarySlots = CATALOG.filter((c) => c.kind === "写メ");
  const sources = ALL_SITES.filter((x) => diarySlots.some((d) => d.site === x.code));
  return (
    <>
      <PageHeader title="写メ日記転送" desc="取り込み元サイトの写メ日記を10分間隔で取り込み、転送先サイトへ順次転送します（更新開始後に投稿された、公開中の日記だけが対象）。" />
      <DiaryPanel
        initial={s.diary}
        sources={sources.map((x) => ({ code: x.code, name: x.name }))}
        targets={diarySlots.map((d) => ({ key: `${d.site}:${d.slot}`, name: `${ALL_SITES.find((x) => x.code === d.site)?.name ?? d.site}${d.label}` }))}
        casts={casts}
        items={items.map((i) => ({ id: i.id, castName: i.castName, title: i.title, status: i.status, message: i.message, importedAt: i.importedAt.toISOString(), sourceUrl: i.sourceUrl }))}
      />
    </>
  );
}
