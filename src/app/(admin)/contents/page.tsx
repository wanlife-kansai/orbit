import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { dxPortal } from "@/lib/portals/dx";
import { DxNewsPanel } from "./DxNewsPanel";

export default async function ContentsPage() {
  const portal = await dxPortal();
  const [acc] = portal
    ? await db
        .select()
        .from(schema.shopPortalAccounts)
        .where(and(eq(schema.shopPortalAccounts.shopId, SHOP_ID), eq(schema.shopPortalAccounts.portalId, portal.id)))
    : [];
  const templates = await db
    .select({ id: schema.templates.id, title: schema.templates.title, body: schema.templates.body, label: schema.templates.label })
    .from(schema.templates)
    .where(eq(schema.templates.shopId, SHOP_ID))
    .orderBy(desc(schema.templates.id));

  return (
    <>
      <PageHeader title="コンテンツ更新" desc="ポータルの「更新できる枠」に投稿します。まずは風俗DXのお店速報から。" />
      {!acc?.passwordEnc ? (
        <div className="card p-6 text-sm text-zinc-300">
          風俗DXのログインID・パスワードが未登録です。
          <Link href="/portals" className="ml-1 text-violet-300 underline">連携ポータル</Link>
          の「風俗DX」で登録してください。
        </div>
      ) : (
        <DxNewsPanel templates={templates} />
      )}
    </>
  );
}
