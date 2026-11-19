"use server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "@/lib/shop";
import { catalogItem } from "@/lib/contentCatalog";
import { siteName } from "@/lib/sites";
import { canPost, postContent } from "@/lib/connectors";
import { startTimer } from "@/lib/contentRunner";
import type { ContentEntry, TimeSlot } from "@/db/schema";

import { revalidatePath } from "next/cache";
import { deleteDxNews, listDxNews, postDxNews } from "@/lib/portals/dx";

export async function loadDxNews() {
  const r = await listDxNews();
  return r.ok ? { ok: true as const, items: r.data } : { ok: false as const, message: r.message };
}

/** reserve は "YYYY-MM-DDTHH:MM"（日本時間）。空なら今すぐ */
export async function sendDxNews(input: { title: string; content: string; reserve: string }) {
  const title = input.title.trim().slice(0, 100);
  const content = input.content.trim().slice(0, 5000);
  if (!title) return { ok: false, message: "タイトルを入力してください" };
  let reserveAt: { y: number; m: number; d: number; h: number; mi: number } | undefined;
  if (input.reserve) {
    const m = input.reserve.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return { ok: false, message: "予約日時が正しくありません" };
    reserveAt = { y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
    const t = Date.UTC(reserveAt.y, reserveAt.m - 1, reserveAt.d, reserveAt.h - 9, reserveAt.mi);
    if (t < Date.now() + 5 * 60_000) return { ok: false, message: "予約は今から5分以上あとの日時にしてください" };
    if (reserveAt.y > new Date().getFullYear() + 5) return { ok: false, message: "予約は5年以内にしてください" };
  }
  const r = await postDxNews({ title, content, reserveAt });
  revalidatePath("/logs");
  return { ok: r.ok, message: r.ok ? "風俗DXに登録しました" : r.message };
}

export async function removeDxNews(id: string, title: string) {
  const r = await deleteDxNews(id, title);
  revalidatePath("/logs");
  return { ok: r.ok, message: r.ok ? "削除しました" : r.message };
}

// ── コンテンツ更新（枠の管理・タイマー） ─────────────────
const C = schema.contents;
const mine = (id: number) => and(eq(C.id, id), eq(C.shopId, SHOP_ID));

export async function addContents(keys: string[]) {
  for (const k of keys) {
    const [site, slot] = k.split(":");
    const it = catalogItem(site, slot);
    if (!it) continue;
    await db
      .insert(C)
      .values({ shopId: SHOP_ID, site, slot, name: `${siteName(site)}${it.label}`, kind: it.kind })
      .onConflictDoNothing();
  }
  revalidatePath("/contents");
}

export async function removeContents(ids: number[]) {
  if (!ids.length) return;
  await db.delete(C).where(and(eq(C.shopId, SHOP_ID), inArray(C.id, ids)));
  revalidatePath("/contents");
}

export async function setTimer(id: number, on: boolean) {
  if (on) {
    const [c] = await db.select().from(C).where(mine(id));
    if (!c) return { ok: false, message: "見つかりません" };
    if (!canPost(c.site, c.slot)) return { ok: false, message: `${c.name}：このサイトへの自動投稿は接続準備中のため、タイマーは開始できません（内容・予定は保存されています）` };
    if (c.mode === "timer" && !c.entries.length) return { ok: false, message: "内容が1件もありません。編集から登録してください" };
    if (c.mode === "times" && !c.times.length) return { ok: false, message: "時刻指定が1件もありません" };
    const next = await startTimer(id);
    revalidatePath("/contents");
    return next ? { ok: true, message: "タイマーを開始しました" } : { ok: false, message: "更新できる時間帯がありません（曜日・時間帯を確認してください）" };
  }
  await db.update(C).set({ active: false, nextRunAt: null }).where(mine(id));
  revalidatePath("/contents");
  return { ok: true, message: "タイマーを止めました" };
}

/** まとめて開始・停止 */
export async function setTimerAll(ids: number[], on: boolean) {
  let ok = 0;
  for (const id of ids) if ((await setTimer(id, on)).ok) ok++;
  revalidatePath("/contents");
  return { ok: true, message: `${ok}件を${on ? "開始" : "停止"}しました` };
}

export type ContentForm = {
  mode: "direct" | "timer" | "times";
  intervalMin: number;
  loop: boolean;
  entries: ContentEntry[];
  times: TimeSlot[];
  weekdays: number[];
  hoursFrom: string;
  hoursTo: string;
  memo: string;
  groupName: string;
};

const HHMM = /^\d{2}:\d{2}$/;
export async function saveContent(id: number, f: ContentForm) {
  const clean = (e: ContentEntry) => ({ title: String(e.title ?? "").slice(0, 200), body: String(e.body ?? "").slice(0, 5000), ...(e.templateId ? { templateId: e.templateId } : {}) });
  const set = {
    mode: ["direct", "timer", "times"].includes(f.mode) ? f.mode : "timer",
    intervalMin: Math.min(1440, Math.max(10, Math.round(f.intervalMin) || 60)),
    loop: !!f.loop,
    entries: f.entries.filter((e) => e.title?.trim()).slice(0, 100).map(clean),
    times: f.times.filter((t) => HHMM.test(t.at) && t.entry?.title?.trim()).slice(0, 96).map((t) => ({ at: t.at, entry: clean(t.entry) })),
    weekdays: f.weekdays.filter((d) => d >= 0 && d <= 6),
    hoursFrom: HHMM.test(f.hoursFrom) ? f.hoursFrom : "",
    hoursTo: HHMM.test(f.hoursTo) ? f.hoursTo : "",
    memo: f.memo.slice(0, 500),
    groupName: f.groupName.slice(0, 50),
  };
  await db.update(C).set(set).where(mine(id));
  const [c] = await db.select().from(C).where(mine(id));
  if (c?.active) await startTimer(id); // 稼働中なら次回時刻を引き直す
  revalidatePath("/contents");
  revalidatePath(`/contents/${id}`);
  return { ok: true, message: "保存しました" };
}

/** 直接入力：今すぐ1件送る */
export async function sendNow(id: number, entry: ContentEntry) {
  const [c] = await db.select().from(C).where(mine(id));
  if (!c) return { ok: false, message: "見つかりません" };
  const r = await postContent(c.site, c.slot, entry);
  await db.update(C).set({ lastRunAt: new Date(), lastResult: r.ok ? `成功：${entry.title}` : `失敗：${r.message}` }).where(mine(id));
  revalidatePath("/contents");
  revalidatePath("/logs");
  return { ok: r.ok, message: r.ok ? "サイトへ送りました" : r.message };
}
