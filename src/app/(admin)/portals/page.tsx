import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/PageHeader";
import { SHOP_ID } from "@/lib/shop";
import { getOfficialPortal, linkedCount } from "@/lib/official";
import { OfficialPanel } from "./OfficialPanel";
import { TargetSites } from "./TargetSites";
import { PortalAccount } from "./PortalAccount";
import { getShop } from "@/lib/shop";
import { targetSitesOf } from "@/lib/targets";

export default async function PortalsPage() {
  const portals = await db.select().from(schema.portals).where(ne(schema.portals.kind, "official")).orderBy(asc(schema.portals.id));
  const official = await getOfficialPortal();
  const [acc] = official
    ? await db
        .select()
        .from(schema.shopPortalAccounts)
        .where(and(eq(schema.shopPortalAccounts.shopId, SHOP_ID), eq(schema.shopPortalAccounts.portalId, official.id)))
    : [];
  const linked = await linkedCount();
  const accounts = await db.select().from(schema.shopPortalAccounts).where(eq(schema.shopPortalAccounts.shopId, SHOP_ID));
  const shop = await getShop();
  const slots = await db.select().from(schema.portalSlots).orderBy(asc(schema.portalSlots.id));

  return (
    <>
      <PageHeader title="公式サイト連携" desc="公式サイトにはAPIで配信します。女性編集に出す連動先サイトもここで選びます。" />
      <div className="space-y-4">
        <OfficialPanel url={acc?.loginId ?? ""} hasKey={!!acc?.passwordEnc} linked={linked} lastCheck={acc?.lastCheckResult ?? ""} />
        <TargetSites initial={targetSitesOf(shop)} />
        <p className="text-sm text-zinc-400">
          ポータルサイトのログインID・パスワードは <a href="/accounts" className="text-violet-300 underline">ID・PASS登録</a> で設定します。
        </p>
      </div>
    </>
  );
}
