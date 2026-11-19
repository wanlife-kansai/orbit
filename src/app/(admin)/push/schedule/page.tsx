import { PageHeader } from "@/components/PageHeader";
import { pushData } from "../data";
import { PushPicker } from "../PushPicker";
import { pushSchedules } from "../actions";
import { getSettings } from "@/lib/settings";

export default async function PushSchedulePage() {
  const { casts, sites } = await pushData("schedule");
  const s = await getSettings();
  return (
    <>
      <PageHeader title="出勤情報をサイトへ更新" desc={`選んだ女性の出勤情報（今日から${s.schedulePeriod === "2w" ? "2週間" : "1週間"}）を、選んだサイトへ送ります。`}>
        <a href="/logs?c=schedule" className="btn">更新結果を見る</a>
      </PageHeader>
      <PushPicker casts={casts} sites={sites} action={pushSchedules} button="出勤情報を更新" castQ="どの女性の出勤情報を更新しますか？" siteQ="どのサイトに更新しますか？" />
    </>
  );
}
