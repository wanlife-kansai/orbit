import { PageHeader } from "@/components/PageHeader";
import { pushData } from "../data";
import { PushPicker } from "../PushPicker";
import { pushCasts } from "../actions";

export default async function PushCastsPage() {
  const { casts, sites } = await pushData("girl");
  return (
    <>
      <PageHeader title="女性をサイトへ更新" desc="ORBITに登録している女性のプロフィール・写真をサイトへ送ります。女性名はサイト側では変更できない場合があるのでご注意ください。">
        <a href="/logs?c=girl" className="btn">更新結果を見る</a>
      </PageHeader>
      <PushPicker casts={casts} sites={sites} action={pushCasts} button="女性を更新" castQ="どの女性を更新しますか？" siteQ="どのサイトに更新しますか？" showMissing />
    </>
  );
}
