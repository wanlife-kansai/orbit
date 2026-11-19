"use server";
import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { getShop, SHOP_ID } from "@/lib/shop";
import { addDays, businessDate } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { deliverCast, deliverCastRemoved, deliverSchedules, getConn } from "@/lib/official";
import { siteName } from "@/lib/sites";

type R = { ok: boolean; message: string };

/** 公式サイト以外は、ロボット接続ができるまで「準備中」として返す */
function pending(sites: string[]) {
  const others = sites.filter((s) => s !== "official");
  return others.length ? `\n${others.map(siteName).join("・")} は接続準備中のため送っていません。` : "";
}

export async function pushSchedules(castIds: number[], sites: string[]): Promise<R> {
  if (!castIds.length || !sites.length) return { ok: false, message: "女性とサイトを選んでください" };
  let head = "";
  if (sites.includes("official")) {
    if (!(await getConn())) return { ok: false, message: "公式サイトが未接続です（公式サイト連携で設定してください）" };
    const shop = await getShop();
    const s = await getSettings();
    const from = businessDate(shop.dayChangeHour);
    const to = addDays(from, s.schedulePeriod === "2w" ? 13 : 6);
    const rows = await db
      .select({ castId: schema.schedules.castId, date: schema.schedules.date })
      .from(schema.schedules)
      .where(and(eq(schema.schedules.shopId, SHOP_ID), inArray(schema.schedules.castId, castIds), gte(schema.schedules.date, from), lte(schema.schedules.date, to)));
    // 未設定の日も送る（公式サイト側の古い出勤を消すため）
    const items: { castId: number; date: string }[] = [];
    for (const id of castIds) for (let d = 0; ; d++) { const date = addDays(from, d); if (date > to) break; items.push({ castId: id, date }); }
    await deliverSchedules(items);
    head = `公式サイトへ ${castIds.length}人・${from}〜${to} の出勤（入力済み ${rows.length}件）を送りました。`;
  }
  revalidatePath("/logs");
  return { ok: true, message: (head || "送信できるサイトがありません。") + pending(sites) };
}

export async function pushCasts(castIds: number[], sites: string[]): Promise<R> {
  if (!castIds.length || !sites.length) return { ok: false, message: "女性とサイトを選んでください" };
  let head = "";
  if (sites.includes("official")) {
    if (!(await getConn())) return { ok: false, message: "公式サイトが未接続です（公式サイト連携で設定してください）" };
    for (const id of castIds) await deliverCast(id);
    head = `公式サイトへ ${castIds.length}人を送りました。`;
  }
  revalidatePath("/logs");
  return { ok: true, message: (head || "送信できるサイトがありません。") + pending(sites) };
}

export async function deleteFromSites(castIds: number[], sites: string[]): Promise<R> {
  if (!castIds.length || !sites.length) return { ok: false, message: "女性とサイトを選んでください" };
  let head = "";
  if (sites.includes("official")) {
    if (!(await getConn())) return { ok: false, message: "公式サイトが未接続です" };
    const list = await db.select({ id: schema.casts.id, name: schema.casts.name }).from(schema.casts).where(and(eq(schema.casts.shopId, SHOP_ID), inArray(schema.casts.id, castIds)));
    for (const c of list) await deliverCastRemoved(c.id, c.name);
    head = `公式サイトで ${list.length}人を非公開にしました（ORBITからは削除していません）。`;
  }
  revalidatePath("/logs");
  return { ok: true, message: (head || "送信できるサイトがありません。") + pending(sites) };
}
