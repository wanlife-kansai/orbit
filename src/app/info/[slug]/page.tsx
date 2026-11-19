import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicFrame } from "@/components/PublicFrame";
import { CMS_NAME } from "@/lib/brand";

const PAGES: Record<string, string> = { company: "運営会社", terms: "利用規約", privacy: "プライバシーポリシー" };

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = PAGES[slug];
  if (!title) notFound();
  return (
    <PublicFrame>
      <div className="w-full max-w-2xl rounded-xl bg-zinc-900/90 p-8 ring-1 ring-zinc-700/70">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-4 text-sm text-zinc-400">{CMS_NAME} の{title}は準備中です。</p>
        <Link href="/login" className="mt-8 inline-block text-sm text-violet-300 underline underline-offset-4">ログイン画面へ戻る</Link>
      </div>
    </PublicFrame>
  );
}
