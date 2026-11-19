import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { and, count, eq, gte } from "drizzle-orm";
import { PageHeader } from "@/components/PageHeader";
import { getShop, SHOP_ID } from "@/lib/shop";
import { getTodayRoster } from "@/lib/queries";
import { fmtTime, labelMd } from "@/lib/dates";

async function saveMemo(formData: FormData) {
  "use server";
  await db
    .update(schema.shops)
    .set({ memo: String(formData.get("memo") ?? "") })
    .where(eq(schema.shops.id, SHOP_ID));
  revalidatePath("/");
}

const STATUS_LABEL = { none: "", waiting: "待機中", serving: "接客中" } as const;

export default async function Dashboard() {
  const shop = await getShop();
  const { date, roster } = await getTodayRoster(shop.dayChangeHour);
  const [{ n: castCount }] = await db
    .select({ n: count() })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, SHOP_ID));
  const [{ n: portalCount }] = await db
    .select({ n: count() })
    .from(schema.shopPortalAccounts)
    .where(eq(schema.shopPortalAccounts.shopId, SHOP_ID));
  const [{ n: errorCount }] = await db
    .select({ n: count() })
    .from(schema.syncLogs)
    .where(and(eq(schema.syncLogs.shopId, SHOP_ID), eq(schema.syncLogs.ok, false), gte(schema.syncLogs.createdAt, new Date(Date.now() - 86400_000))));
  const [{ n: activeCount }] = await db
    .select({ n: count() })
    .from(schema.contents)
    .where(and(eq(schema.contents.shopId, SHOP_ID), eq(schema.contents.active, true)));

  const working = roster.filter((r) => r.state === "working").length;
  const waiting = roster.filter((r) => r.status === "waiting").length;

  const cards = [
    { label: "出勤中", value: `${working}人`, sub: `本日の出勤 ${roster.length}人`, href: "/sokuhime", action: "即姫ボードへ" },
    { label: "女性", value: `${castCount}人`, sub: "登録中", href: "/casts", action: "女性一覧へ" },
    { label: "連携先", value: `${portalCount}件`, sub: "公式サイト・ポータル", href: "/accounts", action: "ID・PASS登録へ" },
    { label: "タイマー稼働", value: `${activeCount}件`, sub: "コンテンツ更新", href: "/contents", action: "コンテンツ更新へ" },
    { label: "更新エラー", value: `${errorCount}件`, sub: "直近24時間", href: "/logs?e=1", action: "更新結果へ" },
  ];

  return (
    <>
      <PageHeader title="お知らせ" desc={`営業日 ${labelMd(date)}（${shop.dayChangeHour}:00 切り替え）`} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-4 hover:ring-violet-700">
            <div className="text-xs text-zinc-400">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold">{c.value}</div>
            <div className="mt-1 text-xs text-zinc-500">{c.sub}</div>
            <div className="mt-3 text-xs text-violet-300">{c.action} →</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="font-semibold">本日の出勤</h2>
            <span className="text-xs text-zinc-400">待機中 {waiting}人</span>
          </div>
          <table className="mt-2 w-full">
            <tbody>
              {roster.length === 0 && (
                <tr>
                  <td className="td text-zinc-500">本日の出勤はまだ登録されていません</td>
                </tr>
              )}
              {roster.map((r) => (
                <tr key={r.castId} className={r.state === "done" ? "opacity-40" : ""}>
                  <td className="td">{r.name}</td>
                  <td className="td text-zinc-400 tabular-nums">
                    {fmtTime(r.start, shop.dayChangeHour)}〜{fmtTime(r.end, shop.dayChangeHour)}
                  </td>
                  <td className="td text-right">
                    {r.state === "before" && <span className="text-xs text-zinc-500">出勤前</span>}
                    {r.state === "done" && <span className="text-xs text-zinc-500">退勤</span>}
                    {r.state === "working" && r.status !== "none" && (
                      <span className={`badge ${r.status === "waiting" ? "text-emerald-300 ring-emerald-700" : "text-amber-300 ring-amber-700"}`}>
                        {STATUS_LABEL[r.status]}
                        {r.status === "serving" && r.until ? `（〜${r.until}）` : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold">フリーメモ</h2>
          <form action={saveMemo} className="mt-3 space-y-2">
            <textarea name="memo" defaultValue={shop.memo} rows={8} className="input w-full" placeholder="業務連絡など、ご自由にお使いください" />
            <button className="btn-primary">メモを保存</button>
          </form>
        </section>
      </div>
    </>
  );
}
