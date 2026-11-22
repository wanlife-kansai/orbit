import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { CATALOG } from "@/lib/contentCatalog";
import { BulkForm } from "./BulkForm";

export default async function BulkPage() {
  const contents = await db.select().from(schema.contents).where(eq(schema.contents.shopId, (await currentShopId()))).orderBy(asc(schema.contents.name));
  const templates = await db.select({ id: schema.templates.id, title: schema.templates.title, body: schema.templates.body }).from(schema.templates).where(eq(schema.templates.shopId, (await currentShopId()))).orderBy(asc(schema.templates.sortOrder), asc(schema.templates.id));
  const history = await db.select().from(schema.bulkPosts).where(eq(schema.bulkPosts.shopId, (await currentShopId()))).orderBy(desc(schema.bulkPosts.id));
  return (
    <>
      <PageHeader title="まとめて投稿" desc="1日限りの限定イベントなどを、選んだサイトへまとめて1回で更新します。履歴は100件を超えると古いものから消えます。" />
      <BulkForm
        contents={contents.map((c) => ({ id: c.id, name: c.name, kind: c.kind, auto: !!CATALOG.find((x) => x.site === c.site && x.slot === c.slot)?.driver }))}
        templates={templates}
        history={history.map((h) => ({ id: h.id, title: h.title, createdAt: h.createdAt.toISOString(), results: h.results }))}
      />
    </>
  );
}
