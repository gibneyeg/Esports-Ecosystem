import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request) {
  const token = await getToken({ req: request });
  const isAuthenticated = !!token;
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isProfileUpload = request.nextUrl.pathname.startsWith(
    "/api/user/profile-picture"
  );

  // Handle authentication first
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

  // Handle profile picture upload requests
  if (isProfileUpload) {
    // Clone the request headers
    const requestHeaders = new Headers(request.headers);
    // Add upload tracking header
    requestHeaders.set("X-Upload-Request", "true");

    // Return modified request
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
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
    "/api/user/profile-picture", // Add this new path
  ],
};
