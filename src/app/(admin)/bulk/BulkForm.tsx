"use client";
import { useState, useTransition } from "react";
import { deleteBulk, sendBulk } from "./actions";

type Content = { id: number; name: string; kind: string; auto: boolean };
type Hist = { id: number; title: string; createdAt: string; results: { name: string; ok: boolean; message: string }[] };
const fmt = (iso: string) => new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function BulkForm({ contents, templates, history }: { contents: Content[]; templates: { id: number; title: string; body: string }[]; history: Hist[] }) {
  const [step, setStep] = useState<"" | "direct" | "template">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sel, setSel] = useState<number[]>(contents.filter((c) => c.auto).map((c) => c.id));
  const [hsel, setHsel] = useState<number[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">新規投稿</h2>
        {!step ? (
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => setStep("direct")}>投稿内容を直接入力</button>
            <button className="btn" onClick={() => setStep("template")}>テンプレートを選択</button>
          </div>
        ) : (
          <div className="space-y-3">
            {step === "template" && (
              <select className="input w-full" defaultValue="" onChange={(e) => { const t = templates.find((x) => x.id === Number(e.target.value)); if (t) { setTitle(t.title); setBody(t.body); } }}>
                <option value="" disabled>テンプレートを選んでください</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            )}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル" className="input w-full" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="本文" className="input w-full" />
            <div>
              <div className="label">更新するコンテンツ（{sel.length}件）</div>
              {contents.length === 0 && <p className="text-xs text-zinc-500">先に「コンテンツ更新」で枠を追加してください。</p>}
              <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-md bg-zinc-950/40 p-2 ring-1 ring-zinc-800">
                {contents.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sel.includes(c.id)} onChange={() => setSel((v) => (v.includes(c.id) ? v.filter((x) => x !== c.id) : [...v, c.id]))} />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-[11px] text-zinc-500">{c.kind}</span>
                    {!c.auto && <span className="text-[11px] text-zinc-600">接続準備中</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => setStep("")}>戻る</button>
              <button
                className="btn-primary"
                disabled={pending || !title.trim() || !sel.length}
                onClick={() => confirm(`「${title}」を ${sel.length}件のコンテンツへ今すぐ更新します。よろしいですか？`) && start(async () => { const r = await sendBulk({ title, body, contentIds: sel }); setMsg({ ok: r.ok, text: r.message }); if (r.ok) { setTitle(""); setBody(""); setStep(""); } })}
              >
                {pending ? "更新中…" : "まとめて更新"}
              </button>
            </div>
          </div>
        )}
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</p>}
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">過去の更新履歴（{history.length}件）</h2>
          <button className="btn-danger" disabled={!hsel.length || pending} onClick={() => start(async () => { await deleteBulk(hsel); setHsel([]); })}>選択削除</button>
        </div>
        {history.length === 0 && <p className="text-sm text-zinc-500">まだ履歴はありません</p>}
        <ul className="divide-y divide-zinc-800">
          {history.map((h) => {
            const ok = h.results.filter((r) => r.ok).length;
            return (
              <li key={h.id} className="py-2">
                <div className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hsel.includes(h.id)} onChange={() => setHsel((v) => (v.includes(h.id) ? v.filter((x) => x !== h.id) : [...v, h.id]))} />
                  <span className="text-xs text-zinc-500 tabular-nums">{fmt(h.createdAt)}</span>
                  <button className="flex-1 text-left hover:text-violet-300" onClick={() => setOpen(open === h.id ? null : h.id)}>{h.title}</button>
                  <span className={`text-xs ${ok === h.results.length ? "text-emerald-300" : "text-amber-300"}`}>{ok}/{h.results.length}</span>
                </div>
                {open === h.id && (
                  <ul className="mt-1 ml-6 space-y-0.5 text-xs">
                    {h.results.map((r, i) => (
                      <li key={i} className={r.ok ? "text-zinc-400" : "text-rose-400"}>{r.ok ? "○" : "×"} {r.name}：{r.message}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
