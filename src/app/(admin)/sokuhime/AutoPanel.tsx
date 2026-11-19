"use client";
import { useState, useTransition } from "react";
import { saveSokuhimeSettings } from "./actions";

type S = { sokuhimeOrder: "priority" | "random"; sokuhimeBatch: number; sokuhimePriority: "early" | "late" | "list"; sokuhimeIntervalMin: number; sokuhimeActive: boolean };

export function AutoPanel({ initial, dayChangeHour, targets }: { initial: S; dayChangeHour: number; targets: { name: string; auto: boolean }[] }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const save = (p: Partial<S>) => {
    const next = { ...s, ...p };
    setS(next);
    start(async () => setMsg((await saveSokuhimeSettings(next)).message));
  };
  return (
    <section className="card mb-4 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-400">日付変更時間 {dayChangeHour}:00</span>
        <span className={`badge ${s.sokuhimeActive ? "text-emerald-300 ring-emerald-800" : "text-zinc-500 ring-zinc-700"}`}>{s.sokuhimeActive ? "自動更新中" : "停止中"}</span>
        <select value={s.sokuhimeOrder} onChange={(e) => setS({ ...s, sokuhimeOrder: e.target.value as S["sokuhimeOrder"] })} className="input">
          <option value="priority">優先順</option>
          <option value="random">ランダム</option>
        </select>
        で
        <select value={s.sokuhimeBatch} onChange={(e) => setS({ ...s, sokuhimeBatch: Number(e.target.value) })} className="input">
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}人ずつ</option>)}
          <option value={0}>全員同時</option>
        </select>
        <select value={s.sokuhimeIntervalMin} onChange={(e) => setS({ ...s, sokuhimeIntervalMin: Number(e.target.value) })} className="input">
          {[10, 15, 20, 30, 45, 60, 90, 120].map((n) => <option key={n} value={n}>{n}分ごと</option>)}
        </select>
        更新　優先順位
        <select value={s.sokuhimePriority} onChange={(e) => setS({ ...s, sokuhimePriority: e.target.value as S["sokuhimePriority"] })} className="input">
          <option value="early">先に出勤している人優先</option>
          <option value="late">後から出勤した人優先</option>
          <option value="list">女性一覧の並び順</option>
        </select>
        <div className="ml-auto flex gap-2">
          {s.sokuhimeActive ? (
            <button className="btn" disabled={pending} onClick={() => save({ sokuhimeActive: false })}>止める</button>
          ) : (
            <button className="btn-primary" disabled={pending} onClick={() => save({ sokuhimeActive: true })}>自動更新を開始</button>
          )}
          <button className="btn" disabled={pending} onClick={() => save({})}>設定を保存</button>
        </div>
      </div>
      <div className="mt-3 text-xs text-zinc-400">
        更新対象 {targets.length} コンテンツ：
        {targets.length ? targets.map((t) => `${t.name}${t.auto ? "" : "（接続準備中）"}`).join("、") : "「コンテンツ更新」で種別「即姫」の枠を追加すると対象になります"}
        <div className="mt-1 text-zinc-500">公式サイトへは、下で待機中・接客中を切り替えた時点ですぐ反映されます。</div>
      </div>
      {msg && <p className="mt-2 text-sm text-emerald-300">{msg}</p>}
    </section>
  );
}
