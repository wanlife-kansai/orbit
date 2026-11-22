"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteCasts, pushCastsToSites, toggleNew, togglePublished } from "./actions";

export type Row = {
  id: number;
  name: string;
  kana: string;
  age: number | null;
  isNew: boolean;
  isPublished: boolean;
  memo: string;
  sortOrder: number;
  photo: string | null;
  thumbs: number;
  photos: number;
  linked: boolean;
};

type SortKey = "sortOrder" | "name" | "age" | "isNew" | "isPublished" | "memo";

export function CastList({ rows, officialConnected }: { rows: Row[]; officialConnected: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pub" | "unpub" | "new">("all");
  const [per, setPer] = useState(48);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "sortOrder", asc: true });
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"list" | "grid">("grid");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    let r = rows.filter((x) => !k || x.name.toLowerCase().includes(k) || x.kana.toLowerCase().includes(k) || x.memo.toLowerCase().includes(k));
    if (filter === "pub") r = r.filter((x) => x.isPublished);
    if (filter === "unpub") r = r.filter((x) => !x.isPublished);
    if (filter === "new") r = r.filter((x) => x.isNew);
    const dir = sort.asc ? 1 : -1;
    return [...r].sort((a, b) => {
      const A = a[sort.key] ?? "";
      const B = b[sort.key] ?? "";
      return (A > B ? 1 : A < B ? -1 : a.sortOrder - b.sortOrder) * dir;
    });
  }, [rows, q, filter, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const cur = Math.min(page, pages);
  const shown = filtered.slice((cur - 1) * per, cur * per);
  const allShownSel = shown.length > 0 && shown.every((r) => sel.has(r.id));

  const toggleSel = (id: number) => setSel((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const sortBy = (key: SortKey) => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.asc ? " ↑" : " ↓") : "");

  const run = (fn: () => Promise<{ ok: boolean; message: string } | void>) =>
    start(async () => {
      const r = await fn();
      if (r) setMsg({ ok: r.ok, text: r.message });
    });

  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={`th cursor-pointer select-none hover:text-zinc-200 ${className}`} onClick={() => sortBy(k)}>
      {children}
      {arrow(k)}
    </th>
  );

  const Pager = () => (
    <div className="flex items-center gap-1">
      <button className="btn px-2 py-1" disabled={cur <= 1} onClick={() => setPage(cur - 1)} aria-label="前のページ">‹</button>
      {Array.from({ length: pages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === pages || Math.abs(p - cur) <= 2)
        .map((p) => (
          <button key={p} onClick={() => setPage(p)} className={`h-8 min-w-8 rounded-full text-sm ${p === cur ? "bg-violet-600 text-white" : "hover:bg-zinc-800"}`}>
            {p}
          </button>
        ))}
      <button className="btn px-2 py-1" disabled={cur >= pages} onClick={() => setPage(cur + 1)} aria-label="次のページ">›</button>
    </div>
  );

  return (
    <>
      {/* 上：検索と絞り込み。右に表示の切り替えと登録ボタン */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="名前・ふりがな・メモで探す"
          className="input w-full sm:w-72"
          type="search"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="絞り込み">
          {([
            ["all", "全員", rows.length],
            ["pub", "公開中", rows.filter((r) => r.isPublished).length],
            ["unpub", "非公開", rows.filter((r) => !r.isPublished).length],
            ["new", "新人", rows.filter((r) => r.isNew).length],
          ] as const).map(([k, l, n]) => (
            <button
              key={k}
              aria-pressed={filter === k}
              onClick={() => { setFilter(k); setPage(1); }}
              className={`rounded-full border px-3 py-1 text-[13px] font-bold tnum ${filter === k ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-700 text-zinc-300 hover:border-violet-400"}`}
            >
              {l} {n}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-700 p-0.5" role="group" aria-label="表示">
            {(["grid", "list"] as const).map((k) => (
              <button key={k} aria-pressed={view === k} onClick={() => setView(k)} className={`rounded-md px-3 py-1 text-[13px] font-bold ${view === k ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"}`}>
                {k === "grid" ? "写真で見る" : "表で見る"}
              </button>
            ))}
          </div>
          <Link href="/casts/new" className="btn-primary">女性を登録</Link>
        </div>
      </div>

      {/* 選んだときだけ出る操作の帯 */}
      {sel.size > 0 && (
        <div className="sticky top-[104px] z-20 mb-3 flex flex-wrap items-center gap-3 rounded-[10px] border border-violet-600/60 bg-zinc-900 px-4 py-2.5">
          <span className="text-sm font-bold">{sel.size}人を選択中</span>
          <button
            className="btn"
            disabled={pending || !officialConnected}
            title={officialConnected ? "" : "公式サイトが未接続です"}
            onClick={() => { if (confirm(`${sel.size}人のプロフィールを公式サイトへ送りますか？`)) run(() => pushCastsToSites([...sel])); }}
          >
            公式サイトへ送る
          </button>
          <button
            className="btn-danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`${sel.size}人を削除しますか？\n写真・出勤も消えます（公式サイトでは非公開になります）。`)) {
                const ids = [...sel];
                setSel(new Set());
                run(() => deleteCasts(ids));
              }
            }}
          >
            削除
          </button>
          <button className="ml-auto text-xs font-bold text-zinc-400 hover:text-zinc-100" onClick={() => setSel(new Set())}>選択をやめる</button>
        </div>
      )}

      {msg && <p className={`mb-3 text-sm font-bold ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 px-4 py-2.5 text-xs text-zinc-400">
          <span className="tnum">{filtered.length}人中 {filtered.length ? `${(cur - 1) * per + 1}〜${Math.min(cur * per, filtered.length)}人目` : "0人"}</span>
          <label className="flex items-center gap-1">
            1ページに
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="input py-0.5 text-xs">
              {[24, 48, 96, 200, 400].map((n) => (
                <option key={n} value={n}>{n}人</option>
              ))}
            </select>
          </label>
          <a href="/casts/export.csv" className="font-bold text-violet-300 hover:underline">CSVで書き出す</a>
          <div className="ml-auto"><Pager /></div>
        </div>

        {view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="th w-10">
                    <input type="checkbox" checked={allShownSel} onChange={() => setSel((p) => {
                      const n = new Set(p);
                      shown.forEach((r) => (allShownSel ? n.delete(r.id) : n.add(r.id)));
                      return n;
                    })} aria-label="すべて選択" />
                  </th>
                  <Th k="name">女性</Th>
                  <Th k="age" className="w-16">年齢</Th>
                  <Th k="isPublished" className="w-28">公開</Th>
                  <Th k="isNew" className="w-20">新人</Th>
                  <Th k="memo">メモ</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={sel.has(r.id) ? "bg-violet-900/40" : "hover:bg-zinc-800/40"}>
                    <td className="td"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} aria-label={`${r.name}を選択`} /></td>
                    <td className="td">
                      <Link href={`/casts/${r.id}`} className="flex items-center gap-3">
                        <span className="block h-14 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {r.photo && <img src={r.photo} alt="" className="h-full w-full object-cover" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-bold hover:text-violet-300">{r.name}</span>
                          <span className="block text-xs text-zinc-500">
                            {r.kana}・写真{r.photos}枚
                            {r.linked && <span className="ml-1 text-violet-300">・公式サイト連携中</span>}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="td tnum">{r.age ?? "-"}</td>
                    <td className="td">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold">
                        <input type="checkbox" role="switch" className="peer sr-only" checked={r.isPublished} disabled={pending} onChange={() => run(() => togglePublished(r.id, !r.isPublished))} />
                        <span aria-hidden className={`relative h-5 w-9 rounded-full ${r.isPublished ? "bg-violet-600" : "bg-zinc-700"} peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${r.isPublished ? "left-[18px]" : "left-0.5"}`} />
                        </span>
                        {r.isPublished ? "公開" : "非公開"}
                      </label>
                    </td>
                    <td className="td">
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={r.isNew} disabled={pending} onChange={(e) => run(() => toggleNew(r.id, e.target.checked))} />
                        新人
                      </label>
                    </td>
                    <td className="td max-w-56 truncate text-xs text-zinc-400" title={r.memo}>{r.memo}</td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td className="td text-zinc-500" colSpan={6}>条件に合う女性がいません。絞り込みを「全員」に戻すか、検索の言葉を変えてください。</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {shown.map((r) => (
              <div key={r.id} className="group relative">
                <Link href={`/casts/${r.id}`} className={`relative block aspect-[3/4] overflow-hidden rounded-[10px] bg-zinc-800 ${sel.has(r.id) ? "outline outline-[3px] outline-violet-600" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.photo && <img src={r.photo} alt="" className={`h-full w-full object-cover ${r.isPublished ? "" : "grayscale opacity-60"}`} />}
                  {r.isNew && <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold text-zinc-950" style={{ background: "var(--orbit-gold)" }}>新人</span>}
                  {!r.isPublished && <span className="absolute inset-x-0 bottom-0 bg-zinc-950/80 py-1 text-center text-[11px] font-bold text-zinc-200">非公開</span>}
                </Link>
                <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} aria-label={`${r.name}を選択`} className="absolute right-2 top-2 h-5 w-5 accent-violet-600" />
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <Link href={`/casts/${r.id}`} className="truncate text-sm font-bold hover:text-violet-300">{r.name}</Link>
                  <span className="shrink-0 text-xs text-zinc-500 tnum">{r.age ?? "-"}歳</span>
                </div>
              </div>
            ))}
            {shown.length === 0 && <p className="col-span-full py-6 text-sm text-zinc-500">条件に合う女性がいません。絞り込みを「全員」に戻すか、検索の言葉を変えてください。</p>}
          </div>
        )}
        <div className="flex justify-end border-t border-zinc-800 p-3"><Pager /></div>
      </div>
    </>
  );
}
