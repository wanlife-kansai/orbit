import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { LAST_SHOP_COOKIE } from "@/lib/auth";
import { PublicFrame } from "@/components/PublicFrame";
import { db, ensureSchema, schema } from "@/db";
import { LoginCard } from "./LoginCard";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const remembered = (await cookies()).get(LAST_SHOP_COOKIE)?.value ?? null;
  await ensureSchema();
  // 覚えているIDの店舗があれば、店舗名を出して「ログイン」だけにする
  const [shop] = remembered ? await db.select().from(schema.shops).where(eq(schema.shops.loginId, remembered)) : [];
  const known = shop ? shop.name : null;
  return (
    <PublicFrame officialUrl={shop?.officialUrl || undefined}>
      <LoginCard shopName={known} rememberedId={known ? remembered : null} />
    </PublicFrame>
  );
}
