import Link from "next/link";
import { getShop } from "@/lib/shop";
import { getTodayRoster } from "@/lib/queries";
import { fmtTime, labelMd } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { StatusRow } from "./StatusRow";

export default async function SokuhimePage() {
  const shop = await getShop();
  const { date, roster } = await getTodayRoster(shop.dayChangeHour);
  const waiting = roster.filter((r) => r.status === "waiting").length;
  const serving = roster.filter((r) => r.status === "serving").length;

  return (
    <>
      <PageHeader
        title="即姫・接客ボード"
        desc={`${labelMd(date)}　出勤 ${roster.length}人・待機中 ${waiting}人・接客中 ${serving}人　接客中は終了予定を過ぎると自動で解除されます。`}
      />
      <p className="mb-4 rounded-md bg-zinc-900 px-3 py-2 text-xs text-zinc-400 ring-1 ring-zinc-800">
        いまは自店のデータだけが変わります。ポータル（風俗DXの「今すぐ娘」など）への配信はステップ2でつなぎます。
      </p>
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
