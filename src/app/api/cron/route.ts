import { NextResponse, type NextRequest } from "next/server";
import { ensureSchema } from "@/db";
import { runDue } from "@/lib/contentRunner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 予約・タイマー更新の実行口。外部の定期実行（GitHub Actions など）が数分おきに叩きます。
 * CRON_SECRET を設定した場合は Authorization: Bearer <CRON_SECRET> か ?key= が必要です。
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}` && req.nextUrl.searchParams.get("key") !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  await ensureSchema();
  const done = await runDue(20);
  return NextResponse.json({ ok: true, ran: done.length, done });
}
