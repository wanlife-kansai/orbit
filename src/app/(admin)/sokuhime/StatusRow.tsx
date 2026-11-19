"use client";
import { useState, useTransition } from "react";
import { setStatus } from "./actions";
import type { RosterRow } from "@/lib/queries";

export function StatusRow({ r, date, timeLabel }: { r: RosterRow; date: string; timeLabel: string }) {
  const [pending, start] = useTransition();
  const [until, setUntil] = useState(r.until || "");
  const [comment, setComment] = useState(r.comment);
  const run = (p: Parameters<typeof setStatus>[2]) => start(() => setStatus(r.castId, date, p));
  const disabled = pending || r.state === "done";

  return (
    <div className={`card p-4 ${r.state === "done" ? "opacity-40" : ""} ${r.excluded ? "ring-zinc-700 border-dashed" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">
            {r.name}
            {r.age ? <span className="ml-1 text-xs text-zinc-400">{r.age}歳</span> : null}
          </div>
          <div className="text-xs text-zinc-400 tabular-nums">
            {timeLabel}
            {r.state === "before" && " ・出勤前"}
            {r.state === "done" && " ・退勤"}
          </div>
        </div>
        <label className="flex items-center gap-1 text-xs text-zinc-400">
          <input type="checkbox" checked={r.excluded} disabled={pending} onChange={(e) => run({ excluded: e.target.checked })} />
          配信から除外
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          disabled={disabled || r.state === "before"}
          onClick={() => run({ status: "waiting", until: "" })}
          className={`rounded-md px-3 py-2 text-sm ring-1 ${r.status === "waiting" ? "bg-emerald-600 text-white ring-emerald-500" : "ring-zinc-700 hover:bg-zinc-800"} disabled:opacity-40`}
        >
          待機中
        </button>
        <div className="flex items-center gap-1">
          <button
            disabled={disabled || !until}
            onClick={() => run({ status: "serving", until })}
            className={`rounded-md px-3 py-2 text-sm ring-1 ${r.status === "serving" ? "bg-amber-600 text-white ring-amber-500" : "ring-zinc-700 hover:bg-zinc-800"} disabled:opacity-40`}
          >
            接客中
          </button>
          <input type="time" step={600} value={until} onChange={(e) => setUntil(e.target.value)} className="input px-2 py-1.5" aria-label="接客終了予定" />
          <span className="text-xs text-zinc-500">まで</span>
        </div>
        <button disabled={disabled || r.status === "none"} onClick={() => run({ status: "none", until: "" })} className="btn">
          解除
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="一言コメント" className="input flex-1" />
        <button disabled={pending || comment === r.comment} onClick={() => run({ comment })} className="btn">
          保存
        </button>
      </div>
    </div>
  );
}
