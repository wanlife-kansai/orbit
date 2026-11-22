import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { CATALOG, KINDS } from "@/lib/contentCatalog";
import { ALL_SITES } from "@/lib/sites";
import { ContentList } from "./ContentList";
import { AddContents } from "./AddContents";

export default async function ContentsPage() {
  const rows = await db.select().from(schema.contents).where(eq(schema.contents.shopId, (await currentShopId()))).orderBy(asc(schema.contents.groupName), asc(schema.contents.name));
  const portals = await db.select().from(schema.portals);
  const accounts = await db.select().from(schema.shopPortalAccounts).where(eq(schema.shopPortalAccounts.shopId, (await currentShopId())));
  const registered = new Set(portals.filter((p) => accounts.some((a) => a.portalId === p.id && a.loginId)).map((p) => p.code));
  const have = new Set(rows.map((r) => `${r.site}:${r.slot}`));

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    group: r.groupName,
    mode: r.mode,
    active: r.active,
    nextRunAt: r.nextRunAt?.toISOString() ?? null,
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    lastResult: r.lastResult,
    memo: r.memo,
    auto: !!CATALOG.find((c) => c.site === r.site && c.slot === r.slot)?.driver,
    registered: registered.has(r.site),
  }));
  const catalog = ALL_SITES.filter((s) => CATALOG.some((c) => c.site === s.code)).map((s) => ({
    code: s.code,
    name: s.name,
    registered: registered.has(s.code),
    slots: CATALOG.filter((c) => c.site === s.code).map((c) => ({ key: `${c.site}:${c.slot}`, label: c.label, kind: c.kind, auto: !!c.driver, added: have.has(`${c.site}:${c.slot}`) })),
  }));

  return (
    <>
      <PageHeader title="サイト更新の予約" desc="サイトごとの「速報」「上位化」「割引」などの枠を、タイマー・時刻指定・直接入力で更新します。">
        <a href="/logs?c=content" className="btn">配信の記録を見る</a>
        <a href="/settings?tab=basic" className="btn">更新してよい時間帯</a>
      </PageHeader>
      <AddContents catalog={catalog} />
      <ContentList items={items} kinds={[...KINDS]} />
    </>
  );
}
