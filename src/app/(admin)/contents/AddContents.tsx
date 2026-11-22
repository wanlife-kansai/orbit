"use client";
import { useState, useTransition } from "react";
import { addContents } from "./actions";

type Site = { code: string; name: string; registered: boolean; slots: { key: string; label: string; kind: string; auto: boolean; added: boolean }[] };

export function AddContents({ catalog }: { catalog: Site[] }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [onlyReg, setOnlyReg] = useState(true);
  const [pending, start] = useTransition();
  const list = catalog.filter((s) => !onlyReg || s.registered);
  const toggle = (k: string) => setSel((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]));

  return (
    <div className="mb-4">
      <button className="btn-primary" onClick={() => setOpen(!open)}>{open ? "閉じる" : "＋ 更新枠を追加"}</button>
      {open && (
        <div className="card mt-3 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={onlyReg} onChange={(e) => setOnlyReg(e.target.checked)} />
              ログイン情報を登録済みのサイトだけ表示
            </label>
            <span className="text-zinc-500">選択中 {sel.length} 件</span>
            <button
              className="btn-primary ml-auto"
              disabled={!sel.length || pending}
              onClick={() =>
                start(async () => {
                  await addContents(sel);
                  setSel([]);
                  setOpen(false);
                })
              }
            >
              {pending ? "追加中…" : "選んだ枠を追加"}
            </button>
          </div>
          {list.length === 0 && <p className="text-sm text-zinc-400">登録済みのサイトがありません。チェックを外すと全サイトから選べます。</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((s) => (
              <div key={s.code} className="rounded-lg bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
                <div className="mb-1 text-sm font-medium">{s.name}</div>
                {s.slots.map((sl) => (
                  <label key={sl.key} className={`flex items-center gap-2 py-0.5 text-sm ${sl.added ? "text-zinc-600" : ""}`}>
                    <input type="checkbox" disabled={sl.added} checked={sel.includes(sl.key)} onChange={() => toggle(sl.key)} />
                    <span className="flex-1">{sl.label}</span>
                    <span className="text-[11px] text-zinc-500">{sl.kind}</span>
                    {sl.auto && <span className="badge text-emerald-300 ring-emerald-800">自動投稿</span>}
                    {sl.added && <span className="text-[11px]">追加済</span>}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
