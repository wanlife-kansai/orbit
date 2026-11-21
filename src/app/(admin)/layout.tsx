import { Sidebar } from "@/components/Sidebar";
import { getShop, isMaster } from "@/lib/shop";
import { after } from "next/server";
import { runDue } from "@/lib/contentRunner";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  // 画面を開くたびに、時刻が来たコンテンツ更新を実行（定期実行の補助）
  after(() => runDue(5).catch((e) => console.error("[runDue]", e)));
  return (
    <div className="md:flex min-h-screen">
      <Sidebar shopName={shop.name} shopCode={shop.loginId ?? String(shop.id)} master={await isMaster()} />
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
