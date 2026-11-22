import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { CMS_NAME } from "@/lib/brand";

/** ログイン前の画面の外枠。左にORBITの説明、右にフォーム */
export function PublicFrame({ children, officialUrl }: { children: React.ReactNode; officialUrl?: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-5xl gap-10 px-6 py-10 md:grid-cols-[1fr_400px] md:items-center md:gap-16">
        <section className="md:pb-16">
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <span className="text-2xl font-bold" style={{ letterSpacing: "0.06em" }}>{CMS_NAME}</span>
          </div>
          <p className="mt-8 max-w-md text-[28px] font-bold leading-snug">
            出勤もプロフィールも、
            <br />
            ここで直せば各サイトへ。
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
            店舗ごとのIDでログインします。IDとパスワードがわからないときは、お店の管理者か運営に確認してください。
          </p>
        </section>
        <div>
          {children}
          <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
            <Link href="/info/company" className="hover:text-zinc-200">運営会社</Link>
            <Link href="/info/terms" className="hover:text-zinc-200">利用規約</Link>
            <Link href="/info/privacy" className="hover:text-zinc-200">プライバシーポリシー</Link>
            {officialUrl && (
              <a href={officialUrl} target="_blank" rel="noopener" className="hover:text-zinc-200">お店のサイト</a>
            )}
            <span className="w-full pt-2 text-zinc-600">© {new Date().getFullYear()} {CMS_NAME}</span>
          </nav>
        </div>
      </div>
    </div>
  );
}
