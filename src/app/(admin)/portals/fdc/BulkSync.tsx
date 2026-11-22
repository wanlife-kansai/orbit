"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PlanRow } from "@/lib/portals/fdc";
import { batchesAction, planAction, restoreManyAction, sendManyAction } from "./actions";

const jst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const add = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

type Batch = { batch: string; n: number; left: number; at: string };

/** キャスト全員・期間まとめて：比べる → 違うところだけ送る → 必要なら元に戻す */
export function BulkSync() {
  const today = jst();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(add(today, 6));
  const [rows, setRows] = useState<PlanRow[] | null>(null);
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [log, setLog] = useState<{ t: string; ok: boolean }[]>([]);
  const [onlyDiff, setOnlyDiff] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const stop = useRef(false);
  const say = (t: string, ok = true) => setLog((x) => [...x, { t, ok }]);

  const loadBatches = async () => setBatches(await batchesAction());
  useEffect(() => {
    loadBatches();
  }, []);

  const diff = useMemo(() => (rows ?? []).filter((r) => !r.same), [rows]);
  const shown = useMemo(() => (rows ?? []).filter((r) => !onlyDiff || !r.same), [rows, onlyDiff]);

  async function compare() {
    setBusy("比べています…（データセンターの出勤表を読んでいます）");
    const r = await planAction(from, to);
    setBusy("");
    if (!r.ok) return say(r.message, false);
    setRows(r.rows);
    const casts = new Set(r.rows.map((x) => x.castId)).size;
    setInfo(
      `${casts}人 × ${md(from)}〜${md(to)}：同じ ${r.rows.filter((x) => x.same).length}件・違う ${r.rows.filter((x) => !x.same).length}件` +
        (r.unmatched.length ? `／データセンターにいてORBITで見つからない人：${r.unmatched.join("、")}` : "") +
        (r.notInFdc ? `／ORBITにいてデータセンターに出勤表がない人：${r.notInFdc}人（非公開など）` : ""),
    );
  }

  async function send() {
    if (!diff.length) return;
    if (!confirm(`違う ${diff.length}件 をORBITの出勤で上書きして、風俗データセンター（公式サイト）へ送ります。\n送る前の値は保存され、あとで元に戻せます。よろしいですか？`)) return;
    const batch = `${today}-${Date.now().toString(36)}`;
    stop.current = false;
    setProgress({ done: 0, total: diff.length });
    setBusy("送っています…");
    let ok = 0, ng = 0;
    for (let i = 0; i < diff.length && !stop.current; i += 40) {
      const chunk = diff.slice(i, i + 40).map((r) => ({ castId: r.castId, itemId: r.itemId, date: r.date, before: { from: r.fdc.from, to: r.fdc.to, freeText: r.fdc.freeText, label: r.fdc.label } }));
      const r = await sendManyAction(batch, chunk).catch(() => null);
      if (!r || !r.ok) {
        say(r && !r.ok ? r.message : "通信エラーで止まりました（もう一度「比べる」から続きを送れます）", false);
        break;
      }
      for (const x of r.results) x.ok ? ok++ : (ng++, say(`× ${rows?.find((y) => y.castId === x.castId)?.name} ${md(x.date)}：${x.shown}`, false));
      setProgress({ done: Math.min(i + 40, diff.length), total: diff.length });
    }
    setBusy("");
    say(`送信 ${ok}件${ng ? `・失敗 ${ng}件` : ""}（記録：${batch}）`, ng === 0);
    await loadBatches();
    await compare();
  }

  async function restore(batch: string) {
    if (!confirm("この送信の前の値に、データセンターを戻します。よろしいですか？")) return;
    setBusy("元に戻しています…");
    let total = 0;
    for (let i = 0; i < 100; i++) {
      const r = await restoreManyAction(batch).catch(() => null);
      if (!r || !r.ok) {
        say(r && !r.ok ? r.message : "通信エラーで止まりました（もう一度押すと続きから戻します）", false);
        break;
      }
      total += r.done;
      if (r.left === 0 || r.done === 0) break;
    }
    setBusy("");
    say(`元に戻しました：${total}件`);
    await loadBatches();
    if (rows) await compare();
  }

  return (
    <div className="card mt-8 p-5">
      <h2 className="text-lg font-bold">キャスト全員・期間をまとめて</h2>
      <p className="mt-1 text-sm text-zinc-400">
        データセンターに出勤表がある全員について、ORBITの出勤と見比べ、違うところだけを送ります。件数の上限はありません。
        送る前の値はすべて保存され、送信ごとに元に戻せます。ORBITで出勤を入れていない日は送りません。
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="bulk-from">いつから</label>
          <input id="bulk-from" type="date" className="input" value={from} min={today} max={add(today, 34)} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="bulk-to">いつまで</label>
          <input id="bulk-to" type="date" className="input" value={to} min={from} max={add(today, 34)} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn" onClick={() => { setFrom(today); setTo(today); }}>今日だけ</button>
        <button className="btn" onClick={() => { setFrom(today); setTo(add(today, 34)); }}>35日すべて</button>
        <button className="btn-primary" disabled={!!busy} onClick={compare}>比べる</button>
        <button className="btn-primary" disabled={!!busy || !diff.length} onClick={send}>違う {diff.length}件 を送る</button>
        {busy && progress.total > 0 && <button className="btn" onClick={() => (stop.current = true)}>止める</button>}
      </div>

      {busy && (
        <p className="mt-3 text-sm text-zinc-400">
          {busy}
          {progress.total > 0 && ` ${progress.done} / ${progress.total}件`}
        </p>
      )}
      {info && <p className="mt-3 text-sm font-bold">{info}</p>}
      <div className="mt-2 space-y-0.5 text-sm" id="bulk-log">
        {log.map((l, i) => (
          <div key={i} className={l.ok ? "text-emerald-300" : "text-rose-300"}>{l.t}</div>
        ))}
      </div>

      {rows && (
        <div className="mt-4">
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
            違うところだけ表示
          </label>
          <div className="max-h-[480px] overflow-auto rounded-lg border border-zinc-700/70">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr>
                  <th className="th">日付</th>
                  <th className="th">女性</th>
                  <th className="th">ORBIT（送る値）</th>
                  <th className="th">データセンター（今）</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={`${r.itemId}_${r.date}`} className={r.same ? "" : "bg-amber-500/10"}>
                    <td className="td tnum">{md(r.date)}</td>
                    <td className="td font-bold">{r.name}</td>
                    <td className="td tnum">{r.orbit ? r.orbit.label : <span className="text-zinc-500">未設定（送らない）</span>}</td>
                    <td className="td tnum">{r.fdc.label || r.fdc.from}</td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td className="td text-zinc-500" colSpan={4}>違うところはありません。ORBITとデータセンターの出勤は同じです。</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {batches.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold">これまでのまとめて送信</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {batches.map((b) => (
              <li key={b.batch} className="flex flex-wrap items-center gap-3">
                <span className="tnum text-zinc-400">{b.at.slice(0, 16)}</span>
                <span>{b.n}件{b.left === 0 ? "（元に戻し済み）" : ""}</span>
                {b.left > 0 && <button className="btn py-1 text-xs" disabled={!!busy} onClick={() => restore(b.batch)}>送る前に戻す（{b.left}件）</button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
