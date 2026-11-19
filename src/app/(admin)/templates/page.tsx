import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { createTemplate } from "./actions";
import { LABELS } from "./labels";

export default async function TemplatesPage() {
  const list = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.shopId, SHOP_ID))
    .orderBy(desc(schema.templates.id));

  return (
    <>
      <PageHeader title="テンプレート" desc="各ポータルに共通で使える文章です。お店速報やイベント告知で選んで使います。" />
      <form action={createTemplate} className="card mb-6 grid gap-3 p-5 md:grid-cols-[1fr_160px]">
        <input name="title" required placeholder="タイトル（例：本日も元気に営業中！）" className="input" />
        <select name="label" className="input">
          {LABELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <textarea name="body" rows={4} placeholder="本文" className="input md:col-span-2" />
        <div className="md:col-span-2">
          <button className="btn-primary">＋ 追加する</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th w-12">No.</th>
              <th className="th">タイトル</th>
              <th className="th w-24">ラベル</th>
              <th className="th w-20"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((t, i) => (
              <tr key={t.id}>
                <td className="td text-zinc-500">{list.length - i}</td>
                <td className="td">
                  <div className="font-medium">{t.title}</div>
                  <div className="line-clamp-1 text-xs text-zinc-500">{t.body}</div>
                </td>
                <td className="td">
                  <span className="badge text-violet-300 ring-violet-800">{t.label}</span>
                </td>
                <td className="td text-right">
                  <Link href={`/templates/${t.id}`} className="btn">編集</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
