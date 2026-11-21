import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { createTemplate } from "./actions";
import { LABELS, TEMPLATE_MAX } from "./labels";
import { TemplateList } from "./TemplateList";

export default async function TemplatesPage() {
  const list = await db.select().from(schema.templates).where(eq(schema.templates.shopId, (await currentShopId()))).orderBy(asc(schema.templates.sortOrder), asc(schema.templates.id));
  const contents = await db.select({ entries: schema.contents.entries, times: schema.contents.times }).from(schema.contents).where(eq(schema.contents.shopId, (await currentShopId())));
  const used = (id: number) => contents.filter((c) => c.entries.some((e) => e.templateId === id) || c.times.some((t) => t.entry.templateId === id)).length;
  return (
    <>
      <PageHeader title="テンプレート" desc="各サイトに共通で使える文章です。コンテンツ更新・簡単一括更新で選んで使います。" />
      <form action={createTemplate} className="card mb-6 grid gap-3 p-5 md:grid-cols-[1fr_140px_160px]">
        <input name="title" required placeholder="タイトル（例：本日も元気に営業中！）" className="input" />
        <select name="label" className="input">
          {LABELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <input name="groupName" placeholder="グループ（任意）" className="input" />
        <textarea name="body" rows={4} placeholder="本文" className="input md:col-span-3" />
        <div className="flex items-center gap-3 md:col-span-3">
          <button className="btn-primary" disabled={list.length >= TEMPLATE_MAX}>＋ 新規登録</button>
          <span className="text-xs text-zinc-500">登録件数 {list.length} / 上限 {TEMPLATE_MAX}件</span>
        </div>
      </form>
      <TemplateList items={list.map((t) => ({ id: t.id, title: t.title, body: t.body, label: t.label, group: t.groupName, memo: t.memo, used: used(t.id) }))} />
    </>
  );
}
