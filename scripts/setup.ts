// テーブルを作り、最初のデモデータを入れます。何度実行しても大丈夫です（データが入っていれば追加しません）。
//   npm run setup
import { PGlite } from "@electric-sql/pglite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DDL } from "../src/db/ddl";
import { seedStatements } from "../src/db/seed";

async function main() {
  if (process.env.DATABASE_URL) {
    console.log("本番（Neon）は、最初にアクセスしたときに自動でテーブルと初期データが作られます。setup は不要です。");
    return;
  }
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.exec(DDL);

  const { rows } = await pg.query<{ n: number }>("SELECT count(*)::int AS n FROM shops");
  if (rows[0].n > 0) {
    // 以前のデモ店舗名のままなら、テスト店舗名に変える
    await pg.query("UPDATE shops SET name = $1, day_change_hour = 6 WHERE id = 1 AND name = 'デモ店舗'", ["Biollante 梅田店"]);
    console.log("すでにデータがあります。テーブルの確認だけ行いました。");
    await pg.close();
    return;
  }

  for (const st of seedStatements()) await pg.exec(st);

  await pg.close();
  console.log("準備ができました。npm run dev で起動し、http://localhost:3000 を開いてください（初期のID 1001 ／ パスワード orbit-demo）。\n女性と出勤は「連携ポータル → 公式サイトから取り込む」で入れます。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
