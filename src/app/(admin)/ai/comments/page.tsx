import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";
import { usage } from "./actions";
import { CommentGen } from "./CommentGen";

export default async function AiCommentsPage() {
  const casts = await db
    .select({ id: schema.casts.id, name: schema.casts.name, specialPlay: schema.casts.specialPlay, charmPoint: schema.casts.charmPoint, style: schema.casts.bodyType, castType: schema.casts.castType, catchCopy: schema.casts.catchCopy })
    .from(schema.casts)
    .where(eq(schema.casts.shopId, (await currentShopId())))
    .orderBy(asc(schema.casts.sortOrder));
  const history = await db.select().from(schema.aiGenerations).where(eq(schema.aiGenerations.shopId, (await currentShopId()))).orderBy(desc(schema.aiGenerations.id)).limit(20);
  const u = await usage();
  return (
    <>
      <PageHeader title="紹介文をAIで作る" desc="女性の特徴とキーワード・口調から、お店コメントの文案をAIが作ります。" />
      <CommentGen
        casts={casts}
        usage={u}
        hasKey={!!process.env.ANTHROPIC_API_KEY}
        history={history.map((h) => ({ id: h.id, castName: casts.find((c) => c.id === h.castId)?.name ?? "", output: h.output, createdAt: h.createdAt.toISOString() }))}
      />
    </>
  );
}
