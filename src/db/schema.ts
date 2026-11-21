import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── 店舗 ─────────────────────────────────────────
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  officialUrl: text("official_url").notNull().default(""),
  email: text("email").notNull().default(""),
  // 営業日の切り替わり時刻（0〜12時）。例：3 なら深夜3時までは前日扱い
  dayChangeHour: integer("day_change_hour").notNull().default(3),
  memo: text("memo").notNull().default(""),
  // 女性編集の「各サイト項目」・必須項目チェッカーに出す連動先サイト（sites.ts の code）
  targetSites: jsonb("target_sites").$type<string[]>().notNull().default([]),
  // 設定画面（基本・出勤・女性・即姫・その他）の内容。型は lib/settings.ts
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  // ログインID（例：1001）とパスワード（scrypt）。運営画面で店舗ごとに発行します
  loginId: text("login_id"),
  passwordHash: text("password_hash").notNull().default(""),
  active: boolean("active").notNull().default(true),
  // 取り込み元（Mr.Venrey など）の接続情報と最終取り込み結果。パスワードは暗号化して保存
  importSource: jsonb("import_source").$type<ImportSource>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ImportSource = {
  venrey?: { loginId: string; passwordEnc: string; lastImportAt?: string; lastSummary?: string };
};

// ── 女性（キャスト） ─────────────────────────────
export type PrItem = { title: string; body: string };

export const casts = pgTable("casts", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
  nameKana: text("name_kana").notNull().default(""), // ひらがな
  kana: text("kana").notNull().default(""), // カタカナ
  age: integer("age"),
  height: integer("height"),
  bust: integer("bust"),
  waist: integer("waist"),
  hip: integer("hip"),
  cup: text("cup").notNull().default(""),
  bodyType: text("body_type").notNull().default(""), // スタイル
  romaji: text("romaji").notNull().default(""),
  joinedOn: text("joined_on").notNull().default(""), // 入店日 YYYY-MM-DD
  birthday: text("birthday").notNull().default(""),
  ageFromBirthday: boolean("age_from_birthday").notNull().default(false),
  weight: integer("weight"),
  bloodType: text("blood_type").notNull().default(""),
  castType: text("cast_type").notNull().default(""), // タイプ
  styleBySite: jsonb("style_by_site").$type<Record<string, string>>().notNull().default({}),
  typeBySite: jsonb("type_by_site").$type<Record<string, string>>().notNull().default({}),
  erogenousZone: text("erogenous_zone").notNull().default(""),
  hobby: text("hobby").notNull().default(""),
  specialPlay: text("special_play").notNull().default(""),
  charmPoint: text("charm_point").notNull().default(""),
  idealType: text("ideal_type").notNull().default(""),
  firstExperience: text("first_experience").notNull().default(""),
  hometown: text("hometown").notNull().default(""),
  zodiac: text("zodiac").notNull().default(""),
  drinks: text("drinks").notNull().default(""), // "" | 飲む | 飲まない
  smokes: text("smokes").notNull().default(""), // "" | 吸う | 吸わない
  showFace: text("show_face").notNull().default(""), // "" | 設定する | 設定しない
  mobileEmail: text("mobile_email").notNull().default(""),
  pcEmail: text("pc_email").notNull().default(""),
  comment: text("comment").notNull().default(""),
  shopCommentByLength: jsonb("shop_comment_by_length").$type<Record<string, string>>().notNull().default({}),
  messageByLength: jsonb("message_by_length").$type<Record<string, string>>().notNull().default({}),
  commentByLength: jsonb("comment_by_length").$type<Record<string, string>>().notNull().default({}),
  siteFields: jsonb("site_fields").$type<Record<string, Record<string, string | string[]>>>().notNull().default({}),
  qa: jsonb("qa").$type<{ q: string; a: string }[]>().notNull().default([]),
  qaBySite: jsonb("qa_by_site").$type<Record<string, { q: string; a: string }[]>>().notNull().default({}),
  isNew: boolean("is_new").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  message: text("message").notNull().default(""),
  shopComment: text("shop_comment").notNull().default(""),
  sokuhimeComment: text("sokuhime_comment").notNull().default(""),
  catchCopy: text("catch_copy").notNull().default(""),
  shortComment: text("short_comment").notNull().default(""),
  prItems: jsonb("pr_items").$type<PrItem[]>().notNull().default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  // 並び替え：固定枠（先頭に固定する）
  pinned: boolean("pinned").notNull().default(false),
  // 基本出勤（曜日 0=日〜6=土 → {start,end} / off）。月間スケジュールの「基本出勤を適用」で使う
  baseSchedule: jsonb("base_schedule").$type<Record<string, { start: string; end: string; off?: boolean }>>().notNull().default({}),
  memo: text("memo").notNull().default(""),
  // 取り込み元のID（例：venrey:3031045）。取り込み直しで重複させないため
  sourceRef: text("source_ref").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── 出勤 ─────────────────────────────────────────
export const schedules = pgTable(
  "schedules",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id").notNull(),
    castId: integer("cast_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD（営業日）
    start: text("start").notNull().default(""), // HH:MM
    end: text("end").notNull().default(""), // HH:MM（開始より前なら翌日）
    off: boolean("off").notNull().default(false),
  },
  (t) => [uniqueIndex("schedules_cast_date").on(t.castId, t.date)],
);

// ── 即姫・接客（当日の状態） ─────────────────────
export const castStatus = pgTable(
  "cast_status",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id").notNull(),
    castId: integer("cast_id").notNull(),
    date: text("date").notNull(),
    status: text("status").notNull().default("none"), // none | waiting | serving
    until: text("until").notNull().default(""), // 接客終了予定 HH:MM
    comment: text("comment").notNull().default(""),
    excluded: boolean("excluded").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cast_status_cast_date").on(t.castId, t.date)],
);

// ── テンプレート ─────────────────────────────────
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  label: text("label").notNull().default("その他"),
  memo: text("memo").notNull().default(""),
  groupName: text("group_name").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  sourceRef: text("source_ref").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── ポータル（運営側で管理。全店舗共通） ─────────
export const portals = pgTable("portals", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("portal"), // portal：ポータル（ロボットで投稿） / official：公式サイト（API）
  loginUrl: text("login_url").notNull().default(""),
  dayChangeHour: integer("day_change_hour").notNull().default(6),
  supports: jsonb("supports").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
});

