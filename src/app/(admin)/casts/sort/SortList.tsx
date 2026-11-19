"use client";
import { useState, useTransition } from "react";
import { reorderCasts, savePinned } from "../actions";

type Shift = { start: string; end: string } | null;
type Item = { id: number; name: string; photo: string | null; isPublished: boolean; isNew: boolean; pinned: boolean; kana: string; romaji: string; joinedOn: string; createdAt: string; today: Shift; tomorrow: Shift; working: boolean };

const PRESETS = ["登録日付順", "入店日順", "50音順", "ABC順", "当日出勤順", "現在出勤中順", "翌日出勤順", "ランダム（当日出勤）", "ランダム（翌日出勤）"] as const;

export function SortList({ items, dayChangeHour }: { items: Item[]; dayChangeHour: number }) {
  const [list, setList] = useState(items);
  const [drag, setDrag] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [preset, setPreset] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const mins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h < dayChangeHour ? h + 24 : h) * 60 + m;
  };

  /** 固定枠を先頭に保ったまま並べ替える */
  const apply = (fn: (a: Item[]) => Item[]) => {
    const pinned = list.filter((x) => x.pinned);
    const rest = list.filter((x) => !x.pinned);
    setList([...pinned, ...fn(rest)]);
    setDirty(true);
    setMsg("");
  };
  const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  const byShift = (key: "today" | "tomorrow", random = false) => (a: Item[]) => {
    const on = a.filter((x) => x[key]);
    const off = a.filter((x) => !x[key]);
    return [...(random ? shuffle(on) : on.sort((p, q) => mins(p[key]!.start) - mins(q[key]!.start))), ...off];
  };
  const runPreset = () => {
    const p = preset as (typeof PRESETS)[number];
    const cmp = (f: (x: Item) => string) => (a: Item[]) => [...a].sort((p1, q1) => f(p1).localeCompare(f(q1), "ja"));
    const fns: Record<(typeof PRESETS)[number], (a: Item[]) => Item[]> = {
      登録日付順: (a) => [...a].sort((x, y) => y.createdAt.localeCompare(x.createdAt)),
      入店日順: (a) => [...a].sort((x, y) => (y.joinedOn || "").localeCompare(x.joinedOn || "")),
      "50音順": cmp((x) => x.kana || x.name),
      ABC順: cmp((x) => x.romaji || "~"),
      当日出勤順: byShift("today"),
      現在出勤中順: (a) => [...a.filter((x) => x.working), ...a.filter((x) => !x.working)],
      翌日出勤順: byShift("tomorrow"),
      "ランダム（当日出勤）": byShift("today", true),
      "ランダム（翌日出勤）": byShift("tomorrow", true),
    };
    if (fns[p]) apply(fns[p]);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const n = [...list];
    const [x] = n.splice(from, 1);
    n.splice(to, 0, x);
    setList(n);
    setDirty(true);
    setMsg("");
  };
  const togglePin = (id: number) => {
    const n = list.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x));
    setList([...n.filter((x) => x.pinned), ...n.filter((x) => !x.pinned)]);
    setDirty(true);
  };
  const time = (s: Shift) => (s ? `${s.start}〜${s.end}` : "");

  return (
    <>
      <div className="card mb-3 flex flex-wrap items-center gap-2 p-3 text-sm">
        並び順：
        <select value={preset} onChange={(e) => setPreset(e.target.value)} className="input">
          <option value="">未選択</option>
          {PRESETS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className="btn" disabled={!preset} onClick={runPreset}>並び順を適用</button>
        <button className="btn" onClick={() => apply((a) => [...a.filter((x) => x.isNew), ...a.filter((x) => !x.isNew)])}>新人を先頭へ</button>
        <button className="btn" onClick={() => apply((a) => [...a.filter((x) => x.isPublished), ...a.filter((x) => !x.isPublished)])}>非公開を最後尾へ</button>
        <button className="btn" onClick={() => { setList(items); setDirty(false); }}>前回保存時に戻す</button>
        <div className="ml-auto flex items-center gap-2">
          {msg && <span className="text-emerald-300">{msg}</span>}
          {dirty && !msg && <span className="text-xs text-amber-300">未保存</span>}
          <button
            className="btn-primary"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                await savePinned(list.filter((x) => x.pinned).map((x) => x.id));
                await reorderCasts(list.map((x) => x.id));
                setDirty(false);
                setMsg("並び順を保存しました（サイトへ更新）");
              })
            }
          >
            {pending ? "保存中…" : "保存してサイトへ更新"}
          </button>
        </div>
      </div>
      {list.some((x) => x.pinned) && <div className="mb-1 text-xs text-zinc-400">並び替え固定枠</div>}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {list.map((x, i) => (
          <li
            key={x.id}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (drag !== null) move(drag, i);
              setDrag(null);
            }}
            className={`cursor-grab overflow-hidden rounded-lg bg-zinc-900 ring-1 ${drag === i ? "ring-violet-500 opacity-60" : x.pinned ? "ring-amber-600" : "ring-zinc-800"} ${x.isPublished ? "" : "opacity-50"}`}
          >
            <div className="relative aspect-[3/4] bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.photo && <img src={x.photo} alt="" className="h-full w-full object-cover" draggable={false} />}
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs">{i + 1}</span>
              <span className="absolute right-1 top-1 flex flex-col items-end gap-0.5">
                {x.isNew && <span className="rounded bg-pink-600 px-1 text-[10px]">新人</span>}
                {x.today && <span className="rounded bg-emerald-700 px-1 text-[10px]">出勤 {time(x.today)}</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 p-1.5">
              <span className="truncate text-xs">{x.name}</span>
              <span className="flex shrink-0 gap-0.5">
                <button className={`rounded px-1.5 text-xs ${x.pinned ? "bg-amber-600 text-black" : "bg-zinc-800"}`} onClick={() => togglePin(x.id)} title="固定枠">固</button>
                <button className="rounded bg-zinc-800 px-1.5 text-xs" onClick={() => move(i, i - 1)} aria-label="前へ">←</button>
                <button className="rounded bg-zinc-800 px-1.5 text-xs" onClick={() => move(i, i + 1)} aria-label="後ろへ">→</button>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
