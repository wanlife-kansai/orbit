import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { getConn, getOfficialPortal } from "@/lib/official";
import { CastList, type Row } from "./CastList";

export default async function CastsPage() {
  const list = await db
    .select()
    .from(schema.casts)
    .where(eq(schema.casts.shopId, (await currentShopId())))
    .orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const counts = await db
    .select({ castId: schema.castPhotos.castId, kind: schema.castPhotos.kind, n: sql<number>`count(*)::int` })
    .from(schema.castPhotos)
    .where(eq(schema.castPhotos.shopId, (await currentShopId())))
    .groupBy(schema.castPhotos.castId, schema.castPhotos.kind);
  const firsts = await db
    .select({ castId: schema.castPhotos.castId, kind: schema.castPhotos.kind, url: schema.castPhotos.url, sortOrder: schema.castPhotos.sortOrder })
    .from(schema.castPhotos)
    .where(eq(schema.castPhotos.shopId, (await currentShopId())))
    .orderBy(asc(schema.castPhotos.sortOrder), asc(schema.castPhotos.id));
  const official = await getOfficialPortal();
  const links = official
    ? await db
        .select({ castId: schema.castPortalMap.castId, remoteId: schema.castPortalMap.remoteId })
        .from(schema.castPortalMap)
        .where(and(eq(schema.castPortalMap.shopId, (await currentShopId())), eq(schema.castPortalMap.portalId, official.id)))
    : [];
  const linked = new Set(links.filter((l) => l.remoteId).map((l) => l.castId));
  const conn = await getConn();

  const rows: Row[] = list.map((c) => {
    const n = (kind: string) => counts.find((x) => x.castId === c.id && x.kind === kind)?.n ?? 0;
    const first = firsts.find((p) => p.castId === c.id && p.kind === "thumb") ?? firsts.find((p) => p.castId === c.id && p.kind === "photo");
    return {
      id: c.id,
      name: c.name,
      kana: c.nameKana || c.kana,
      age: c.age,
      isNew: c.isNew,
      isPublished: c.isPublished,
      memo: c.memo,
      sortOrder: c.sortOrder,
      photo: first?.url ?? null,
      thumbs: n("thumb"),
      photos: n("photo"),
      linked: linked.has(c.id),
    };
  });

  return (
    <>
      <PageHeader title="女性一覧" desc={`${rows.length}人登録中（上限400人）。写真の数字は「サムネイル・画像」の枚数です。`} />
      <CastList rows={rows} officialConnected={!!conn} />
    </>
  );
}
