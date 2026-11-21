"use client";
import { useRef, useState } from "react";
import { connectVenrey, finishImport, importGirlsStep, importRestStep } from "./actions";

type Line = { text: string; tone?: "ok" | "err" | "dim" };

export function ImportRunner({ savedId, hasSaved, lastImportAt, lastSummary }: { savedId: string; hasSaved: boolean; lastImportAt: string; lastSummary: string }) {
  const [id, setId] = useState(savedId);
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [opts, setOpts] = useState({ girls: true, schedules: true, templates: true, contents: true });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [log, setLog] = useState<Line[]>([]);
  const stop = useRef(false);
  const add = (l: Line) => setLog((x) => [...x, l]);

  async function run() {
    setRunning(true);
    stop.current = false;
    setLog([]);
    const summary: string[] = [];
    try {
      add({ text: "Mr.Venreyに接続しています…", tone: "dim" });
      const c = await connectVenrey(id, pw, remember);
      if (!c.ok) return add({ text: c.message, tone: "err" });
      add({ text: `接続しました。女性 ${c.girls.length}人`, tone: "ok" });

      if (opts.girls) {
        setProgress({ done: 0, total: c.girls.length });
        let created = 0, updated = 0, photos = 0, errors = 0, done = 0;
        // 2人ずつを3本並行で。通信が切れたら少し待って最大3回やり直す
        const batches: number[][] = [];
        for (let i = 0; i < c.girls.length; i += 2) batches.push(c.girls.slice(i, i + 2).map((g) => g.id));
        let next = 0;
        let fatal = "";
        const worker = async () => {
          while (!stop.current && !fatal && next < batches.length) {
            const batch = batches[next++];
            let r: Awaited<ReturnType<typeof importGirlsStep>> | null = null;
            for (let t = 0; t < 3 && !r; t++) {
              try {
                r = await importGirlsStep(c.session, batch);
              } catch {
                await new Promise((ok) => setTimeout(ok, 3000 * (t + 1)));
              }
            }
            if (!r) {
              errors += batch.length;
              add({ text: `× 通信エラー：${batch.map((id) => c.girls.find((g) => g.id === id)?.name).join("・")}（もう一度実行すると続きから入ります）`, tone: "err" });
            } else if (!r.ok) {
              fatal = r.message;
            } else {
              for (const x of r.results) {
                if (x.error) {
                  errors++;
                  add({ text: `× ${c.girls.find((g) => g.id === x.id)?.name}：${x.error}`, tone: "err" });
                } else {
                  x.created ? created++ : updated++;
                  photos += x.photos;
                }
              }
            }
            done += batch.length;
            setProgress({ done, total: c.girls.length });
          }
        };
        await Promise.all([worker(), worker(), worker()]);
        if (fatal) add({ text: fatal, tone: "err" });
        const line = `女性：新規 ${created}人・更新 ${updated}人、写真 ${photos}枚を追加${errors ? `、エラー ${errors}件` : ""}`;
        summary.push(line);
        add({ text: line, tone: errors ? "err" : "ok" });
      }
      for (const [key, label] of [
        ["schedules", "出勤"],
        ["templates", "テンプレート"],
        ["contents", "コンテンツ枠"],
      ] as const) {
        if (!opts[key] || stop.current) continue;
        add({ text: `${label}を取り込んでいます…`, tone: "dim" });
        const r = await importRestStep(c.session, key);
        if (!r.ok) {
          add({ text: `${label}：${r.message}`, tone: "err" });
          continue;
        }
        summary.push(r.message);
        add({ text: r.message, tone: "ok" });
        if (r.detail?.length) add({ text: `ORBITに枠がないため未登録：${r.detail.join("、")}`, tone: "dim" });
      }
      await finishImport(summary.join("\n"));
      add({ text: stop.current ? "途中で止めました" : "取り込みが終わりました", tone: "ok" });
    } catch (e) {
      add({ text: e instanceof Error ? e.message : String(e), tone: "err" });
    } finally {
      setRunning(false);
      setPw("");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="card space-y-4 p-5">
        <div>
          <label className="label">Mr.Venrey の店舗ID</label>
          <input value={id} onChange={(e) => setId(e.target.value)} className="input w-full" placeholder="例：4946" autoComplete="off" />
        </div>
        <div>
          <label className="label">Mr.Venrey のパスワード{hasSaved && "（保存済み：空欄のままでOK）"}</label>
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" className="input w-full" autoComplete="new-password" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          ID・パスワードを保存する（暗号化して保存。次回から空欄で取り込めます）
        </label>
        <div className="space-y-1 text-sm">
          <div className="label">取り込む内容</div>
          {(
            [
              ["girls", "女性（プロフィール・コメント・Q&A・各サイト項目・別名・写真・並び順）"],
              ["schedules", "出勤（基本出勤＋先月〜再来月）"],
              ["templates", "テンプレート"],
              ["contents", "コンテンツ更新の枠（停止中で登録）"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} />
              {l}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={running || !id || (!pw && !hasSaved)} onClick={run}>
            {running ? "取り込み中…" : "取り込みを開始"}
          </button>
          {running && (
            <button className="btn" onClick={() => (stop.current = true)}>
              止める
            </button>
          )}
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          何度実行しても重複しません（Mr.Venreyの内容で上書き）。ORBITで手で追加した女性・写真はそのままです。
          ポータルのID・パスワードは取り込まないので、取り込んだだけでORBITからポータルへ配信されることはありません。
        </p>
        {lastImportAt && (
          <div className="rounded-md bg-zinc-800/60 p-3 text-xs text-zinc-300">
            前回：{new Date(lastImportAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
            <pre className="mt-1 whitespace-pre-wrap font-sans text-zinc-400">{lastSummary}</pre>
          </div>
        )}
      </div>

      <div className="card p-5">
        {progress.total > 0 && (
          <div className="mb-4">
            <div className="mb-1 text-xs text-zinc-400">
              女性 {progress.done} / {progress.total}人
            </div>
            <div className="h-2 overflow-hidden rounded bg-zinc-800">
              <div className="h-full bg-violet-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="space-y-1 text-sm" id="import-log">
          {log.length === 0 && <p className="text-zinc-500">ここに進み具合が出ます。</p>}
          {log.map((l, i) => (
            <div key={i} className={l.tone === "ok" ? "text-emerald-300" : l.tone === "err" ? "text-rose-300" : "text-zinc-400"}>
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
