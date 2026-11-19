import { Sidebar } from "@/components/Sidebar";
import { getShop } from "@/lib/shop";
import { credentials } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  return (
    <div className="md:flex min-h-screen">
      <Sidebar shopName={shop.name} shopCode={credentials().id} />
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
