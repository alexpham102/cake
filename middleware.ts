import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { USER_COOKIE_NAME, isValidPassword } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow the login page
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Read user id cookie
  const cookie = request.cookies.get(USER_COOKIE_NAME)?.value ?? null;
  const ok = isValidPassword(cookie);
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/.*).*)",
  ],
};


