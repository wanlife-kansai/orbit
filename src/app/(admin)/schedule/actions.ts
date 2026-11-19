"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { deliverSchedules } from "@/lib/official";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { addDays } from "@/lib/dates";

export type Cell = { castId: number; date: string; start: string; end: string; off: boolean };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveWeek(cells: Cell[]) {
  for (const c of cells) {
    const empty = !c.off && !c.start && !c.end;
    if (empty) {
      await db
        .delete(schema.schedules)
        .where(and(eq(schema.schedules.castId, c.castId), eq(schema.schedules.date, c.date), eq(schema.schedules.shopId, SHOP_ID)));
      continue;
    }
    if (!c.off && (!TIME.test(c.start) || !TIME.test(c.end))) continue;
    await db
      .insert(schema.schedules)
      .values({ shopId: SHOP_ID, castId: c.castId, date: c.date, start: c.off ? "" : c.start, end: c.off ? "" : c.end, off: c.off })
      .onConflictDoUpdate({
        target: [schema.schedules.castId, schema.schedules.date],
        set: { start: sql`excluded.start`, end: sql`excluded."end"`, off: sql`excluded.off` },
      });
  }
  after(() => deliverSchedules(cells.map((c) => ({ castId: c.castId, date: c.date }))));
  revalidatePath("/schedule");
  revalidatePath("/");
  revalidatePath("/sokuhime");
}

/** 前の週の出勤を、この週にコピー（すでに入っている日は上書きしない） */
export async function copyPrevWeek(monday: string) {
  const prevMon = addDays(monday, -7);
  const prev = await db
    .select()
    .from(schema.schedules)
    .where(and(eq(schema.schedules.shopId, SHOP_ID), gte(schema.schedules.date, prevMon), lte(schema.schedules.date, addDays(prevMon, 6))));
  const copied: { castId: number; date: string }[] = [];
  for (const p of prev) {
    const r = await db
      .insert(schema.schedules)
      .values({ shopId: SHOP_ID, castId: p.castId, date: addDays(p.date, 7), start: p.start, end: p.end, off: p.off })
      .onConflictDoNothing()
      .returning({ castId: schema.schedules.castId, date: schema.schedules.date });
    copied.push(...r);
  }
  after(() => deliverSchedules(copied));
  revalidatePath("/schedule");
}
