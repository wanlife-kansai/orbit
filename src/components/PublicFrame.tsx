import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CMS_NAME } from "@/lib/brand";

/** ログイン画面などの、ログイン前の外枠（上のロゴ帯・下のリンク） */
export function PublicFrame({ children, officialUrl }: { children: React.ReactNode; officialUrl?: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#262628]">
      <header className="flex h-16 items-center bg-black px-6 md:px-14">
        <Link href="/login">
          <Logo size={30} />
        </Link>
      </header>
      <main className="relative flex flex-1 flex-col items-center overflow-hidden px-4 pt-16 pb-12">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,transparent_0%,transparent_45%,rgba(255,255,255,0.025)_45%,rgba(255,255,255,0.025)_70%,transparent_70%),linear-gradient(20deg,rgba(0,0,0,0.18)_0%,transparent_40%)]" />
        <div className="relative w-full flex justify-center">{children}</div>
        <nav className="relative mt-16 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-zinc-300">
          <Link href="/info/company" className="underline underline-offset-4 hover:text-white">運営会社</Link>
          <Link href="/info/terms" className="underline underline-offset-4 hover:text-white">利用規約</Link>
          <Link href="/info/privacy" className="underline underline-offset-4 hover:text-white">プライバシーポリシー</Link>
          {officialUrl ? (
            <a href={officialUrl} target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-white">オフィシャルサイト</a>
          ) : (
            <span className="text-zinc-500">オフィシャルサイト</span>
          )}
        </nav>
        <p className="relative mt-8 text-xs text-zinc-500">© {new Date().getFullYear()} {CMS_NAME}. All rights reserved.</p>
      </main>
    </div>
  );
}
