import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Konfigurasi Rute
const PROTECTED_ROUTES = {
  ADMIN: "/admin",
  CASHIER: "/cashier",
};
const AUTH_ROUTE = "/auth/login";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ambil Cookies
  const hasSession = request.cookies.has("admin_session");
  const userRole = request.cookies.get("user_role")?.value;

  // 2. LOGIC PROTEKSI HALAMAN (Admin & Cashier)
  const isAdminRoute = pathname.startsWith(PROTECTED_ROUTES.ADMIN);
  const isCashierRoute = pathname.startsWith(PROTECTED_ROUTES.CASHIER);

  if (isAdminRoute || isCashierRoute) {
    // A. Jika belum login -> Tendang ke Login
    if (!hasSession) {
      const url = new URL(AUTH_ROUTE, request.url);
      return NextResponse.redirect(url);
    }

    // B. Role-Based Access Control (RBAC)
    // Skenario: User 'cashier' mencoba masuk '/admin' -> Redirect ke '/cashier/pos'
    if (isAdminRoute && userRole === "cashier") {
      const url = new URL("/cashier/pos", request.url);
      return NextResponse.redirect(url);
    }

    // Skenario: User 'super_admin' bebas akses (Boleh masuk cashier juga)
    // Jadi tidak perlu 'else if' untuk membatasi admin masuk cashier
  }

  // 3. PROTEKSI HALAMAN LOGIN (Redirect jika sudah login)
  if (pathname === AUTH_ROUTE) {
    if (hasSession) {
      // Redirect sesuai role yang tersimpan
      const targetUrl =
        userRole === "cashier" ? "/cashier/pos" : "/admin/dashboard";

      const url = new URL(targetUrl, request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Matcher: Tentukan path mana saja yang dicek middleware
export const config = {
  matcher: ["/admin/:path*", "/cashier/:path*", "/auth/login"],
};
