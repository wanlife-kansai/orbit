import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHOP_ID } from "./shop";

/** 設定画面の内容（Venrey「設定」の5タブ） */
export type ShopSettings = {
  // 基本設定
  hoursMode: "24h" | "range"; // 更新時間帯
  hoursFrom: string; // "10:00"
  hoursTo: string; // "翌03:59" は "03:59"（切り替え時刻より前は翌日扱い）
  officialEmail: string;
  notifyMail: boolean;
  // 出勤設定
  convertMidnight: boolean; // 翌0:00 を 23:59 に変換
  unsetDeletes: boolean; // 未設定ならサイト側の出勤を削除
  schedulePeriod: "1w" | "2w";
  importOffAsUnset: boolean;
  importUnsetAsOff: boolean;
  importNoComment: boolean;
  weekStartsMonday: boolean;
  // 女性設定
  photoPatterns: boolean;
  deleteExtraPhotos: boolean;
  commonQaSites: string[];
  importQaToCommon: boolean;
  // 即姫・接客
  sokuhimeRestartAt: string; // 指定時刻にタイマー再スタート（空なら指定なし）
  sokuhimeOrder: "priority" | "random";
  sokuhimeBatch: number; // 1〜5、0=全員同時
  sokuhimePriority: "early" | "late" | "list";
  sokuhimeIntervalMin: number;
  sokuhimeActive: boolean;
  // その他
  autoSyncSchedule: boolean; // 出勤更新時オフィシャルを対象にする（オートシンクロ）
  autoSyncGirl: boolean; // 女性更新時オフィシャルを対象にする
  autoSyncScheduleSites: string[];
  autoSyncGirlSites: string[];
  // 写メ日記転送
  diary: {
    running: boolean;
    sourceSite: string;
    sourceUrl: string;
    footer: string;
    fromEmail: string;
    targets: string[];
    excludedCasts: number[];
  };
  // AI
  aiMonthlyLimit: number;
  // 無料サイト申込：サイト名 → メモ
  freeSiteMemos: Record<string, string>;
};

export const DEFAULT_SETTINGS: ShopSettings = {
  hoursMode: "24h",
  hoursFrom: "10:00",
  hoursTo: "03:59",
  officialEmail: "",
  notifyMail: true,
  convertMidnight: false,
  unsetDeletes: false,
  schedulePeriod: "1w",
  importOffAsUnset: false,
  importUnsetAsOff: false,
  importNoComment: false,
  weekStartsMonday: true,
  photoPatterns: false,
  deleteExtraPhotos: false,
  commonQaSites: [],
  importQaToCommon: false,
  sokuhimeRestartAt: "",
  sokuhimeOrder: "priority",
  sokuhimeBatch: 1,
  sokuhimePriority: "early",
  sokuhimeIntervalMin: 30,
  sokuhimeActive: false,
  autoSyncSchedule: true,
  autoSyncGirl: true,
  autoSyncScheduleSites: [],
  autoSyncGirlSites: [],
  diary: { running: false, sourceSite: "", sourceUrl: "", footer: "", fromEmail: "", targets: [], excludedCasts: [] },
  aiMonthlyLimit: 50,
  freeSiteMemos: {},
};

export function mergeSettings(raw: Record<string, unknown> | null | undefined): ShopSettings {
  const r = (raw ?? {}) as Partial<ShopSettings>;
  return { ...DEFAULT_SETTINGS, ...r, diary: { ...DEFAULT_SETTINGS.diary, ...(r.diary ?? {}) } };
}

export async function getSettings() {
  const [s] = await db.select({ settings: schema.shops.settings }).from(schema.shops).where(eq(schema.shops.id, SHOP_ID));
  return mergeSettings(s?.settings);
}

export async function patchSettings(patch: Partial<ShopSettings>) {
  const cur = await getSettings();
  const next = { ...cur, ...patch, diary: { ...cur.diary, ...(patch.diary ?? {}) } };
  await db.update(schema.shops).set({ settings: next as unknown as Record<string, unknown> }).where(eq(schema.shops.id, SHOP_ID));
  return next;
}
