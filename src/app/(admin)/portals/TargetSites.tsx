"use client";
import { useState, useTransition } from "react";
import { SITES } from "@/lib/sites";
import { saveTargetSites } from "./actions";

export function TargetSites({ initial }: { initial: string[] }) {
  const [sel, setSel] = useState(new Set(initial));
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const toggle = (c: string) => {
    const n = new Set(sel);
    if (n.has(c)) n.delete(c);
    else n.add(c);
    setSel(n);
    setMsg("");
  };
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">連動先サイト</h2>
          <p className="mt-1 text-xs text-zinc-400">この店舗が使っているサイトを選びます。女性編集の「各サイト項目」と「必須項目チェッカー」に出ます。</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">{sel.size} / {SITES.length} サイト</span>
          {msg && <span className="text-sm text-emerald-300">{msg}</span>}
          <button className="btn-primary" disabled={pending} onClick={() => start(async () => {
            await saveTargetSites([...sel]);
            setMsg("保存しました");
          })}>
            {pending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {SITES.map((s) => (
          <label key={s.code} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-800">
            <input type="checkbox" checked={sel.has(s.code)} onChange={() => toggle(s.code)} />
            <span className="truncate">{s.name}</span>
            {s.note && <span className="truncate text-[11px] text-zinc-500">{s.note}</span>}
          </label>
        ))}
      </div>
    </section>
  );
}
