import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "./shop";
import { getSettings, type ShopSettings } from "./settings";
import { minutesInBusinessDay } from "./dates";
import { postContent } from "./connectors";

type Content = typeof schema.contents.$inferSelect;
const JST = 9 * 3600_000;

/** 日本時間の部品（営業日ベースの曜日つき） */
export function jstInfo(t: Date, dayChangeHour: number) {
  const j = new Date(t.getTime() + JST);
  const h = j.getUTCHours();
  const hhmm = `${String(h).padStart(2, "0")}:${String(j.getUTCMinutes()).padStart(2, "0")}`;
  const b = new Date(j.getTime() - dayChangeHour * 3600_000);
  return { hhmm, businessDow: b.getUTCDay(), businessYmd: b.toISOString().slice(0, 10) };
}

function inWindow(t: Date, c: Pick<Content, "weekdays" | "hoursFrom" | "hoursTo">, s: ShopSettings, dch: number, ignoreHours = false) {
  const { hhmm, businessDow } = jstInfo(t, dch);
  if (c.weekdays.length && !c.weekdays.includes(businessDow)) return false;
  if (ignoreHours) return true;
  const from = c.hoursFrom || (s.hoursMode === "range" ? s.hoursFrom : "");
  const to = c.hoursTo || (s.hoursMode === "range" ? s.hoursTo : "");
  if (!from || !to) return true;
  const m = minutesInBusinessDay(hhmm, dch);
  const f = minutesInBusinessDay(from, dch);
  const e = minutesInBusinessDay(to, dch);
  return f <= e ? m >= f && m <= e : m >= f || m <= e; // 日をまたぐ指定（例 10:00〜03:59）にも対応
}

/** 次に更新する時刻（見つからなければ null） */
export function computeNext(c: Content, from: Date, s: ShopSettings, dch: number): Date | null {
  if (c.mode === "times") {
    const slots = [...new Set(c.times.map((x) => x.at))].sort();
    if (!slots.length) return null;
    // 1分ずつ見るのは重いので、各日の各スロットを順に試す（最大8日）
    const j0 = new Date(from.getTime() + JST);
    for (let d = 0; d < 9; d++) {
      for (const at of slots) {
        const [h, m] = at.split(":").map(Number);
        const cand = new Date(Date.UTC(j0.getUTCFullYear(), j0.getUTCMonth(), j0.getUTCDate() + d, h, m) - JST);
        if (cand.getTime() <= from.getTime()) continue;
        if (inWindow(cand, c, s, dch, true)) return cand;
      }
    }
    return null;
  }
  const step = Math.max(10, c.intervalMin) * 60_000;
  let cand = new Date(from.getTime() + step);
  for (let i = 0; i < 2000; i++) {
    if (inWindow(cand, c, s, dch)) return cand;
    cand = new Date(cand.getTime() + Math.min(step, 15 * 60_000));
  }
  return null;
}

/** 時刻指定のとき、その時刻に入れた内容 */
function entryFor(c: Content, at: Date, dch: number) {
  if (c.mode === "times") {
    const { hhmm } = jstInfo(at, dch);
    return c.times.find((x) => x.at === hhmm)?.entry ?? null;
  }
  if (!c.entries.length) return null;
  return c.entries[c.cursor % c.entries.length];
}

/** 期限が来たコンテンツを更新する（cron・画面表示のたびに呼ばれる） */
export async function runDue(limit = 10) {
  const [shop] = await db.select().from(schema.shops).where(eq(schema.shops.id, SHOP_ID));
  if (!shop) return [];
  const s = await getSettings();
  const now = new Date();
  const due = await db
    .select()
    .from(schema.contents)
    .where(and(eq(schema.contents.shopId, SHOP_ID), eq(schema.contents.active, true), isNotNull(schema.contents.nextRunAt), lte(schema.contents.nextRunAt, now)))
    .orderBy(asc(schema.contents.nextRunAt))
    .limit(limit);
  const out: { id: number; name: string; ok: boolean; message: string }[] = [];
  for (const c of due) {
    const at = c.nextRunAt!;
    const next = computeNext(c, now, s, shop.dayChangeHour);
    // 先に次回を書いて「取った」ことにする（二重実行の防止）
    const claimed = await db
      .update(schema.contents)
      .set({ nextRunAt: next, active: !!next })
      .where(and(eq(schema.contents.id, c.id), eq(schema.contents.nextRunAt, at)))
      .returning({ id: schema.contents.id });
    if (!claimed.length) continue;
    const entry = entryFor(c, at, shop.dayChangeHour);
    if (!entry) {
      out.push({ id: c.id, name: c.name, ok: false, message: "内容が設定されていません" });
      continue;
    }
    const r = await postContent(c.site, c.slot, entry);
    const cursor = c.cursor + 1;
    const finished = c.mode === "timer" && !c.loop && cursor >= c.entries.length;
    await db
      .update(schema.contents)
      .set({ lastRunAt: now, lastResult: r.ok ? `成功：${entry.title}` : `失敗：${r.message}`, cursor, ...(finished ? { active: false, nextRunAt: null } : {}) })
      .where(eq(schema.contents.id, c.id));
    out.push({ id: c.id, name: c.name, ok: r.ok, message: r.message });
  }
  return out;
}

/** タイマー開始：次回時刻を決めて動かす */
export async function startTimer(id: number, immediate = false) {
  const [c] = await db.select().from(schema.contents).where(and(eq(schema.contents.id, id), eq(schema.contents.shopId, SHOP_ID)));
  const [shop] = await db.select().from(schema.shops).where(eq(schema.shops.id, SHOP_ID));
  if (!c || !shop) return null;
  const s = await getSettings();
  const now = new Date();
  const next = immediate && c.mode === "timer" ? now : computeNext(c, new Date(now.getTime() - (c.mode === "timer" ? c.intervalMin * 60_000 : 0)), s, shop.dayChangeHour);
  await db.update(schema.contents).set({ active: !!next, nextRunAt: next }).where(eq(schema.contents.id, id));
  return next;
}
