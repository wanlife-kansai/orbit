"use client";
import { useState, useTransition } from "react";
import { saveContent, sendNow, setTimer, type ContentForm } from "../actions";
import type { ContentEntry } from "@/db/schema";

type Tpl = { id: number; title: string; body: string; label: string };
const TABS = [
  { key: "direct", label: "直接入力" },
  { key: "timer", label: "タイマー更新" },
  { key: "times", label: "時刻指定更新" },
  { key: "detail", label: "詳細設定" },
] as const;
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const INTERVALS = [10, 15, 20, 30, 40, 45, 50, 60, 70, 80, 90, 120, 150, 180, 240, 300, 360, 480, 720, 1440];
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "");

export function ContentEditor({ id, auto, active, nextRunAt, initial, templates }: { id: number; auto: boolean; active: boolean; nextRunAt: string | null; initial: ContentForm; templates: Tpl[] }) {
  const [f, setF] = useState<ContentForm>(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(initial.mode === "direct" ? "direct" : initial.mode);
  const [direct, setDirect] = useState<ContentEntry>({ title: "", body: "" });
  const [newAt, setNewAt] = useState("12:00");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const up = (p: Partial<ContentForm>) => setF((v) => ({ ...v, ...p }));

  const save = (mode?: ContentForm["mode"]) =>
    start(async () => {
      const r = await saveContent(id, { ...f, ...(mode ? { mode } : {}) });
      if (mode) up({ mode });
      setMsg({ ok: r.ok, text: r.message });
    });
  const pickTemplate = (t: Tpl) => {
    const e = { title: t.title, body: t.body, templateId: t.id };
    if (tab === "direct") setDirect(e);
    else if (tab === "timer") up({ entries: [...f.entries, e].slice(0, 100) });
    else if (tab === "times") up({ times: [...f.times, { at: newAt, entry: e }].sort((a, b) => a.at.localeCompare(b.at)) });
  };
  const move = (i: number, d: -1 | 1) => {
    const a = [...f.entries];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    up({ entries: a });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-zinc-800 pb-3">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-sm ${tab === t.key ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>
              {t.label}
              {f.mode === t.key && <span className="ml-1 text-[10px] text-emerald-300">使用中</span>}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs">
            {active ? <span className="text-emerald-300">タイマー稼働中・次回 {fmt(nextRunAt)}</span> : <span className="text-zinc-500">停止中</span>}
            {f.mode !== "direct" &&
              (active ? (
                <button className="btn" disabled={pending} onClick={() => start(async () => { const r = await setTimer(id, false); setMsg({ ok: r.ok, text: r.message }); })}>止める</button>
              ) : (
                <button className="btn-primary" disabled={pending} onClick={() => start(async () => { await saveContent(id, f); const r = await setTimer(id, true); setMsg({ ok: r.ok, text: r.message }); })}>保存して開始</button>
              ))}
          </div>
        </div>

        {tab === "direct" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">1件をすぐサイトへ送ります。右のテンプレートをクリックすると入ります。</p>
            <input value={direct.title} onChange={(e) => setDirect({ ...direct, title: e.target.value })} placeholder="タイトル" className="input w-full" />
            <textarea value={direct.body} onChange={(e) => setDirect({ ...direct, body: e.target.value })} rows={8} placeholder="本文" className="input w-full" />
            <button
              className="btn-primary"
              disabled={!auto || pending || !direct.title.trim()}
              onClick={() => confirm(`「${direct.title}」を今すぐ送ります。よろしいですか？`) && start(async () => { const r = await sendNow(id, direct); setMsg({ ok: r.ok, text: r.message }); })}
            >
              {auto ? "今すぐサイトへ送る" : "接続準備中のため送れません"}
            </button>
          </div>
        )}

        {tab === "timer" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select value={f.intervalMin} onChange={(e) => up({ intervalMin: Number(e.target.value) })} className="input">
                {INTERVALS.map((m) => (
                  <option key={m} value={m}>{m < 60 ? `${m}分` : m % 60 ? `${Math.floor(m / 60)}時間${m % 60}分` : `${m / 60}時間`}</option>
                ))}
              </select>
              間隔で更新
              <label className="ml-3 flex items-center gap-1.5">
                <input type="checkbox" checked={f.loop} onChange={(e) => up({ loop: e.target.checked })} />
                設定内容をループする
              </label>
              <span className="ml-auto text-xs text-zinc-500">（{f.entries.length} / 100）</span>
            </div>
            <ol className="space-y-2">
              {f.entries.map((e, i) => (
                <li key={i} className="rounded-lg bg-zinc-950/40 p-2 ring-1 ring-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-right text-xs text-zinc-500">{i + 1}.</span>
                    <input value={e.title} onChange={(ev) => up({ entries: f.entries.map((x, k) => (k === i ? { ...x, title: ev.target.value } : x)) })} className="input flex-1" />
                    <button className="btn" onClick={() => move(i, -1)}>↑</button>
                    <button className="btn" onClick={() => move(i, 1)}>↓</button>
                    <button className="btn-danger" onClick={() => up({ entries: f.entries.filter((_, k) => k !== i) })}>×</button>
                  </div>
                  <textarea value={e.body} onChange={(ev) => up({ entries: f.entries.map((x, k) => (k === i ? { ...x, body: ev.target.value } : x)) })} rows={2} className="input mt-2 w-full text-xs" />
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <button className="btn" onClick={() => up({ entries: [...f.entries, { title: "", body: "" }] })}>＋ 空の行を追加</button>
              <button className="btn-danger" onClick={() => confirm("すべて削除しますか？") && up({ entries: [] })}>すべて削除</button>
            </div>
            <p className="text-xs text-zinc-500">上から順に、指定した間隔で1件ずつ送ります。右のテンプレートをクリックすると末尾に追加されます。</p>
            <button className="btn-primary" disabled={pending} onClick={() => save("timer")}>この内容で保存（タイマー更新を使う）</button>
          </div>
        )}

        {tab === "times" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              追加する時刻
              <input type="time" value={newAt} onChange={(e) => setNewAt(e.target.value)} className="input" />
              <span className="text-xs text-zinc-500">→ 右のテンプレートをクリックでこの時刻に追加（現在 {f.times.length} 箇所）</span>
            </div>
            <table className="w-full">
              <tbody>
                {f.times.map((t, i) => (
                  <tr key={i}>
                    <td className="td w-28"><input type="time" value={t.at} onChange={(e) => up({ times: f.times.map((x, k) => (k === i ? { ...x, at: e.target.value } : x)) })} className="input" /></td>
                    <td className="td"><input value={t.entry.title} onChange={(e) => up({ times: f.times.map((x, k) => (k === i ? { ...x, entry: { ...x.entry, title: e.target.value } } : x)) })} className="input w-full" /></td>
                    <td className="td w-12"><button className="btn-danger" onClick={() => up({ times: f.times.filter((_, k) => k !== i) })}>×</button></td>
                  </tr>
                ))}
                {!f.times.length && (
                  <tr><td className="td text-sm text-zinc-500">まだ時刻がありません</td></tr>
                )}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              一括登録：毎時
              <select id="bulkMin" className="input" defaultValue="0">
                {[0, 10, 15, 20, 30, 40, 45, 50].map((m) => <option key={m} value={m}>{m}分</option>)}
              </select>
              に
              <select id="bulkTpl" className="input max-w-52">
                {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <button
                className="btn"
                onClick={() => {
                  const m = Number((document.getElementById("bulkMin") as HTMLSelectElement).value);
                  const t = templates.find((x) => x.id === Number((document.getElementById("bulkTpl") as HTMLSelectElement).value));
                  if (!t) return;
                  const add = HOURS.map((h) => ({ at: `${h.slice(0, 2)}:${String(m).padStart(2, "0")}`, entry: { title: t.title, body: t.body, templateId: t.id } }));
                  up({ times: [...f.times.filter((x) => !add.some((a) => a.at === x.at)), ...add].sort((a, b) => a.at.localeCompare(b.at)) });
                }}
              >
                24時間分を登録
              </button>
              <button className="btn-danger" onClick={() => confirm("すべて削除しますか？") && up({ times: [] })}>すべて削除</button>
            </div>
            <button className="btn-primary" disabled={pending} onClick={() => save("times")}>この内容で保存（時刻指定更新を使う）</button>
          </div>
        )}

        {tab === "detail" && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="label">曜日（何も選ばなければ毎日）</div>
              <div className="flex gap-1">
                {WD.map((w, d) => (
                  <button key={d} onClick={() => up({ weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d] })} className={`h-9 w-9 rounded-md ring-1 ${f.weekdays.includes(d) ? "bg-violet-600 text-white ring-violet-500" : "ring-zinc-700"}`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label">更新時間帯（空なら「設定」の更新時間帯に従う）</div>
              <div className="flex items-center gap-2">
                <input type="time" value={f.hoursFrom} onChange={(e) => up({ hoursFrom: e.target.value })} className="input" />〜
                <input type="time" value={f.hoursTo} onChange={(e) => up({ hoursTo: e.target.value })} className="input" />
                <button className="btn" onClick={() => up({ hoursFrom: "", hoursTo: "" })}>指定しない</button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">日付変更時刻より前は翌日扱いです（例：10:00〜03:00 で深夜3時まで）。</p>
            </div>
            <div>
              <div className="label">グループ（一覧でまとめて表示）</div>
              <input value={f.groupName} onChange={(e) => up({ groupName: e.target.value })} className="input w-64" />
            </div>
            <div>
              <div className="label">メモ</div>
              <textarea value={f.memo} onChange={(e) => up({ memo: e.target.value })} rows={3} className="input w-full" />
            </div>
            <button className="btn-primary" disabled={pending} onClick={() => save()}>設定を保存</button>
          </div>
        )}
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</p>}
      </div>

      <aside className="card max-h-[80vh] overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">テンプレート</h3>
          <a href="/templates" className="text-xs text-violet-300">追加・編集</a>
        </div>
        {templates.length === 0 && <p className="text-xs text-zinc-500">テンプレートがありません</p>}
        {templates.map((t, i) => (
          <button key={t.id} onClick={() => pickTemplate(t)} disabled={tab === "detail"} className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-zinc-800 disabled:opacity-50">
            <span className="text-zinc-500">{i + 1}. </span>
            {t.title}
            <span className="ml-1 text-[10px] text-zinc-500">{t.label}</span>
          </button>
        ))}
      </aside>
    </div>
  );
}
