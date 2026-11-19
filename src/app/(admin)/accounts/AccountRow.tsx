"use client";
import { useState } from "react";
import { PortalAccount } from "../portals/PortalAccount";

type R = { code: string; name: string; portalId: number; loginId: string; hasPassword: boolean; lastCheck: string; registered: boolean; kinds: string[]; auto: boolean };

export function AccountRow({ r }: { r: R }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{r.name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {r.kinds.map((k) => (
              <span key={k} className="badge text-zinc-400 ring-zinc-700">{k}</span>
            ))}
            {r.auto && <span className="badge text-emerald-300 ring-emerald-800">自動投稿</span>}
          </div>
        </div>
        {r.registered ? (
          <span className={`badge ${r.lastCheck === "OK" ? "text-emerald-300 ring-emerald-800" : "text-sky-300 ring-sky-800"}`}>
            {r.lastCheck === "OK" ? "登録済・ログインOK" : "登録済"}
          </span>
        ) : (
          <span className="badge text-zinc-500 ring-zinc-700">未登録</span>
        )}
        <button className="btn" onClick={() => setOpen(!open)} disabled={!r.portalId}>
          {open ? "閉じる" : r.registered ? "編集" : "登録"}
        </button>
      </div>
      {open && r.portalId > 0 && <PortalAccount portalId={r.portalId} loginId={r.loginId} hasPassword={r.hasPassword} lastCheck={r.lastCheck} />}
    </div>
  );
}
