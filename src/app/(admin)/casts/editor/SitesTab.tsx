"use client";
import { useState } from "react";
import { COMMON_FIELDS, INBOUND_FIELDS, SITE_FIELDS, siteName, type FieldDef } from "@/lib/sites";
import type { CastInput } from "../types";
import { Card, Counter, Level, MultiChips, Row, Select, TextInput } from "./ui";

type Props = {
  v: CastInput;
  set: <K extends keyof CastInput>(k: K, val: CastInput[K]) => void;
  targetSites: string[];
};

function FieldInput({ def, value, onChange }: { def: FieldDef; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const s = typeof value === "string" ? value : "";
  switch (def.type) {
    case "text":
      return <TextInput value={s} onChange={onChange} max={def.max} placeholder={def.placeholder} />;
    case "textarea":
      return (
        <div className="flex items-start gap-2">
          <textarea value={s} onChange={(e) => onChange(e.target.value)} rows={def.rows ?? 3} className="input w-full" />
          <Counter value={s} max={def.max} />
        </div>
      );
    case "select":
      return <Select value={s} onChange={onChange} options={def.options} className="min-w-56 max-w-full" />;
    case "date":
      return <input type="date" value={s} onChange={(e) => onChange(e.target.value)} className="input" />;
    case "multi":
      return <MultiChips value={Array.isArray(value) ? value : []} onChange={onChange} groups={def.groups} max={def.max} />;
  }
}

export function SitesTab({ v, set, targetSites }: Props) {
  const [sub, setSub] = useState<"ja" | "inbound">("ja");
  const target = new Set(targetSites);
  const sf = v.siteFields;
  const get = (site: string, key: string) => sf[site]?.[key];
  const put = (site: string, key: string, val: string | string[]) => set("siteFields", { ...sf, [site]: { ...(sf[site] ?? {}), [key]: val } });

  const common = COMMON_FIELDS.filter((f) => f.sites.some((s) => target.has(s)));
  const sites = SITE_FIELDS.filter((s) => target.has(s.code));

  return (
    <div className="space-y-4">
      <div className="inline-flex overflow-hidden rounded-md ring-1 ring-zinc-700">
        {(
          [
            ["ja", "日本語サイト"],
            ["inbound", "インバウンドサイト"],
          ] as const
        ).map(([k, label]) => (
          <button
            type="button"
            key={k}
            onClick={() => setSub(k)}
            className={`px-4 py-1.5 text-sm ${sub === k ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "ja" && (
        <>
          {common.length > 0 && (
            <Card
              title={
                <>
                  <Level level="必須" />
                  複数サイト共通
                </>
              }
            >
              {common.map((f) => (
                <Row
                  key={f.key}
                  label={f.label}
                  note={
                    <span className="flex flex-wrap gap-1">
                      {f.sites
                        .filter((s) => target.has(s))
                        .map((s) => (
                          <span key={s} className="rounded bg-zinc-800 px-1.5 py-px text-[10px] text-zinc-400">
                            {siteName(s)}
                          </span>
                        ))}
                    </span>
                  }
                >
                  <FieldInput def={f} value={get("common", f.key)} onChange={(x) => put("common", f.key, x)} />
                </Row>
              ))}
            </Card>
          )}

          {sites.map((site) => (
            <Card
              key={site.code}
              title={
                <>
                  <Level level={site.level} />
                  {site.name}
                </>
              }
            >
              {site.fields.map((f) => (
                <Row key={f.key} label={f.label} note={f.note} wide={f.type === "multi"}>
                  <FieldInput def={f} value={get(site.code, f.key)} onChange={(x) => put(site.code, f.key, x)} />
                </Row>
              ))}
            </Card>
          ))}

          {sites.length === 0 && common.length === 0 && (
            <div className="card p-6 text-sm text-zinc-400">
              専用項目のあるサイトが連動先に選ばれていません。「連携ポータル → 連動先サイト」で選んでください。
            </div>
          )}
        </>
      )}

      {sub === "inbound" && (
        <Card title="インバウンドサイト">
          {INBOUND_FIELDS.map((f) => (
            <Row key={f.key} label={f.label} note={f.note}>
              <FieldInput def={f} value={get("inbound", f.key)} onChange={(x) => put("inbound", f.key, x)} />
            </Row>
          ))}
        </Card>
      )}
    </div>
  );
}
