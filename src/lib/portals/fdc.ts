import { and, eq } from "drizzle-orm";
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
