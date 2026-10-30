import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const path = request.nextUrl.pathname;
  const privatePage =
    /^\/(profile|dashboard|payment|login|signup|otp|forgot)(\/|$)/.test(path) ||
    /^\/biodata\//.test(path);
  if (privatePage || (path === "/biodata" && request.nextUrl.search))
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (privatePage)
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|opengraph-image).*)"],
};
