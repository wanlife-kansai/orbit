import { db, schema } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { SHOP_ID } from "./shop";
import { businessDate, minutesInBusinessDay, nowMinutesInBusinessDay } from "./dates";

const { casts, schedules, castStatus } = schema;

export type RosterRow = {
  castId: number;
  name: string;
  age: number | null;
  start: string;
  end: string;
  state: "before" | "working" | "done";
  status: "none" | "waiting" | "serving";
  until: string;
  comment: string;
  excluded: boolean;
};

/** 今日（営業日）の出勤者と、即姫の状態 */
export async function getTodayRoster(dayChangeHour: number) {
  const date = businessDate(dayChangeHour);
  const rows = await db
    .select({
      castId: casts.id,
      name: casts.name,
      age: casts.age,
      sortOrder: casts.sortOrder,
      sokuhimeComment: casts.sokuhimeComment,
      start: schedules.start,
      end: schedules.end,
    })
    .from(schedules)
    .innerJoin(casts, eq(casts.id, schedules.castId))
    .where(and(eq(schedules.shopId, SHOP_ID), eq(schedules.date, date), eq(schedules.off, false)))
    .orderBy(asc(schedules.start), asc(casts.sortOrder));

  const statuses = await db
    .select()
    .from(castStatus)
    .where(and(eq(castStatus.shopId, SHOP_ID), eq(castStatus.date, date)));
  const byCast = new Map(statuses.map((s) => [s.castId, s]));

  const nowMin = nowMinutesInBusinessDay(dayChangeHour);
  const roster: RosterRow[] = rows
    .filter((r) => r.start && r.end)
    .map((r) => {
      const s = minutesInBusinessDay(r.start, dayChangeHour);
      let e = minutesInBusinessDay(r.end, dayChangeHour);
      if (e <= s) e += 24 * 60;
      const state = nowMin < s ? "before" : nowMin >= e ? "done" : "working";
      const st = byCast.get(r.castId);
      // 接客中の終了予定を過ぎたら自動で解除扱い
      let status = (st?.status ?? "none") as RosterRow["status"];
      if (status === "serving" && st?.until) {
        let u = minutesInBusinessDay(st.until, dayChangeHour);
        if (u < s) u += 24 * 60;
        if (nowMin >= u) status = "none";
      }
      if (state === "done") status = "none";
      return {
        castId: r.castId,
        name: r.name,
        age: r.age,
        start: r.start,
        end: r.end,
        state,
        status,
        until: st?.until ?? "",
        comment: st?.comment ?? r.sokuhimeComment,
        excluded: st?.excluded ?? false,
      };
    });
  return { date, roster };
}
