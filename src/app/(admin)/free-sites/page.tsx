import { PageHeader } from "@/components/PageHeader";
import { FREE_SITES, applyUrl } from "@/lib/freeSites";
import { getSettings } from "@/lib/settings";
import { FreeSiteList } from "./FreeSiteList";

export default async function FreeSitesPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="無料サイト申込" desc="無料で掲載できるポータル・求人サイトです。「申込」をクリックすると掲載申し込み（相互リンク・バナー案内）のページが開きます。" />
      <FreeSiteList sites={FREE_SITES.map((x) => ({ ...x, apply: applyUrl(x), memo: s.freeSiteMemos[x.name] ?? "" }))} />
    </>
  );
}
