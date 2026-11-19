"use client";
import { useActionState, useRef, useState } from "react";
import { ApiKeyField } from "./ApiKeyField";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { importOfficial, saveOfficial, testOfficial, type Msg } from "./actions";

const init: Msg = { ok: true, message: "", n: 0 };

function Note({ m }: { m: Msg }) {
  if (!m.message) return null;
  return <p className={`mt-3 text-sm ${m.ok ? "text-emerald-300" : "text-rose-400"}`}>{m.message}</p>;
}

export function OfficialPanel({ url, hasKey, linked, lastCheck }: { url: string; hasKey: boolean; linked: number; lastCheck: string }) {
  const [saveMsg, save, saving] = useActionState(saveOfficial, init);
  const [testMsg, test, testing] = useActionState(testOfficial, init);
  const [impMsg, imp, importing] = useActionState(importOfficial, init);
  const form = useRef<HTMLFormElement>(null);
  const ok = useRef(false);
  const [ask, setAsk] = useState(false);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">オフィシャル（公式サイト）</h2>
          <p className="mt-1 text-xs text-zinc-400">
            公式サイトに「受け取り口（API）」を付けて、女性・出勤・即姫をそのまま届けます。ロボットは使いません。
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {["女性", "出勤", "即姫"].map((s) => (
            <span key={s} className="badge text-violet-300 ring-violet-800">{s}</span>
          ))}
          {hasKey && url ? (
            <span className={`badge ${lastCheck === "OK" ? "text-emerald-300 ring-emerald-800" : "text-amber-300 ring-amber-800"}`}>
              {lastCheck === "OK" ? "接続OK" : "未確認"}
            </span>
          ) : (
            <span className="badge text-zinc-400 ring-zinc-700">未設定</span>
          )}
        </div>
      </div>

      <form
        ref={form}
        action={save}
        onSubmit={(e) => {
          if (ok.current) { ok.current = false; return; }
          e.preventDefault();
          setAsk(true);
        }}
        className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label className="label">公式サイトのURL</label>
          <input name="url" defaultValue={url} placeholder="https://biollante-osaka.com" className="input w-full" />
        </div>
        <div>
          <label className="label">APIキー（公式サイトの OFFICIAL_API_KEY と同じもの）</label>
          <ApiKeyField name="key" hasKey={hasKey} />
        </div>
        <div className="flex items-start pt-5">
          <button disabled={saving} className="btn-primary w-full">{saving ? "保存中…" : "保存して接続テスト"}</button>
        </div>
      </form>
      <Note m={saveMsg} />
      <ConfirmDialog
        open={ask}
        title="保存しますか？"
        message="公式サイトのURL・APIキーを保存して、接続テストをします。"
        onNo={() => setAsk(false)}
        onYes={() => { setAsk(false); ok.current = true; form.current?.requestSubmit(); }}
      />

      <div className="mt-5 flex flex-wrap items-start gap-6 border-t border-zinc-800 pt-5">
        <form action={test}>
          <button disabled={testing || !hasKey} className="btn">{testing ? "確認中…" : "接続テスト"}</button>
          <Note m={testMsg} />
        </form>

        <form action={imp} className="flex-1 min-w-[260px]">
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={importing || !hasKey} className="btn">{importing ? "取り込み中…" : "公式サイトから取り込む"}</button>
            <span className="text-xs text-zinc-400">いまつながっている女性：{linked}人</span>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" name="replaceAll" />
            ORBITの女性を全員入れ替える（いまORBITにいる女性・出勤を消して、公式サイトの女性だけにする）
          </label>
          <p className="mt-1 text-xs text-zinc-500">女性のプロフィール・今日から2週間の出勤・今日の待ち時間を、公式サイトからORBITへ写します。公式サイト側は変わりません。</p>
          <Note m={impMsg} />
        </form>
      </div>
    </section>
  );
}
