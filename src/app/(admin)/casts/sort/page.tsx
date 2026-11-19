import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getShop, SHOP_ID } from "@/lib/shop";
import { addDays, businessDate, minutesInBusinessDay, nowMinutesInBusinessDay } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { SortList } from "./SortList";

export default async function SortPage() {
  const shop = await getShop();
  const today = businessDate(shop.dayChangeHour);
  const tomorrow = addDays(today, 1);
  const list = await db
    .select({ id: schema.casts.id, name: schema.casts.name, isPublished: schema.casts.isPublished, isNew: schema.casts.isNew, pinned: schema.casts.pinned, kana: schema.casts.nameKana, romaji: schema.casts.romaji, joinedOn: schema.casts.joinedOn, createdAt: schema.casts.createdAt })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, SHOP_ID))
    .orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const photos = await db
    .select({ castId: schema.castPhotos.castId, kind: schema.castPhotos.kind, url: schema.castPhotos.url })
    .from(schema.castPhotos)
    .where(eq(schema.castPhotos.shopId, SHOP_ID))
    .orderBy(asc(schema.castPhotos.sortOrder), asc(schema.castPhotos.id));
  const sch = await db
    .select()
    .from(schema.schedules)
    .where(and(eq(schema.schedules.shopId, SHOP_ID), inArray(schema.schedules.date, [today, tomorrow]), eq(schema.schedules.off, false)));
  const nowMin = nowMinutesInBusinessDay(shop.dayChangeHour);
  const first = (id: number) => (photos.find((p) => p.castId === id && p.kind === "thumb") ?? photos.find((p) => p.castId === id))?.url ?? null;
  const shift = (id: number, date: string) => {
    const r = sch.find((s) => s.castId === id && s.date === date && s.start);
    return r ? { start: r.start, end: r.end } : null;
  };
  return (
    <>
      <PageHeader title="並び替え" desc="ドラッグ（または ← →）で順番を変えて保存します。固定枠の女性は常に先頭に並びます。保存すると公式サイトの並び順にも反映します。" />
      <SortList
        dayChangeHour={shop.dayChangeHour}
        items={list.map((c) => {
          const t = shift(c.id, today);
          const tm = shift(c.id, tomorrow);
          let working = false;
          if (t) {
            const s = minutesInBusinessDay(t.start, shop.dayChangeHour);
            let e = minutesInBusinessDay(t.end, shop.dayChangeHour);
            if (e <= s) e += 1440;
            working = nowMin >= s && nowMin < e;
          }
          return { id: c.id, name: c.name, isPublished: c.isPublished, isNew: c.isNew, pinned: c.pinned, kana: c.kana, romaji: c.romaji, joinedOn: c.joinedOn, createdAt: c.createdAt.toISOString(), photo: first(c.id), today: t, tomorrow: tm, working };
        })}
      />
    </>
  );
}
