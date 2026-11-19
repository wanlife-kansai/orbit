import { PageHeader } from "@/components/PageHeader";
import { pushData } from "../data";
import { PushPicker } from "../PushPicker";
import { deleteFromSites } from "../actions";

export default async function PushDeletePage() {
  const { casts, sites } = await pushData("delete");
  return (
    <>
      <PageHeader title="女性をサイトから削除" desc="サイト側に登録されている女性を削除（公式サイトは非公開）にします。ORBITからは削除されません。">
        <a href="/logs?c=delete" className="btn">更新結果を見る</a>
      </PageHeader>
      <PushPicker casts={casts} sites={sites} action={deleteFromSites} button="選んだサイトから削除" castQ="どの女性をサイトから削除しますか？" siteQ="どのサイトから削除しますか？" danger />
    </>
  );
}
