import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const ok = !!(await verifySession(req.cookies.get(AUTH_COOKIE)?.value));
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|logout|info|media|api/cron|_next|favicon.ico|icon.svg).*)"],
};
