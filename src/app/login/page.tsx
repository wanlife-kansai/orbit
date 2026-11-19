import { cookies } from "next/headers";
import { LAST_SHOP_COOKIE, credentials } from "@/lib/auth";
import { PublicFrame } from "@/components/PublicFrame";
import { findShop } from "@/lib/shop";
import { LoginCard } from "./LoginCard";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const remembered = (await cookies()).get(LAST_SHOP_COOKIE)?.value ?? null;
  const shop = await findShop();
  // 覚えているIDが今の店舗のものなら、店舗名を出して「ログイン」だけにする
  const known = remembered && remembered === credentials().id && shop ? shop.name : null;
  return (
    <PublicFrame officialUrl={shop?.officialUrl || undefined}>
      <LoginCard shopName={known} rememberedId={known ? remembered : null} />
    </PublicFrame>
  );
}
