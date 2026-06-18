import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "gradex_token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through Next internals, API routes and static assets.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;

  // Unauthenticated → login (presence check only; token is verified server-side).
  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated → keep away from the login page.
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
