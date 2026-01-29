"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // FUNGSI LOGOUT (Hapus Cookie & Storage)
  const handleLogout = () => {
    // 1. Hapus Cookie (PENTING: Agar middleware mendeteksi logout)
    document.cookie = "admin_session=; path=/; max-age=0; SameSite=Lax";

    // 2. Hapus LocalStorage (Data UI)
    localStorage.removeItem("admin_data");

    // 3. Notifikasi & Redirect
    toast.success("Berhasil keluar.");
    router.replace("/auth/login"); // Pakai replace agar tidak bisa di-back
    router.refresh(); // Refresh agar middleware jalan ulang
  };

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Manajemen Menu", href: "/admin/menu", icon: UtensilsCrossed },
    { name: "Riwayat Order", href: "/admin/orders", icon: ShoppingBag },
    { name: "Ulasan Pelanggan", href: "/admin/reviews", icon: MessageSquare },
    { name: "Pengaturan Toko", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex font-sans">
      {/* --- SIDEBAR (Desktop & Mobile) --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-white/5 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-zinc-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
              <ChefHat className="text-orange-500" />
              <span>Admin Panel</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-zinc-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <item.icon
                    size={18}
                    className={
                      isActive
                        ? "text-white"
                        : "text-zinc-500 group-hover:text-white transition-colors"
                    }
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-white/5 bg-zinc-900/50">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border border-transparent hover:border-red-500/20"
            >
              <LogOut size={18} />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* --- OVERLAY (Mobile Only) --- */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
        />
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300">
        {/* Header Mobile (Hamburger) */}
        <header className="h-16 flex items-center px-4 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="text-white hover:bg-zinc-800"
          >
            <Menu size={24} />
          </Button>
          <span className="ml-3 font-bold text-white text-lg">Dashboard</span>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-8 flex-1 overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
}
