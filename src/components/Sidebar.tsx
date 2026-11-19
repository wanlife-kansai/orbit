"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";

type Item = { href: string; label: string; soon?: boolean };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "", items: [{ href: "/", label: "ダッシュボード" }] },
  {
    title: "女性",
    items: [
      { href: "/casts", label: "女性一覧" },
      { href: "/casts/new", label: "女性を登録" },
      { href: "/casts/sort", label: "並び替え" },
      { href: "/casts/aliases", label: "別名管理" },
    ],
  },
  {
    title: "出勤",
    items: [
      { href: "/schedule", label: "週間スケジュール" },
      { href: "/sokuhime", label: "即姫・接客ボード" },
    ],
  },
  {
    title: "配信",
    items: [
      { href: "/templates", label: "テンプレート" },
      { href: "/portals", label: "連携ポータル" },
      { href: "/contents", label: "コンテンツ更新" },
      { href: "#", label: "一括投稿", soon: true },
      { href: "/logs", label: "配信ログ" },
    ],
  },
  { title: "自店HP", items: [{ href: "#", label: "サイト設定", soon: true }] },
  { title: "AI", items: [{ href: "#", label: "コメント生成", soon: true }] },
  { title: "", items: [{ href: "/settings", label: "店舗設定" }] },
];

export function Sidebar({ shopName, shopCode }: { shopName: string; shopCode: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const SUB = ["/casts/new", "/casts/sort", "/casts/aliases"];
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path === href || (!SUB.includes(href) && path.startsWith(href + "/") && !SUB.some((x) => path.startsWith(x)));

  return (
    <>
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-zinc-900 px-4 py-3 ring-1 ring-zinc-800">
        <Logo size={22} />
        <button className="btn" onClick={() => setOpen(!open)} aria-label="メニュー">
          {open ? "閉じる" : "メニュー"}
        </button>
      </div>
      <aside
        className={`${open ? "block" : "hidden"} md:block md:sticky md:top-0 md:h-screen w-full md:w-56 shrink-0 overflow-y-auto bg-zinc-900 ring-1 ring-zinc-800`}
      >
        <div className="hidden md:block px-4 pt-5">
          <Logo size={24} />
        </div>
        <div className="mx-3 mt-4 rounded-lg bg-zinc-800/60 px-3 py-2.5 ring-1 ring-zinc-700/60">
          <div className="text-sm font-semibold">{shopName} 様</div>
          <div className="mt-0.5 text-[11px] text-zinc-400">ID: {shopCode}</div>
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
