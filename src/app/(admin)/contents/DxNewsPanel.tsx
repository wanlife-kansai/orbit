"use client";
import { useEffect, useState, useTransition } from "react";
import { loadDxNews, removeDxNews, sendDxNews } from "./actions";

type News = { id: string; title: string; body: string; time: string; status: string };
type Tpl = { id: number; title: string; body: string; label: string };

/** 日本時間の datetime-local 用の文字列 */
function jstLocal(addMinutes: number) {
  const d = new Date(Date.now() + 9 * 3600_000 + addMinutes * 60_000);
  return d.toISOString().slice(0, 16);
}

export function DxNewsPanel({ templates }: { templates: Tpl[] }) {
  const [items, setItems] = useState<News[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"now" | "reserve">("reserve");
  const [reserve, setReserve] = useState(jstLocal(60));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const refresh = () =>
    start(async () => {
      setLoadErr("");
      const r = await loadDxNews();
      if (r.ok) setItems(r.items);
      else setLoadErr(r.message);
    });
  useEffect(refresh, []);

  const send = () => {
    const label = mode === "now" ? "今すぐ風俗DXに公開" : `${reserve.replace("T", " ")} に予約`;
    if (!confirm(`「${title}」を${label}します。よろしいですか？`)) return;
    start(async () => {
      const r = await sendDxNews({ title, content, reserve: mode === "reserve" ? reserve : "" });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setTitle("");
        setContent("");
        const l = await loadDxNews();
        if (l.ok) setItems(l.items);
      }
    });
  };
  const remove = (n: News) => {
    if (!confirm(`風俗DXのお店速報「${n.title}」を削除します。元に戻せません。よろしいですか？`)) return;
    start(async () => {
      const r = await removeDxNews(n.id, n.title);
      setMsg({ ok: r.ok, text: r.message });
      const l = await loadDxNews();
      if (l.ok) setItems(l.items);
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section className="card p-5">
        <h2 className="font-semibold">お店速報を書く</h2>
        <p className="mt-1 text-xs text-zinc-400">風俗DXの「お店速報」に登録します。登録後30分間は次の登録ができません（他のツールの投稿も含む）。</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">テンプレートから</label>
            <select
              className="input w-full"
              value=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === Number(e.target.value));
                if (t) {
                  setTitle(t.title);
                  setContent(t.body);
                }
              }}
            >
              <option value="">テンプレートを選ぶ（任意）</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>[{t.label}] {t.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">速報タイトル</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className="input w-full" />
          </div>
          <div>
            <label className="label">詳細内容</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="input w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === "reserve"} onChange={() => setMode("reserve")} />
              予約投稿
            </label>
            {mode === "reserve" && <input type="datetime-local" value={reserve} onChange={(e) => setReserve(e.target.value)} className="input" />}
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === "now"} onChange={() => setMode("now")} />
              今すぐ公開
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={pending || !title.trim()} onClick={send}>
              {pending ? "処理中…" : "風俗DXに送信"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => {
                setMode("reserve");
                setReserve(jstLocal(60 * 24 * 365));
                if (!title) setTitle("【テスト】ORBIT接続確認");
                if (!content) setContent("ORBITからの接続テストです。確認後に削除します。");
              }}
            >
              テスト用に1年後の予約にする
            </button>
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</p>}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">風俗DXのお店速報（最大3件）</h2>
          <button className="btn py-1 text-xs" disabled={pending} onClick={refresh}>再読み込み</button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">いま風俗DXに載っている速報です。3件を超えると古いものから消えます。</p>
        <div className="mt-3 space-y-2">
          {items === null && !loadErr && <p className="text-sm text-zinc-500">風俗DXに確認中…</p>}
          {loadErr && <p className="text-sm text-rose-400">{loadErr}</p>}
          {items?.length === 0 && <p className="text-sm text-zinc-500">速報はありません</p>}
          {items?.map((n) => (
            <div key={n.id} className="rounded-lg bg-zinc-950/60 p-3 ring-1 ring-zinc-800">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  <div className="text-[11px] text-zinc-500">
                    {n.time}・{n.status}
                  </div>
                </div>
                <button className="btn-danger shrink-0 px-2 py-1 text-xs" disabled={pending} onClick={() => remove(n)}>
                  削除
                </button>
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-zinc-400">{n.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
