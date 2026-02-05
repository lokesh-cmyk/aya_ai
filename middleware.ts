import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes (let them handle their own auth)
  // Better Auth routes are handled by /api/auth/[...all]/route.ts
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Check for session cookie - check both standard and secure (HTTPS) cookie names
  // In production with HTTPS, Better-Auth uses __Secure- prefix
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  // If accessing a protected route, check for session
  if (!isPublicRoute) {
    if (!sessionCookie) {
      // Redirect to login for protected routes
      if (
        pathname.startsWith("/inbox") ||
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/analytics") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/onboarding") ||
        pathname.startsWith("/chat") ||
        pathname.startsWith("/meetings")
      ) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  // If logged in and trying to access auth pages, redirect to onboarding
  // Onboarding will check if setup is needed or redirect to dashboard
  if (sessionCookie && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

