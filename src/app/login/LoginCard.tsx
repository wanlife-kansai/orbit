"use client";
import { useActionState, useState } from "react";
import { forgetShop, login } from "./actions";

/** ログイン：店舗ID とパスワード。前回の店舗IDは覚えておき、最初から入れておく */
export function LoginCard({ shopName, rememberedId }: { shopName: string | null; rememberedId: string | null }) {
  const [state, action, pending] = useActionState(login, { error: "", id: rememberedId ?? "", n: 0 });
  const [showPw, setShowPw] = useState(false);
  const remembered = !!(shopName && rememberedId);

  return (
    <div className="rounded-[10px] border border-zinc-700/70 bg-zinc-900 p-7">
      <h1 className="text-lg font-bold">ログイン</h1>
      {remembered && <p className="mt-1 text-sm text-zinc-400">前回：{shopName}</p>}
      <form action={action} className="mt-6 space-y-5">
        <div>
          <label className="label" htmlFor="login-id">店舗ID</label>
          <input id="login-id" key={state.n} name="id" defaultValue={state.id} inputMode="numeric" autoComplete="username" className="input w-full tnum" autoFocus={!state.id} />
        </div>
        <div>
          <label className="label" htmlFor="login-pw">パスワード</label>
          <div className="relative">
            <input id="login-pw" name="password" type={showPw ? "text" : "password"} autoComplete="current-password" className="input w-full pr-16" autoFocus={!!state.id} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 right-3 text-xs font-bold text-zinc-400 hover:text-zinc-100">
              {showPw ? "隠す" : "表示"}
            </button>
          </div>
        </div>
        {state.error && <p className="text-sm font-bold text-rose-300" role="alert">{state.error}</p>}
        <button disabled={pending} className="btn-primary w-full py-3 text-[15px]">
          {pending ? "確認しています…" : "ログイン"}
        </button>
      </form>
      {remembered && (
        <form action={forgetShop} className="mt-4">
          <button className="text-xs font-bold text-zinc-400 underline underline-offset-4 hover:text-zinc-100">別の店舗IDで入る</button>
        </form>
      )}
    </div>
  );
}
