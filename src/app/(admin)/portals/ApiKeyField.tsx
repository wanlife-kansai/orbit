"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { addApiKey, deleteApiKey, generateApiKey, listApiKeys, revealApiKey, type KeyItem } from "./keyActions";

/** APIキーの入力欄。クリックすると下に「登録済みのキー」が出て、クリックでコピー＆貼り付けできる */
export function ApiKeyField({ name, hasKey }: { name: string; hasKey: boolean }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ current: { last4: string } | null; keys: KeyItem[] } | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  const load = () => start(async () => setData(await listApiKeys()));
  useEffect(() => {
    if (!open) return;
    if (!data) load();
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  };
  const use = (id: string, title: string) =>
    start(async () => {
      const r = await revealApiKey(id);
      if (!r.ok) return setNote({ ok: false, text: "キーを読み出せませんでした" });
      setValue(r.key);
      const copied = await copy(r.key);
      setNote({ ok: true, text: `「${title}」を入力欄に貼り付けました${copied ? "（コピーもしました）" : ""}` });
      setOpen(false);
    });

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <input
          name={name}
          value={value}
          onChange={(e) => { setValue(e.target.value); setNote(null); }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          type={show ? "text" : "password"}
          autoComplete="off"
          placeholder={hasKey ? "保存済み（変えるときだけ入力）" : "24文字以上"}
          className="input w-full pr-14"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200">{show ? "隠す" : "表示"}</button>
      </div>
      {note && <p className={`mt-1 text-xs ${note.ok ? "text-emerald-300" : "text-rose-400"}`}>{note.text}</p>}

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg bg-zinc-900 p-2 shadow-xl ring-1 ring-zinc-700">
          <div className="px-2 pb-1 text-[11px] text-zinc-500">クリックでコピーして入力欄に貼り付け</div>
          {!data && <div className="px-2 py-2 text-xs text-zinc-500">読み込み中…</div>}
          {data?.current && (
            <button type="button" disabled={pending} onClick={() => use("current", "今保存中のキー")} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-800">
              <span>今保存中のキー</span>
              <span className="font-mono text-xs text-zinc-400">••••{data.current.last4}</span>
            </button>
          )}
          {data?.keys.map((k) => (
            <div key={k.id} className="flex items-center gap-1 rounded-md hover:bg-zinc-800">
              <button type="button" disabled={pending} onClick={() => use(k.id, k.label)} className="flex flex-1 items-center justify-between px-2 py-1.5 text-left text-sm">
                <span>{k.label}</span>
                <span className="font-mono text-xs text-zinc-400">••••{k.last4}</span>
              </button>
              <button type="button" title="登録を消す" disabled={pending} onClick={() => confirm(`「${k.label}」の登録を消しますか？`) && start(async () => { await deleteApiKey(k.id); setData(await listApiKeys()); })} className="px-2 text-xs text-zinc-500 hover:text-rose-300">×</button>
            </div>
          ))}
          {data && !data.current && !data.keys.length && <div className="px-2 py-1.5 text-xs text-zinc-500">登録済みのキーはまだありません</div>}

          <div className="mt-2 space-y-1.5 border-t border-zinc-800 px-2 pt-2">
            <div className="text-[11px] text-zinc-500">キーを登録（入力欄のキーに名前を付けて保存）</div>
            <div className="flex gap-1">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="名前（例：Biollante本番）" className="input flex-1 py-1 text-xs" />
              <button
                type="button"
                className="btn px-2 py-1 text-xs"
                disabled={pending || value.trim().length < 24}
                onClick={() => start(async () => { const r = await addApiKey(label, value); setNote({ ok: r.ok, text: r.message }); if (r.ok) { setLabel(""); setData(await listApiKeys()); } })}
              >
                登録
              </button>
            </div>
            <button
              type="button"
              className="text-xs text-violet-300 hover:underline"
              disabled={pending}
              onClick={() => start(async () => { const k = await generateApiKey(); setValue(k); setShow(true); const c = await copy(k); setNote({ ok: true, text: `新しいキーを作りました${c ? "（コピー済み）" : ""}。公式サイトの OFFICIAL_API_KEY にも同じ値を入れてください` }); })}
            >
              ＋ 新しいキーを作る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
