import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { catalogItem } from "@/lib/contentCatalog";
import { ContentEditor } from "./ContentEditor";
import { DxNewsPanel } from "../DxNewsPanel";

export default async function ContentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [c] = await db.select().from(schema.contents).where(and(eq(schema.contents.id, id), eq(schema.contents.shopId, SHOP_ID)));
  if (!c) notFound();
  const templates = await db
    .select({ id: schema.templates.id, title: schema.templates.title, body: schema.templates.body, label: schema.templates.label })
    .from(schema.templates)
    .where(eq(schema.templates.shopId, SHOP_ID))
    .orderBy(asc(schema.templates.sortOrder), asc(schema.templates.id));
  const item = catalogItem(c.site, c.slot);
  return (
    <>
      <PageHeader title={c.name} desc={`種別：${c.kind}　${item?.driver ? "ORBITから自動投稿できます" : "このサイトへの自動投稿は接続準備中です（内容と予定は今のうちに作っておけます）"}`}>
        <a href="/contents" className="btn">← 一覧へ</a>
      </PageHeader>
      <ContentEditor
        id={c.id}
        auto={!!item?.driver}
        active={c.active}
        nextRunAt={c.nextRunAt?.toISOString() ?? null}
        initial={{ mode: c.mode as "direct" | "timer" | "times", intervalMin: c.intervalMin, loop: c.loop, entries: c.entries, times: c.times, weekdays: c.weekdays, hoursFrom: c.hoursFrom, hoursTo: c.hoursTo, memo: c.memo, groupName: c.groupName }}
        templates={templates}
      />
      {item?.driver === "fuzokudx.news" && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">風俗DXに今載っているお店速報</h2>
          <DxNewsPanel templates={templates} />
        </section>
      )}
    </>
  );
}
