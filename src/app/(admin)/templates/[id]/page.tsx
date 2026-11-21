import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { deleteTemplate, updateTemplate } from "../actions";
import { LABELS } from "../labels";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [t] = await db
    .select()
    .from(schema.templates)
    .where(and(eq(schema.templates.id, id), eq(schema.templates.shopId, (await currentShopId()))));
  if (!t) notFound();
  return (
    <>
      <PageHeader title="テンプレートを編集">
        <form action={deleteTemplate.bind(null, id)}>
          <button className="btn-danger">削除</button>
        </form>
      </PageHeader>
      <form action={updateTemplate.bind(null, id)} className="card grid gap-3 p-5 md:grid-cols-[1fr_160px]">
        <input name="title" required defaultValue={t.title} className="input" />
        <select name="label" defaultValue={t.label} className="input">
          {LABELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <textarea name="body" rows={8} defaultValue={t.body} className="input md:col-span-2" />
        <input name="groupName" defaultValue={t.groupName} placeholder="グループ（任意）" className="input md:col-span-2" />
        <input name="memo" defaultValue={t.memo} placeholder="メモ（管理用）" className="input md:col-span-2" />
        <div>
          <button className="btn-primary">保存する</button>
        </div>
      </form>
    </>
  );
}
