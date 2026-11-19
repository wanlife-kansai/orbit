"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, asc, eq, max, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { deliverCast } from "@/lib/official";
import { COMMENT_MAX, CUPS, QA_MAX, QA_Q_MAX, TEXT_MAX } from "@/lib/castFields";
import type { CastInput } from "./types";

const { casts } = schema;

const clip = (v: unknown, max = 100000) => String(v ?? "").slice(0, max);
const intOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const oneOf = (v: unknown, list: readonly string[]) => (list.includes(String(v)) ? String(v) : "");
const strMap = (v: unknown, maxLen = COMMENT_MAX) => {
  const out: Record<string, string> = {};
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === "string" && x) out[k] = x.slice(0, maxLen);
  return out;
};
const qaList = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((x) => ({ q: clip((x as { q?: string })?.q, QA_Q_MAX).trim(), a: clip((x as { a?: string })?.a, 5000).trim() }))
    .filter((x) => x.q || x.a)
    .slice(0, QA_MAX);

function clean(input: CastInput) {
  const siteFields: Record<string, Record<string, string | string[]>> = {};
  for (const [site, vals] of Object.entries(input.siteFields ?? {})) {
    const o: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(vals ?? {})) {
      if (Array.isArray(v)) {
        const arr = v.map((x) => clip(x, 200)).filter(Boolean);
        if (arr.length) o[k] = arr;
      } else if (v !== undefined && v !== null && String(v) !== "") o[k] = clip(v, 20000);
    }
    if (Object.keys(o).length) siteFields[site] = o;
  }
  const qaBySite: Record<string, { q: string; a: string }[]> = {};
  for (const [site, list] of Object.entries(input.qaBySite ?? {})) qaBySite[site] = qaList(list);

  return {
    name: clip(input.name, TEXT_MAX.name).trim(),
    kana: clip(input.kana, TEXT_MAX.kana).trim(),
    nameKana: clip(input.hiragana, TEXT_MAX.hiragana).trim(),
    romaji: clip(input.romaji, TEXT_MAX.romaji).trim(),
    joinedOn: DATE.test(input.joinedOn ?? "") ? input.joinedOn : "",
    isNew: !!input.isNew,
    isPublished: !!input.isPublished,
    age: intOrNull(input.age),
    ageFromBirthday: !!input.ageFromBirthday,
    birthday: DATE.test(input.birthday ?? "") ? input.birthday : "",
    bust: intOrNull(input.bust),
    cup: CUPS.includes(input.cup) ? input.cup : "",
    waist: intOrNull(input.waist),
    hip: intOrNull(input.hip),
    height: intOrNull(input.height),
    weight: intOrNull(input.weight),
    bloodType: oneOf(input.bloodType, ["A", "B", "O", "AB"]),
    bodyType: clip(input.style, 50),
    castType: clip(input.castType, 50),
    styleBySite: strMap(input.styleBySite, 50),
    typeBySite: strMap(input.typeBySite, 50),
    catchCopy: clip(input.catchCopy, TEXT_MAX.catchCopy),
    shortComment: clip(input.shortComment, TEXT_MAX.shortComment),
    erogenousZone: clip(input.erogenousZone, TEXT_MAX.erogenousZone),
    hobby: clip(input.hobby, TEXT_MAX.hobby),
    specialPlay: clip(input.specialPlay, TEXT_MAX.specialPlay),
    charmPoint: clip(input.charmPoint, 5000),
    idealType: clip(input.idealType, 5000),
    firstExperience: clip(input.firstExperience, 5000),
    hometown: clip(input.hometown, TEXT_MAX.hometown),
    zodiac: clip(input.zodiac, TEXT_MAX.zodiac),
    drinks: oneOf(input.drinks, ["飲む", "飲まない"]),
    smokes: oneOf(input.smokes, ["吸う", "吸わない"]),
    showFace: oneOf(input.showFace, ["設定する", "設定しない"]),
    mobileEmail: clip(input.mobileEmail, 200).trim(),
    pcEmail: clip(input.pcEmail, 200).trim(),
    shopComment: clip(input.shopComment, COMMENT_MAX),
    message: clip(input.message, COMMENT_MAX),
    comment: clip(input.comment, COMMENT_MAX),
    shopCommentByLength: strMap(input.shopCommentByLength),
    messageByLength: strMap(input.messageByLength),
    commentByLength: strMap(input.commentByLength),
    siteFields,
    qa: qaList(input.qa),
    qaBySite,
    memo: clip(input.memo, 2000),
  };
}

export type SaveResult = { ok: boolean; id?: number; message: string };

export async function saveCastFull(id: number | null, input: CastInput): Promise<SaveResult> {
  const v = clean(input);
  if (!v.name) return { ok: false, message: "女性名を入力してください" };

  let castId = id;
  if (castId) {
    const r = await db
      .update(casts)
      .set(v)
      .where(and(eq(casts.id, castId), eq(casts.shopId, SHOP_ID)))
      .returning({ id: casts.id });
    if (!r.length) return { ok: false, message: "女性が見つかりません" };
  } else {
    const [{ m }] = await db.select({ m: max(casts.sortOrder) }).from(casts).where(eq(casts.shopId, SHOP_ID));
    const [row] = await db
      .insert(casts)
      .values({ ...v, shopId: SHOP_ID, sortOrder: (m ?? 0) + 1 })
      .returning({ id: casts.id });
    castId = row.id;
  }
  const cid = castId;
  after(() => deliverCast(cid));
  revalidatePath("/casts");
  revalidatePath("/");
  return { ok: true, id: cid, message: "保存しました" };
}

/** 「他の女性のQ&Aを読み込む」用 */
export async function listCastsWithQa(exceptId: number | null) {
  const rows = await db
    .select({ id: casts.id, name: casts.name, qa: casts.qa })
    .from(casts)
    .where(exceptId ? and(eq(casts.shopId, SHOP_ID), ne(casts.id, exceptId)) : eq(casts.shopId, SHOP_ID))
    .orderBy(asc(casts.sortOrder));
  return rows.filter((r) => r.qa.length > 0).map((r) => ({ id: r.id, name: r.name, qa: r.qa }));
}
