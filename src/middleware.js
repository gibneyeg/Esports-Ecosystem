import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request) {
  const token = await getToken({ req: request });
  const isAuthenticated = !!token;

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (!isAuthenticated) {
    // For API routes, return 401
    if (isApiRoute) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/tournament/create",
    "/tournament/:path*/edit",
    "/tournament/:path*/participate",
    "/api/tournaments/create",
    "/api/tournaments/:id/participate",
    "/api/tournaments/:id/edit",
    "/protected/:path*",
  ],
};
