"use client";
import { useState, useTransition } from "react";
import { deleteDiaryItems, saveDiary } from "./actions";

type Diary = { running: boolean; sourceSite: string; sourceUrl: string; footer: string; fromEmail: string; targets: string[]; excludedCasts: number[] };
type Item = { id: number; castName: string; title: string; status: string; message: string; importedAt: string; sourceUrl: string };
const TABS = ["一覧", "取り込み元設定", "フッター設定", "送信元メールアドレス設定", "女性設定", "転送先設定"] as const;
const ST: Record<string, string> = { pending: "待機中", sent: "送信済み", failed: "失敗", skipped: "対象外" };
const fmt = (iso: string) => new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function DiaryPanel({ initial, sources, targets, casts, items }: { initial: Diary; sources: { code: string; name: string }[]; targets: { key: string; name: string }[]; casts: { id: number; name: string }[]; items: Item[] }) {
  const [d, setD] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]>("一覧");
  const [sel, setSel] = useState<number[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const save = (p: Partial<Diary> = {}) =>
    start(async () => {
      const r = await saveDiary({ ...d, ...p });
      if (r.ok) setD({ ...d, ...p });
      setMsg({ ok: r.ok, text: r.message });
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {d.running ? (
          <button className="btn" disabled={pending} onClick={() => save({ running: false })}>■ 更新停止</button>
        ) : (
          <button className="btn-primary" disabled={pending} onClick={() => save({ running: true })}>▶ 更新開始</button>
        )}
        <span className={`badge ${d.running ? "text-emerald-300 ring-emerald-800" : "text-zinc-500 ring-zinc-700"}`}>{d.running ? "転送中" : "停止中"}</span>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</span>}
      </div>
      <p className="mb-4 rounded-md bg-amber-950/30 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-900">
        日記の取り込み・転送は、取り込み元／転送先サイトとの接続ができ次第動きます。設定は今のうちに保存しておけます。
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>{t}</button>
        ))}
      </div>
      <div className="card p-4">
        {tab === "一覧" && (
          <>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm text-zinc-400">{items.length}件</span>
              <button className="btn-danger ml-auto" disabled={!sel.length || pending} onClick={() => start(async () => { await deleteDiaryItems(sel); setSel([]); })}>一括削除</button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-zinc-500">まだ取り込んだ日記はありません</p>
            ) : (
              <table className="w-full">
                <thead><tr><th className="th w-8" /><th className="th">女性名／タイトル</th><th className="th w-24">ステータス</th><th className="th w-36">取り込み日時</th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="td"><input type="checkbox" checked={sel.includes(i.id)} onChange={() => setSel((v) => (v.includes(i.id) ? v.filter((x) => x !== i.id) : [...v, i.id]))} /></td>
                      <td className="td"><div className="text-xs text-zinc-400">{i.castName}</div>{i.sourceUrl ? <a href={i.sourceUrl} target="_blank" className="hover:text-violet-300">{i.title}</a> : i.title}{i.message && <div className="text-xs text-rose-400">{i.message}</div>}</td>
                      <td className="td text-sm">{ST[i.status] ?? i.status}</td>
                      <td className="td text-xs text-zinc-400 tabular-nums">{fmt(i.importedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        {tab === "取り込み元設定" && (
          <div className="max-w-xl space-y-3">
            <div>
              <div className="label">取り込み元サイト</div>
              <select value={d.sourceSite} onChange={(e) => setD({ ...d, sourceSite: e.target.value })} className="input w-full">
                <option value="">選択してください</option>
                {sources.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <div className="label">取り込み元の写メ日記一覧ページのURL</div>
              <input value={d.sourceUrl} onChange={(e) => setD({ ...d, sourceUrl: e.target.value })} className="input w-full" placeholder="https://" />
            </div>
            <button className="btn-primary" disabled={pending} onClick={() => save()}>保存</button>
          </div>
        )}
        {tab === "フッター設定" && (
          <div className="max-w-xl space-y-3">
            <div className="label">転送する日記の最後に付ける文章</div>
            <textarea value={d.footer} onChange={(e) => setD({ ...d, footer: e.target.value })} rows={5} className="input w-full" />
            <button className="btn-primary" disabled={pending} onClick={() => save()}>保存</button>
          </div>
        )}
        {tab === "送信元メールアドレス設定" && (
          <div className="max-w-xl space-y-3">
            <div className="label">メール投稿型のサイトへ送るときの送信元アドレス</div>
            <input type="email" value={d.fromEmail} onChange={(e) => setD({ ...d, fromEmail: e.target.value })} className="input w-full" />
            <button className="btn-primary" disabled={pending} onClick={() => save()}>保存</button>
          </div>
        )}
        {tab === "女性設定" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">チェックを外した女性の日記は転送しません。</p>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
              {casts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!d.excludedCasts.includes(c.id)} onChange={(e) => setD({ ...d, excludedCasts: e.target.checked ? d.excludedCasts.filter((x) => x !== c.id) : [...d.excludedCasts, c.id] })} />
                  {c.name}
                </label>
              ))}
            </div>
            <button className="btn-primary" disabled={pending} onClick={() => save()}>保存</button>
          </div>
        )}
        {tab === "転送先設定" && (
          <div className="space-y-3">
            <div className="grid gap-1 md:grid-cols-2">
              {targets.map((t) => (
                <label key={t.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.targets.includes(t.key)} onChange={(e) => setD({ ...d, targets: e.target.checked ? [...d.targets, t.key] : d.targets.filter((x) => x !== t.key) })} />
                  {t.name}
                </label>
              ))}
            </div>
            <button className="btn-primary" disabled={pending} onClick={() => save()}>保存</button>
          </div>
        )}
      </div>
    </>
  );
}
