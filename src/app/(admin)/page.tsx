import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { and, count, eq, gte } from "drizzle-orm";
import { getShop, currentShopId } from "@/lib/shop";
import { getTodayRoster } from "@/lib/queries";
import { fmtTime, labelMd } from "@/lib/dates";

async function saveMemo(formData: FormData) {
  "use server";
  await db
    .update(schema.shops)
    .set({ memo: String(formData.get("memo") ?? "") })
    .where(eq(schema.shops.id, (await currentShopId())));
  revalidatePath("/");
}

const STATUS_LABEL = { none: "", waiting: "待機中", serving: "接客中" } as const;

export default async function Dashboard() {
  const shop = await getShop();
  const { date, roster } = await getTodayRoster(shop.dayChangeHour);
  const [{ n: castCount }] = await db
    .select({ n: count() })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, (await currentShopId())));
  const [{ n: portalCount }] = await db
    .select({ n: count() })
    .from(schema.shopPortalAccounts)
    .where(eq(schema.shopPortalAccounts.shopId, (await currentShopId())));
  const [{ n: errorCount }] = await db
    .select({ n: count() })
    .from(schema.syncLogs)
    .where(and(eq(schema.syncLogs.shopId, (await currentShopId())), eq(schema.syncLogs.ok, false), gte(schema.syncLogs.createdAt, new Date(Date.now() - 86400_000))));
  const [{ n: activeCount }] = await db
    .select({ n: count() })
    .from(schema.contents)
    .where(and(eq(schema.contents.shopId, (await currentShopId())), eq(schema.contents.active, true)));

  const working = roster.filter((r) => r.state === "working").length;
  const waiting = roster.filter((r) => r.status === "waiting").length;

  const cards = [
    { label: "出勤中", value: `${working}人`, sub: `本日の出勤 ${roster.length}人`, href: "/sokuhime", action: "今すぐ案内へ" },
    { label: "女性", value: `${castCount}人`, sub: "登録中", href: "/casts", action: "在籍一覧へ" },
    { label: "連携先", value: `${portalCount}件`, sub: "公式サイト・ポータル", href: "/accounts", action: "ログイン情報へ" },
    { label: "予約が動作中", value: `${activeCount}件`, sub: "サイト更新の予約", href: "/contents", action: "予約一覧へ" },
    { label: "配信エラー", value: `${errorCount}件`, sub: "直近24時間", href: "/logs?e=1", action: "配信の記録へ" },
  ];

  const wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(`${date}T00:00:00Z`).getUTCDay()];
  const [, mm, dd] = date.split("-").map(Number);

  return (
    <>
      {/* ORBIT のホームは「今日」を大きく見せる：営業日と、いま動いている人数 */}
      <section className="mb-8 grid gap-6 border-b border-zinc-700/70 pb-7 lg:grid-cols-[auto_1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold text-zinc-400">今日の営業日（{shop.dayChangeHour}:00で切り替え）</p>
          <h1 className="mt-1 flex items-baseline gap-2 font-bold leading-none text-zinc-100 tnum">
            <span className="text-[56px]">{mm}</span>
            <span className="text-2xl text-zinc-400">月</span>
            <span className="text-[56px]">{dd}</span>
            <span className="text-2xl text-zinc-400">日（{wd}）</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-x-10 gap-y-3 lg:justify-end">
          <Link href="/sokuhime" className="group">
            <span className="block text-sm font-bold text-zinc-400">いま出勤中</span>
            <span className="block text-[40px] font-bold leading-tight tnum" style={{ color: "var(--orbit-gold)" }}>
              {working}<span className="ml-1 text-lg text-zinc-400">人</span>
            </span>
            <span className="text-xs text-zinc-500 group-hover:text-violet-300">今日の出勤 {roster.length}人・待機中 {waiting}人</span>
          </Link>
        </div>
      </section>

      <div className="mb-8 divide-y divide-zinc-800 rounded-[10px] border border-zinc-700/70 bg-zinc-900 sm:grid sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {cards.slice(1).map((c) => (
          <Link key={c.label} href={c.href} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-800/60 sm:border-r sm:border-zinc-800 last:border-r-0">
            <span>
              <span className="block text-[13px] font-bold text-zinc-300">{c.label}</span>
              <span className="block text-xs text-zinc-500">{c.sub}</span>
            </span>
            <span className={`text-2xl font-bold tnum ${c.label === "配信エラー" && errorCount > 0 ? "text-rose-300" : "text-zinc-100"}`}>{c.value}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
            <h2 className="font-bold">今日の出勤</h2>
            <Link href="/schedule/day" className="text-xs font-bold text-violet-300 hover:underline">出勤を編集</Link>
          </div>
          <table className="w-full">
            <tbody>
              {roster.length === 0 && (
                <tr>
                  <td className="px-5 py-6 text-sm text-zinc-500">今日の出勤はまだ入っていません。<Link href="/schedule" className="font-bold text-violet-300 underline">週の出勤表</Link>から入れられます。</td>
                </tr>
              )}
              {roster.map((r) => (
                <tr key={r.castId} className={r.state === "done" ? "opacity-40" : ""}>
                  <td className="td pl-5 font-bold">{r.name}</td>
                  <td className="td text-zinc-400 tnum">
                    {fmtTime(r.start, shop.dayChangeHour)}〜{fmtTime(r.end, shop.dayChangeHour)}
                  </td>
                  <td className="td pr-5 text-right">
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

        <section className="card p-5">
          <h2 className="font-bold">店内メモ</h2>
          <p className="mt-1 text-xs text-zinc-500">スタッフ同士の申し送りに。ログインした全員が見られます。</p>
          <form action={saveMemo} className="mt-3 space-y-2">
            <textarea name="memo" defaultValue={shop.memo} rows={8} className="input w-full" placeholder="例：本日22時以降は送迎1台のみ" />
            <button className="btn-primary">メモを保存</button>
          </form>
        </section>
      </div>
    </>
  );
}
