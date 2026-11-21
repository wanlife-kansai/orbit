"use client";
import { useActionState, useState, useTransition } from "react";
import { createShop, openShop, setShopActive, setShopPassword, type MasterResult } from "./actions";

type Row = { id: number; loginId: string; name: string; active: boolean; hasPassword: boolean; casts: number; venrey: string };

export function MasterPanel({ shops, current }: { shops: Row[]; current: number }) {
  const [state, action, pending] = useActionState<MasterResult, FormData>(createShop, { ok: true, message: "" });
  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-400">
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3">店舗ID</th>
              <th className="px-4 py-3">店舗名</th>
              <th className="px-4 py-3">女性数</th>
              <th className="px-4 py-3">Venrey取り込み</th>
              <th className="px-4 py-3">パスワード</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shops.map((s) => (
              <ShopRow key={s.id} s={s} current={s.id === current} />
            ))}
          </tbody>
        </table>
      </div>

      <form action={action} className="card space-y-4 p-5">
        <h2 className="font-semibold">店舗を追加</h2>
        <p className="text-xs text-zinc-400">店舗IDは {nextHint(shops)} から順番に自動で付きます。パスワードは店舗に渡すログイン用です（あとから設定・変更もできます）。</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">店舗名</label>
            <input name="name" className="input w-full" placeholder="例：快楽園 京都店" />
          </div>
          <div>
            <label className="label">ログインパスワード（8文字以上・空欄可）</label>
            <input name="password" type="password" autoComplete="new-password" className="input w-full" />
          </div>
          <div>
            <label className="label">テンプレートを引き継ぐ店舗</label>
            <select name="copyFrom" className="input w-full" defaultValue="">
              <option value="">引き継がない</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.loginId} {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button disabled={pending} className="btn-primary">
            {pending ? "作成中…" : "店舗を作成"}
          </button>
          {state.message && <span className={`text-sm ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>{state.message}</span>}
        </div>
      </form>
    </div>
  );
}

function nextHint(shops: Row[]) {
  const nums = shops.map((s) => Number(s.loginId)).filter((n) => Number.isFinite(n));
  return String((nums.length ? Math.max(...nums) : 1000) + 1);
}

function ShopRow({ s, current }: { s: Row; current: boolean }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, start] = useTransition();
  return (
    <tr className="border-b border-zinc-800/70 align-top">
      <td className="px-4 py-3 font-mono">{s.loginId}</td>
      <td className="px-4 py-3">
        {s.name}
        {current && <span className="ml-2 rounded bg-violet-600/30 px-1.5 py-0.5 text-[10px] text-violet-200">表示中</span>}
      </td>
      <td className="px-4 py-3">{s.casts}人</td>
      <td className="px-4 py-3 text-xs text-zinc-400">{s.venrey ? new Date(s.venrey).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "—"}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="new-password" placeholder={s.hasPassword ? "設定済み（変更）" : "未設定"} className="input w-36" />
          <button
            className="btn"
            disabled={busy || !pw}
            onClick={() =>
              start(async () => {
                const r = await setShopPassword(s.id, pw);
                setMsg(r.message);
                if (r.ok) setPw("");
              })
            }
          >
            設定
          </button>
        </div>
        {msg && <div className="mt-1 text-xs text-zinc-400">{msg}</div>}
      </td>
      <td className="px-4 py-3">
        <button className="btn" disabled={busy} onClick={() => start(async () => setMsg((await setShopActive(s.id, !s.active)).message))}>
          {s.active ? "利用中" : "停止中"}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <button className="btn-primary" disabled={busy || current} onClick={() => start(() => openShop(s.id))}>
          この店舗を開く
        </button>
      </td>
    </tr>
  );
}
