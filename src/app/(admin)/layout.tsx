import { Sidebar, TopBar } from "@/components/Sidebar";
import { getShop, isMaster } from "@/lib/shop";
import { after } from "next/server";
import { runDue } from "@/lib/contentRunner";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  // 画面を開くたびに、時刻が来たコンテンツ更新を実行（定期実行の補助）
  after(() => runDue(5).catch((e) => console.error("[runDue]", e)));
  const code = shop.loginId ?? String(shop.id);
  const master = await isMaster();
  return (
    <div className="md:flex min-h-screen">
      <Sidebar shopName={shop.name} shopCode={code} master={master} />
      <div className="flex-1 min-w-0">
        <TopBar shopName={shop.name} shopCode={code} master={master} />
        <main className="px-4 pb-24 pt-6 md:px-8 md:pb-12">{children}</main>
      </div>
    </div>
  );
}
