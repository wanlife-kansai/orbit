import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import path from "node:path";
import * as schema from "./schema";
import { DDL } from "./ddl";
import { seedStatements, splitSql } from "./seed";

// DATABASE_URL があれば Neon（本番）、なければ手元の .data フォルダのDB（開発用）を使います。
type DB = ReturnType<typeof drizzlePglite<typeof schema>>;

const g = globalThis as unknown as { __pcmsDb?: DB; __pcmsPg?: PGlite; __pcmsReady?: Promise<unknown> };

export function localDataDir() {
  return path.join(process.cwd(), ".data", "pglite");
}

function create(): DB {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzleNeon(neon(url), { schema }) as unknown as DB;
  }
  if (!g.__pcmsPg) g.__pcmsPg = new PGlite(localDataDir());
  return drizzlePglite(g.__pcmsPg, { schema });
}

export const db: DB = g.__pcmsDb ?? (g.__pcmsDb = create());

/**
 * テーブル・列を自動で用意する（後から増えた列も）。
 * 本番（Neon）では、店舗がまだなければ最初のデータも入れる。サーバーが起動するたびに1回だけ動く。
 */
export function ensureSchema() {
  const url = process.env.DATABASE_URL;
  if (url) return (g.__pcmsReady ??= setupNeon(url).catch((e) => {
    g.__pcmsReady = undefined; // 失敗したら次のアクセスでやり直す
    throw e;
  }));
  if (!g.__pcmsPg) return Promise.resolve();
  return (g.__pcmsReady ??= g.__pcmsPg.exec(DDL));
}

async function setupNeon(url: string) {
  const sql = neon(url);
  await sql.transaction(splitSql(DDL).map((s) => sql.query(s)));
  const rows = (await sql.query("SELECT count(*)::int AS n FROM shops")) as { n: number }[];
  if (rows[0]?.n === 0) await sql.transaction(seedStatements(process.env.SHOP_NAME || undefined).map((s) => sql.query(s)));
}

export { schema };
