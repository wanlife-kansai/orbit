import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID, getShop } from "@/lib/shop";
import { targetSitesOf } from "@/lib/targets";
import { businessDate } from "@/lib/dates";
import { CastEditor } from "../editor/CastEditor";
import { toInput } from "../types";

export default async function EditCastPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const shop = await getShop();
  const [cast] = await db
    .select()
    .from(schema.casts)
    .where(and(eq(schema.casts.id, id), eq(schema.casts.shopId, SHOP_ID)));
  if (!cast) notFound();
  const photos = await db
    .select({ id: schema.castPhotos.id, kind: schema.castPhotos.kind, url: schema.castPhotos.url, sortOrder: schema.castPhotos.sortOrder })
    .from(schema.castPhotos)
    .where(eq(schema.castPhotos.castId, id))
    .orderBy(asc(schema.castPhotos.sortOrder), asc(schema.castPhotos.id));
  return <CastEditor key={id} castId={id} initial={toInput(cast)} initialPhotos={photos} targetSites={targetSitesOf(shop)} today={businessDate(shop.dayChangeHour)} />;
}
