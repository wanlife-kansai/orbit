import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { FdcTester } from "./FdcTester";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function FdcPage() {
  const list = await db
    .select({ id: schema.casts.id, name: schema.casts.name })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, await currentShopId()))
    .orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  return (
    <>
      <PageHeader
        title="風俗データセンター 出勤連動テスト"
        desc="1人・1日だけ、ORBITの出勤を風俗データセンター（まるごとHP）へ送って確かめます。送る前の値を覚えておき、ボタン1つで元に戻せます。自動配信にはまだつないでいません。"
      />
      <FdcTester casts={list} />
    </>
  );
}
