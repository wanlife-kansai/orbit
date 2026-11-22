"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { removeContents, setTimer, setTimerAll } from "./actions";

type Item = { id: number; name: string; kind: string; group: string; mode: string; active: boolean; nextRunAt: string | null; lastRunAt: string | null; lastResult: string; memo: string; auto: boolean; registered: boolean };

const fmt = (iso: string | null, withDate = true) =>
  iso
    ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", ...(withDate ? { month: "2-digit", day: "2-digit" } : {}), hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
    : "";
const MODE: Record<string, string> = { direct: "直接入力", timer: "タイマー", times: "時刻指定" };
const KIND_COLOR: Record<string, string> = {
  速報: "text-sky-300 ring-sky-800",
  上位化: "text-rose-300 ring-rose-800",
  イベント: "text-orange-300 ring-orange-800",
  割引: "text-blue-300 ring-blue-800",
  即姫: "text-pink-300 ring-pink-800",
  写メ: "text-purple-300 ring-purple-800",
  求人: "text-teal-300 ring-teal-800",
  その他: "text-amber-300 ring-amber-800",
};

export function ContentList({ items, kinds }: { items: Item[]; kinds: string[] }) {
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const list = useMemo(() => items.filter((i) => (!kind || i.kind === kind) && (!q || i.name.includes(q))), [items, kind, q]);
  const groups = [...new Set(list.map((i) => i.group))];
  const toggle = (id: number) => setSel((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const run = (fn: () => Promise<{ message: string } | void>) =>
    start(async () => {
      const r = await fn();
      if (r) setMsg(r.message);
    });

  if (!items.length)
    return <div className="card p-6 text-sm text-zinc-400">まだコンテンツがありません。「＋ コンテンツを追加」から、更新したいサイトの枠を選んでください。</div>;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setKind("")} className={`rounded-md px-2.5 py-1 text-sm ${!kind ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>すべて（{items.length}）</button>
        {kinds.map((k) => {
          const n = items.filter((i) => i.kind === k).length;
          return n ? (
            <button key={k} onClick={() => setKind(k)} className={`rounded-md px-2.5 py-1 text-sm ${kind === k ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>
              {k}（{n}）
            </button>
          ) : null;
        })}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="コンテンツ名で検索" className="input ml-auto w-56" />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-500">選択 {sel.length}件：</span>
        <button className="btn" disabled={!sel.length || pending} onClick={() => run(() => setTimerAll(sel, true))}>まとめてタイマー開始</button>
        <button className="btn" disabled={!sel.length || pending} onClick={() => run(() => setTimerAll(sel, false))}>まとめて停止</button>
        <button className="btn-danger" disabled={!sel.length || pending} onClick={() => confirm(`${sel.length}件を一覧から外します。よろしいですか？`) && run(async () => { await removeContents(sel); setSel([]); })}>選択削除</button>
        {msg && <span className="text-emerald-300">{msg}</span>}
      </div>
      {groups.map((g) => (
        <div key={g} className="card mb-4 overflow-x-auto">
          {g && <div className="px-4 pt-3 text-sm font-semibold">{g}</div>}
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <th className="th w-8">
                  <input type="checkbox" checked={list.filter((i) => i.group === g).every((i) => sel.includes(i.id))} onChange={(e) => { const ids = list.filter((i) => i.group === g).map((i) => i.id); setSel((v) => (e.target.checked ? [...new Set([...v, ...ids])] : v.filter((x) => !ids.includes(x)))); }} />
                </th>
                <th className="th w-36">タイマー</th>
                <th className="th">コンテンツ名</th>
                <th className="th w-28">最終更新</th>
                <th className="th w-20">種別</th>
                <th className="th w-40" />
              </tr>
            </thead>
            <tbody>
              {list
                .filter((i) => i.group === g)
                .map((i) => (
                  <tr key={i.id}>
                    <td className="td"><input type="checkbox" checked={sel.includes(i.id)} onChange={() => toggle(i.id)} /></td>
                    <td className="td text-xs">
                      {i.active ? (
                        <span className="text-emerald-300">次回 {fmt(i.nextRunAt)}</span>
                      ) : (
                        <span className="text-zinc-500">-- : --（{MODE[i.mode] ?? i.mode}）</span>
                      )}
                    </td>
                    <td className="td">
                      <Link href={`/contents/${i.id}`} className="hover:text-violet-300">{i.name}</Link>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {i.auto ? <span className="badge text-emerald-300 ring-emerald-800">自動投稿</span> : <span className="badge text-zinc-500 ring-zinc-700">接続準備中</span>}
                        {!i.registered && <span className="badge text-amber-300 ring-amber-800">ログイン情報なし</span>}
                      </div>
                      {i.lastResult && <div className={`mt-0.5 text-xs ${i.lastResult.startsWith("成功") ? "text-zinc-500" : "text-rose-400"}`}>{i.lastResult}</div>}
                      {i.memo && <div className="mt-0.5 text-xs text-zinc-500">メモ：{i.memo}</div>}
                    </td>
                    <td className="td text-xs text-zinc-400 tabular-nums">{fmt(i.lastRunAt)}</td>
                    <td className="td"><span className={`badge ${KIND_COLOR[i.kind] ?? ""}`}>{i.kind}</span></td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/contents/${i.id}`} className="btn">編集</Link>
                        {i.active ? (
                          <button className="btn" disabled={pending} onClick={() => run(() => setTimer(i.id, false))}>停止</button>
                        ) : (
                          <button className="btn" disabled={pending || i.mode === "direct"} title={i.mode === "direct" ? "直接入力は編集画面から送ります" : ""} onClick={() => run(() => setTimer(i.id, true))}>開始</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
