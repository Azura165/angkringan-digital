"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  Armchair,
  Users, // Import Icon Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminSoundSystem } from "@/components/admin/AdminSoundSystem";
import { TicketPercent } from "lucide-react";

// Utility Debounce Sederhana (Hemat Resource)
function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [counts, setCounts] = useState({ pendingOrders: 0, activeTables: 0 });
  const pathname = usePathname();
  const router = useRouter();

  // --- 1. LOGIC BADGE (OPTIMIZED) ---
  const fetchCounts = useCallback(async () => {
    try {
      // A. BADGE ORDER (Pending & New)
      const lastReadOrder = localStorage.getItem("admin_last_read_orders");
      let orderQuery = supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (lastReadOrder) {
        orderQuery = orderQuery.gt("created_at", lastReadOrder);
      }
      const { count: pendingCount } = await orderQuery;

      // B. BADGE TABLES (Activity)
      const lastReadTable = localStorage.getItem("admin_last_read_tables");
      let tableQuery = supabase
        .from("tables")
        .select("*", { count: "exact", head: true })
        .or("status.eq.occupied,service_request.not.is.null");

      if (lastReadTable) {
        tableQuery = tableQuery.gt("updated_at", lastReadTable);
      }
      const { count: tableCount } = await tableQuery;

      setCounts({
        pendingOrders: pendingCount || 0,
        activeTables: tableCount || 0,
      });
    } catch (e) {
      console.error("Badge sync error", e);
    }
  }, []);

  const debouncedFetchCounts = useDebounceCallback(fetchCounts, 1000);

  // --- 2. LOGIC RESET & INIT ---
  useEffect(() => {
    if (pathname === "/admin/orders") {
      localStorage.setItem("admin_last_read_orders", new Date().toISOString());
      setCounts((prev) => ({ ...prev, pendingOrders: 0 }));
    } else if (pathname === "/admin/tables") {
      localStorage.setItem("admin_last_read_tables", new Date().toISOString());
      setCounts((prev) => ({ ...prev, activeTables: 0 }));
    } else {
      fetchCounts();
    }
  }, [pathname, fetchCounts]);

  // --- 3. REALTIME LISTENER (Global) ---
  useEffect(() => {
    fetchCounts();

    const channel = supabase
      .channel("admin-layout-badges-optimized")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          if (window.location.pathname === "/admin/orders") {
            localStorage.setItem(
              "admin_last_read_orders",
              new Date().toISOString(),
            );
          } else {
            debouncedFetchCounts();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => {
          if (window.location.pathname === "/admin/tables") {
            localStorage.setItem(
              "admin_last_read_tables",
              new Date().toISOString(),
            );
          } else {
            debouncedFetchCounts();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCounts, debouncedFetchCounts]);

  const handleLogout = () => {
    document.cookie = "admin_session=; path=/; max-age=0; SameSite=Lax";
    localStorage.removeItem("admin_data");
    toast.success("Berhasil keluar.");
    router.replace("/auth/login");
    router.refresh();
  };

  const menuItems = useMemo(
    () => [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Manajemen Menu", href: "/admin/menu", icon: UtensilsCrossed },
      {
        name: "Manajemen Meja",
        href: "/admin/tables",
        icon: Armchair,
        badge: counts.activeTables > 0 ? counts.activeTables : null,
        badgeColor: "bg-blue-600 animate-pulse",
      },
      {
        name: "Riwayat Order",
        href: "/admin/orders",
        icon: ShoppingBag,
        badge: counts.pendingOrders > 0 ? counts.pendingOrders : null,
        badgeColor: "bg-red-600 animate-pulse",
      },
      // MENU BARU: TIM & AKSES
      { name: "Tim & Akses", href: "/admin/users", icon: Users },
      { name: "Promo & Diskon", href: "/admin/promos", icon: TicketPercent },
      { name: "Ulasan Pelanggan", href: "/admin/reviews", icon: MessageSquare },
      { name: "Pengaturan Toko", href: "/admin/settings", icon: Settings },
    ],
    [counts],
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex font-sans text-zinc-100 selection:bg-orange-500/30 overflow-hidden">
      <AdminSoundSystem />

      {/* --- SIDEBAR --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-white/5 
        transform-gpu transition-transform duration-300 ease-in-out md:translate-x-0 will-change-transform backface-hidden
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-zinc-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
              <div className="bg-gradient-to-tr from-orange-600 to-orange-400 p-1.5 rounded-lg shadow-lg shadow-orange-500/20">
                <ChefHat size={20} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Admin Panel
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors active:scale-90"
              aria-label="Tutup Menu"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                    isActive
                      ? "bg-gradient-to-r from-orange-600/10 to-orange-500/5 text-orange-500 border border-orange-500/20 shadow-sm"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <item.icon
                    size={18}
                    className={
                      isActive
                        ? "text-orange-500"
                        : "text-zinc-500 group-hover:text-white transition-colors"
                    }
                  />
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.badge && (
                    <span
                      className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white rounded-full shadow-lg ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5 bg-zinc-900/50">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/20 active:scale-95 group"
            >
              <LogOut
                size={18}
                className="group-hover:-translate-x-1 transition-transform"
              />{" "}
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* --- OVERLAY --- */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300">
        <header className="h-16 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 md:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="text-white hover:bg-zinc-800 relative active:scale-90 transition-transform"
              aria-label="Buka Menu"
            >
              <Menu size={24} />
              {(counts.pendingOrders > 0 || counts.activeTables > 0) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-black rounded-full animate-pulse" />
              )}
            </Button>
            <span className="font-bold text-white text-lg truncate">
              {menuItems.find((i) => i.href === pathname)?.name || "Dashboard"}
            </span>
          </div>
        </header>
        <div className="p-4 md:p-8 flex-1 overflow-x-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}
