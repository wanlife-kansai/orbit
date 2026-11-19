import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";

const COLS: [string, (c: typeof schema.casts.$inferSelect) => unknown][] = [
  ["ID", (c) => c.id],
  ["女性名", (c) => c.name],
  ["カタカナ", (c) => c.kana],
  ["ひらがな", (c) => c.nameKana],
  ["ローマ字", (c) => c.romaji],
  ["入店日", (c) => c.joinedOn],
  ["新人", (c) => (c.isNew ? "新人" : "")],
  ["公開", (c) => (c.isPublished ? "公開中" : "非公開")],
  ["年齢", (c) => c.age],
  ["生年月日", (c) => c.birthday],
  ["バスト", (c) => c.bust],
  ["カップ", (c) => c.cup],
  ["ウエスト", (c) => c.waist],
  ["ヒップ", (c) => c.hip],
  ["身長", (c) => c.height],
  ["体重", (c) => c.weight],
  ["血液型", (c) => c.bloodType],
  ["スタイル", (c) => c.bodyType],
  ["タイプ", (c) => c.castType],
  ["キャッチコピー", (c) => c.catchCopy],
  ["ショートコメント", (c) => c.shortComment],
  ["性感帯", (c) => c.erogenousZone],
  ["趣味", (c) => c.hobby],
  ["得意プレイ", (c) => c.specialPlay],
  ["チャームポイント", (c) => c.charmPoint],
  ["好きなタイプ", (c) => c.idealType],
  ["初体験", (c) => c.firstExperience],
  ["出身地", (c) => c.hometown],
  ["星座", (c) => c.zodiac],
  ["お酒", (c) => c.drinks],
  ["タバコ", (c) => c.smokes],
  ["顔出し", (c) => c.showFace],
  ["お店コメント", (c) => c.shopComment],
  ["女の子コメント", (c) => c.message],
  ["コメント", (c) => c.comment],
  ["メモ", (c) => c.memo],
];

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 女性CSV出力（Excelで開けるようにBOM付きUTF-8） */
export async function GET() {
  const list = await db.select().from(schema.casts).where(eq(schema.casts.shopId, SHOP_ID)).orderBy(asc(schema.casts.sortOrder), asc(schema.casts.id));
  const lines = [COLS.map(([h]) => h).join(","), ...list.map((c) => COLS.map(([, f]) => esc(f(c))).join(","))];
  const date = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="casts-${date}.csv"` },
  });
}
