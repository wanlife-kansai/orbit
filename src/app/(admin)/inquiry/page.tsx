import { PageHeader } from "@/components/PageHeader";
import { CMS_NAME } from "@/lib/brand";

export default function InquiryPage() {
  const email = process.env.SUPPORT_EMAIL || "";
  const tel = process.env.SUPPORT_TEL || "";
  return (
    <>
      <PageHeader title="お問合せ" desc={`${CMS_NAME} の使い方・不具合・新しいサイトへの対応のご相談はこちらへ。`} />
      <div className="card max-w-xl space-y-3 p-5 text-sm">
        {email ? <p>メール：<a className="text-violet-300 underline" href={`mailto:${email}?subject=${encodeURIComponent(`${CMS_NAME} お問合せ`)}`}>{email}</a></p> : null}
        {tel ? <p>電話：<a className="text-violet-300 underline" href={`tel:${tel}`}>{tel}</a></p> : null}
        {!email && !tel && <p className="text-zinc-400">お問合せ先は準備中です（運営側で SUPPORT_EMAIL / SUPPORT_TEL を設定すると表示されます）。</p>}
        <p className="text-xs text-zinc-500">不具合のときは、更新結果の赤い行の文面を一緒に送っていただくと早く解決できます。</p>
      </div>
    </>
  );
}
