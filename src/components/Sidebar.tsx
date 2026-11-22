"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * ORBIT の画面の骨組み。
 * 左：5つの「仕事場」を1本の軌道の上に並べたレール（今日・女性・出勤・配信・店舗）。
 * 上：いま開いている仕事場の中のページをタブで切り替え。
 * スマホでは、レールが画面下のバーになります。
 */
type Page = { href: string; label: string };
type Space = { key: string; label: string; home: string; pages: Page[] };

export const SPACES: Space[] = [
  {
    key: "today",
    label: "今日",
    home: "/",
    pages: [
      { href: "/", label: "ホーム" },
      { href: "/schedule/day", label: "今日の出勤" },
      { href: "/sokuhime", label: "今すぐ案内" },
    ],
  },
  {
    key: "casts",
    label: "女性",
    home: "/casts",
    pages: [
      { href: "/casts", label: "在籍一覧" },
      { href: "/casts/new", label: "新しく登録" },
      { href: "/casts/sort", label: "表示順" },
      { href: "/casts/status", label: "サイト別の掲載状況" },
      { href: "/casts/aliases", label: "名前の使い分け" },
      { href: "/ai/comments", label: "紹介文をAIで作る" },
      { href: "/ai/movies", label: "動画をAIで作る" },
    ],
  },
  {
    key: "schedule",
    label: "出勤",
    home: "/schedule",
    pages: [
      { href: "/schedule", label: "週の出勤表" },
      { href: "/schedule/month", label: "月の出勤表" },
      { href: "/schedule/day", label: "今日の出勤" },
    ],
  },
  {
    key: "send",
    label: "配信",
    home: "/contents",
    pages: [
      { href: "/contents", label: "サイト更新の予約" },
      { href: "/templates", label: "文面テンプレート" },
      { href: "/bulk", label: "まとめて投稿" },
      { href: "/diary", label: "写メ日記の転送" },
      { href: "/push/schedule", label: "出勤を送る" },
      { href: "/push/casts", label: "プロフィールを送る" },
      { href: "/push/delete", label: "サイトから外す" },
      { href: "/portals/fdc", label: "公式サイト連動" },
      { href: "/logs", label: "配信の記録" },
    ],
  },
  {
    key: "shop",
    label: "店舗",
    home: "/settings",
    pages: [
      { href: "/settings", label: "店舗の設定" },
      { href: "/accounts", label: "サイトのログイン情報" },
      { href: "/portals", label: "公式サイト接続" },
      { href: "/import", label: "Mr.Venreyから取り込み" },
      { href: "/free-sites", label: "無料で載せられるサイト" },
      { href: "/help", label: "使い方" },
      { href: "/inquiry", label: "サポートに連絡" },
    ],
  },
];

const MASTER: Page = { href: "/master", label: "店舗の管理（運営）" };

/** いまのURLに一番くわしく当てはまるページ */
function match(path: string, master: boolean) {
  let best: { space: Space; page: Page } | null = null;
  for (const space of SPACES) {
    const pages = space.key === "shop" && master ? [...space.pages, MASTER] : space.pages;
    for (const page of pages) {
      const hit = page.href === "/" ? path === "/" : path === page.href || path.startsWith(page.href + "/");
      if (hit && (!best || page.href.length > best.page.href.length)) best = { space, page };
    }
  }
  return best;
}

function Icon({ k }: { k: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (k) {
    case "today":
      return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>);
    case "casts":
      return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>);
    case "schedule":
      return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>);
    case "send":
      return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...p}><path d="M4 12h11M11 6l6 6-6 6" /><path d="M20 5v14" /></svg>);
    default:
      return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...p}><path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M10 20v-6h4v6" /></svg>);
  }
}

/** 左のレール（PC）／下のバー（スマホ） */
export function Sidebar({ shopName, shopCode, master = false }: { shopName: string; shopCode: string; master?: boolean }) {
  const path = usePathname();
  const cur = match(path, master)?.space.key ?? "today";
  return (
    <>
      <aside className="hidden md:flex sticky top-0 h-screen w-[92px] shrink-0 flex-col items-center border-r border-zinc-700/70 bg-zinc-900 py-5">
        <Link href="/" aria-label="ホーム" className="mb-8">
          <LogoMark size={34} />
        </Link>
        <nav className="relative flex flex-1 flex-col items-center gap-7" aria-label="仕事場">
          {/* 軌道：5つの仕事場をつなぐ1本の線 */}
          <span aria-hidden className="absolute left-1/2 top-3 bottom-8 w-px -translate-x-1/2 bg-zinc-700" />
          {SPACES.map((s) => {
            const on = s.key === cur;
            return (
              <Link
                key={s.key}
                href={s.home}
                aria-current={on ? "page" : undefined}
                className={`relative flex w-[72px] flex-col items-center gap-1 rounded-xl py-2 text-[12px] font-bold ${on ? "text-violet-200" : "text-zinc-400 hover:text-zinc-100"}`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    on ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-700 bg-zinc-900"
                  }`}
                >
                  <Icon k={s.key} />
                </span>
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-3">
          <ThemeToggle />
          <a href="/logout" className="text-[11px] text-zinc-500 hover:text-zinc-200">ログアウト</a>
        </div>
        <span className="sr-only">{shopName}（{shopCode}）</span>
      </aside>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-zinc-700 bg-zinc-900/95 backdrop-blur" aria-label="仕事場">
        {SPACES.map((s) => {
          const on = s.key === cur;
          return (
            <Link key={s.key} href={s.home} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${on ? "text-violet-200" : "text-zinc-400"}`}>
              <Icon k={s.key} />
              {s.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** 上の帯：店舗名と、仕事場の中のページのタブ */
export function TopBar({ shopName, shopCode, master = false }: { shopName: string; shopCode: string; master?: boolean }) {
  const path = usePathname();
  const m = match(path, master);
  const space = m?.space ?? SPACES[0];
  const pages = space.key === "shop" && master ? [...space.pages, MASTER] : space.pages;
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-700/70 bg-zinc-950/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 pt-3 md:px-8">
        <span className="md:hidden"><Logo size={22} /></span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold text-zinc-100">{shopName}</div>
          <div className="text-[11px] text-zinc-500 tnum">店舗ID {shopCode}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {master && (
            <Link href="/master" className="rounded-full border border-amber-600/50 px-3 py-1 text-[12px] font-bold text-amber-300 hover:bg-amber-500/10">
              運営
            </Link>
          )}
          <span className="md:hidden"><ThemeToggle /></span>
        </div>
      </div>
      <nav className="mt-2 flex gap-1 overflow-x-auto px-3 md:px-7" aria-label={`${space.label}のページ`}>
        {pages.map((p) => {
          const on = m?.page.href === p.href;
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 border-b-[3px] px-3 pb-2.5 pt-1.5 text-[13px] font-bold ${
                on ? "border-violet-600 text-zinc-100" : "border-transparent text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
