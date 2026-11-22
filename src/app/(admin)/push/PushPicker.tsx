"use client";
import { useState, useTransition } from "react";

type Cast = { id: number; name: string; isPublished: boolean; missing: number };
type Site = { code: string; name: string; ready: boolean; lastAt: string | null; count: number };
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "-");

export function PushPicker({ casts, sites, action, button, castQ, siteQ, showMissing, danger }: { casts: Cast[]; sites: Site[]; action: (castIds: number[], sites: string[]) => Promise<{ ok: boolean; message: string }>; button: string; castQ: string; siteQ: string; showMissing?: boolean; danger?: boolean }) {
  const [cs, setCs] = useState<number[]>([]);
  const [ss, setSs] = useState<string[]>(sites.filter((s) => s.ready).map((s) => s.code));
  const [onlyPub, setOnlyPub] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const list = casts.filter((c) => !onlyPub || c.isPublished);
  const all = (on: boolean) => setCs(on ? list.map((c) => c.id) : []);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{castQ}</h2>
          <span className="text-xs text-zinc-400">選択中 {cs.length} / {casts.length}人</span>
          <div className="ml-auto flex gap-1 text-xs">
            <button className="btn py-1" onClick={() => all(true)}>全選択</button>
            <button className="btn py-1" onClick={() => all(false)}>全解除</button>
            <label className="flex items-center gap-1"><input type="checkbox" checked={onlyPub} onChange={(e) => setOnlyPub(e.target.checked)} />公開中のみ</label>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className={c.isPublished ? "" : "opacity-50"}>
                  <td className="td w-8"><input type="checkbox" checked={cs.includes(c.id)} onChange={() => setCs((v) => (v.includes(c.id) ? v.filter((x) => x !== c.id) : [...v, c.id]))} /></td>
                  <td className="td text-sm">{c.name}{!c.isPublished && <span className="ml-1 text-[10px]">非公開</span>}</td>
                  {showMissing && <td className={`td w-24 text-right text-xs ${c.missing ? "text-amber-300" : "text-zinc-600"}`}>{c.missing ? `未入力 ${c.missing}` : "OK"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card p-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-semibold">{siteQ}</h2>
          <span className="text-xs text-zinc-400">選択中 {ss.length} / {sites.length}件</span>
        </div>
        {sites.length === 0 && <p className="text-sm text-zinc-500">連携しているサイトがありません（サイトのログイン情報・公式サイト連携から設定）。</p>}
        <table className="w-full">
          <tbody>
            {sites.map((s) => (
              <tr key={s.code}>
                <td className="td w-8"><input type="checkbox" checked={ss.includes(s.code)} onChange={() => setSs((v) => (v.includes(s.code) ? v.filter((x) => x !== s.code) : [...v, s.code]))} /></td>
                <td className="td text-sm">{s.name}{!s.ready && <span className="ml-1 text-[10px] text-zinc-500">接続準備中</span>}</td>
                <td className="td w-16 text-right text-xs text-zinc-500">{s.count ? `${s.count}人` : ""}</td>
                <td className="td w-36 text-right text-xs text-zinc-500 tabular-nums">{fmt(s.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center gap-2">
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            disabled={pending || !cs.length || !ss.length}
            onClick={() => confirm(`${cs.length}人 × ${ss.length}サイトで実行します。よろしいですか？`) && start(async () => { const r = await action(cs, ss); setMsg({ ok: r.ok, text: r.message }); })}
          >
            {pending ? "実行中…" : button}
          </button>
          <a href="/settings?tab=other" className="text-xs text-violet-300">オートシンクロを設定する</a>
        </div>
        {msg && <p className={`mt-3 whitespace-pre-line text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</p>}
      </section>
    </div>
  );
}
