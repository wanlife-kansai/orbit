"use client";
import { useMemo, useState, useTransition } from "react";
import { applyBaseSchedule, saveBaseSchedule, saveWeek, type Cell } from "../actions";

type Base = Record<string, { start: string; end: string; off?: boolean }>;
const WD = ["日", "月", "火", "水", "木", "金", "土"];

export function MonthEditor({ castId, castName, month, today, dayChangeHour, base, initial, allCastIds }: { castId: number; castName: string; month: string; today: string; dayChangeHour: number; base: Base; initial: Cell[]; allCastIds: number[] }) {
  const times = useMemo(() => Array.from({ length: 48 }, (_, i) => { const m = (dayChangeHour * 60 + i * 30) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }), [dayChangeHour]);
  const show = (t: string) => (Number(t.slice(0, 2)) < dayChangeHour ? `翌${t}` : t);
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const dates = Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const [cells, setCells] = useState<Record<string, Cell>>(() => Object.fromEntries(initial.map((c) => [c.date, c])));
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [b, setB] = useState<Base>(base);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const get = (date: string): Cell => cells[date] ?? { castId, date, start: "", end: "", off: false };
  const set = (c: Cell) => { setCells((p) => ({ ...p, [c.date]: c })); setDirty((p) => new Set(p).add(c.date)); setMsg(""); };
  const state = (c: Cell) => (c.off ? "off" : c.start ? "on" : "unset");

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{castName} さんの基本出勤</h2>
          <div className="flex gap-2">
            <button className="btn" disabled={pending} onClick={() => start(async () => setMsg((await saveBaseSchedule(castId, b)).message))}>基本出勤を保存</button>
            <button className="btn-primary" disabled={pending} onClick={() => start(async () => { await saveBaseSchedule(castId, b); setMsg((await applyBaseSchedule(castId, month)).message); location.reload(); })}>この月に適用</button>
            <button className="btn" disabled={pending} title="基本出勤を登録している全員に適用" onClick={() => confirm("基本出勤がある全員の、この月の未設定の日に入れます。よろしいですか？") && start(async () => { setMsg((await applyBaseSchedule(castId, month, allCastIds)).message); location.reload(); })}>全員に適用</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
          {WD.map((w, d) => {
            const v = b[String(d)];
            return (
              <div key={d} className="rounded-md bg-zinc-950/40 p-2 text-xs ring-1 ring-zinc-800">
                <div className="mb-1 font-medium">{w}</div>
                <select value={v ? (v.off ? "off" : "on") : ""} onChange={(e) => { const x = e.target.value; const n = { ...b }; if (!x) delete n[String(d)]; else n[String(d)] = x === "off" ? { start: "", end: "", off: true } : { start: v?.start || "12:00", end: v?.end || "22:00" }; setB(n); }} className="input mb-1 w-full py-1">
                  <option value="">なし</option>
                  <option value="on">出勤</option>
                  <option value="off">休み</option>
                </select>
                {v && !v.off && (
                  <>
                    <select value={v.start} onChange={(e) => setB({ ...b, [String(d)]: { ...v, start: e.target.value } })} className="input mb-1 w-full py-1">{times.map((t) => <option key={t} value={t}>{show(t)}</option>)}</select>
                    <select value={v.end} onChange={(e) => setB({ ...b, [String(d)]: { ...v, end: e.target.value } })} className="input w-full py-1">{times.map((t) => <option key={t} value={t}>{show(t)}</option>)}</select>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-500">「適用」は、その月で未設定の日だけに入ります（すでに入っている出勤・休みは上書きしません）。</p>
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{castName} さんの出勤情報</h2>
          <div className="flex items-center gap-2">
            {msg && <span className="text-sm text-emerald-300">{msg}</span>}
            <button className="btn-primary" disabled={pending || !dirty.size} onClick={() => start(async () => { await saveWeek([...dirty].map((d) => get(d))); setDirty(new Set()); setMsg("保存しました（サイトへ更新）"); })}>保存（{dirty.size}日）</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {WD.map((w) => <div key={w} className="py-1 text-center text-zinc-500">{w}</div>)}
          {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
          {dates.map((date) => {
            const c = get(date);
            const st = state(c);
            return (
              <div key={date} className={`rounded-md p-1.5 ring-1 ${date === today ? "ring-violet-500" : "ring-zinc-800"} ${dirty.has(date) ? "bg-amber-950/30" : "bg-zinc-950/40"}`}>
                <div className="mb-1 text-zinc-400">{Number(date.slice(8))}</div>
                <select value={st} onChange={(e) => { const x = e.target.value; set(x === "off" ? { ...c, off: true, start: "", end: "" } : x === "on" ? { ...c, off: false, start: c.start || "12:00", end: c.end || "22:00" } : { ...c, off: false, start: "", end: "" }); }} className={`input w-full px-1 py-0.5 text-[11px] ${st === "on" ? "text-emerald-300" : st === "off" ? "text-zinc-500" : ""}`}>
                  <option value="unset">未設定</option>
                  <option value="on">出勤</option>
                  <option value="off">休み</option>
                </select>
                {st === "on" && (
                  <div className="mt-1 space-y-0.5">
                    <select value={c.start} onChange={(e) => set({ ...c, start: e.target.value })} className="input w-full px-1 py-0.5 text-[11px]">{times.map((t) => <option key={t} value={t}>{show(t)}</option>)}</select>
                    <select value={c.end} onChange={(e) => set({ ...c, end: e.target.value })} className="input w-full px-1 py-0.5 text-[11px]">{times.map((t) => <option key={t} value={t}>{show(t)}</option>)}</select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