// ポータルの中の「更新できる枠」
export const portalSlots = pgTable("portal_slots", {
  id: serial("id").primaryKey(),
  portalId: integer("portal_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // 速報 / 即姫 / 出勤 / 女性 / 写メ / 割引 / イベント / 求人 / 上位化 / その他
  minIntervalMin: integer("min_interval_min").notNull().default(0),
  rules: text("rules").notNull().default(""),
});

// 店舗ごとのポータルのログイン情報（ステップ2で暗号化して使う）
export const shopPortalAccounts = pgTable(
  "shop_portal_accounts",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id").notNull(),
    portalId: integer("portal_id").notNull(),
    loginId: text("login_id").notNull().default(""), // 公式サイトのときはサイトのURL
    passwordEnc: text("password_enc").notNull().default(""),
    lastCheckAt: timestamp("last_check_at"),
    lastCheckResult: text("last_check_result").notNull().default(""),
    memo: text("memo").notNull().default(""),
  },
  (t) => [uniqueIndex("spa_shop_portal").on(t.shopId, t.portalId)],
);

// 配信キューとログ（ステップ2で使う）
export const syncJobs = pgTable("sync_jobs", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  portalId: integer("portal_id").notNull(),
  slotId: integer("slot_id"),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull().default({}),
  runAt: timestamp("run_at").notNull().defaultNow(),
  state: text("state").notNull().default("queued"), // queued | running | done | failed
  attempts: integer("attempts").notNull().default(0),
});

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  jobId: integer("job_id"),
  portalId: integer("portal_id").notNull(),
  ok: boolean("ok").notNull(),
  // 更新結果の分類：content（コンテンツ）/ schedule（出勤）/ girl（女性）/ delete（削除）/ sort（並び替え）/ ''（その他）
  category: text("category").notNull().default(""),
  errorKind: text("error_kind").notNull().default(""),
  message: text("message").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 女性とポータル（公式サイト）側の女性IDの対応
export const castPortalMap = pgTable(
  "cast_portal_map",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id").notNull(),
    castId: integer("cast_id").notNull(),
    portalId: integer("portal_id").notNull(),
    remoteId: text("remote_id").notNull(),
    alias: text("alias").notNull().default(""),
  },
  (t) => [uniqueIndex("cpm_cast_portal").on(t.castId, t.portalId)],
);

// 女性の写真（thumb：サムネイル 最大5枚 ／ photo：画像 最大15枚）
export const castPhotos = pgTable("cast_photos", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  castId: integer("cast_id").notNull(),
  kind: text("kind").notNull().default("photo"),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  sourceRef: text("source_ref").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── コンテンツ更新（サイトごとの「速報」「上位化」などの枠と、その更新予定） ──
export type ContentEntry = { title: string; body: string; templateId?: number };
export type TimeSlot = { at: string; entry: ContentEntry }; // at = "HH:MM"
export const contents = pgTable("contents", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  site: text("site").notNull(), // sites.ts の code
  slot: text("slot").notNull(), // contentCatalog.ts の slot
  name: text("name").notNull(),
  kind: text("kind").notNull().default("その他"), // 速報 / 上位化 / イベント / 割引 / 即姫 / 写メ / 求人 / その他
  groupName: text("group_name").notNull().default(""),
  // direct：直接入力（1件をすぐ送る） / timer：タイマー（間隔でローテーション） / times：時刻指定
  mode: text("mode").notNull().default("timer"),
  intervalMin: integer("interval_min").notNull().default(60),
  loop: boolean("loop").notNull().default(true),
  entries: jsonb("entries").$type<ContentEntry[]>().notNull().default([]),
  times: jsonb("times").$type<TimeSlot[]>().notNull().default([]),
  // 曜日（0=日〜6=土）。空なら毎日
  weekdays: jsonb("weekdays").$type<number[]>().notNull().default([]),
  // 更新時間帯（営業日の HH:MM。空なら設定画面の更新時間帯に従う）
  hoursFrom: text("hours_from").notNull().default(""),
  hoursTo: text("hours_to").notNull().default(""),
  active: boolean("active").notNull().default(false), // タイマー稼働中
  cursor: integer("cursor").notNull().default(0),
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  lastResult: text("last_result").notNull().default(""),
  memo: text("memo").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  sourceRef: text("source_ref").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 簡単一括更新の履歴（最大100件）
export const bulkPosts = pgTable("bulk_posts", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  targets: jsonb("targets").$type<number[]>().notNull().default([]), // contents.id
  results: jsonb("results").$type<{ contentId: number; name: string; ok: boolean; message: string }[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 写メ日記転送：取り込んだ日記
export const diaryItems = pgTable("diary_items", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  castId: integer("cast_id"),
  castName: text("cast_name").notNull().default(""),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | sent | failed | skipped
  message: text("message").notNull().default(""),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
});

// AIコメント生成の履歴（月の回数制限にも使う）
export const aiGenerations = pgTable("ai_generations", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  castId: integer("cast_id"),
  kind: text("kind").notNull().default("comment"),
  input: jsonb("input").$type<Record<string, string>>().notNull().default({}),
  output: text("output").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
