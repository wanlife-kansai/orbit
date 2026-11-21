import { and, desc, eq } from "drizzle-orm";
import { getSettings } from "./settings";
import { db, schema } from "@/db";
import { currentShopId, getShop } from "./shop";
import { decrypt } from "./secret";
import { addDays, businessDate } from "./dates";

/**
 * 公式サイト（オフィシャル）への配信。
 * 公式サイト側の受け取り口：<サイトURL>/api/official/v1/...（Biollante に実装済み）
 *
 * 配信は「失敗しても管理画面の保存は止めない」。結果はすべて配信ログ（sync_logs）に残します。
 */

const { casts, schedules, castStatus, castPortalMap, portals, shopPortalAccounts, syncLogs } = schema;

type Conn = { portalId: number; url: string; key: string };
type Result = { ok: boolean; status: number; data: Record<string, unknown> | null; error: string };

export async function getOfficialPortal() {
  const [p] = await db.select().from(portals).where(eq(portals.code, "official"));
  return p ?? null;
}

export async function getConn(): Promise<Conn | null> {
  const portal = await getOfficialPortal();
  if (!portal) return null;
  const [acc] = await db
    .select()
    .from(shopPortalAccounts)
    .where(and(eq(shopPortalAccounts.shopId, (await currentShopId())), eq(shopPortalAccounts.portalId, portal.id)));
  if (!acc || !acc.loginId || !acc.passwordEnc) return null;
  let key = "";
  try {
    key = decrypt(acc.passwordEnc);
  } catch {
    return null;
  }
  return { portalId: portal.id, url: acc.loginId.replace(/\/+$/, ""), key };
}

