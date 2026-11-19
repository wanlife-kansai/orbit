"use client";
import { useState, useTransition } from "react";
import { saveSettings, type ShopBasics } from "./actions";
import type { ShopSettings } from "@/lib/settings";

const TABS = [
  { key: "basic", label: "基本設定" },
  { key: "schedule", label: "出勤設定" },
  { key: "girl", label: "女性設定" },
  { key: "sokuhime", label: "即姫・接客一括更新" },
  { key: "other", label: "その他" },
];
const HOURS = (from: number) => Array.from({ length: 24 }, (_, i) => { const h = (from + i) % 24; return `${String(h).padStart(2, "0")}:00`; });

export function SettingsForm({ tab: tab0, basics, initial, sites, build }: { tab: string; basics: ShopBasics; initial: ShopSettings; sites: { code: string; name: string }[]; build: string }) {
  const [tab, setTab] = useState(tab0);
  const [b, setB] = useState(basics);
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const up = (p: Partial<ShopSettings>) => { setS({ ...s, ...p }); setMsg(""); };
  const chk = (k: keyof ShopSettings, label: string, note?: string) => (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" checked={!!s[k]} onChange={(e) => up({ [k]: e.target.checked } as Partial<ShopSettings>)} />
      <span>{label}{note && <span className="block text-xs text-zinc-500">{note}</span>}</span>
    </label>
  );
  const show = (t: string) => (Number(t.slice(0, 2)) < b.dayChangeHour ? `翌${t}` : t);
  const save = () => start(async () => setMsg((await saveSettings(b, s)).message));

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      <nav className="card h-fit p-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`block w-full rounded-md px-3 py-2 text-left text-sm ${tab === t.key ? "bg-violet-600/20 text-violet-200" : "hover:bg-zinc-800"}`}>{t.label}</button>
        ))}
      </nav>
      <div className="card max-w-3xl space-y-5 p-5">
        {tab === "basic" && (
          <>
            <div>
              <div className="label">店舗名</div>
              <input value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} className="input w-full" />
            </div>
            <div>
              <div className="label">更新時間帯（コンテンツ更新画面で個別にも設定できます）</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-1"><input type="radio" checked={s.hoursMode === "24h"} onChange={() => up({ hoursMode: "24h" })} />24時間</label>
                <label className="flex items-center gap-1"><input type="radio" checked={s.hoursMode === "range"} onChange={() => up({ hoursMode: "range" })} />時間指定</label>
                {s.hoursMode === "range" && (
                  <>
                    <select value={s.hoursFrom} onChange={(e) => up({ hoursFrom: e.target.value })} className="input">{HOURS(b.dayChangeHour + 1).map((t) => <option key={t} value={t}>{show(t)}</option>)}</select>〜
                    <select value={s.hoursTo} onChange={(e) => up({ hoursTo: e.target.value })} className="input">{HOURS(b.dayChangeHour).map((t) => { const x = `${t.slice(0, 2)}:59`; return <option key={x} value={x}>{show(x)}</option>; })}</select>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="label">日付変更時間</div>
              <select value={b.dayChangeHour} onChange={(e) => setB({ ...b, dayChangeHour: Number(e.target.value) })} className="input">
                {Array.from({ length: 13 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
              <p className="mt-1 text-xs text-zinc-500">この時刻より前は前日の営業として扱います。</p>
            </div>
            <div>
              <div className="label">オフィシャルURL</div>
              <input value={b.officialUrl} onChange={(e) => setB({ ...b, officialUrl: e.target.value })} className="input w-full" placeholder="https://" />
            </div>
            <div>
              <div className="label">オフィシャルメールアドレス</div>
              <input value={s.officialEmail} onChange={(e) => up({ officialEmail: e.target.value })} className="input w-full" />
            </div>
            <div>
              <div className="label">ご連絡用メールアドレス（必須）</div>
              <input value={b.email} onChange={(e) => setB({ ...b, email: e.target.value })} className="input w-full" />
            </div>
            {chk("notifyMail", "お知らせメールを受信する", "メンテナンス等のお知らせはチェック状態にかかわらず送ります")}
          </>
        )}
        {tab === "schedule" && (
          <>
            {chk("convertMidnight", "出勤更新時に「翌0:00」を「23:59」に変換して更新する")}
            {chk("unsetDeletes", "「未設定」の場合、サイト側の出勤情報を削除する")}
            <div>
              <div className="label">更新・取り込み期間（対象サイトのみ）</div>
              <select value={s.schedulePeriod} onChange={(e) => up({ schedulePeriod: e.target.value as "1w" | "2w" })} className="input">
                <option value="1w">1週間</option>
                <option value="2w">2週間</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="label">出勤取り込み設定</div>
              {chk("importOffAsUnset", "休みを未設定で取り込む")}
              {chk("importUnsetAsOff", "未設定を休みで取り込む")}
              {chk("importNoComment", "コメントは取り込まない")}
            </div>
            <div className="space-y-2">
              <div className="label">出勤表示設定</div>
              {chk("weekStartsMonday", "週間スケジュールを月曜はじまりで表示する")}
            </div>
          </>
        )}
        {tab === "girl" && (
          <>
            {chk("photoPatterns", "画像パターンを有効にする", "サイトごとに女性画像を変えたい場合にチェック")}
            {chk("deleteExtraPhotos", "サイト側の画像枚数の方が多い場合は削除する")}
            <div>
              <div className="label">共通Q&Aの更新対象サイト（各サイトのQ&A項目を同じ内容で更新）</div>
              <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
                {sites.map((x) => (
                  <label key={x.code} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.commonQaSites.includes(x.code)} onChange={(e) => up({ commonQaSites: e.target.checked ? [...s.commonQaSites, x.code] : s.commonQaSites.filter((c) => c !== x.code) })} />
                    {x.name}
                  </label>
                ))}
              </div>
            </div>
            {chk("importQaToCommon", "女性取り込み時、共通Q&Aタブへ取り込む", "オートシンクロ（女性）を含む")}
          </>
        )}
        {tab === "sokuhime" && (
          <>
            <div>
              <div className="label">指定時刻になると、自動更新中のタイマーを再スタートします</div>
              <div className="flex items-center gap-2">
                <input type="time" value={s.sokuhimeRestartAt} onChange={(e) => up({ sokuhimeRestartAt: e.target.value })} className="input" />
                <button className="btn" onClick={() => up({ sokuhimeRestartAt: "" })}>指定解除</button>
              </div>
            </div>
            <p className="text-xs text-zinc-500">更新の順番・人数・間隔は「即姫・接客一括更新」画面で設定します。</p>
          </>
        )}
        {tab === "other" && (
          <>
            <div className="space-y-2">
              <div className="label">オートシンクロ設定（保存したらすぐサイトへ反映する）</div>
              {chk("autoSyncSchedule", "出勤更新時、オフィシャル（公式サイト）を対象にする")}
              {chk("autoSyncGirl", "女性更新時、オフィシャル（公式サイト）を対象にする")}
              <p className="text-xs text-zinc-500">ポータルへのオートシンクロは、各サイトの接続ができ次第ここで選べるようになります。</p>
            </div>
            <div>
              <div className="label">AIコメント生成の月間上限</div>
              <input type="number" min={0} max={1000} value={s.aiMonthlyLimit} onChange={(e) => up({ aiMonthlyLimit: Number(e.target.value) })} className="input w-28" /> 回
            </div>
            <div className="text-xs text-zinc-500">ビルドバージョン：{build}</div>
          </>
        )}
        <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
          <button className="btn-primary" disabled={pending} onClick={save}>{pending ? "保存中…" : "設定を保存"}</button>
          {msg && <span className="text-sm text-emerald-300">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
