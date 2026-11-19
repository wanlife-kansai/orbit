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
  const [per, setPer] = useState(50);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "sortOrder", asc: true });
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"list" | "grid">("list");
  const [tools, setTools] = useState(false);
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/casts/new" className="btn-primary">＋ 新規登録</Link>
        <Link href="/portals" className="btn">女性取り込み</Link>
        <Link href="/casts/aliases" className="btn">別名管理</Link>
        <Link href="/casts/sort" className="btn">並び替え</Link>
        <div className="relative">
          <button className="btn" onClick={() => setTools(!tools)}>ツール ▾</button>
          {tools && (
            <div className="absolute z-30 mt-1 w-44 overflow-hidden rounded-md bg-zinc-900 py-1 text-sm shadow-xl ring-1 ring-zinc-700" onMouseLeave={() => setTools(false)}>
              <a href="/casts/export.csv" className="block px-3 py-2 hover:bg-zinc-800">女性CSV出力</a>
              <Link href="/casts/aliases" className="block px-3 py-2 hover:bg-zinc-800">別名管理</Link>
            </div>
          )}
        </div>
        <button
          className="btn"
          disabled={pending || !officialConnected}
          title={officialConnected ? "" : "公式サイトが未接続です"}
          onClick={() => {
            const ids = [...sel];
            if (confirm(ids.length ? `選択中の${ids.length}人をサイトへ更新しますか？` : "全員をサイトへ更新しますか？")) run(() => pushCastsToSites(ids));
          }}
        >
          ⇪ サイトへ更新{sel.size ? `（${sel.size}人）` : ""}
        </button>
        <div className="ml-auto inline-flex overflow-hidden rounded-md ring-1 ring-zinc-700">
          {(["list", "grid"] as const).map((k) => (
            <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 text-sm ${view === k ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>
              {k === "list" ? "リスト" : "写真"}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className={`mb-3 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</p>}

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 p-3">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="女性名・メモで検索"
            className="input w-56"
          />
          <select value={filter} onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(1); }} className="input">
            <option value="all">すべて</option>
            <option value="pub">公開中</option>
            <option value="unpub">非公開</option>
            <option value="new">新人</option>
          </select>
          <button
            className="btn-danger py-1.5"
            disabled={pending || sel.size === 0}
            onClick={() => {
              if (confirm(`選択した${sel.size}人を削除しますか？\n写真・出勤も消えます（公式サイトでは非公開になります）。`)) {
                const ids = [...sel];
                setSel(new Set());
                run(() => deleteCasts(ids));
              }
            }}
          >
            選択削除{sel.size ? `（${sel.size}）` : ""}
          </button>
          <span className="text-xs text-zinc-400">
            {filtered.length ? `${(cur - 1) * per + 1}-${Math.min(cur * per, filtered.length)}人` : "0人"} / {filtered.length}人中（上限400人）
          </span>
          <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="input py-1 text-xs">
            {[10, 30, 50, 100, 200, 400].map((n) => (
              <option key={n} value={n}>{n}人</option>
            ))}
          </select>
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
                  <th className="th w-16"></th>
                  <th className="th w-20">写真</th>
                  <Th k="name">名前</Th>
                  <Th k="age" className="w-16">年齢</Th>
                  <Th k="isNew" className="w-20">新人</Th>
                  <Th k="isPublished" className="w-24">公開状態</Th>
                  <Th k="memo">メモ</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={sel.has(r.id) ? "bg-violet-950/30" : ""}>
                    <td className="td"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} aria-label={`${r.name}を選択`} /></td>
                    <td className="td"><Link href={`/casts/${r.id}`} className="text-xs text-violet-300 hover:underline">✎ 編集</Link></td>
                    <td className="td">
                      <Link href={`/casts/${r.id}`} className="relative block h-16 w-12 overflow-hidden rounded bg-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {r.photo && <img src={r.photo} alt="" className="h-full w-full object-cover" />}
                        <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center text-[9px] leading-4 text-zinc-200">{r.thumbs}・{r.photos}</span>
                      </Link>
                    </td>
                    <td className="td">
                      <Link href={`/casts/${r.id}`} className="font-medium hover:text-violet-300">{r.name}</Link>
                      <div className="text-xs text-zinc-500">
                        {r.kana}
                        {r.linked && <span className="ml-2 text-emerald-400" title="公式サイトとつながっています">● 公式</span>}
                      </div>
                    </td>
                    <td className="td tabular-nums">{r.age ?? "-"}</td>
                    <td className="td">
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={r.isNew} disabled={pending} onChange={(e) => run(() => toggleNew(r.id, e.target.checked))} />
                        新人
                      </label>
                    </td>
                    <td className="td">
                      <button
                        disabled={pending}
                        onClick={() => run(() => togglePublished(r.id, !r.isPublished))}
                        className={`relative h-6 w-16 rounded-full text-[10px] font-medium transition ${r.isPublished ? "bg-violet-600 text-white" : "bg-zinc-700 text-zinc-300"}`}
                      >
                        {r.isPublished ? "公開中" : "非公開"}
                      </button>
                    </td>
                    <td className="td max-w-56 truncate text-xs text-zinc-400" title={r.memo}>{r.memo}</td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td className="td text-zinc-500" colSpan={8}>該当する女性がいません</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 lg:grid-cols-6">
            {shown.map((r) => (
              <div key={r.id} className={`overflow-hidden rounded-lg ring-1 ${sel.has(r.id) ? "ring-violet-500" : "ring-zinc-800"} ${r.isPublished ? "" : "opacity-50"}`}>
                <Link href={`/casts/${r.id}`} className="block aspect-[3/4] bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.photo && <img src={r.photo} alt="" className="h-full w-full object-cover" />}
                </Link>
                <div className="flex items-center gap-2 p-2">
                  <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} aria-label={`${r.name}を選択`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="text-[11px] text-zinc-500">{r.age ?? "-"}歳{r.isNew ? "・新人" : ""}{r.isPublished ? "" : "・非公開"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end border-t border-zinc-800 p-3"><Pager /></div>
      </div>
    </>
  );
}
