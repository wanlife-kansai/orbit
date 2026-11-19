"use client";
import { useState, useTransition } from "react";
import { saveAliases } from "../actions";

type Row = { id: number; name: string; romaji: string; aliases: Record<string, string> };

export function AliasEditor({ rows, sites }: { rows: Row[]; sites: { code: string; name: string; note?: string }[] }) {
  const [site, setSite] = useState(sites[0]?.code ?? "");
  const [vals, setVals] = useState<Record<string, Record<number, string>>>(() =>
    Object.fromEntries(sites.map((s) => [s.code, Object.fromEntries(rows.map((r) => [r.id, r.aliases[s.code] ?? ""]))])),
  );
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const cur = sites.find((s) => s.code === site);

  const set = (id: number, v: string) => {
    setVals((p) => ({ ...p, [site]: { ...p[site], [id]: v } }));
    setDirty(true);
    setMsg("");
  };

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 p-3">
        <label className="text-sm text-zinc-400">サイト</label>
        <select
          value={site}
          onChange={(e) => {
            if (dirty && !confirm("保存していない変更があります。サイトを切り替えますか？")) return;
            setSite(e.target.value);
            setDirty(false);
          }}
          className="input"
        >
          {sites.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
        {cur?.note && <span className="text-xs text-amber-300">{cur.note}</span>}
        <button type="button" className="btn text-xs" onClick={() => rows.forEach((r) => r.romaji && !vals[site]?.[r.id] && set(r.id, r.romaji))}>
          空欄にローマ字を入れる
        </button>
        <div className="ml-auto flex items-center gap-3">
          {msg && <span className="text-sm text-emerald-300">{msg}</span>}
          <button
            className="btn-primary"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                await saveAliases(site, rows.map((r) => ({ castId: r.id, alias: vals[site]?.[r.id] ?? "" })));
                setDirty(false);
                setMsg("保存しました");
              })
            }
          >
            {pending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="th w-1/3">女性名</th>
            <th className="th">このサイトでの名前（空欄なら女性名のまま）</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td">
                {r.name}
                {r.romaji && <div className="text-xs text-zinc-500">{r.romaji}</div>}
              </td>
              <td className="td">
                <input value={vals[site]?.[r.id] ?? ""} onChange={(e) => set(r.id, e.target.value)} placeholder={r.name} className="input w-full max-w-sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
