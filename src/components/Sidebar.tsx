"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

type Item = { href: string; label: string; soon?: boolean };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "", items: [{ href: "/", label: "お知らせ" }] },
  {
    title: "連携",
    items: [
      { href: "/accounts", label: "ID・PASS登録" },
      { href: "/portals", label: "公式サイト連携" },
      { href: "/import", label: "Mr.Venreyから取り込み" },
      { href: "/portals/fdc", label: "公式サイト連動" },
    ],
  },
  {
    title: "コンテンツ",
    items: [
      { href: "/contents", label: "コンテンツ更新" },
      { href: "/templates", label: "テンプレート" },
      { href: "/bulk", label: "簡単一括更新" },
      { href: "/sokuhime", label: "即姫・接客一括更新" },
      { href: "/diary", label: "写メ日記転送" },
    ],
  },
  {
    title: "女性",
    items: [
      { href: "/casts", label: "女性一覧" },
      { href: "/casts/new", label: "女性を登録" },
      { href: "/casts/sort", label: "並び替え" },
      { href: "/casts/status", label: "女性登録状況一覧" },
      { href: "/casts/aliases", label: "別名管理" },
    ],
  },
  {
    title: "AI自動生成",
    items: [
      { href: "/ai/comments", label: "コメント生成" },
      { href: "/ai/movies", label: "動画生成" },
    ],
  },
  {
    title: "スケジュール",
    items: [
      { href: "/schedule", label: "週間スケジュール" },
      { href: "/schedule/day", label: "当日スケジュール" },
      { href: "/schedule/month", label: "月間スケジュール" },
    ],
  },
  {
    title: "サイトへ更新",
    items: [
      { href: "/push/schedule", label: "出勤情報をサイトへ更新" },
      { href: "/push/casts", label: "女性をサイトへ更新" },
      { href: "/push/delete", label: "女性をサイトから削除" },
    ],
  },
  { title: "", items: [{ href: "/logs", label: "更新結果" }] },
  {
    title: "",
    items: [
      { href: "/settings", label: "設定" },
      { href: "/help", label: "操作説明Q&A" },
      { href: "/inquiry", label: "お問合せ" },
      { href: "/free-sites", label: "無料サイト申込" },
    ],
  },
];

export function Sidebar({ shopName, shopCode, master = false }: { shopName: string; shopCode: string; master?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const SUB = ["/casts/new", "/casts/sort", "/casts/aliases", "/casts/status", "/schedule/day", "/schedule/month"];
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path === href || (!SUB.includes(href) && path.startsWith(href + "/") && !SUB.some((x) => path.startsWith(x)));

  return (
    <>
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-zinc-900 px-4 py-3 ring-1 ring-zinc-800">
        <Logo size={22} />
        <ThemeToggle className="ml-auto mr-2" />
        <button className="btn" onClick={() => setOpen(!open)} aria-label="メニュー">
          {open ? "閉じる" : "メニュー"}
        </button>
      </div>
      <aside
        className={`${open ? "block" : "hidden"} md:block md:sticky md:top-0 md:h-screen w-full md:w-56 shrink-0 overflow-y-auto bg-zinc-900 ring-1 ring-zinc-800`}
      >
        <div className="hidden md:flex items-center justify-between px-4 pt-5">
          <Logo size={24} />
          <ThemeToggle />
        </div>
        <div className="mx-3 mt-4 rounded-lg bg-zinc-800/60 px-3 py-2.5 ring-1 ring-zinc-700/60">
          <div className="text-sm font-semibold">{shopName} 様</div>
          <div className="mt-0.5 text-[11px] text-zinc-400">ID: {shopCode}</div>
          {master && (
            <Link href="/master" onClick={() => setOpen(false)} className="mt-2 block rounded bg-amber-500/15 px-2 py-1 text-center text-[11px] text-amber-200 ring-1 ring-amber-500/30 hover:bg-amber-500/25">
              運営：店舗の追加・切り替え
            </Link>
          )}
        </div>
        <nav className="px-2 pb-6">
          {GROUPS.map((g, i) => (
            <div key={i} className="mt-3">
              {g.title && <div className="px-2 pb-1 text-[11px] text-zinc-500">{g.title}</div>}
              {g.items.map((it) =>
                it.soon ? (
                  <div key={it.label} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-600">
                    {it.label}
                    <span className="text-[10px]">準備中</span>
                  </div>
                ) : (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-2 py-1.5 text-sm ${
                      isActive(it.href) ? "bg-violet-600/20 text-violet-200" : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {it.label}
                  </Link>
                ),
              )}
            </div>
          ))}
          <a href="/logout" className="mt-6 block rounded-md px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
            ログアウト
          </a>
        </nav>
      </aside>
    </>
  );
}
