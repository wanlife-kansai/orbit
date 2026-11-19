// 最初のデータ（店舗・テンプレート・ポータル）。店舗がまだ1件もないときだけ入れます。
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function seedStatements(shopName = "Biollante 梅田店") {
  const tpls: [string, string, string][] = [
    ["本日も元気に営業中！", "本日も受付スタートしております。ご予約お待ちしております♪", "出勤"],
    ["ご新規様限定の割引", "初めてご利用のお客様限定で割引中です。", "割引"],
    ["新人さん続々入店中", "フレッシュな新人さんが続々入店しています！", "新人"],
  ];
  const slots: [string, string, string, number, string][] = [
    ["shopnews", "お店速報", "速報", 30, "タイトル・詳細・画像1枚・予約投稿。最大3件（古い順に削除）。登録後30分は新規登録不可"],
    ["right_now", "今すぐ娘", "即姫", 0, "当日出勤と画像が登録済みの子のみ。今すぐは最大20名。終了時刻で自動解除。反映に数十分のキャッシュ"],
    ["schedule", "出勤スケジュール", "出勤", 0, "日付は毎日午前6時に切り替わる"],
    ["girls", "女の子登録", "女性", 0, "タグ最大10個、写真最大800×800px・10枚、新人は登録後変更不可・30日で自動解除"],
    ["syame", "写メ日記", "写メ", 0, "未確認"],
  ];
  return [
    `INSERT INTO shops (id, name, day_change_hour, memo) VALUES (1, ${q(shopName)}, 6, ${q("業務連絡など、ご自由にお使いください")})`,
    `SELECT setval('shops_id_seq', (SELECT max(id) FROM shops))`,
    ...tpls.map(([t, b, l]) => `INSERT INTO templates (shop_id, title, body, label) VALUES (1, ${q(t)}, ${q(b)}, ${q(l)})`),
    `INSERT INTO portals (code, name, kind, login_url, day_change_hour, supports) VALUES ('fuzokudx', '風俗DX', 'portal', 'https://fuzokudx.com/shopmanager.php/', 6, '["速報","即姫","出勤","女性","写メ"]') ON CONFLICT (code) DO NOTHING`,
    ...slots.map(
      ([c, n, k, m, r]) =>
        `INSERT INTO portal_slots (portal_id, code, name, kind, min_interval_min, rules) SELECT id, ${q(c)}, ${q(n)}, ${q(k)}, ${m}, ${q(r)} FROM portals WHERE code = 'fuzokudx' AND NOT EXISTS (SELECT 1 FROM portal_slots s JOIN portals p ON p.id = s.portal_id WHERE p.code = 'fuzokudx' AND s.code = ${q(c)})`,
    ),
  ];
}

/** DDL を1文ずつに分ける（-- のコメント行は除く） */
export function splitSql(sql: string) {
  return sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((s) => s.trim().replace(/;$/, ""))
    .filter(Boolean);
}
