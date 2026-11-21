import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId, getShop } from "@/lib/shop";
import { SITES } from "@/lib/sites";
import { targetSitesOf } from "@/lib/targets";
import { PageHeader } from "@/components/PageHeader";
import { AliasEditor } from "./AliasEditor";

export default async function AliasesPage() {
  const shop = await getShop();
  const targets = targetSitesOf(shop);
  const list = await db
    .select({ id: schema.casts.id, name: schema.casts.name, romaji: schema.casts.romaji, siteFields: schema.casts.siteFields })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, (await currentShopId())))
    .orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  return (
    <>
      <PageHeader title="別名管理" desc="サイトによって名前を変えて載せたいときに使います（例：英語版サイトはローマ字）。" />
      <AliasEditor
        sites={SITES.filter((s) => targets.includes(s.code))}
        rows={list.map((c) => ({ id: c.id, name: c.name, romaji: c.romaji, aliases: (c.siteFields._alias as Record<string, string> | undefined) ?? {} }))}
      />
    </>
  );
}
