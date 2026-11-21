import Link from "next/link";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { getShop, currentShopId } from "@/lib/shop";
import { addDays, businessDate, labelMd, mondayOf } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { WeekGrid } from "./WeekGrid";
import { copyPrevWeek } from "./actions";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const shop = await getShop();
  const today = businessDate(shop.dayChangeHour);
  const { w } = await searchParams;
  const monday = mondayOf(w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : today);
  const sunday = addDays(monday, 6);

  const casts = await db
    .select({ id: schema.casts.id, name: schema.casts.name })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, (await currentShopId())))
    .orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const rows = await db
    .select()
    .from(schema.schedules)
    .where(and(eq(schema.schedules.shopId, (await currentShopId())), gte(schema.schedules.date, monday), lte(schema.schedules.date, sunday)));

  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, label: labelMd(date), isToday: date === today };
  });

  return (
    <>
      <PageHeader title="週間スケジュール" desc={`${labelMd(monday)} 〜 ${labelMd(sunday)}　時刻は${shop.dayChangeHour}:00 切り替え（それより前は「翌」）`}>
        <Link className="btn" href={`/schedule?w=${addDays(monday, -7)}`}>← 前の週</Link>
        <Link className="btn" href="/schedule">今週</Link>
        <Link className="btn" href={`/schedule?w=${addDays(monday, 7)}`}>次の週 →</Link>
        <form action={copyPrevWeek.bind(null, monday)}>
          <button className="btn">前週をコピー</button>
        </form>
      </PageHeader>
      <WeekGrid
        key={monday}
        dates={dates}
        casts={casts}
        dayChangeHour={shop.dayChangeHour}
        initial={rows.map((r) => ({ castId: r.castId, date: r.date, start: r.start, end: r.end, off: r.off }))}
      />
    </>
  );
}
