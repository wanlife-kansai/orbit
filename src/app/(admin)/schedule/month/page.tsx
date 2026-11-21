import Link from "next/link";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { getShop, currentShopId } from "@/lib/shop";
import { businessDate } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { MonthEditor } from "./MonthEditor";

const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

export default async function MonthSchedulePage({ searchParams }: { searchParams: Promise<{ m?: string; c?: string }> }) {
  const shop = await getShop();
  const today = businessDate(shop.dayChangeHour);
  const sp = await searchParams;
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const casts = await db.select({ id: schema.casts.id, name: schema.casts.name, base: schema.casts.baseSchedule }).from(schema.casts).where(eq(schema.casts.shopId, (await currentShopId()))).orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const castId = Number(sp.c) || casts[0]?.id || 0;
  const cast = casts.find((c) => c.id === castId);
  const [y, m] = month.split("-").map(Number);
  const last = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  const rows = cast ? await db.select().from(schema.schedules).where(and(eq(schema.schedules.castId, castId), gte(schema.schedules.date, `${month}-01`), lte(schema.schedules.date, last))) : [];
  return (
    <>
      <PageHeader title="月間スケジュール" desc={`${y}年${m}月`}>
        <Link className="btn" href={`/schedule/month?m=${shiftMonth(month, -1)}&c=${castId}`}>← 前月</Link>
        <Link className="btn" href={`/schedule/month?c=${castId}`}>今月</Link>
        <Link className="btn" href={`/schedule/month?m=${shiftMonth(month, 1)}&c=${castId}`}>翌月 →</Link>
      </PageHeader>
      {!cast ? (
        <div className="card p-6 text-sm text-zinc-400">女性が登録されていません</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          <nav className="card max-h-[75vh] overflow-y-auto p-2">
            {casts.map((c) => (
              <Link key={c.id} href={`/schedule/month?m=${month}&c=${c.id}`} className={`block rounded-md px-2 py-1.5 text-sm ${c.id === castId ? "bg-violet-600/20 text-violet-200" : "hover:bg-zinc-800"}`}>
                {c.name}
                {Object.keys(c.base).length > 0 && <span className="ml-1 text-[10px] text-zinc-500">基本出勤あり</span>}
              </Link>
            ))}
          </nav>
          <MonthEditor
            key={`${castId}-${month}`}
            castId={castId}
            castName={cast.name}
            month={month}
            today={today}
            dayChangeHour={shop.dayChangeHour}
            base={cast.base}
            initial={rows.map((r) => ({ castId: r.castId, date: r.date, start: r.start, end: r.end, off: r.off }))}
            allCastIds={casts.map((c) => c.id)}
          />
        </div>
      )}
    </>
  );
}
