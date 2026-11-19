import { PageHeader } from "@/components/PageHeader";

export default function AiMoviesPage() {
  return (
    <>
      <PageHeader title="動画生成" desc="女性の写真から、ポータルの「投稿動画」枠に使える短い動画を自動で作る機能です。" />
      <div className="card max-w-2xl space-y-3 p-6 text-sm text-zinc-300">
        <p>この機能は準備中です。動画を作るAIサービス（画像→動画）との契約・接続が必要なため、方式を決めてから組み込みます。</p>
        <ul className="list-disc space-y-1 pl-5 text-zinc-400">
          <li>女性の写真を選ぶ → 5〜10秒の縦動画を生成</li>
          <li>生成した動画の保存・お気に入り・結合・選択削除</li>
          <li>Fu-WEB・ぴゅあらば等の「投稿動画」枠へコンテンツ更新から投稿</li>
        </ul>
      </div>
    </>
  );
}
