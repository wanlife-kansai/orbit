"use client";
import { useMemo, useState, useTransition } from "react";
import { saveWeek, type Cell } from "./actions";

type Props = {
  dates: { date: string; label: string; isToday: boolean }[];
  casts: { id: number; name: string }[];
  initial: Cell[];
  dayChangeHour: number;
};

const key = (castId: number, date: string) => `${castId}_${date}`;

export function WeekGrid({ dates, casts, initial, dayChangeHour }: Props) {
  const times = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 48; i++) {
      const m = (dayChangeHour * 60 + i * 30) % (24 * 60);
      out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return out;
  }, [dayChangeHour]);
  const showTime = (t: string) => (Number(t.slice(0, 2)) < dayChangeHour ? `翌${t}` : t);

  const [cells, setCells] = useState<Record<string, Cell>>(() => Object.fromEntries(initial.map((c) => [key(c.castId, c.date), c])));
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  const get = (castId: number, date: string): Cell => cells[key(castId, date)] ?? { castId, date, start: "", end: "", off: false };
  const set = (c: Cell) => {
    const k = key(c.castId, c.date);
    setCells((p) => ({ ...p, [k]: c }));
    setDirty((p) => new Set(p).add(k));
    setMsg("");
  };

  const counts = dates.map((d) => casts.filter((c) => {
    const x = get(c.id, d.date);
    return !x.off && x.start && x.end;
  }).length);

  const save = () =>
    start(async () => {
      await saveWeek([...dirty].map((k) => cells[k]));
      setDirty(new Set());
      setMsg("保存しました");
    });

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={pending || dirty.size === 0}>
          {pending ? "保存中…" : `保存する${dirty.size ? `（${dirty.size}件の変更）` : ""}`}
        </button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr>
              <th className="th sticky left-0 bg-zinc-900 w-32">名前</th>
              {dates.map((d, i) => (
                <th key={d.date} className={`th text-center ${d.isToday ? "text-violet-300" : ""}`}>
                  {d.label}
                  <div className="text-[11px] font-normal text-zinc-500">{counts[i]}名</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {casts.map((c) => (
              <tr key={c.id}>
                <td className="td sticky left-0 bg-zinc-900 font-medium">{c.name}</td>
                {dates.map((d) => {
                  const x = get(c.id, d.date);
                  const k = key(c.id, d.date);
                  return (
                    <td key={d.date} className={`td align-top ${dirty.has(k) ? "bg-violet-950/40" : ""} ${d.isToday ? "bg-zinc-800/40" : ""}`}>
                      {x.off ? (
                        <button className="w-full rounded bg-zinc-800 py-1 text-xs text-zinc-400" onClick={() => set({ ...x, off: false })}>
                          休み
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <select value={x.start} onChange={(e) => set({ ...x, start: e.target.value })} className="input w-full px-1 py-1 text-xs">
                            <option value="">--</option>
                            {times.map((t) => (
                              <option key={t} value={t}>{showTime(t)}</option>
                            ))}
                          </select>
                          <select value={x.end} onChange={(e) => set({ ...x, end: e.target.value })} className="input w-full px-1 py-1 text-xs">
                            <option value="">--</option>
                            {times.map((t) => (
                              <option key={t} value={t}>{showTime(t)}</option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <button className="flex-1 rounded text-[11px] text-zinc-500 hover:text-zinc-300" onClick={() => set({ ...x, off: true, start: "", end: "" })}>
                              休み
                            </button>
                            {(x.start || x.end) && (
                              <button className="flex-1 rounded text-[11px] text-zinc-500 hover:text-zinc-300" onClick={() => set({ ...x, start: "", end: "" })}>
                                消す
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
