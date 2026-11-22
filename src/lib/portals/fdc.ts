import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentShopId, getShop } from "@/lib/shop";
import { decrypt } from "@/lib/secret";
import { businessDate } from "@/lib/dates";
import { Fdc, FdcError, toFdcTimes, type FdcDay } from "@/lib/robots/fdc";

/**
 * 風俗データセンター（まるごとHP）への出勤連動。
 * いまは「1人・1日を手で送るテスト」だけ。自動配信にはつないでいません。
 */
const { portals, shopPortalAccounts, castPortalMap, casts, schedules, syncLogs } = schema;

async function portal() {
  const [p] = await db.select().from(portals).where(eq(portals.code, "fdc"));
  if (!p) throw new FdcError("風俗データセンターの設定がありません（画面を開き直してください）", "内容");
  return p;
}

async function connect() {
  const p = await portal();
  const [a] = await db
    .select()
    .from(shopPortalAccounts)
    .where(and(eq(shopPortalAccounts.shopId, await currentShopId()), eq(shopPortalAccounts.portalId, p.id)));
  if (!a?.loginId || !a.passwordEnc) throw new FdcError("風俗データセンターのログインID・パスワードが未登録です（サイトのログイン情報で登録してください）", "ログイン");
  const fdc = new Fdc(a.loginId, decrypt(a.passwordEnc));
  await fdc.login();
  return { fdc, portalId: p.id };
}

async function log(portalId: number, ok: boolean, message: string, kind = "") {
  await db.insert(syncLogs).values({ shopId: await currentShopId(), portalId, ok, errorKind: ok ? "" : kind, message, category: "schedule" });
}

const norm = (s: string) => s.replace(/[\s　]/g, "");
const today = async () => {
  // データセンターの「当日」は暦の日付（日本時間）
  const j = new Date(Date.now() + 9 * 3600_000);
  return j.toISOString().slice(0, 10);
};

/** ORBITの女性 → データセンターのキャストID（名前で照合して覚える） */
async function itemIdOf(fdc: Fdc, portalId: number, castId: number) {
  const [m] = await db.select().from(castPortalMap).where(and(eq(castPortalMap.castId, castId), eq(castPortalMap.portalId, portalId)));
  if (m?.remoteId) return m.remoteId;
  const [c] = await db.select({ name: casts.name }).from(casts).where(and(eq(casts.id, castId), eq(casts.shopId, await currentShopId())));
  if (!c) throw new FdcError("女性が見つかりません", "内容");
  const hit = (await fdc.listItems()).filter((i) => norm(i.name) === norm(c.name));
  if (hit.length !== 1) throw new FdcError(hit.length ? `「${c.name}」が風俗データセンターに${hit.length}人います` : `「${c.name}」が風俗データセンターに見つかりません`, "内容");
  await db
    .insert(castPortalMap)
    .values({ shopId: await currentShopId(), castId, portalId, remoteId: hit[0].itemId })
    .onConflictDoUpdate({ target: [castPortalMap.castId, castPortalMap.portalId], set: { remoteId: hit[0].itemId } });
  return hit[0].itemId;
}

type Res<T> = ({ ok: true } & T) | { ok: false; message: string };
const fail = (e: unknown) => ({ ok: false as const, message: e instanceof Error ? e.message : String(e) });

export async function fdcTest(): Promise<Res<{ message: string }>> {
  try {
    const { fdc, portalId } = await connect();
    const n = (await fdc.listItems()).length;
    await log(portalId, true, `風俗データセンター 接続テスト（キャスト ${n}人）`);
    return { ok: true, message: `ログインできました。出勤表のキャスト ${n}人` };
  } catch (e) {
    return fail(e);
  }
}

/** ORBIT とデータセンター、両方の「その日の出勤」 */
export async function fdcCompare(castId: number, date: string): Promise<Res<{ itemId: string; orbit: string; fdc: FdcDay }>> {
  try {
    const shop = await getShop();
    const { fdc, portalId } = await connect();
    const itemId = await itemIdOf(fdc, portalId, castId);
    const [s] = await db.select().from(schedules).where(and(eq(schedules.castId, castId), eq(schedules.date, date)));
    const orbit = !s ? "未設定" : s.off ? "休み" : `${s.start}〜${s.end}`;
    void shop;
    return { ok: true, itemId, orbit, fdc: await fdc.readDay(itemId, date, await today()) };
  } catch (e) {
    return fail(e);
  }
}

