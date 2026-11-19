"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteTemplates, reorderTemplates } from "./actions";

type T = { id: number; title: string; body: string; label: string; group: string; memo: string; used: number };

export function TemplateList({ items }: { items: T[] }) {
  const [list, setList] = useState(items);
  const [sel, setSel] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [group, setGroup] = useState("");
  const [pending, start] = useTransition();
  const groups = [...new Set(items.map((i) => i.group).filter(Boolean))];
  const view = list.filter((i) => !group || i.group === group);
  const move = (id: number, d: -1 | 1) => {
    const i = list.findIndex((x) => x.id === id);
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    setList(n);
    setDirty(true);
  };
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button onClick={() => setGroup("")} className={`rounded-md px-2.5 py-1 text-sm ${!group ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>すべて</button>
        {groups.map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={`rounded-md px-2.5 py-1 text-sm ${group === g ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>{g}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <button className="btn-primary" disabled={!dirty || pending} onClick={() => start(async () => { await reorderTemplates(list.map((x) => x.id)); setDirty(false); })}>並び順を保存</button>
          <button className="btn-danger" disabled={!sel.length || pending} onClick={() => confirm(`${sel.length}件を削除します。よろしいですか？`) && start(async () => { await deleteTemplates(sel); setList(list.filter((x) => !sel.includes(x.id))); setSel([]); })}>選択削除</button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th w-8" />
              <th className="th w-12">No.</th>
              <th className="th">テンプレート名</th>
              <th className="th w-20">ラベル</th>
              <th className="th w-16">設定数</th>
              <th className="th w-40" />
            </tr>
          </thead>
          <tbody>
            {view.map((t) => (
              <tr key={t.id}>
                <td className="td"><input type="checkbox" checked={sel.includes(t.id)} onChange={() => setSel((v) => (v.includes(t.id) ? v.filter((x) => x !== t.id) : [...v, t.id]))} /></td>
                <td className="td text-zinc-500">{list.indexOf(t) + 1}</td>
                <td className="td">
                  <div className="font-medium">{t.title}</div>
                  <div className="line-clamp-1 text-xs text-zinc-500">{t.body}</div>
                  {t.group && <div className="text-[10px] text-zinc-500">グループ：{t.group}</div>}
                </td>
                <td className="td"><span className="badge text-violet-300 ring-violet-800">{t.label}</span></td>
                <td className="td text-center text-sm">{t.used || ""}</td>
                <td className="td text-right">
                  <div className="flex justify-end gap-1">
                    <button className="btn px-2" onClick={() => move(t.id, -1)}>↑</button>
                    <button className="btn px-2" onClick={() => move(t.id, 1)}>↓</button>
                    <Link href={`/templates/${t.id}`} className="btn">編集</Link>
                  </div>
                </td>
              </tr>
            ))}
            {!view.length && <tr><td className="td text-sm text-zinc-500" colSpan={6}>テンプレートがありません</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
