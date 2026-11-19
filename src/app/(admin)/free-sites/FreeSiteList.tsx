"use client";
import { useMemo, useState, useTransition } from "react";
import { saveFreeSiteMemo } from "./actions";

type Site = { name: string; kind: "営業" | "求人"; banner: string; apply: string; memo: string };
type Key = "name" | "kind" | "banner" | "memo";
const PER = 50;

export function FreeSiteList({ sites }: { sites: Site[] }) {
  const [list, setList] = useState(sites);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [sort, setSort] = useState<{ key: Key; asc: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [, start] = useTransition();

  const rows = useMemo(() => {
    let r = list.filter((s) => (!q || s.name.toLowerCase().includes(q.toLowerCase())) && (!kind || s.kind === kind));
    if (sort) r = [...r].sort((a, b) => (sort.asc ? 1 : -1) * ((a[sort.key] || "￿").localeCompare(b[sort.key] || "￿", "ja")));
    return r;
  }, [list, q, kind, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const view = rows.slice(page * PER, page * PER + PER);
  const th = (key: Key, label: string, cls = "") => (
    <th className={`th ${cls}`}>
      <button className="inline-flex items-center gap-1 hover:text-zinc-200" onClick={() => setSort(sort?.key === key ? { key, asc: !sort.asc } : { key, asc: true })}>
        {label}
        <span className="text-[10px]">{sort?.key === key ? (sort.asc ? "▲" : "▼") : "⇅"}</span>
      </button>
    </th>
  );
  const saveMemo = (name: string) => {
    setList((l) => l.map((s) => (s.name === name ? { ...s, memo: draft.trim() } : s)));
    setEditing(null);
    start(async () => { await saveFreeSiteMemo(name, draft); });
  };

  return (
    <div className="card overflow-x-auto">
      <div className="flex flex-wrap items-center gap-2 p-4">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="サイト名で検索" className="input w-72" />
        {["", "営業", "求人"].map((k) => (
          <button key={k} onClick={() => { setKind(k); setPage(0); }} className={`rounded-md px-2.5 py-1 text-sm ${kind === k ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>{k || "すべて"}</button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
          {rows.length ? `${page * PER + 1}-${Math.min(rows.length, page * PER + PER)}件` : "0件"} / {rows.length}件中
          <button className="btn px-2 py-1" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} className={`h-7 w-7 rounded-full text-xs ${i === page ? "bg-violet-600 text-white" : "hover:bg-zinc-800"}`}>{i + 1}</button>
          ))}
          <button className="btn px-2 py-1" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>›</button>
        </div>
      </div>
      <table className="w-full min-w-[760px]">
        <thead>
          <tr>
            <th className="th w-24" />
            {th("name", "サイト名", "w-56")}
            {th("kind", "種別", "w-20")}
            {th("banner", "バナーリンク")}
            {th("memo", "メモ", "w-64")}
          </tr>
        </thead>
        <tbody>
          {view.map((s) => (
            <tr key={s.name} className="hover:bg-zinc-800/40">
              <td className="td">
                <a href={s.apply} target="_blank" rel="noopener noreferrer" className="btn-primary px-3 py-1.5 text-xs">↗ 申込</a>
              </td>
              <td className="td font-medium">{s.name}</td>
              <td className="td">
                <span className={`badge ${s.kind === "求人" ? "text-rose-300 ring-rose-800" : "text-sky-300 ring-sky-800"}`}>{s.kind}</span>
              </td>
              <td className="td text-xs">
                {s.banner ? (
                  <a href={s.banner} target="_blank" rel="noopener noreferrer" className="break-all text-violet-300 underline">{s.banner} ↗</a>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="td text-xs">
                {editing === s.name ? (
                  <div className="flex gap-1">
                    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveMemo(s.name); if (e.key === "Escape") setEditing(null); }} className="input flex-1 py-1 text-xs" placeholder="申込日・担当者など" />
                    <button className="btn px-2 py-1 text-xs" onClick={() => saveMemo(s.name)}>保存</button>
                  </div>
                ) : (
                  <button className="w-full text-left hover:text-violet-300" onClick={() => { setEditing(s.name); setDraft(s.memo); }}>
                    {s.memo || <span className="text-zinc-600">＋ メモ</span>}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!view.length && <tr><td className="td text-sm text-zinc-500" colSpan={5}>該当するサイトはありません</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
