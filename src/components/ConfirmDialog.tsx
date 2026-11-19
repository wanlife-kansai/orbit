"use client";
import { useEffect, useRef } from "react";

/** 「はい／いいえ」で確認するダイアログ */
export function ConfirmDialog({ open, title, message, onYes, onNo }: { open: boolean; title: string; message?: string; onYes: () => void; onNo: () => void }) {
  const yes = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    yes.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onNo();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onNo]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onNo}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="cd-title" className="w-full max-w-sm rounded-xl bg-zinc-900 p-5 ring-1 ring-zinc-700" onClick={(e) => e.stopPropagation()}>
        <h3 id="cd-title" className="text-base font-semibold">{title}</h3>
        {message && <p className="mt-2 whitespace-pre-line text-sm text-zinc-400">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn min-w-20" onClick={onNo}>いいえ</button>
          <button ref={yes} className="btn-primary min-w-20" onClick={onYes}>はい</button>
        </div>
      </div>
    </div>
  );
}
