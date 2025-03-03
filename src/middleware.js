import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request) {
  const token = await getToken({ req: request });
  const isAuthenticated = !!token;
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isProfileUpload = request.nextUrl.pathname.startsWith("/api/user/profile-picture");
  const isPublicApiRoute = request.nextUrl.pathname.startsWith("/api/stats") || 
                          request.nextUrl.pathname.startsWith("/api/leaderboard");
  //const isBracketRoute = request.nextUrl.pathname.startsWith("")
  // For public API routes that need cache control but not auth
  if (isPublicApiRoute) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // Handle authentication
  if (!isAuthenticated) {
    // For protected API routes, return 401
    if (isApiRoute) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    // For protected pages, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle profile picture upload requests
  if (isProfileUpload) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("X-Upload-Request", "true");
    
    // Add cache control headers for upload requests
    requestHeaders.set('Cache-Control', 'no-store, must-revalidate');
    requestHeaders.set('Pragma', 'no-cache');
    requestHeaders.set('Expires', '0');
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // For all other authenticated API requests, add cache control headers
  if (isApiRoute) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
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
    "/api/user/profile-picture",
    // Public API routes that need cache control
    "/api/stats",
    "/api/leaderboard",
    "/settings",
  ],
};