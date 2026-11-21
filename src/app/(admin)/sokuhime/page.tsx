import Link from "next/link";
import { getShop } from "@/lib/shop";
import { getTodayRoster } from "@/lib/queries";
import { fmtTime, labelMd } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { StatusRow } from "./StatusRow";
import { AutoPanel } from "./AutoPanel";
import { getSettings } from "@/lib/settings";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { CATALOG } from "@/lib/contentCatalog";

export default async function SokuhimePage() {
  const shop = await getShop();
  const { date, roster } = await getTodayRoster(shop.dayChangeHour);
  const waiting = roster.filter((r) => r.status === "waiting").length;
  const serving = roster.filter((r) => r.status === "serving").length;
  const st = await getSettings();
  const targets = await db.select().from(schema.contents).where(and(eq(schema.contents.shopId, (await currentShopId())), eq(schema.contents.kind, "即姫")));

  return (
    <>
      <PageHeader
        title="即姫・接客一括更新"
        desc={`${labelMd(date)}　出勤 ${roster.length}人・待機中 ${waiting}人・接客中 ${serving}人　接客中は終了予定を過ぎると自動で解除されます。`}
      />
      <AutoPanel
        dayChangeHour={shop.dayChangeHour}
        initial={{ sokuhimeOrder: st.sokuhimeOrder, sokuhimeBatch: st.sokuhimeBatch, sokuhimePriority: st.sokuhimePriority, sokuhimeIntervalMin: st.sokuhimeIntervalMin, sokuhimeActive: st.sokuhimeActive }}
        targets={targets.map((t) => ({ name: t.name, auto: !!CATALOG.find((c) => c.site === t.site && c.slot === t.slot)?.driver }))}
      />
      {roster.length === 0 ? (
        <div className="card p-6 text-sm text-zinc-400">
          本日の出勤がありません。<Link href="/schedule" className="text-violet-300 underline">週間スケジュール</Link>で登録してください。
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {roster.map((r) => (
            <StatusRow key={r.castId} r={r} date={date} timeLabel={`${fmtTime(r.start, shop.dayChangeHour)}〜${fmtTime(r.end, shop.dayChangeHour)}`} />
          ))}
        </div>
      )}
    </>
  );
}
