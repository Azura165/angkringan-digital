"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LogOut,
  Store,
  History,
  Armchair,
  Utensils,
  Clock,
  Maximize,
  Minimize,
  Wifi,
  WifiOff,
  Wallet,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Helper Format Rupiah
const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // State Data
  const [adminId, setAdminId] = useState<number | null>(null);
  const [username, setUsername] = useState("Memuat...");
  const [time, setTime] = useState(new Date());

  // State UI
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // State Shift Logic
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [systemCash, setSystemCash] = useState(0);
  const [actualCashInput, setActualCashInput] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  // 1. INIT & AUTH CHECK
  useEffect(() => {
    setIsMounted(true);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Online 🟢");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Offline 🔴");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    const checkAuth = async () => {
      if (!document.cookie.includes("admin_session=true")) {
        router.replace("/auth/login");
        return;
      }

      const localData = localStorage.getItem("admin_data");
      let userId = null;

      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setUsername(parsed.username);
          userId = parsed.id;
          setAdminId(parsed.id);
        } catch (e) {}
      }

      if (userId) {
        const { data } = await supabase
          .from("admins")
          .select("username, role")
          .eq("id", userId)
          .single();

        if (data) {
          setUsername(data.username);
          if (!["cashier", "super_admin"].includes(data.role)) {
            handleLogout();
          }
        }
      }
    };

    checkAuth();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  // 2. CLOCK
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. LOGIC TUTUP SHIFT
  const handleOpenShiftModal = async () => {
    setIsShiftModalOpen(true);
    setIsCalculating(true);

    // Hitung Total Uang Tunai Hari Ini (System Cash)
    const today = new Date().toISOString().split("T")[0];

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("total_price, cash_received, payment_method")
        .eq("payment_status", "paid")
        .eq("payment_method", "cash") // Hanya hitung tunai
        .gte("created_at", `${today}T00:00:00`);

      if (error) throw error;

      // Hitung total penjualan tunai
      const totalSystem = data.reduce(
        (acc, curr) => acc + (curr.total_price || 0),
        0,
      );
      setSystemCash(totalSystem);
    } catch (e) {
      toast.error("Gagal menghitung data penjualan");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCloseShift = async () => {
    if (!actualCashInput) {
      toast.error("Masukkan jumlah uang di laci!");
      return;
    }

    setIsClosing(true);
    const actualCash = parseInt(actualCashInput.replace(/\D/g, "")) || 0;
    const difference = actualCash - systemCash;

    try {
      // Simpan Data Shift ke DB
      const { error } = await supabase.from("shifts").insert({
        admin_id: adminId,
        start_time: new Date().setHours(0, 0, 0, 0), // Asumsi shift mulai hari ini (bisa diperbaiki nanti dengan fitur Open Shift)
        end_time: new Date(),
        end_cash_system: systemCash,
        end_cash_actual: actualCash,
        difference: difference,
        status: "closed",
      });

      if (error) throw error;

      toast.success("Laporan Shift Tersimpan ✅");

      // Proses Logout
      setTimeout(() => {
        handleLogout();
      }, 1000);
    } catch (e: any) {
      toast.error("Gagal menyimpan shift", { description: e.message });
      setIsClosing(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "admin_session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "user_role=; path=/; max-age=0; SameSite=Lax";
    localStorage.removeItem("admin_data");
    router.replace("/auth/login");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const navItems = [
    { href: "/cashier/pos", label: "POS Kasir", icon: Store },
    { href: "/cashier/tables", label: "Meja", icon: Armchair },
    { href: "/cashier/orders", label: "Riwayat", icon: History },
  ];

  if (!isMounted)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Memuat Sistem...
      </div>
    );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* HEADER DESKTOP */}
      <header className="hidden md:flex h-16 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5 px-6 items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tight select-none">
            <div className="bg-gradient-to-tr from-emerald-600 to-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Utensils size={18} className="text-white" />
            </div>
            <span>
              Kasir<span className="text-emerald-500">App</span>
            </span>
          </div>

          <nav className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl border border-white/5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`h-8 text-xs font-bold gap-2 rounded-lg transition-all ${isActive ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"}`}
                  >
                    <item.icon
                      size={14}
                      className={isActive ? "text-emerald-400" : ""}
                    />{" "}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${isOnline ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500 animate-pulse"}`}
          >
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
          </div>

          <div className="text-right leading-tight">
            <p className="text-xs font-bold text-white font-mono">
              {time.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-[9px] text-zinc-500 uppercase font-medium">
              {time.toLocaleDateString("id-ID", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="text-right hidden lg:block mr-2">
              <p className="text-xs font-bold text-white uppercase tracking-wider truncate max-w-[120px]">
                {username}
              </p>
              <p className="text-[9px] text-zinc-500 font-medium">
                Kasir Aktif
              </p>
            </div>

            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </Button>

            <Button
              onClick={handleOpenShiftModal}
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-bold text-xs"
            >
              <LogOut size={16} className="mr-2" /> Tutup Shift
            </Button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-hidden relative pb-20 md:pb-0">
        {children}
      </main>

      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-xl border-t border-white/5 p-2 z-50 pb-safe">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 active:bg-zinc-800"}`}
                >
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className="mb-1"
                  />
                  <span className="text-[9px] font-bold">{item.label}</span>
                </div>
              </Link>
            );
          })}
          <button
            onClick={handleOpenShiftModal}
            className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl text-red-500/70 active:bg-red-500/10 transition-all"
          >
            <LogOut size={20} className="mb-1" />
            <span className="text-[9px] font-bold">Tutup</span>
          </button>
        </div>
      </div>

      {/* --- MODAL TUTUP SHIFT --- */}
      <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wallet className="text-emerald-500" /> Rekapitulasi Shift
            </DialogTitle>
            <DialogDescription>
              Silakan hitung uang tunai di laci sebelum menutup sistem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info System */}
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-1">
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>Total Penjualan Tunai (System)</span>
                {isCalculating ? (
                  <Loader2 className="animate-spin w-3 h-3" />
                ) : (
                  <span>{new Date().toLocaleDateString("id-ID")}</span>
                )}
              </div>
              <p className="text-2xl font-black text-white tracking-tight">
                {isCalculating ? "..." : formatRupiah(systemCash)}
              </p>
              <p className="text-[10px] text-zinc-500 italic">
                *Tidak termasuk pembayaran QRIS/Transfer
              </p>
            </div>

            {/* Input Actual */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-300">
                Uang Tunai Aktual (Di Laci)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                  Rp
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={actualCashInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setActualCashInput(
                      val
                        ? new Intl.NumberFormat("id-ID").format(parseInt(val))
                        : "",
                    );
                  }}
                  className="pl-10 h-12 bg-black border-zinc-700 font-mono text-lg font-bold focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Selisih Preview (Optional, hanya muncul jika ada input) */}
            {actualCashInput && (
              <div
                className={`p-3 rounded-lg flex items-center gap-3 text-xs font-bold border ${
                  parseInt(actualCashInput.replace(/\./g, "")) - systemCash ===
                  0
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                }`}
              >
                <AlertTriangle size={16} />
                <span>
                  Selisih:{" "}
                  {formatRupiah(
                    parseInt(actualCashInput.replace(/\./g, "")) - systemCash,
                  )}
                  {parseInt(actualCashInput.replace(/\./g, "")) - systemCash ===
                  0
                    ? " (Pas)"
                    : " (Periksa Lagi)"}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsShiftModalOpen(false)}
              className="text-zinc-400"
            >
              Batal
            </Button>
            <Button
              onClick={handleCloseShift}
              disabled={isClosing || isCalculating}
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              {isClosing ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <LogOut className="mr-2" size={16} />
              )}
              Tutup Shift & Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
