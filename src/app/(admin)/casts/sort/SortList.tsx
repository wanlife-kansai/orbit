"use client";
import { useState, useTransition } from "react";
import { reorderCasts } from "../actions";

type Item = { id: number; name: string; photo: string | null; isPublished: boolean };

export function SortList({ items }: { items: Item[] }) {
  const [list, setList] = useState(items);
  const [drag, setDrag] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const n = [...list];
    const [x] = n.splice(from, 1);
    n.splice(to, 0, x);
    setList(n);
    setDirty(true);
    setMsg("");
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <button className="btn-primary" disabled={pending || !dirty} onClick={() => start(async () => {
          await reorderCasts(list.map((x) => x.id));
          setDirty(false);
          setMsg("並び順を保存しました");
        })}>
          {pending ? "保存中…" : "並び順を保存"}
        </button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
        {dirty && !msg && <span className="text-xs text-amber-300">未保存</span>}
      </div>
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
            className={`cursor-grab overflow-hidden rounded-lg bg-zinc-900 ring-1 ${drag === i ? "ring-violet-500 opacity-60" : "ring-zinc-800"} ${x.isPublished ? "" : "opacity-50"}`}
          >
            <div className="relative aspect-[3/4] bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.photo && <img src={x.photo} alt="" className="h-full w-full object-cover" draggable={false} />}
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs">{i + 1}</span>
            </div>
            <div className="flex items-center justify-between gap-1 p-1.5">
              <span className="truncate text-xs">{x.name}</span>
              <span className="flex shrink-0 gap-0.5">
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
