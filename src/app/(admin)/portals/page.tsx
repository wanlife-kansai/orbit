import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/PageHeader";
import { SHOP_ID } from "@/lib/shop";
import { getOfficialPortal, linkedCount } from "@/lib/official";
import { OfficialPanel } from "./OfficialPanel";
import { TargetSites } from "./TargetSites";
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
  const shop = await getShop();
  const slots = await db.select().from(schema.portalSlots).orderBy(asc(schema.portalSlots.id));

  return (
    <>
      <PageHeader title="連携ポータル" desc="公式サイトにはAPIで、ポータルにはロボットで配信します。ポータルの接続はこの次につなぎます。" />
      <div className="space-y-4">
        <OfficialPanel url={acc?.loginId ?? ""} hasKey={!!acc?.passwordEnc} linked={linked} lastCheck={acc?.lastCheckResult ?? ""} />
        <TargetSites initial={targetSitesOf(shop)} />
        {portals.map((p) => (
          <section key={p.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{p.name}</h2>
                <div className="text-xs text-zinc-500">{p.loginUrl}　日付切り替え {p.dayChangeHour}:00</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.supports.map((s) => (
                  <span key={s} className="badge text-violet-300 ring-violet-800">{s}</span>
                ))}
                <span className="badge text-amber-300 ring-amber-800">テスト用・未接続</span>
              </div>
            </div>
            <table className="mt-4 w-full">
              <thead>
                <tr>
                  <th className="th">更新枠</th>
                  <th className="th w-20">種別</th>
                  <th className="th w-24">最小間隔</th>
                  <th className="th">ルール</th>
                </tr>
              </thead>
              <tbody>
                {slots
                  .filter((s) => s.portalId === p.id)
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="td font-medium">{s.name}</td>
                      <td className="td">{s.kind}</td>
                      <td className="td text-zinc-400">{s.minIntervalMin ? `${s.minIntervalMin}分` : "-"}</td>
                      <td className="td text-xs text-zinc-400">{s.rules}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto] opacity-50">
              <input disabled placeholder="ログインID" className="input" />
              <input disabled placeholder="パスワード（暗号化して保存）" className="input" />
              <button disabled className="btn">接続テスト</button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
