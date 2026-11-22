import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { isOffFor } from "@/lib/official";
import { ALL_SITES } from "@/lib/sites";

type Cell = "登録済" | "未登録" | "除外" | "未取得";
const COLOR: Record<Cell, string> = { 登録済: "bg-emerald-600", 未登録: "bg-zinc-700", 除外: "bg-zinc-900 ring-1 ring-zinc-700", 未取得: "bg-sky-900" };

export default async function CastStatusPage({ searchParams }: { searchParams: Promise<{ diff?: string }> }) {
  const { diff } = await searchParams;
  const casts = await db.select().from(schema.casts).where(eq(schema.casts.shopId, (await currentShopId()))).orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const portals = await db.select().from(schema.portals);
  const accounts = await db.select().from(schema.shopPortalAccounts).where(eq(schema.shopPortalAccounts.shopId, (await currentShopId())));
  const maps = await db.select().from(schema.castPortalMap).where(eq(schema.castPortalMap.shopId, (await currentShopId())));
  const cols = portals
    .filter((p) => accounts.some((a) => a.portalId === p.id && a.loginId))
    .sort((a, b) => (a.kind === "official" ? -1 : b.kind === "official" ? 1 : a.name.localeCompare(b.name, "ja")))
    .map((p) => ({ id: p.id, code: p.code, name: p.kind === "official" ? "オフィシャル" : ALL_SITES.find((s) => s.code === p.code)?.name ?? p.name, official: p.kind === "official" }));

  const cell = (c: (typeof casts)[number], col: (typeof cols)[number]): Cell => {
    if (isOffFor(c, col.code)) return "除外";
    if (col.official) return maps.some((m) => m.castId === c.id && m.portalId === col.id) ? "登録済" : "未登録";
    return maps.some((m) => m.castId === c.id && m.portalId === col.id) ? "登録済" : "未取得";
  };
  const rows = casts
    .map((c) => ({ c, cells: cols.map((col) => cell(c, col)) }))
    .filter((r) => !diff || r.cells.some((x) => x === "未登録"));

  return (
    <>
      <PageHeader title="サイト別の掲載状況" desc="ORBITの女性が、各サイトに登録されているかを一覧で確認します。">
        <Link href={diff ? "/casts/status" : "/casts/status?diff=1"} className="btn">{diff ? "すべて表示" : "差異がある女性のみ表示"}</Link>
        <Link href="/casts/aliases" className="btn">別名管理</Link>
        <Link href="/push/casts" className="btn-primary">変更を反映（サイトへ更新）</Link>
      </PageHeader>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-zinc-400">
        {(Object.keys(COLOR) as Cell[]).map((k) => (
          <span key={k} className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${COLOR[k]}`} />{k}</span>
        ))}
        <span>※ポータル側の登録状況の読み込みは、各サイトの接続ができ次第「未取得」から切り替わります</span>
      </div>
      {cols.length === 0 ? (
        <div className="card p-6 text-sm text-zinc-400">連携しているサイトがありません。<Link href="/accounts" className="text-violet-300 underline">サイトのログイン情報</Link>・<Link href="/portals" className="text-violet-300 underline">公式サイト接続</Link>を設定してください。</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="th sticky left-0 z-10 min-w-36 bg-zinc-900">名前</th>
                {cols.map((col, i) => (
                  <th key={col.id} className="th min-w-20 text-center align-bottom">
                    <div className="text-[11px] leading-tight">{col.name}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">{rows.filter((r) => r.cells[i] === "登録済").length}人</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, cells }) => (
                <tr key={c.id}>
                  <td className="td sticky left-0 bg-zinc-900">
                    <Link href={`/casts/${c.id}`} className="hover:text-violet-300">{c.name}</Link>
                    <div className="text-[10px] text-zinc-500">{c.isPublished ? "公開中" : "非公開"}</div>
                  </td>
                  {cells.map((x, i) => (
                    <td key={i} className="td text-center"><span title={x} className={`inline-block h-4 w-4 rounded-sm ${COLOR[x]}`} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
