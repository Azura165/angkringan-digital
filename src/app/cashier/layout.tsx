"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Store, History, Armchair, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("Kasir");

  useEffect(() => {
    const data = localStorage.getItem("admin_data");
    if (data) {
      const parsed = JSON.parse(data);
      setUsername(parsed.username);
      // Security Check Sederhana: Jika bukan kasir/admin, tendang
      if (!["cashier", "super_admin"].includes(parsed.role)) {
        router.replace("/admin/login");
      }
    }
  }, [router]);

  const handleLogout = () => {
    document.cookie = "admin_session=; path=/; max-age=0; SameSite=Lax";
    localStorage.removeItem("admin_data");
    toast.success("Shift Selesai. Bye! 👋");
    router.replace("/admin/login");
  };

  const navItems = [
    { href: "/cashier/pos", label: "POS Kasir", icon: Store },
    { href: "/cashier/orders", label: "Riwayat", icon: History },
    { href: "/cashier/tables", label: "Cek Meja", icon: Armchair },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* HEADER KHUSUS KASIR */}
      <header className="h-16 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="bg-emerald-600 p-1.5 rounded-lg shadow-lg shadow-emerald-500/20">
              <Utensils size={20} className="text-white" />
            </div>
            <span>
              Kasir<span className="text-emerald-500">App</span>
            </span>
          </div>

          {/* Navigasi Sederhana */}
          <nav className="hidden md:flex gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`h-9 text-xs font-bold gap-2 ${isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
                  >
                    <item.icon size={14} /> {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              {username}
            </p>
            <p className="text-[10px] text-emerald-500 font-mono">Online</p>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block" />
          <Button
            onClick={handleLogout}
            variant="destructive"
            size="sm"
            className="h-9 px-4 rounded-xl text-xs font-bold shadow-lg shadow-red-900/20"
          >
            <LogOut size={14} className="mr-2" /> Keluar
          </Button>
        </div>
      </header>

      {/* CONTENT AREA (FULL WIDTH) */}
      <main className="flex-1 overflow-hidden relative">{children}</main>
    </div>
  );
}
