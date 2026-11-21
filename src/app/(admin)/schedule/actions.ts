"use server";
import { revalidatePath } from "next/cache";
import { autoDeliverSchedules as deliverSchedules } from "@/lib/official";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { afterForShop, currentShopId } from "@/lib/shop";
import { addDays } from "@/lib/dates";

export type Cell = { castId: number; date: string; start: string; end: string; off: boolean };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveWeek(cells: Cell[]) {
  for (const c of cells) {
    const empty = !c.off && !c.start && !c.end;
    if (empty) {
      await db
        .delete(schema.schedules)
        .where(and(eq(schema.schedules.castId, c.castId), eq(schema.schedules.date, c.date), eq(schema.schedules.shopId, (await currentShopId()))));
      continue;
    }
    if (!c.off && (!TIME.test(c.start) || !TIME.test(c.end))) continue;
    await db
      .insert(schema.schedules)
      .values({ shopId: (await currentShopId()), castId: c.castId, date: c.date, start: c.off ? "" : c.start, end: c.off ? "" : c.end, off: c.off })
      .onConflictDoUpdate({
        target: [schema.schedules.castId, schema.schedules.date],
        set: { start: sql`excluded.start`, end: sql`excluded."end"`, off: sql`excluded.off` },
      });
  }
  await afterForShop(() => deliverSchedules(cells.map((c) => ({ castId: c.castId, date: c.date }))));
  revalidatePath("/schedule", "layout");
  revalidatePath("/");
  revalidatePath("/sokuhime");
}

/** 前の週の出勤を、この週にコピー（すでに入っている日は上書きしない） */
export async function copyPrevWeek(monday: string) {
  const prevMon = addDays(monday, -7);
  const prev = await db
    .select()
    .from(schema.schedules)
    .where(and(eq(schema.schedules.shopId, (await currentShopId())), gte(schema.schedules.date, prevMon), lte(schema.schedules.date, addDays(prevMon, 6))));
  const copied: { castId: number; date: string }[] = [];
  for (const p of prev) {
    const r = await db
      .insert(schema.schedules)
      .values({ shopId: (await currentShopId()), castId: p.castId, date: addDays(p.date, 7), start: p.start, end: p.end, off: p.off })
      .onConflictDoNothing()
      .returning({ castId: schema.schedules.castId, date: schema.schedules.date });
    copied.push(...r);
  }
  await afterForShop(() => deliverSchedules(copied));
  revalidatePath("/schedule");
}

type Base = Record<string, { start: string; end: string; off?: boolean }>;
/** 基本出勤（曜日ごと）を保存 */
export async function saveBaseSchedule(castId: number, base: Base) {
  const clean: Base = {};
  for (const [k, v] of Object.entries(base)) {
    if (!/^[0-6]$/.test(k)) continue;
    if (v.off) clean[k] = { start: "", end: "", off: true };
    else if (TIME.test(v.start) && TIME.test(v.end)) clean[k] = { start: v.start, end: v.end };
  }
  await db.update(schema.casts).set({ baseSchedule: clean }).where(and(eq(schema.casts.id, castId), eq(schema.casts.shopId, (await currentShopId()))));
  revalidatePath("/schedule/month");
  return { ok: true, message: "基本出勤を保存しました" };
}

/** 基本出勤を、指定した月の「未設定」の日に適用する */
export async function applyBaseSchedule(castId: number, month: string, castIds?: number[]) {
  const ids = castIds?.length ? castIds : [castId];
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const added: { castId: number; date: string }[] = [];
  for (const id of ids) {
    const [c] = await db.select({ base: schema.casts.baseSchedule }).from(schema.casts).where(and(eq(schema.casts.id, id), eq(schema.casts.shopId, (await currentShopId()))));
    if (!c) continue;
    for (let d = 1; d <= days; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      const b = c.base[String(new Date(date + "T00:00:00Z").getUTCDay())];
      if (!b) continue;
      const r = await db
        .insert(schema.schedules)
        .values({ shopId: (await currentShopId()), castId: id, date, start: b.off ? "" : b.start, end: b.off ? "" : b.end, off: !!b.off })
        .onConflictDoNothing()
        .returning({ castId: schema.schedules.castId, date: schema.schedules.date });
      added.push(...r);
    }
  }
  await afterForShop(() => deliverSchedules(added));
  revalidatePath("/schedule/month");
  revalidatePath("/schedule");
  return { ok: true, message: `未設定の日 ${added.length}日分に基本出勤を入れました` };
}
