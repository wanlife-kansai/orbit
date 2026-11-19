"use client";
import type { ReactNode } from "react";

/** 必須／推奨のバッジ */
export function Level({ level }: { level?: "必須" | "推奨" }) {
  if (!level) return null;
  return (
    <span className={`mr-1.5 rounded px-1 py-px text-[10px] ${level === "必須" ? "bg-rose-600/80 text-white" : "bg-sky-700/70 text-white"}`}>
      {level}
    </span>
  );
}

/** 入力欄の外枠（左にラベル、右に入力） */
export function Row({ label, level, children, note, wide }: { label: ReactNode; level?: "必須" | "推奨"; children: ReactNode; note?: ReactNode; wide?: boolean }) {
  return (
    <div className={`grid gap-1.5 border-t border-zinc-800/80 py-3 first:border-t-0 ${wide ? "" : "md:grid-cols-[180px_1fr] md:items-start md:gap-4"}`}>
      <div className="pt-1.5 text-sm text-zinc-300">
        <Level level={level} />
        {label}
      </div>
      <div className="min-w-0">
        {children}
        {note && <p className="mt-1 text-xs text-zinc-500">{note}</p>}
      </div>
    </div>
  );
}

export function Counter({ value, max }: { value: string; max?: number }) {
  const n = [...(value ?? "")].length;
  const over = max !== undefined && Number.isFinite(max) && n > max;
  return (
    <span className={`text-[11px] tabular-nums ${over ? "text-rose-400" : "text-zinc-500"}`}>
      {n}/{max === undefined || !Number.isFinite(max) ? "∞" : max}
    </span>
  );
}

export function TextInput({
  value,
  onChange,
  max,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  max?: number;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="input w-full" />
      {max !== undefined && <Counter value={value} max={max} />}
    </div>
  );
}

export function NumInput({ value, onChange, unit, className = "" }: { value: number | string | null; onChange: (v: string) => void; unit?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <input type="number" inputMode="numeric" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="input w-24" />
      {unit && <span className="text-sm text-zinc-400">{unit}</span>}
    </div>
  );
}

export function Select({ value, onChange, options, empty = "未選択", className = "" }: { value: string; onChange: (v: string) => void; options: readonly string[]; empty?: string | null; className?: string }) {
  const opts = options.filter((o) => o !== "");
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`input ${className}`}>
      {empty !== null && <option value="">{empty}</option>}
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** 2〜3択のボタン（もう一度押すと解除） */
export function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md ring-1 ring-zinc-700">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => onChange(value === o ? "" : o)}
          className={`px-4 py-1.5 text-sm ${value === o ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-sm">
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-violet-600" : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? "left-4.5" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

/** チップを押して選ぶ複数選択 */
export function MultiChips({
  value,
  onChange,
  groups,
  max,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  groups: readonly { title?: string; options: readonly string[] }[];
  max?: number;
}) {
  const set = new Set(value);
  const toggle = (o: string) => {
    if (set.has(o)) onChange(value.filter((x) => x !== o));
    else if (!max || value.length < max) onChange([...value, o]);
  };
  const all = [...new Set(groups.flatMap((g) => g.options))];
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded px-2 py-0.5 ring-1 ${max && value.length >= max ? "text-amber-300 ring-amber-700" : "text-zinc-300 ring-zinc-700"}`}>
          {value.length}件選択中{max ? `（${max}個まで）` : ""}
        </span>
        {!max && (
          <button type="button" onClick={() => onChange(all)} className="text-violet-300 hover:underline">
            すべて選択
          </button>
        )}
        <button type="button" onClick={() => onChange([])} className="text-zinc-400 hover:underline">
          解除
        </button>
      </div>
      {groups.map((g, i) => (
        <div key={i} className="mb-2">
          {g.title && <div className="mb-1 text-[11px] text-zinc-500">{g.title}</div>}
          <div className="flex flex-wrap gap-1.5">
            {g.options.map((o) => {
              const on = set.has(o);
              const disabled = !on && !!max && value.length >= max;
              return (
                <button
                  type="button"
                  key={o}
                  disabled={disabled}
                  onClick={() => toggle(o)}
                  className={`rounded-full px-2.5 py-1 text-xs ring-1 transition ${
                    on ? "bg-violet-600/90 text-white ring-violet-500" : "bg-zinc-800/80 text-zinc-300 ring-zinc-700 hover:ring-zinc-500"
                  } disabled:opacity-35`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Card({ title, children, right }: { title?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card px-5 py-4">
      {(title || right) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
