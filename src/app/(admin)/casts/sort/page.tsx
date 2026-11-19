import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { SortList } from "./SortList";

export default async function SortPage() {
  const list = await db
    .select({ id: schema.casts.id, name: schema.casts.name, isPublished: schema.casts.isPublished })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, SHOP_ID))
    .orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const photos = await db
    .select({ castId: schema.castPhotos.castId, kind: schema.castPhotos.kind, url: schema.castPhotos.url })
    .from(schema.castPhotos)
    .where(eq(schema.castPhotos.shopId, SHOP_ID))
    .orderBy(asc(schema.castPhotos.sortOrder), asc(schema.castPhotos.id));
  const first = (id: number) => (photos.find((p) => p.castId === id && p.kind === "thumb") ?? photos.find((p) => p.castId === id))?.url ?? null;
  return (
    <>
      <PageHeader title="並び替え" desc="ドラッグ（または ← →）で順番を変えて保存します。自店HP・公式サイトの表示順になります。" />
      <SortList items={list.map((c) => ({ ...c, photo: first(c.id) }))} />
    </>
  );
}
