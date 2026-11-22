import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { FdcTester } from "./FdcTester";
import { BulkSync } from "./BulkSync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function FdcPage() {
  const list = await db
    .select({ id: schema.casts.id, name: schema.casts.name })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, await currentShopId()))
    .orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  return (
    <>
      <PageHeader
        title="公式サイト連動"
        desc="ORBITの出勤を風俗データセンター（まるごとHP＝公式サイト）へ送ります。1人・1日のテストと、キャスト全員・期間まとめての送信ができます。送る前の値を保存しておき、ボタン1つで元に戻せます。自動配信にはまだつないでいません。"
      />
      <FdcTester casts={list} />
      <BulkSync />
    </>
  );
}
