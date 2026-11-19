import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, credentials, tokenFor } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { id, password } = credentials();
  const ok = !!password && req.cookies.get(AUTH_COOKIE)?.value === (await tokenFor(id, password));
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|logout|info|media|_next|favicon.ico|icon.svg).*)"],
};
