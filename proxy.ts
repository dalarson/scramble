import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  getAdminAccessCode,
  hashAdminAccessCode,
  sanitizeAdminRedirect,
} from "@/lib/admin-access";

export async function proxy(request: NextRequest) {
  const accessCode = getAdminAccessCode();
  if (!accessCode) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const expectedCookieValue = await hashAdminAccessCode(accessCode);

  if (cookieValue === expectedCookieValue) {
    return NextResponse.next();
  }

  const redirectUrl = new URL("/admin-access", request.url);
  redirectUrl.searchParams.set(
    "next",
    sanitizeAdminRedirect(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    ),
  );
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/tournament",
    "/tournament/live",
    "/draft/:path*",
    "/history/:path*",
    "/stats/:path*",
    "/leaderboard/:path*",
  ],
};