async function call(conn: Conn, method: string, path: string, body?: unknown): Promise<Result> {
  try {
    const res = await fetch(`${conn.url}/api/official/v1/${path}`, {
      method,
      headers: { Authorization: `Bearer ${conn.key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    let data: Record<string, unknown> | null = null;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {}
    if (!res.ok || data?.ok === false) {
      const msg = typeof data?.error === "string" ? data.error : Array.isArray(data?.errors) ? (data.errors as string[]).join(" / ") : `HTTP ${res.status}`;
      return { ok: false, status: res.status, data, error: msg };
    }
    return { ok: true, status: res.status, data, error: "" };
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError" ? "公式サイトから応答がありません（10秒）" : "公式サイトにつながりません";
    return { ok: false, status: 0, data: null, error: msg };
  }
}

function errorKind(r: Result) {
  if (r.status === 0) return "接続";
  if (r.status === 401) return "認証";
  if (r.status >= 500) return "サーバー";
  return "内容";
}

async function log(conn: Conn, what: string, r: Result) {
  await db.insert(syncLogs).values({
    shopId: (await currentShopId()),
    portalId: conn.portalId,
    ok: r.ok,
    errorKind: r.ok ? "" : errorKind(r),
    message: r.ok ? what : `${what}：${r.error}`,
    category: categoryOf(what),
  });
}

/** 更新結果の分類（Venrey の「出勤／女性／削除／並び替え／コンテンツ」） */
export function categoryOf(what: string) {
  if (what.includes("出勤")) return "schedule";
  if (what.includes("非公開に") || what.includes("削除")) return "delete";
  if (what.includes("並び順")) return "sort";
  if (what.includes("即姫")) return "content";
  if (what.includes("女性")) return "girl";
  return "";
}

/** 配信を安全に実行（例外を外に出さない） */
async function safely(fn: (conn: Conn) => Promise<void>) {
  try {
    const conn = await getConn();
    if (conn) await fn(conn);
  } catch (e) {
    console.error("[official]", e);
  }
}

/* ---------- 時刻の変換 ---------- */
// ORBIT は "02:00"（切り替え時刻より前は翌日）、公式サイトは "26:00" の書き方
export function toRemoteTime(hhmm: string, dayChangeHour: number) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(h < dayChangeHour ? h + 24 : h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export function fromRemoteTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${String(h % 24).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

/* ---------- 女性 ---------- */
type Cast = typeof casts.$inferSelect;

const bool3 = (v: string, yes: string, no: string) => (v === yes ? true : v === no ? false : undefined);

/** この女性は公式サイトに送らない設定か（女性編集の「更新するサイト」） */
export function isOffFor(c: Cast, site: string) {
  const off = (c.siteFields?._off?._off as string[] | undefined) ?? [];
  return off.includes(site);
}

function castPayload(c: Cast) {
  const alias = (c.siteFields?._alias as Record<string, string> | undefined)?.official;
  const p: Record<string, unknown> = {
    name: alias || c.name,
    kana: c.kana,
    hiragana: c.nameKana,
    romaji: c.romaji,
    joinedOn: c.joinedOn,
    birthday: c.birthday,
    ageFromBirthday: c.ageFromBirthday,
    age: c.age,
    height: c.height,
    weight: c.weight,
    bust: c.bust,
    waist: c.waist,
    hip: c.hip,
    cup: c.cup,
    bloodType: c.bloodType,
    style: c.styleBySite?.official ?? c.bodyType,
    castType: c.typeBySite?.official ?? c.castType,
    catchCopy: c.catchCopy,
    shortComment: c.shortComment,
    erogenousZone: c.erogenousZone,
    hobby: c.hobby,
    specialPlay: c.specialPlay,
    charmPoint: c.charmPoint,
    idealType: c.idealType,
    firstExperience: c.firstExperience,
    hometown: c.hometown,
    zodiac: c.zodiac,
    message: c.message,
    shopComment: c.shopComment,
    messageByLength: c.messageByLength,
    shopCommentByLength: c.shopCommentByLength,
    isNew: c.isNew,
    isPublished: c.isPublished,
    sortOrder: c.sortOrder,
  };
  const drinks = bool3(c.drinks, "飲む", "飲まない");
  const smokes = bool3(c.smokes, "吸う", "吸わない");
  const showFace = bool3(c.showFace, "設定する", "設定しない");
  if (drinks !== undefined) p.drinks = drinks;
  if (smokes !== undefined) p.smokes = smokes;
  if (showFace !== undefined) p.showFace = showFace;
  // Q&A は1件でも入力があるときだけ送る（すべて空なら公式サイト側のQ&Aを残す）
  if (c.qa?.length) p.qa = c.qa;
  return p;
}

async function remoteIdOf(conn: Conn, castId: number) {
  const [m] = await db
    .select()
    .from(castPortalMap)
    .where(and(eq(castPortalMap.castId, castId), eq(castPortalMap.portalId, conn.portalId)));
  return m?.remoteId ?? null;
}

/** 女性を公式サイトへ（つながっていなければ新しく追加） */
export function deliverCast(castId: number) {
  return safely(async (conn) => {
    const [c] = await db.select().from(casts).where(and(eq(casts.id, castId), eq(casts.shopId, (await currentShopId()))));
    if (!c || isOffFor(c, "official")) return;
    const rid = await remoteIdOf(conn, castId);
    if (rid) {
      await log(conn, `女性「${c.name}」を更新`, await call(conn, "PATCH", `casts/${rid}`, castPayload(c)));
      return;
    }
    if (c.age === null) {
      await log(conn, `女性「${c.name}」を追加`, { ok: false, status: 400, data: null, error: "年齢が空のため公式サイトに追加できません" });
      return;
    }
    const r = await call(conn, "POST", "casts", castPayload(c));
    await log(conn, `女性「${c.name}」を追加`, r);
    if (r.ok && r.data?.id) {
      await db
        .insert(castPortalMap)
        .values({ shopId: (await currentShopId()), castId, portalId: conn.portalId, remoteId: String(r.data.id) })
        .onConflictDoUpdate({ target: [castPortalMap.castId, castPortalMap.portalId], set: { remoteId: String(r.data.id) } });
    }
  });
}

/** 女性を削除する前に呼ぶ：公式サイトでは「非公開」にする */
export function deliverCastRemoved(castId: number, name: string) {
  return safely(async (conn) => {
    const rid = await remoteIdOf(conn, castId);
    if (!rid) return;
    await log(conn, `女性「${name}」を公式サイトで非公開に`, await call(conn, "DELETE", `casts/${rid}`));
    await db.delete(castPortalMap).where(and(eq(castPortalMap.castId, castId), eq(castPortalMap.portalId, conn.portalId)));
  });
}

/** 並び順・公開状態などをまとめて送る */
export function deliverCastFields(castIds: number[], what: string) {
  return safely(async (conn) => {
    const failed: string[] = [];
    for (const id of castIds) {
      const rid = await remoteIdOf(conn, id);
      if (!rid) continue;
      const [c] = await db.select().from(casts).where(eq(casts.id, id));
      if (!c || isOffFor(c, "official")) continue;
      const r = await call(conn, "PATCH", `casts/${rid}`, { sortOrder: c.sortOrder, isPublished: c.isPublished });
      if (!r.ok) failed.push(`${c.name}：${r.error}`);
    }
    await log(conn, what, failed.length ? { ok: false, status: 400, data: null, error: failed.join(" / ") } : { ok: true, status: 200, data: null, error: "" });
  });
}

/* ---------- 出勤・待ち時間 ---------- */
export function deliverSchedules(items: { castId: number; date: string }[]) {
  return safely(async (conn) => {
    if (!items.length) return;
    const shop = await getShop();
    const out: Record<string, unknown>[] = [];
    for (const it of items) {
      const rid = await remoteIdOf(conn, it.castId);
      if (!rid) continue;
      const [s] = await db.select().from(schedules).where(and(eq(schedules.castId, it.castId), eq(schedules.date, it.date)));
      if (!s) out.push({ castId: Number(rid), date: it.date, status: "none" });
      else if (s.off) out.push({ castId: Number(rid), date: it.date, status: "off" });
      else out.push({ castId: Number(rid), date: it.date, status: "work", start: toRemoteTime(s.start, shop.dayChangeHour), end: toRemoteTime(s.end, shop.dayChangeHour) });
    }
    if (!out.length) return;
    await log(conn, `出勤 ${out.length}件を送信`, await call(conn, "PUT", "schedules", { items: out }));
  });
}

export function deliverWait(castId: number, date: string) {
  return safely(async (conn) => {
    const rid = await remoteIdOf(conn, castId);
    if (!rid) return;
    const shop = await getShop();
    const [st] = await db.select().from(castStatus).where(and(eq(castStatus.castId, castId), eq(castStatus.date, date)));
    if (st?.excluded) return; // 配信から除外中
    const [c] = await db.select({ name: casts.name }).from(casts).where(eq(casts.id, castId));
    const status = st?.status ?? "none";
    const item =
      status === "waiting"
        ? { castId: Number(rid), date, waitStatus: "now", availableFrom: "" }
        : status === "serving" && st?.until
          ? { castId: Number(rid), date, waitStatus: "time", availableFrom: toRemoteTime(st.until, shop.dayChangeHour) }
          : { castId: Number(rid), date, waitStatus: "", availableFrom: "" };
    const label = status === "waiting" ? "待機中" : status === "serving" ? `接客中（〜${st?.until}）` : "解除";
    await log(conn, `即姫「${c?.name ?? castId}」${label}`, await call(conn, "PUT", "wait", { items: [item] }));
  });
}

/* ---------- 接続テスト・取り込み ---------- */
export async function testConnection() {
  const conn = await getConn();
  if (!conn) return { ok: false, message: "公式サイトのURLとAPIキーを保存してください" };
  const r = await call(conn, "GET", "ping");
  await log(conn, "接続テスト", r);
  if (!r.ok) return { ok: false, message: r.error };
  const shop = await getShop();
  const remote = String(r.data?.dayChangeTime ?? "");
  const mine = `${String(shop.dayChangeHour).padStart(2, "0")}:00`;
  return {
    ok: true,
    message: remote && remote !== mine ? `つながりました。ただし日付の切り替え時刻が違います（公式サイト ${remote}／ORBIT ${mine}）。店舗設定で合わせてください。` : "つながりました",
  };
}

type RemoteCast = {
  id: number;
  romaji?: string;
  joinedOn?: string;
  birthday?: string;
  ageFromBirthday?: boolean;
  weight?: number | null;
  bloodType?: string;
  castType?: string;
  erogenousZone?: string;
  hobby?: string;
  specialPlay?: string;
  charmPoint?: string;
  idealType?: string;
  firstExperience?: string;
  hometown?: string;
  zodiac?: string;
  drinks?: boolean;
  smokes?: boolean;
  showFace?: boolean;
  messageByLength?: Record<string, string>;
  shopCommentByLength?: Record<string, string>;
  qa?: { q: string; a: string }[];
  name: string;
  kana: string;
  hiragana: string;
  age: number;
  height: number | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  cup: string | null;
  style: string;
  catchCopy: string;
  shortComment: string;
  message: string;
  shopComment: string;
  isNew: boolean;
  isPublished: boolean;
  sortOrder: number;
};

/** 公式サイトの女性・出勤・待ち時間を ORBIT に取り込む */
export async function importFromOfficial(opts: { replaceAll: boolean }) {
  const conn = await getConn();
  if (!conn) return { ok: false, message: "公式サイトのURLとAPIキーを保存してください" };
  const shop = await getShop();

  const rc = await call(conn, "GET", "casts");
  if (!rc.ok) {
    await log(conn, "女性の取り込み", rc);
    return { ok: false, message: rc.error };
  }
  const remote = (rc.data?.items ?? []) as RemoteCast[];
  const maps = await db.select().from(castPortalMap).where(eq(castPortalMap.portalId, conn.portalId));
  const byRemote = new Map(maps.filter((m) => m.remoteId).map((m) => [m.remoteId, m.castId]));

  if (opts.replaceAll) {
    // ORBITの女性を全部消して、公式サイトの女性だけにする（公式サイト側は何も変わらない）
    const local = await db.select({ id: casts.id }).from(casts).where(eq(casts.shopId, (await currentShopId())));
    for (const l of local) {
      await db.delete(schedules).where(eq(schedules.castId, l.id));
      await db.delete(castStatus).where(eq(castStatus.castId, l.id));
      await db.delete(castPortalMap).where(eq(castPortalMap.castId, l.id));
      await db.delete(casts).where(eq(casts.id, l.id));
    }
    byRemote.clear();
  }

  let created = 0;
  let updated = 0;
  for (const r of remote) {
    const fields = {
      name: r.name,
      kana: r.kana ?? "",
      nameKana: r.hiragana ?? "",
      age: r.age,
      height: r.height,
      bust: r.bust,
      waist: r.waist,
      hip: r.hip,
      cup: r.cup ?? "",
      bodyType: r.style ?? "",
      catchCopy: r.catchCopy ?? "",
      shortComment: r.shortComment ?? "",
      message: r.message ?? "",
      shopComment: r.shopComment ?? "",
      isNew: r.isNew,
      isPublished: r.isPublished,
      sortOrder: r.sortOrder,
      romaji: r.romaji ?? "",
      joinedOn: r.joinedOn ?? "",
      birthday: r.birthday ?? "",
      ageFromBirthday: r.ageFromBirthday ?? false,
      weight: r.weight ?? null,
      bloodType: r.bloodType ?? "",
      castType: r.castType ?? "",
      erogenousZone: r.erogenousZone ?? "",
      hobby: r.hobby ?? "",
      specialPlay: r.specialPlay ?? "",
      charmPoint: r.charmPoint ?? "",
      idealType: r.idealType ?? "",
      firstExperience: r.firstExperience ?? "",
      hometown: r.hometown ?? "",
      zodiac: r.zodiac ?? "",
      drinks: r.drinks === undefined ? "" : r.drinks ? "飲む" : "飲まない",
      smokes: r.smokes === undefined ? "" : r.smokes ? "吸う" : "吸わない",
      showFace: r.showFace === undefined ? "" : r.showFace ? "設定する" : "設定しない",
      messageByLength: r.messageByLength ?? {},
      shopCommentByLength: r.shopCommentByLength ?? {},
      qa: Array.isArray(r.qa) ? r.qa.slice(0, 30) : [],
    };
    const localId = byRemote.get(String(r.id));
    if (localId) {
      await db.update(casts).set(fields).where(eq(casts.id, localId));
      updated++;
    } else {
      const [row] = await db.insert(casts).values({ ...fields, shopId: (await currentShopId()) }).returning({ id: casts.id });
      await db.insert(castPortalMap).values({ shopId: (await currentShopId()), castId: row.id, portalId: conn.portalId, remoteId: String(r.id) });
      byRemote.set(String(r.id), row.id);
      created++;
    }
  }

  // 出勤：今日から2週間
  const from = businessDate(shop.dayChangeHour);
  const to = addDays(from, 13);
  const rs = await call(conn, "GET", `schedules?from=${from}&to=${to}`);
  let sched = 0;
  if (rs.ok) {
    const items = (rs.data?.items ?? []) as { castId: number; date: string; status: string; start: string; end: string; waitStatus: string; availableFrom: string }[];
    for (const s of items) {
      const castId = byRemote.get(String(s.castId));
      if (!castId) continue;
      const off = s.status === "off";
      await db
        .insert(schedules)
        .values({ shopId: (await currentShopId()), castId, date: s.date, start: off ? "" : fromRemoteTime(s.start), end: off ? "" : fromRemoteTime(s.end), off })
        .onConflictDoUpdate({
          target: [schedules.castId, schedules.date],
          set: { start: off ? "" : fromRemoteTime(s.start), end: off ? "" : fromRemoteTime(s.end), off },
        });
      sched++;
      if (s.date === from) {
        const status = s.waitStatus === "now" ? "waiting" : s.waitStatus === "time" ? "serving" : "none";
        const until = s.waitStatus === "time" ? fromRemoteTime(s.availableFrom) : "";
        await db
          .insert(castStatus)
          .values({ shopId: (await currentShopId()), castId, date: from, status, until })
          .onConflictDoUpdate({ target: [castStatus.castId, castStatus.date], set: { status, until } });
      }
    }
  }
  const msg = `女性 ${remote.length}人（新規 ${created}・更新 ${updated}）、出勤 ${sched}件を取り込みました`;
  await log(conn, msg, rs.ok ? rc : rs);
  return { ok: rs.ok, message: rs.ok ? msg : `女性は取り込みましたが、出勤の取り込みに失敗しました：${rs.error}` };
}

/** 公式サイトとつながっている女性の数 */
export async function linkedCount() {
  const portal = await getOfficialPortal();
  if (!portal) return 0;
  const rows = await db.select({ id: castPortalMap.id }).from(castPortalMap).where(and(eq(castPortalMap.shopId, (await currentShopId())), eq(castPortalMap.portalId, portal.id)));
  return rows.length;
}

export async function recentLogs(limit = 100, category?: string) {
  return db
    .select({ id: syncLogs.id, ok: syncLogs.ok, errorKind: syncLogs.errorKind, message: syncLogs.message, createdAt: syncLogs.createdAt, portal: portals.name, category: syncLogs.category })
    .from(syncLogs)
    .leftJoin(portals, eq(portals.id, syncLogs.portalId))
    .where(category ? and(eq(syncLogs.shopId, (await currentShopId())), eq(syncLogs.category, category)) : eq(syncLogs.shopId, (await currentShopId())))
    .orderBy(desc(syncLogs.id))
    .limit(limit);
}

/** 接続先が変わったら、女性のつながり（どの子がどの子か）をリセットする */
export async function resetLinks(portalId: number) {
  await db.delete(castPortalMap).where(and(eq(castPortalMap.shopId, (await currentShopId())), eq(castPortalMap.portalId, portalId)));
}

/* ---------- オートシンクロ（設定 → その他 で切り替え） ---------- */
export async function autoDeliverSchedules(items: { castId: number; date: string }[]) {
  if ((await getSettings()).autoSyncSchedule) await deliverSchedules(items);
}
export async function autoDeliverCast(castId: number) {
  if ((await getSettings()).autoSyncGirl) await deliverCast(castId);
}
export async function autoDeliverCastFields(castIds: number[], what: string) {
  if ((await getSettings()).autoSyncGirl) await deliverCastFields(castIds, what);
}
