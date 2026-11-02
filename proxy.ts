import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth);

  // Public routes
  const publicRoutes = ["/login", "/register"];
  const isPublic =
    publicRoutes.some((r) => pathname.startsWith(r)) ||
    (pathname === "/api/users" && req.method === "POST");
  const isApiAuth = pathname.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();
  if (isPublic && isLoggedIn) {
    return NextResponse.redirect(new URL("/dossiers", req.url));
  }
  if (!isPublic && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