/** ORBIT のその日の出勤をデータセンターへ送る。送る前の値も返す（元に戻す用） */
export async function fdcSendDay(castId: number, date: string): Promise<Res<{ before: FdcDay; after: FdcDay; shown: string }>> {
  let portalId = 0;
  try {
    const shop = await getShop();
    const c = await connect();
    portalId = c.portalId;
    const { fdc } = c;
    const itemId = await itemIdOf(fdc, portalId, castId);
    const t = await today();
    const before = await fdc.readDay(itemId, date, t);
    const [s] = await db.select().from(schedules).where(and(eq(schedules.castId, castId), eq(schedules.date, date)));
    const { from, to } = !s || s.off ? { from: "--", to: "--" } : toFdcTimes(s.start, s.end, shop.dayChangeHour);
    const shown = await fdc.writeDay(itemId, date, from, to, before.freeText);
    const after = await fdc.readDay(itemId, date, t);
    const ok = after.from === from && after.to === to;
    const [cast] = await db.select({ name: casts.name }).from(casts).where(eq(casts.id, castId));
    await log(portalId, ok, `風俗データセンター 出勤「${cast?.name}」${date}：${before.label || before.from} → ${after.label || after.from}${ok ? "" : "（送った値と一致しません）"}`, ok ? "" : "内容");
    return ok ? { ok: true, before, after, shown } : { ok: false, message: `送信後の値が一致しません（送信：${from}〜${to}、データセンター：${after.from}〜${after.to}）` };
  } catch (e) {
    if (portalId) await log(portalId, false, `風俗データセンター 出勤送信：${e instanceof Error ? e.message : e}`, e instanceof FdcError ? e.kind : "接続");
    return fail(e);
  }
}

