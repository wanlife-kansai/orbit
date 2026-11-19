"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, count, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { getSettings } from "@/lib/settings";
import { generateText } from "@/lib/ai";
import { autoDeliverCastFields as deliverCastFields } from "@/lib/official";

export type AiInput = { castId: number; specialPlay: string; charmPoint: string; style: string; castType: string; catch10: string; catch20: string; keyword: string; tone: string; length: string };

function monthStart() {
  const j = new Date(Date.now() + 9 * 3600_000);
  return new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), 1) - 9 * 3600_000);
}

export async function usage() {
  const s = await getSettings();
  const [{ n }] = await db.select({ n: count() }).from(schema.aiGenerations).where(and(eq(schema.aiGenerations.shopId, SHOP_ID), gte(schema.aiGenerations.createdAt, monthStart())));
  return { used: n, limit: s.aiMonthlyLimit };
}

export async function generateComment(input: AiInput) {
  const u = await usage();
  if (u.used >= u.limit) return { ok: false, message: `今月の生成回数（${u.limit}回）に達しました`, text: "" };
  const [c] = await db.select().from(schema.casts).where(and(eq(schema.casts.id, input.castId), eq(schema.casts.shopId, SHOP_ID)));
  if (!c) return { ok: false, message: "女性を選んでください", text: "" };
  const facts = [
    `名前：${c.name}`,
    c.age ? `年齢：${c.age}歳` : "",
    c.height ? `身長：${c.height}cm` : "",
    c.bust ? `スリーサイズ：B${c.bust}(${c.cup}) W${c.waist ?? "-"} H${c.hip ?? "-"}` : "",
    input.specialPlay && `得意なこと：${input.specialPlay}`,
    input.charmPoint && `チャームポイント：${input.charmPoint}`,
    input.style && `スタイル：${input.style}`,
    input.castType && `タイプ：${input.castType}`,
    input.catch10 && `キャッチコピー(10字)：${input.catch10}`,
    input.catch20 && `キャッチコピー(20字)：${input.catch20}`,
    input.keyword && `キーワード：${input.keyword}`,
  ].filter(Boolean);
  const system =
    "あなたは大人向けリラクゼーション店のプロフィール文を書くコピーライターです。在籍女性の魅力を伝える「お店からのコメント」を日本語で書きます。" +
    "露骨な性的表現・違法なサービスを想起させる表現・未成年を想起させる表現・事実でない数値は使わず、上品で読みやすい文章にします。出力は本文のみ（見出しや前置きは不要）。";
  const user = `次の情報をもとに、口調「${input.tone}」で約${input.length}文字のお店コメントを書いてください。\n${facts.join("\n")}`;
  try {
    const text = await generateText(system, user, 1200);
    await db.insert(schema.aiGenerations).values({ shopId: SHOP_ID, castId: c.id, kind: "comment", input: { ...input, castId: String(input.castId) } as unknown as Record<string, string>, output: text });
    revalidatePath("/ai/comments");
    return { ok: true, message: "生成しました", text };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "生成できませんでした", text: "" };
  }
}

/** 生成したコメントを女性の「お店コメント」に入れる */
export async function applyToShopComment(castId: number, text: string) {
  await db.update(schema.casts).set({ shopComment: text }).where(and(eq(schema.casts.id, castId), eq(schema.casts.shopId, SHOP_ID)));
  after(() => deliverCastFields([castId], "お店コメントを更新"));
  revalidatePath(`/casts/${castId}`);
  return { ok: true, message: "お店コメントに入れました（公式サイトへも送ります）" };
}
