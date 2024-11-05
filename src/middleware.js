export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/protected/:path*",
    "/api/protected/:path*"
  ]
}