/** 送る前の値に戻す */
export async function fdcRestoreDay(castId: number, date: string, before: { from: string; to: string; freeText: string }): Promise<Res<{ after: FdcDay }>> {
  try {
    const { fdc, portalId } = await connect();
    const itemId = await itemIdOf(fdc, portalId, castId);
    await fdc.writeDay(itemId, date, before.from, before.to, before.freeText);
    const after = await fdc.readDay(itemId, date, await today());
    const ok = after.from === before.from && after.to === before.to;
    await log(portalId, ok, `風俗データセンター 出勤 ${date} を元に戻す：${after.label || after.from}`, ok ? "" : "内容");
    return ok ? { ok: true, after } : { ok: false, message: `元に戻せませんでした（今：${after.from}〜${after.to}）` };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── キャスト全員・期間まとめて ───────── */

const { fdcSnapshots } = schema;

export type PlanRow = {
  castId: number;
  name: string;
  itemId: string;
  date: string;
  orbit: { from: string; to: string; label: string } | null; // null = ORBITで未設定（送らない）
  fdc: { from: string; to: string; label: string; freeText: string };
  same: boolean;
};

const addDay = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

/** 当日〜35日の範囲の、全員分の「ORBIT」と「データセンター」を並べる（読むだけ） */
export async function fdcPlan(from: string, to: string): Promise<Res<{ rows: PlanRow[]; unmatched: string[]; notInFdc: number }>> {
  try {
    const shop = await getShop();
    const shopId = shop.id;
    const { fdc, portalId } = await connect();
    const t = await today();
    if (from < t) from = t;
    const last = addDay(t, 34);
    if (to > last) to = last;
    if (to < from) return { ok: false, message: "期間が正しくありません（当日〜35日先まで）" };

    // データセンターのキャスト ↔ ORBITの女性（名前で照合し、覚えておく）
    const items = await fdc.listItems();
    const castRows = await db.select({ id: casts.id, name: casts.name }).from(casts).where(eq(casts.shopId, shopId));
    const maps = await db.select().from(castPortalMap).where(and(eq(castPortalMap.shopId, shopId), eq(castPortalMap.portalId, portalId)));
    const byItem = new Map(maps.map((m) => [m.remoteId, m.castId]));
    const unmatched: string[] = [];
    for (const it of items) {
      if (byItem.has(it.itemId)) continue;
      const hit = castRows.filter((c) => norm(c.name) === norm(it.name));
      if (hit.length !== 1) {
        unmatched.push(it.name);
        continue;
      }
      byItem.set(it.itemId, hit[0].id);
      await db
        .insert(castPortalMap)
        .values({ shopId, castId: hit[0].id, portalId, remoteId: it.itemId })
        .onConflictDoUpdate({ target: [castPortalMap.castId, castPortalMap.portalId], set: { remoteId: it.itemId } });
    }
    const nameOf = new Map(castRows.map((c) => [c.id, c.name]));

    // データセンター：必要な週だけ読む
    const weeks = new Set<number>();
    for (let d = from; d <= to; d = addDay(d, 1)) weeks.add(Fdc.weekOf(d, t)!);
    const fdcVals = new Map<string, FdcDay>();
    for (const w of weeks) for (const [itemId, days] of await fdc.readWeek(w)) for (const [date, v] of days) fdcVals.set(`${itemId}_${date}`, v);

    // ORBIT：期間内の出勤
    const castIds = [...byItem.values()];
    const sch = castIds.length
      ? await db.select().from(schedules).where(and(eq(schedules.shopId, shopId), inArray(schedules.castId, castIds), gte(schedules.date, from), lte(schedules.date, to)))
      : [];
    const orbitOf = new Map(sch.map((x) => [`${x.castId}_${x.date}`, x]));

    const rows: PlanRow[] = [];
    for (const [itemId, castId] of byItem) {
      for (let d = from; d <= to; d = addDay(d, 1)) {
        const f = fdcVals.get(`${itemId}_${d}`);
        if (!f) continue;
        const o = orbitOf.get(`${castId}_${d}`);
        const want = !o ? null : o.off ? { from: "--", to: "--", label: "お休み" } : { ...toFdcTimes(o.start, o.end, shop.dayChangeHour), label: `${o.start}〜${o.end}` };
        rows.push({
          castId,
          name: nameOf.get(castId) ?? "",
          itemId,
          date: d,
          orbit: want,
          fdc: { from: f.from, to: f.to, label: f.label, freeText: f.freeText },
          same: !want || (want.from === f.from && want.to === f.to),
        });
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "ja"));
    return { ok: true, rows, unmatched, notInFdc: castRows.length - byItem.size };
  } catch (e) {
    return fail(e);
  }
}

/** 違うところを送る（何件でも。画面から少しずつ呼ぶ）。送る前の値は batch に保存 */
export async function fdcSendMany(
  batch: string,
  items: { castId: number; itemId: string; date: string; before: { from: string; to: string; freeText: string; label: string } }[],
): Promise<Res<{ results: { castId: number; date: string; ok: boolean; shown: string }[] }>> {
  let portalId = 0;
  try {
    const shop = await getShop();
    const c = await connect();
    portalId = c.portalId;
    const results = [];
    for (const it of items.slice(0, 40)) {
      const [s] = await db.select().from(schedules).where(and(eq(schedules.castId, it.castId), eq(schedules.date, it.date), eq(schedules.shopId, shop.id)));
      if (!s) {
        results.push({ castId: it.castId, date: it.date, ok: false, shown: "ORBITで未設定のため送りません" });
        continue;
      }
      const { from, to } = s.off ? { from: "--", to: "--" } : toFdcTimes(s.start, s.end, shop.dayChangeHour);
      await db.insert(fdcSnapshots).values({
        shopId: shop.id, batch, castId: it.castId, itemId: it.itemId, date: it.date,
        fromValue: it.before.from, toValue: it.before.to, freeText: it.before.freeText, label: it.before.label,
      });
      try {
        const shown = await c.fdc.writeDay(it.itemId, it.date, from, to, it.before.freeText);
        results.push({ castId: it.castId, date: it.date, ok: true, shown });
      } catch (e) {
        results.push({ castId: it.castId, date: it.date, ok: false, shown: e instanceof Error ? e.message : String(e) });
      }
    }
    const ok = results.filter((r) => r.ok).length;
    await log(portalId, ok === results.length, `風俗データセンター 出勤まとめて送信（${batch}）：${ok}/${results.length}件`, ok === results.length ? "" : "内容");
    return { ok: true, results };
  } catch (e) {
    if (portalId) await log(portalId, false, `風俗データセンター 出勤まとめて送信：${e instanceof Error ? e.message : e}`, e instanceof FdcError ? e.kind : "接続");
    return fail(e);
  }
}

/** まとめて送った分を、送る前の値に戻す（画面から少しずつ呼ぶ。残り件数を返す） */
export async function fdcRestoreMany(batch: string): Promise<Res<{ done: number; left: number }>> {
  try {
    const shopId = await currentShopId();
    const { fdc, portalId } = await connect();
    const rows = await db
      .select()
      .from(fdcSnapshots)
      .where(and(eq(fdcSnapshots.shopId, shopId), eq(fdcSnapshots.batch, batch), eq(fdcSnapshots.restored, false)))
      .limit(40);
    for (const r of rows) {
      await fdc.writeDay(r.itemId, r.date, r.fromValue, r.toValue, r.freeText);
      await db.update(fdcSnapshots).set({ restored: true }).where(eq(fdcSnapshots.id, r.id));
    }
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(fdcSnapshots)
      .where(and(eq(fdcSnapshots.shopId, shopId), eq(fdcSnapshots.batch, batch), eq(fdcSnapshots.restored, false)));
    if (rows.length) await log(portalId, true, `風俗データセンター 出勤を元に戻す（${batch}）：${rows.length}件`);
    return { ok: true, done: rows.length, left: n };
  } catch (e) {
    return fail(e);
  }
}

/** これまでの「まとめて送信」（元に戻せるもの） */
export async function fdcBatches() {
  const shopId = await currentShopId();
  return db
    .select({ batch: fdcSnapshots.batch, n: sql<number>`count(*)::int`, left: sql<number>`count(*) filter (where not ${fdcSnapshots.restored})::int`, at: sql<string>`min(${fdcSnapshots.createdAt})::text` })
    .from(fdcSnapshots)
    .where(eq(fdcSnapshots.shopId, shopId))
    .groupBy(fdcSnapshots.batch)
    .orderBy(sql`min(${fdcSnapshots.createdAt}) desc`)
    .limit(10);
}
