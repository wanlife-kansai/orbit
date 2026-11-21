import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { allShops, currentShopId, isMaster } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { MasterPanel } from "./MasterPanel";

export const dynamic = "force-dynamic";

export default async function MasterPage() {
  if (!(await isMaster())) redirect("/");
  const shops = await allShops();
  const counts = await db
    .select({ shopId: schema.casts.shopId, n: sql<number>`count(*)::int` })
    .from(schema.casts)
    .groupBy(schema.casts.shopId);
  const n = new Map(counts.map((c) => [c.shopId, c.n]));
  const current = await currentShopId();
  return (
    <>
      <PageHeader title="運営：店舗の管理" desc="店舗の追加（店舗IDは続き番号で自動発行）、パスワードの設定、店舗の切り替えができます。運営アカウントだけが見られます。" />
      <MasterPanel
        current={current}
        shops={shops.map((s) => ({
          id: s.id,
          loginId: s.loginId ?? String(s.id),
          name: s.name,
          active: s.active,
          hasPassword: !!s.passwordHash,
          casts: n.get(s.id) ?? 0,
          venrey: s.importSource?.venrey?.lastImportAt ?? "",
        }))}
      />
    </>
  );
}
