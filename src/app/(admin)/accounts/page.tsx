import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/PageHeader";
import { currentShopId } from "@/lib/shop";
import { ALL_SITES } from "@/lib/sites";
import { CATALOG } from "@/lib/contentCatalog";
import { AccountRow } from "./AccountRow";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "all", q = "" } = await searchParams;
  const portals = await db.select().from(schema.portals).where(ne(schema.portals.kind, "official"));
  const accounts = await db.select().from(schema.shopPortalAccounts).where(eq(schema.shopPortalAccounts.shopId, (await currentShopId())));
  const byCode = new Map(portals.map((p) => [p.code, p]));

  const rows = ALL_SITES.filter((s) => s.code !== "official")
    .map((s) => {
      const p = byCode.get(s.code);
      const a = p ? accounts.find((x) => x.portalId === p.id) : undefined;
      const items = CATALOG.filter((c) => c.site === s.code);
      return {
        code: s.code,
        name: s.name,
        portalId: p?.id ?? 0,
        loginId: a?.loginId ?? "",
        hasPassword: !!a?.passwordEnc,
        lastCheck: a?.lastCheckResult ?? "",
        memo: a?.memo ?? "",
        registered: !!a?.loginId,
        kinds: [...new Set(items.map((i) => i.kind))],
        auto: items.some((i) => i.driver),
      };
    })
    .filter((r) => (f === "reg" ? r.registered : f === "unreg" ? !r.registered : true))
    .filter((r) => !q || r.name.includes(q));
  const regCount = ALL_SITES.filter((s) => {
    const p = byCode.get(s.code);
    return p && accounts.some((a) => a.portalId === p.id && a.loginId);
  }).length;

  const tab = (key: string, label: string) => (
    <a href={`/accounts?f=${key}`} className={`rounded-md px-3 py-1.5 text-sm ${f === key ? "bg-violet-600/20 text-violet-200" : "text-zinc-400 hover:bg-zinc-800"}`}>
      {label}
    </a>
  );

  return (
    <>
      <PageHeader title="サイトのログイン情報" desc="各サイトの管理画面のログインID・パスワードを登録します（暗号化して保存）。登録したサイトがコンテンツ更新・女性／出勤の更新先になります。" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tab("all", `対応サイト一覧（${ALL_SITES.length - 1}）`)}
        {tab("reg", `登録済（${regCount}）`)}
        {tab("unreg", "未登録")}
        <form className="ml-auto">
          <input type="hidden" name="f" value={f} />
          <input name="q" defaultValue={q} placeholder="サイト名で検索" className="input w-56" />
        </form>
      </div>
      <div className="card divide-y divide-zinc-800">
        {rows.map((r) => (
          <AccountRow key={r.code} r={r} />
        ))}
        {rows.length === 0 && <div className="p-4 text-sm text-zinc-500">該当するサイトはありません</div>}
      </div>
      <p className="mt-3 text-xs text-zinc-500">「自動投稿」が付いているサイトは ORBIT から実際に更新できます。付いていないサイトは ID・PASS を保存しておけば、接続ができ次第そのまま使えます。</p>
    </>
  );
}
