"use client";
import { useActionState, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { forgetShop, login } from "./actions";

export function LoginCard({ shopName, rememberedId }: { shopName: string | null; rememberedId: string | null }) {
  const [state, action, pending] = useActionState(login, { error: "", id: "", n: 0 });
  const error = state.error;
  const remembered = !!(shopName && rememberedId);
  const [askPw, setAskPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-xl bg-zinc-900/90 ring-1 ring-zinc-700/70 shadow-2xl shadow-black/40">
      <div className="relative flex flex-col items-center gap-3 bg-gradient-to-br from-zinc-800 to-zinc-900 px-6 pb-6 pt-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.04)_40%,rgba(255,255,255,0.04)_62%,transparent_62%)]" />
        <LogoMark size={64} />
        <div className="text-sm font-medium text-zinc-200">ログイン</div>
      </div>

      <form action={action} className="px-8 pb-10 pt-8">
        {remembered ? (
          <>
            <p className="mt-6 text-center text-xl font-semibold tracking-wide text-zinc-100">{shopName} 様</p>
            <input type="hidden" name="id" value={rememberedId!} />
            <div className={`mt-10 transition-all ${askPw ? "max-h-40 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
              <PasswordField show={showPw} onToggle={() => setShowPw(!showPw)} autoFocus={askPw} />
            </div>
            <div className={askPw ? "mt-6" : "mt-24"}>
              {askPw ? (
                <SubmitButton pending={pending} />
              ) : (
                <button type="button" onClick={() => setAskPw(true)} className="mx-auto block w-56 rounded-full bg-violet-600 py-3 text-sm font-medium text-white hover:bg-violet-500">
                  ログイン
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">ID</label>
              <input key={state.n} name="id" defaultValue={state.id} autoComplete="username" className="input w-full" autoFocus={!state.id} />
            </div>
            <PasswordField key={state.n} show={showPw} onToggle={() => setShowPw(!showPw)} autoFocus={!!state.id} />
            <div className="pt-4">
              <SubmitButton pending={pending} />
            </div>
          </div>
        )}
        {error && <p className="mt-4 text-center text-sm text-rose-400">{error}</p>}
      </form>

      {remembered && (
        <form action={forgetShop} className="-mt-6 pb-10 text-center">
          <button className="text-xs text-zinc-300 underline underline-offset-4 hover:text-white">別アカウントでログイン</button>
        </form>
      )}
    </div>
  );
}

function PasswordField({ show, onToggle, autoFocus }: { show: boolean; onToggle: () => void; autoFocus?: boolean }) {
  return (
    <div>
      <label className="label">パスワード</label>
      <div className="relative">
        <input name="password" type={show ? "text" : "password"} autoComplete="current-password" className="input w-full pr-14" autoFocus={autoFocus} />
        <button type="button" onClick={onToggle} className="absolute inset-y-0 right-2 text-xs text-zinc-400 hover:text-zinc-200">
          {show ? "隠す" : "表示"}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button disabled={pending} className="mx-auto block w-56 rounded-full bg-violet-600 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60">
      {pending ? "確認中…" : "ログイン"}
    </button>
  );
}
