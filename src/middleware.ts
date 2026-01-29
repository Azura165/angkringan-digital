import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Halaman yang WAJIB Login
const protectedRoutes = ["/admin"];
// Halaman yang HANYA untuk tamu (belum login)
const authRoutes = ["/auth/login"];

export function middleware(request: NextRequest) {
  // 1. Ambil Cookie 'admin_session'
  const hasSession = request.cookies.has("admin_session");
  const { pathname } = request.nextUrl;

  // 2. PROTEKSI ADMIN: Jika mau ke /admin TAPI gak punya session -> Tendang ke Login
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!hasSession) {
      const url = new URL("/auth/login", request.url);
      return NextResponse.redirect(url);
    }
  }

  // 3. PROTEKSI LOGIN: Jika mau ke Login TAPI SUDAH punya session -> Lempar ke Dashboard
  if (authRoutes.includes(pathname)) {
    if (hasSession) {
      const url = new URL("/admin/dashboard", request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Konfigurasi path mana saja yang dicek middleware
export const config = {
  matcher: ["/admin/:path*", "/auth/login"],
};
