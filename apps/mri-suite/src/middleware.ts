import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/reset-password", "/api/health", "/brand", "/favicon"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.get("mri_session")) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|ico|webp)$).*)"] };
