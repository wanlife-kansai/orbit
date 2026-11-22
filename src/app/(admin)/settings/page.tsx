import { getShop } from "@/lib/shop";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { SITES } from "@/lib/sites";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const shop = await getShop();
  const s = await getSettings();
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader title="店舗の設定" />
      <SettingsForm
        tab={tab ?? "basic"}
        basics={{ name: shop.name, officialUrl: shop.officialUrl, email: shop.email, dayChangeHour: shop.dayChangeHour }}
        initial={s}
        sites={SITES.filter((x) => x.code !== "official").map((x) => ({ code: x.code, name: x.name }))}
        build={process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}
      />
    </>
  );
}
