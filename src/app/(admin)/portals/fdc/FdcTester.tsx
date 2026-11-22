"use client";
import { useState, useTransition } from "react";
import { compareAction, restoreAction, sendAction, testAction } from "./actions";

type Day = { date: string; from: string; to: string; label: string; freeText: string };

export function FdcTester({ casts }: { casts: { id: number; name: string }[] }) {
  const [castId, setCastId] = useState(casts[0]?.id ?? 0);
  const [date, setDate] = useState("");
  const [lines, setLines] = useState<{ t: string; ok: boolean }[]>([]);
  const [before, setBefore] = useState<Day | null>(null);
  const [busy, start] = useTransition();
  const add = (t: string, ok = true) => setLines((x) => [...x, { t, ok }]);
  const fmt = (d: Day) => `${d.label || "（表示なし）"}［from=${d.from} / to=${d.to}］`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="card space-y-4 p-5">
        <button className="btn" disabled={busy} onClick={() => start(async () => { const r = await testAction(); add(r.message, r.ok); })}>
          接続テスト
        </button>
        <div>
          <label className="label">女性</label>
          <select className="input w-full" value={castId} onChange={(e) => { setCastId(Number(e.target.value)); setBefore(null); }}>
            {casts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">日付（当日〜35日先まで）</label>
          <input type="date" className="input w-full" value={date} onChange={(e) => { setDate(e.target.value); setBefore(null); }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={busy || !date} onClick={() => start(async () => {
            const r = await compareAction(castId, date);
            if (!r.ok) return add(r.message, false);
            add(`${date}　ORBIT：${r.orbit}　／　データセンター：${fmt(r.fdc)}（キャストID ${r.itemId}）`);
          })}>
            今の値を見る
          </button>
          <button className="btn-primary" disabled={busy || !date} onClick={() => start(async () => {
            const r = await sendAction(castId, date);
            if (!r.ok) return add(r.message, false);
            setBefore(r.before);
            add(`送信しました。送る前：${fmt(r.before)} → 送った後：${fmt(r.after)}`);
          })}>
            ORBITの出勤を送る
          </button>
          <button className="btn" disabled={busy || !before} onClick={() => start(async () => {
            if (!before) return;
            const r = await restoreAction(castId, date, before);
            if (!r.ok) return add(r.message, false);
            setBefore(null);
            add(`元に戻しました：${fmt(r.after)}`);
          })}>
            送る前に戻す
          </button>
        </div>
        {busy && <p className="text-xs text-zinc-400">風俗データセンターとやりとりしています…（10〜30秒）</p>}
      </div>
      <div className="card space-y-1 p-5 text-sm" id="fdc-log">
        {lines.length === 0 && <p className="text-zinc-500">ここに結果が出ます。</p>}
        {lines.map((l, i) => (
          <div key={i} className={l.ok ? "text-emerald-300" : "text-rose-300"}>{l.t}</div>
        ))}
      </div>
    </div>
  );
}
