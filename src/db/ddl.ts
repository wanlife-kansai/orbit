// テーブル作成用のSQL（schema.ts と同じ内容）。何度実行しても壊れないように IF NOT EXISTS を付けています。
export const DDL = `
CREATE TABLE IF NOT EXISTS shops (
  id serial PRIMARY KEY,
  name text NOT NULL,
  official_url text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  day_change_hour integer NOT NULL DEFAULT 3,
  memo text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS casts (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  name text NOT NULL,
  name_kana text NOT NULL DEFAULT '',
  age integer,
  height integer,
  bust integer,
  waist integer,
  hip integer,
  cup text NOT NULL DEFAULT '',
  body_type text NOT NULL DEFAULT '',
  is_new boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  message text NOT NULL DEFAULT '',
  shop_comment text NOT NULL DEFAULT '',
  sokuhime_comment text NOT NULL DEFAULT '',
  pr_items jsonb NOT NULL DEFAULT '[]',
  tags jsonb NOT NULL DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  memo text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedules (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  cast_id integer NOT NULL,
  date text NOT NULL,
  start text NOT NULL DEFAULT '',
  "end" text NOT NULL DEFAULT '',
  off boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS schedules_cast_date ON schedules (cast_id, date);

CREATE TABLE IF NOT EXISTS cast_status (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  cast_id integer NOT NULL,
  date text NOT NULL,
  status text NOT NULL DEFAULT 'none',
  until text NOT NULL DEFAULT '',
  comment text NOT NULL DEFAULT '',
  excluded boolean NOT NULL DEFAULT false,
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cast_status_cast_date ON cast_status (cast_id, date);

CREATE TABLE IF NOT EXISTS templates (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT 'その他',
  memo text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portals (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  login_url text NOT NULL DEFAULT '',
  day_change_hour integer NOT NULL DEFAULT 6,
  supports jsonb NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS portal_slots (
  id serial PRIMARY KEY,
  portal_id integer NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  min_interval_min integer NOT NULL DEFAULT 0,
  rules text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS shop_portal_accounts (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  portal_id integer NOT NULL,
  login_id text NOT NULL DEFAULT '',
  password_enc text NOT NULL DEFAULT '',
  last_check_at timestamp,
  last_check_result text NOT NULL DEFAULT '',
  memo text NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS spa_shop_portal ON shop_portal_accounts (shop_id, portal_id);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  portal_id integer NOT NULL,
  slot_id integer,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  run_at timestamp NOT NULL DEFAULT now(),
  state text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  job_id integer,
  portal_id integer NOT NULL,
  ok boolean NOT NULL,
  error_kind text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

-- 公式サイト連携（2026-11-19 追加）
ALTER TABLE casts ADD COLUMN IF NOT EXISTS kana text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS catch_copy text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS short_comment text NOT NULL DEFAULT '';
ALTER TABLE portals ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'portal';

CREATE TABLE IF NOT EXISTS cast_portal_map (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  cast_id integer NOT NULL,
  portal_id integer NOT NULL,
  remote_id text NOT NULL,
  alias text NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS cpm_cast_portal ON cast_portal_map (cast_id, portal_id);

INSERT INTO portals (code, name, kind, login_url, day_change_hour, supports)
VALUES ('official', 'オフィシャル（公式サイト）', 'official', '', 6, '["女性","出勤","即姫"]')
ON CONFLICT (code) DO NOTHING;

-- 女性プロフィール（Venrey準拠・2026-11-19 追加）
ALTER TABLE casts ADD COLUMN IF NOT EXISTS romaji text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS joined_on text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS birthday text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS age_from_birthday boolean NOT NULL DEFAULT false;
ALTER TABLE casts ADD COLUMN IF NOT EXISTS weight integer;
ALTER TABLE casts ADD COLUMN IF NOT EXISTS blood_type text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS cast_type text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS style_by_site jsonb NOT NULL DEFAULT '{}';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS type_by_site jsonb NOT NULL DEFAULT '{}';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS erogenous_zone text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS hobby text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS special_play text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS charm_point text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS ideal_type text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS first_experience text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS hometown text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS zodiac text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS drinks text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS smokes text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS show_face text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS mobile_email text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS pc_email text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS comment text NOT NULL DEFAULT '';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS shop_comment_by_length jsonb NOT NULL DEFAULT '{}';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS message_by_length jsonb NOT NULL DEFAULT '{}';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS comment_by_length jsonb NOT NULL DEFAULT '{}';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS site_fields jsonb NOT NULL DEFAULT '{}';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS qa jsonb NOT NULL DEFAULT '[]';
ALTER TABLE casts ADD COLUMN IF NOT EXISTS qa_by_site jsonb NOT NULL DEFAULT '{}';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS target_sites jsonb NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS cast_photos (
  id serial PRIMARY KEY,
  shop_id integer NOT NULL,
  cast_id integer NOT NULL,
  kind text NOT NULL DEFAULT 'photo',
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cast_photos_cast ON cast_photos (cast_id);
`;
