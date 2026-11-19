"use client";
import { useState, useTransition } from "react";
import { QA_MAX, QA_Q_MAX } from "@/lib/castFields";
import { QA_SITES, siteName } from "@/lib/sites";
import type { CastInput, QaItem } from "../types";
import { listCastsWithQa } from "../save";
import { Card, Counter, Switch } from "./ui";

type Props = {
  v: CastInput;
  set: <K extends keyof CastInput>(k: K, val: CastInput[K]) => void;
  targetSites: string[];
  castId: number | null;
};

function QaList({ list, onChange }: { list: QaItem[]; onChange: (l: QaItem[]) => void }) {
  const rows = list.length ? list : [{ q: "", a: "" }];
  const upd = (i: number, k: keyof QaItem, x: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: x } : r)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const n = [...rows];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg bg-zinc-950/50 p-3 ring-1 ring-zinc-800">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
            <span>質問{i + 1}</span>
            <span className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn px-2 py-0.5 text-xs" aria-label="上へ">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="btn px-2 py-0.5 text-xs" aria-label="下へ">↓</button>
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="btn px-2 py-0.5 text-xs text-rose-300">削除</button>
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <input value={r.q} onChange={(e) => upd(i, "q", e.target.value)} placeholder="質問" className="input w-full" />
              <Counter value={r.q} max={QA_Q_MAX} />
            </div>
            <div className="flex items-center gap-2">
              <input value={r.a} onChange={(e) => upd(i, "a", e.target.value)} placeholder="回答" className="input w-full" />
              <Counter value={r.a} />
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" disabled={rows.length >= QA_MAX} onClick={() => onChange([...rows, { q: "", a: "" }])} className="btn">
          ＋ 質問を追加
        </button>
        <span className="text-xs text-zinc-500">
          （ {rows.filter((r) => r.q || r.a).length} / {QA_MAX} ）
        </span>
      </div>
    </div>
  );
}

export function QaTab({ v, set, targetSites, castId }: Props) {
  const sites = QA_SITES.filter((s) => targetSites.includes(s));
  const [tab, setTab] = useState("common");
  const [others, setOthers] = useState<{ id: number; name: string; qa: QaItem[] }[] | null>(null);
  const [pending, start] = useTransition();

  const loadOthers = () => start(async () => setOthers(await listCastsWithQa(castId)));

  return (
    <div className="space-y-4">
      <Card title="Q&A項目について">
        <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-400">
          <li>1項目でも入力されているサイトは更新対象になります。未入力の箇所は、サイト側で登録済みのQ&Aが削除されるのでご注意ください。</li>
          <li>すべて未入力の場合は更新しません（サイト側のQ&Aはそのまま残ります）。</li>
          <li>サイト別のQ&Aを使わないサイトには「共通Q&A」が送られます。</li>
        </ul>
      </Card>

      <div className="flex flex-wrap gap-1">
        {["common", ...sites].map((s) => {
          const own = s !== "common" && v.qaBySite[s] !== undefined;
          return (
            <button
              type="button"
              key={s}
              onClick={() => setTab(s)}
              className={`rounded-md px-3 py-1.5 text-xs ring-1 ${tab === s ? "bg-violet-600 text-white ring-violet-500" : "bg-zinc-800 text-zinc-300 ring-zinc-700 hover:bg-zinc-700"}`}
            >
              {s === "common" ? "共通Q&A" : siteName(s)}
              {own && <span className="ml-1 text-emerald-400">●</span>}
            </button>
          );
        })}
      </div>

      {tab === "common" ? (
        <Card
          title="共通Q&A"
          right={
            others === null ? (
              <button type="button" onClick={loadOthers} disabled={pending} className="text-xs text-violet-300 hover:underline">
                {pending ? "読み込み中…" : "他の女性のQ&Aを読み込む"}
              </button>
            ) : (
              <select
                className="input py-1 text-xs"
                defaultValue=""
                onChange={(e) => {
                  const o = others.find((x) => x.id === Number(e.target.value));
                  if (o && confirm(`${o.name} のQ&A（${o.qa.length}件）で置き換えますか？`)) set("qa", o.qa);
                  e.target.value = "";
                }}
              >
                <option value="">{others.length ? "読み込む女性を選択" : "Q&Aのある女性がいません"}</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}（{o.qa.length}件）
                  </option>
                ))}
              </select>
            )
          }
        >
          <div className="pt-2">
            <QaList list={v.qa} onChange={(l) => set("qa", l)} />
          </div>
        </Card>
      ) : (
        <Card title={siteName(tab)}>
          <div className="space-y-3 pt-2">
            <Switch
              checked={v.qaBySite[tab] !== undefined}
              onChange={(on) => {
                const n = { ...v.qaBySite };
                if (on) n[tab] = v.qa.map((x) => ({ ...x }));
                else delete n[tab];
                set("qaBySite", n);
              }}
              label={<span className="text-sm">このサイトだけ別のQ&Aにする</span>}
            />
            {v.qaBySite[tab] !== undefined ? (
              <QaList list={v.qaBySite[tab]} onChange={(l) => set("qaBySite", { ...v.qaBySite, [tab]: l })} />
            ) : (
              <p className="text-sm text-zinc-400">共通Q&Aを使います。</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
