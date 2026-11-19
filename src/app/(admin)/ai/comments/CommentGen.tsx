"use client";
import { useState, useTransition } from "react";
import { applyToShopComment, generateComment, type AiInput } from "./actions";

type Cast = { id: number; name: string; specialPlay: string; charmPoint: string; style: string; castType: string; catchCopy: string };
const TONES = ["ハイテンション", "丁寧", "カジュアル", "高級感", "興奮をあおる", "詩的"];
const fmt = (iso: string) => new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function CommentGen({ casts, usage, hasKey, history }: { casts: Cast[]; usage: { used: number; limit: number }; hasKey: boolean; history: { id: number; castName: string; output: string; createdAt: string }[] }) {
  const [f, setF] = useState<AiInput>({ castId: 0, specialPlay: "", charmPoint: "", style: "", castType: "", catch10: "", catch20: "", keyword: "", tone: "丁寧", length: "200" });
  const [out, setOut] = useState("");
  const [used, setUsed] = useState(usage.used);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const pick = (id: number) => {
    const c = casts.find((x) => x.id === id);
    setF({ ...f, castId: id, specialPlay: c?.specialPlay ?? "", charmPoint: c?.charmPoint ?? "", style: c?.style ?? "", castType: c?.castType ?? "", catch20: c?.catchCopy ?? "" });
  };
  const field = (k: keyof AiInput, label: string) => (
    <div>
      <div className="label">{label}</div>
      <input value={String(f[k])} maxLength={100} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="input w-full" />
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card space-y-3 p-4">
        {!hasKey && <p className="rounded-md bg-amber-950/30 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-900">AIのキー（ANTHROPIC_API_KEY）が未設定のため、まだ生成できません。</p>}
        <div>
          <div className="label">女性を選択</div>
          <select value={f.castId} onChange={(e) => pick(Number(e.target.value))} className="input w-full">
            <option value={0}>先にコメント生成する女性を選択してください</option>
            {casts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {field("specialPlay", "得意なこと")}
          {field("charmPoint", "チャームポイント")}
          {field("style", "スタイル")}
          {field("castType", "女性のタイプ")}
          {field("catch10", "キャッチコピー10文字")}
          {field("catch20", "キャッチコピー20文字")}
        </div>
        {field("keyword", "キーワード")}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="label">口調</div>
            <select value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })} className="input">{TONES.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div>
            <div className="label">長さ</div>
            <select value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} className="input">{["100", "200", "300", "500"].map((t) => <option key={t} value={t}>約{t}文字</option>)}</select>
          </div>
          <button
            className="btn-primary"
            disabled={pending || !f.castId || !hasKey || used >= usage.limit}
            onClick={() => start(async () => { const r = await generateComment(f); setMsg({ ok: r.ok, text: r.message }); if (r.ok) { setOut(r.text); setUsed(used + 1); } })}
          >
            {pending ? "生成中…" : "コメント生成"}
          </button>
          <span className="text-xs text-zinc-400">残り{Math.max(0, usage.limit - used)}回 / 月{usage.limit}回</span>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</p>}
      </section>
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">お店コメントのご提案</h2>
        <textarea value={out} onChange={(e) => setOut(e.target.value)} rows={10} className="input w-full" placeholder="ここに生成結果が出ます（手直しもできます）" />
        <div className="flex gap-2">
          <button className="btn" disabled={!out} onClick={() => navigator.clipboard.writeText(out).then(() => setMsg({ ok: true, text: "コピーしました" }))}>クリップボードにコピー</button>
          <button className="btn-primary" disabled={!out || !f.castId || pending} onClick={() => start(async () => { const r = await applyToShopComment(f.castId, out); setMsg({ ok: r.ok, text: r.message }); })}>この女性のお店コメントに入れる</button>
        </div>
        <h3 className="pt-2 text-sm font-semibold">履歴</h3>
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {history.map((h) => (
            <li key={h.id} className="rounded-md bg-zinc-950/40 p-2 text-xs ring-1 ring-zinc-800">
              <div className="mb-1 text-zinc-500">{fmt(h.createdAt)}　{h.castName}</div>
              <button className="text-left text-zinc-300 hover:text-violet-200" onClick={() => setOut(h.output)}>{h.output.slice(0, 120)}{h.output.length > 120 ? "…" : ""}</button>
            </li>
          ))}
          {!history.length && <li className="text-xs text-zinc-500">まだ履歴はありません</li>}
        </ul>
      </section>
    </div>
  );
}
