"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { REQUIRED, ageOn } from "@/lib/castFields";
import { SITE_FIELDS, siteName } from "@/lib/sites";
import type { CastInput } from "../types";
import { saveCastFull } from "../save";
import { BasicTab } from "./BasicTab";
import { CommentTab } from "./CommentTab";
import { SitesTab } from "./SitesTab";
import { QaTab } from "./QaTab";
import { PhotoTab, type Photo } from "./PhotoTab";

const TABS = [
  { key: "basic", label: "プロフィール" },
  { key: "comment", label: "紹介文" },
  { key: "sites", label: "サイトごとの項目" },
  { key: "qa", label: "質問と答え" },
  { key: "photo", label: "写真" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/** 女性ごとに「このサイトには送らない」を持つ（site_fields._off） */
const OFF = "_off";

export function CastEditor({
  castId,
  initial,
  initialPhotos,
  targetSites,
  today,
}: {
  castId: number | null;
  initial: CastInput;
  initialPhotos: Photo[];
  targetSites: string[];
  today: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<CastInput>(initial);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [tab, setTab] = useState<Tab>("basic");
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showMemo, setShowMemo] = useState(!!initial.memo);
  const [pending, start] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  const set = useCallback(<K extends keyof CastInput>(k: K, val: CastInput[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setDirty(true);
    setMsg(null);
  }, []);

  // 未保存のまま離れようとしたら確認
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = useCallback(() => {
    start(async () => {
      const input = { ...v };
      if (v.ageFromBirthday) {
        const a = ageOn(v.birthday, today);
        if (a !== null) input.age = a;
      }
      const r = await saveCastFull(castId, input);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setDirty(false);
        if (!castId && r.id) router.replace(`/casts/${r.id}?created=1`);
        else router.refresh();
      }
    });
  }, [v, castId, today, router]);

  // Ctrl/⌘ + S で保存
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [save]);

  /* ---- 必須項目チェッカー ---- */
  const missing = useMemo(() => {
    const age = v.ageFromBirthday ? ageOn(v.birthday, today) : v.age;
    return REQUIRED.filter((r) => {
      const x = r.key === "age" ? age : v[r.key as keyof CastInput];
      return x === null || x === undefined || String(x).trim() === "";
    });
  }, [v, today]);
  const off = new Set((v.siteFields[OFF]?.[OFF] as string[] | undefined) ?? []);
  const setOff = (code: string, isOff: boolean) => {
    const n = new Set(off);
    if (isOff) n.add(code);
    else n.delete(code);
    set("siteFields", { ...v.siteFields, [OFF]: { [OFF]: [...n] } });
  };
  const siteWarn = (code: string) => {
    const def = SITE_FIELDS.find((s) => s.code === code);
    if (!def || def.level !== "必須") return false;
    const vals = v.siteFields[code] ?? {};
    return !Object.values(vals).some((x) => (Array.isArray(x) ? x.length : String(x ?? "").trim()));
  };
  const selected = targetSites.filter((s) => !off.has(s)).length;

  const TabBar = () => (
    <div className="flex flex-wrap gap-1">
      {TABS.map((t) => (
        <button
          type="button"
          key={t.key}
          onClick={() => {
            setTab(t.key);
            top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={`border-b-[3px] px-3 py-2 text-sm font-bold ${tab === t.key ? "border-violet-600 text-zinc-100" : "border-transparent text-zinc-400 hover:text-zinc-100"}`}
        >
          {t.label}
          {t.key === "basic" && missing.length > 0 && <span className="ml-1.5 rounded-full bg-rose-600 px-1.5 text-[10px] text-white">{missing.length}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={top} className="scroll-mt-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/casts" className="text-xs font-bold text-zinc-400 hover:text-zinc-100">在籍一覧に戻る</Link>
          <h1 className="mt-1 text-[26px] font-bold leading-tight">{v.name || (castId ? "名前未入力" : "新しい女性")}</h1>
          <p className="text-xs text-zinc-500">{castId ? "プロフィールを編集しています" : "新しく登録します"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowMemo(!showMemo)} className="btn">
            {v.memo ? "メモあり" : "メモを書く"}
          </button>
          <button type="button" onClick={save} disabled={pending} className="btn-primary min-w-28">
            {pending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      {showMemo && (
        <div className="card mb-4 p-4">
          <label className="label">スタッフ用メモ（サイトには出ません）</label>
          <textarea value={v.memo} onChange={(e) => set("memo", e.target.value)} rows={2} className="input w-full" />
        </div>
      )}

      <div className="sticky top-[104px] z-20 -mx-4 mb-5 border-b border-zinc-700/70 bg-zinc-950/95 px-4 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabBar />
          <div className="flex items-center gap-3">
            {msg && <span className={`text-sm ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</span>}
            {dirty && !msg && <span className="text-xs font-bold text-amber-300">保存していない変更があります</span>}
            <button type="button" onClick={save} disabled={pending} className="btn-primary">
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {tab === "basic" && <BasicTab v={v} set={set} targetSites={targetSites} today={today} />}
          {tab === "comment" && <CommentTab v={v} set={set} />}
          {tab === "sites" && <SitesTab v={v} set={set} targetSites={targetSites.filter((s) => !off.has(s))} />}
          {tab === "qa" && <QaTab v={v} set={set} targetSites={targetSites} castId={castId} />}
          {tab === "photo" && <PhotoTab castId={castId} photos={photos} onPhotos={setPhotos} />}
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <div className="card p-4">
            <h2 className="text-sm font-bold">入力のこり</h2>
            {missing.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-300">必須の項目はすべて入っています</p>
            ) : (
              <div className="mt-2">
                <p className="text-xs text-rose-300">まだ入っていない必須項目：{missing.length}件</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {missing.map((m) => (
                    <button type="button" key={m.key} onClick={() => setTab("basic")} className="rounded bg-rose-950/60 px-1.5 py-0.5 text-[11px] text-rose-200 ring-1 ring-rose-900">
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
              <h3 className="text-xs text-zinc-400">更新するサイト</h3>
              <span className="text-xs text-zinc-300">
                選択中 <b>{selected}</b> / {targetSites.length} 件中
              </span>
            </div>
            <ul className="mt-2 max-h-[50vh] space-y-0.5 overflow-y-auto pr-1">
              {targetSites.map((s) => (
                <li key={s}>
                  <label className="flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-zinc-800">
                    <input type="checkbox" checked={!off.has(s)} onChange={(e) => setOff(s, !e.target.checked)} />
                    <span className={`flex-1 truncate ${off.has(s) ? "text-zinc-600" : "text-zinc-200"}`}>{siteName(s)}</span>
                    {!off.has(s) && siteWarn(s) && (
                      <button type="button" onClick={() => setTab("sites")} className="text-[10px] text-amber-300" title="このサイトの必須項目が未入力">
                        未入力
                      </button>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            {targetSites.length === 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                連動先サイトが未設定です。<Link href="/portals" className="text-violet-300 underline">連携ポータル</Link>で選んでください。
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
