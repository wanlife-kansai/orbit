import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getShop, currentShopId } from "@/lib/shop";
import { addDays, businessDate, labelMd } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { WeekGrid } from "../WeekGrid";

export default async function DaySchedulePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const shop = await getShop();
  const today = businessDate(shop.dayChangeHour);
  const { d } = await searchParams;
  const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  const casts = await db.select({ id: schema.casts.id, name: schema.casts.name }).from(schema.casts).where(eq(schema.casts.shopId, (await currentShopId()))).orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const rows = await db.select().from(schema.schedules).where(and(eq(schema.schedules.shopId, (await currentShopId())), eq(schema.schedules.date, date)));
  // 出勤者を上に
  const on = new Set(rows.filter((r) => !r.off && r.start).sort((a, b) => a.start.localeCompare(b.start)).map((r) => r.castId));
  const sorted = [...casts.filter((c) => on.has(c.id)), ...casts.filter((c) => !on.has(c.id))];
  return (
    <>
      <PageHeader title="今日の出勤" desc={`${labelMd(date)}　出勤 ${on.size}名`}>
        <Link className="btn" href={`/schedule/day?d=${addDays(date, -1)}`}>← 前日</Link>
        <Link className="btn" href="/schedule/day">今日</Link>
        <Link className="btn" href={`/schedule/day?d=${addDays(date, 1)}`}>翌日 →</Link>
        <Link className="btn" href="/sokuhime">即姫・接客一括更新</Link>
      </PageHeader>
      <WeekGrid key={date} dates={[{ date, label: labelMd(date), isToday: date === today }]} casts={sorted} dayChangeHour={shop.dayChangeHour} initial={rows.map((r) => ({ castId: r.castId, date: r.date, start: r.start, end: r.end, off: r.off }))} />
    </>
  );
}
