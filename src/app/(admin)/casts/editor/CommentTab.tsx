"use client";
import { useState } from "react";
import { COMMENT_FIELDS, COMMENT_MAX, COMMENT_TABS, type CommentKey } from "@/lib/castFields";
import type { CastInput } from "../types";
import { Card, Counter, Level } from "./ui";

type Props = {
  v: CastInput;
  set: <K extends keyof CastInput>(k: K, val: CastInput[K]) => void;
};

const byLengthKey = { shopComment: "shopCommentByLength", message: "messageByLength", comment: "commentByLength" } as const;

function CommentBox({ field, v, set }: { field: (typeof COMMENT_FIELDS)[number] } & Props) {
  const [tab, setTab] = useState<string>("base");
  const mapKey = byLengthKey[field.key as CommentKey];
  const map = v[mapKey];
  const value = tab === "base" ? v[field.key as CommentKey] : (map[tab] ?? "");
  const limit = tab === "base" || tab === "html" ? COMMENT_MAX : Number(tab);

  const change = (x: string) => {
    if (tab === "base") set(field.key as CommentKey, x);
    else set(mapKey, { ...map, [tab]: x });
  };
  const copyToAll = () => {
    const base = v[field.key as CommentKey];
    if (!base) return;
    const next: Record<string, string> = {};
    for (const t of COMMENT_TABS) {
      if (t.key === "base") continue;
      next[t.key] = t.key === "html" ? base.replace(/\n/g, "<br>") : [...base].slice(0, Number(t.key)).join("");
    }
    set(mapKey, next);
  };

  return (
    <Card
      title={
        <>
          <Level level="推奨" />
          {field.label}
        </>
      }
    >
      {field.note && <p className="mb-2 text-xs text-zinc-500">{field.note}</p>}
      <div className="mb-2 flex flex-wrap gap-1">
        {COMMENT_TABS.map((t) => {
          const filled = t.key === "base" ? !!v[field.key as CommentKey] : !!map[t.key];
          return (
            <button
              type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-2.5 py-1 text-xs ring-1 ${
                tab === t.key ? "bg-violet-600 text-white ring-violet-500" : "bg-zinc-800 text-zinc-300 ring-zinc-700 hover:bg-zinc-700"
              }`}
            >
              {t.label}
              {filled && tab !== t.key && <span className="ml-1 text-emerald-400">●</span>}
            </button>
          );
        })}
      </div>
      <textarea value={value} onChange={(e) => change(e.target.value)} rows={tab === "50" || tab === "100" ? 3 : 7} className="input w-full" />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {tab === "base" ? "文字数別の入力がない場合はこの内容が反映されます。" : tab === "html" ? "HTMLタグが使えるサイト向け。" : `${tab}文字までのサイト向け。`}
        </p>
        <div className="flex items-center gap-3">
          {tab === "base" && (
            <button type="button" onClick={copyToAll} className="text-xs text-violet-300 hover:underline">
              この文章をすべてのタブにコピー
            </button>
          )}
          <Counter value={value} max={limit} />
        </div>
      </div>
    </Card>
  );
}

export function CommentTab(props: Props) {
  return (
    <div className="space-y-4">
      {COMMENT_FIELDS.map((f) => (
        <CommentBox key={f.key} field={f} {...props} />
      ))}
    </div>
  );
}
