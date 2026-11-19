"use client";
import { useActionState, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { savePortalAccount, type Msg } from "./actions";

const init: Msg = { ok: true, message: "", n: 0 };

export function PortalAccount({ portalId, loginId, hasPassword, lastCheck }: { portalId: number; loginId: string; hasPassword: boolean; lastCheck: string }) {
  const [msg, action, pending] = useActionState(savePortalAccount.bind(null, portalId), init);
  const form = useRef<HTMLFormElement>(null);
  const ok = useRef(false);
  const [ask, setAsk] = useState(false);
  return (
    <form
      ref={form}
      action={action}
      onSubmit={(e) => {
        if (ok.current) { ok.current = false; return; }
        e.preventDefault();
        setAsk(true);
      }}
      className="mt-4 border-t border-zinc-800 pt-4"
    >
      <ConfirmDialog open={ask} title="保存しますか？" message="ログインID・パスワードを暗号化して保存します。" onNo={() => setAsk(false)} onYes={() => { setAsk(false); ok.current = true; form.current?.requestSubmit(); }} />
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
        ログイン情報（暗号化して保存します）
        {hasPassword && (
          <span className={`badge ${lastCheck === "OK" ? "text-emerald-300 ring-emerald-800" : "text-amber-300 ring-amber-800"}`}>
            {lastCheck === "OK" ? "ログインOK" : "未確認"}
          </span>
        )}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input name="loginId" defaultValue={loginId} placeholder="ログインID" autoComplete="off" className="input" />
        <input name="password" type="password" placeholder={hasPassword ? "保存済み（変えるときだけ入力）" : "パスワード"} autoComplete="new-password" className="input" />
        <button disabled={pending} className="btn-primary">{pending ? "確認中…" : "保存して接続テスト"}</button>
      </div>
      {msg.message && <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.message}</p>}
    </form>
  );
}
