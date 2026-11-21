import { getShop } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { ImportRunner } from "./ImportRunner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ImportPage() {
  const shop = await getShop();
  const v = shop.importSource?.venrey;
  return (
    <>
      <PageHeader
        title="Mr.Venreyから取り込み"
        desc="Mr.Venreyに登録済みの女性（プロフィール・コメント・Q&A・各サイト項目・別名・写真）、出勤、テンプレート、コンテンツ枠を、この店舗に写します。Mr.Venrey側のデータは読むだけで、変更しません。"
      />
      <ImportRunner savedId={v?.loginId ?? ""} hasSaved={!!v?.passwordEnc} lastImportAt={v?.lastImportAt ?? ""} lastSummary={v?.lastSummary ?? ""} />
    </>
  );
}
