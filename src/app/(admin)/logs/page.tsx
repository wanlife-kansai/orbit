import { PageHeader } from "@/components/PageHeader";
import { recentLogs } from "@/lib/official";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);

const HINT: Record<string, string> = {
  接続: "相手のサイトが動いているか、URLが正しいか確認してください。時間をおいてもう一度試してください",
  認証: "APIキーが公式サイトの OFFICIAL_API_KEY と同じか確認してください",
  未対応: "このサイトへの自動更新は接続準備中です",
  ログイン: "サイトのログイン情報で、そのサイトのログインID・パスワードを入れ直してください",
  内容: "入力内容（年齢・時刻・タイトルなど）を確認してください",
  制限: "サイト側の回数・間隔の制限です（風俗DXの速報は登録後30分あける）。時間をおいてから送ってください",
  画面変更: "相手のサイトの画面が変わった可能性があります。開発側で確認が必要です",
  サーバー: "相手のサイト側でエラーが起きています。少し待ってからもう一度保存してください",
};

const CATS = [
  { key: "", label: "すべて" },
  { key: "content", label: "サイト更新" },
  { key: "schedule", label: "出勤" },
  { key: "girl", label: "プロフィール" },
  { key: "delete", label: "サイトから外す" },
  { key: "sort", label: "表示順" },
];

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ c?: string; e?: string }> }) {
  const { c = "", e } = await searchParams;
  const cat = CATS.some((x) => x.key === c) ? c : "";
  const all = await recentLogs(300, cat || undefined);
  const logs = e ? all.filter((l) => !l.ok) : all;
  return (
    <>
      <PageHeader title="配信の記録" desc="公式サイト・ポータルへの更新結果です（新しい順・最新300件）。">
        <a href={`/logs?c=${cat}${e ? "" : "&e=1"}`} className="btn">{e ? "すべて表示" : "失敗だけ表示"}</a>
      </PageHeader>
      <div className="mb-3 flex flex-wrap gap-1">
        {CATS.map((x) => (
          <a key={x.key} href={`/logs?c=${x.key}`} className={`rounded-md px-3 py-1.5 text-sm ${cat === x.key ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>{x.label}</a>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="th w-28">日時</th>
              <th className="th w-40">配信先</th>
              <th className="th w-20">結果</th>
              <th className="th">内容</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td className="td text-zinc-500" colSpan={4}>まだ配信の記録はありません</td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="td text-xs text-zinc-400 tabular-nums">{fmt(l.createdAt)}</td>
                <td className="td text-sm">{l.portal ?? "-"}</td>
                <td className="td">
                  {l.ok ? (
                    <span className="badge text-emerald-300 ring-emerald-800">成功</span>
                  ) : (
                    <span className="badge text-rose-300 ring-rose-800">失敗{l.errorKind ? `・${l.errorKind}` : ""}</span>
                  )}
                </td>
                <td className="td text-sm">
                  {l.message}
                  {!l.ok && HINT[l.errorKind] && <div className="mt-0.5 text-xs text-zinc-500">→ {HINT[l.errorKind]}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
