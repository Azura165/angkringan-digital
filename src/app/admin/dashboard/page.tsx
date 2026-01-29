"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  DollarSign,
  ShoppingBag,
  Utensils,
  Users,
  TrendingUp,
  ArrowUpRight,
  Download,
  PlusCircle,
  Clock,
  MoreHorizontal,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Helper: Format Rupiah
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data State
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMenu: 0,
    totalReviews: 0,
    totalOrders: 0,
    revenue: 0,
  });

  // Chart State (7 Hari Terakhir)
  const [chartData, setChartData] = useState<number[]>([]);

  // FUNGSI UTAMA: FETCH DATA (OPTIMIZED)
  const fetchData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);

      // 1. Parallel Fetching (Biar Cepat)
      const [menuRes, reviewRes, ordersRes, recentRes] = await Promise.all([
        supabase.from("menu_items").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        // Ambil data pesanan (Hanya kolom total_price dan created_at biar ringan)
        supabase.from("orders").select("total_price, created_at"),
        // Ambil 5 pesanan terbaru lengkap
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const orders = ordersRes.data || [];
      const totalRevenue = orders.reduce(
        (acc, curr) => acc + (curr.total_price || 0),
        0,
      );

      // 2. LOGIC CHART (Menghitung Omzet 7 Hari Terakhir Secara Real)
      const last7Days = Array(7).fill(0);
      const today = new Date();

      orders.forEach((order) => {
        const orderDate = new Date(order.created_at);
        const diffTime = Math.abs(today.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Jika pesanan dalam 7 hari terakhir (indeks 0-6)
        if (diffDays <= 7 && diffDays > 0) {
          // Masukkan ke array (index 6 adalah hari ini, 0 adalah 7 hari lalu)
          // Kita simplifikasi: mapping order ke slot array
          const index = 7 - diffDays;
          if (index >= 0) last7Days[index] += order.total_price;
        }
      });
      // Normalisasi chart agar barnya proporsional (Max height 100%)
      const maxVal = Math.max(...last7Days, 1); // Hindari bagi 0
      const normalizedChart = last7Days.map((val) => (val / maxVal) * 100);

      setStats({
        totalMenu: menuRes.count || 0,
        totalReviews: reviewRes.count || 0,
        totalOrders: orders.length,
        revenue: totalRevenue,
      });

      setRecentOrders(recentRes.data || []);
      setChartData(normalizedChart); // Simpan data grafik real

      if (showToast) toast.success("Data diperbarui! 🔄");
    } catch (error) {
      console.error("Dashboard Error:", error);
      toast.error("Gagal memuat data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // INITIAL LOAD & REALTIME
  useEffect(() => {
    fetchData();

    // Realtime Listener (Hanya refresh jika ada INSERT baru di orders)
    const channel = supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          toast.info("Pesanan Baru Masuk! 🔔");
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-white/5 backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Dashboard
            {isLoading && (
              <span className="text-xs font-normal text-zinc-500 animate-pulse">
                (Sinkronisasi...)
              </span>
            )}
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Pantau performa bisnis secara realtime.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex-1 md:flex-none border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 h-10"
          >
            <RefreshCcw
              size={16}
              className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Loading" : "Refresh"}
          </Button>
          <Button
            size="sm"
            className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-500 text-white font-bold h-10"
          >
            <PlusCircle size={16} className="mr-2" /> Menu
          </Button>
        </div>
      </div>

      {/* STATS GRID (2x2 di Mobile, 4x1 di Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Omzet"
          value={formatRupiah(stats.revenue)}
          icon={DollarSign}
          color="text-green-500"
          bg="bg-green-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Pesanan"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="text-blue-500"
          bg="bg-blue-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Menu Aktif"
          value={stats.totalMenu}
          icon={Utensils}
          color="text-orange-500"
          bg="bg-orange-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Ulasan"
          value={stats.totalReviews}
          icon={Users}
          color="text-purple-500"
          bg="bg-purple-500/10"
          loading={isLoading}
        />
      </div>

      {/* CONTENT GRID (Chart & List) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART SECTION (Real Data) */}
        <div className="lg:col-span-2 bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col h-[300px]">
          <div className="flex items-center justify-between mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-green-500" /> Tren Omzet
              </h3>
              <p className="text-[10px] text-zinc-500">7 Hari Terakhir</p>
            </div>
            <MoreHorizontal size={16} className="text-zinc-600" />
          </div>

          {/* Bar Chart Visual */}
          <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 z-10 px-1">
            {chartData.length > 0 ? (
              chartData.map((h, i) => (
                <div
                  key={i}
                  className="w-full bg-zinc-800/50 rounded-t-lg relative group hover:bg-zinc-800 transition-colors"
                  style={{ height: "100%" }}
                >
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg transition-all duration-700 ease-out group-hover:from-orange-500 group-hover:to-orange-300"
                    style={{ height: `${h || 2}%` }} // Min 2% height biar kelihatan walau 0
                  />
                </div>
              ))
            ) : (
              // Empty State Chart
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                Belum ada data grafik
              </div>
            )}
          </div>

          {/* Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_40px] pointer-events-none" />
        </div>

        {/* RECENT ORDERS LIST */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 flex flex-col h-[300px]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" /> Pesanan Terbaru
          </h3>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-14 w-full rounded-xl bg-zinc-800/50"
                />
              ))
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex gap-3 items-center p-3 rounded-xl bg-zinc-950/50 border border-white/5 hover:border-orange-500/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 text-[10px] font-bold border border-white/5">
                    #{order.id.toString().slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200 font-bold truncate">
                      {order.customer_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded ${order.status === "done" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}
                      >
                        {order.status || "Baru"}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {order.table_number}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-orange-500">
                      {formatRupiah(order.total_price)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                <AlertCircle size={24} className="opacity-20" />
                <span className="text-xs">Belum ada pesanan</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full mt-3 text-[10px] h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Lihat Semua <ArrowUpRight size={12} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// COMPACT CARD (2x2 Optimized)
function StatCard({ title, value, icon: Icon, color, bg, loading }: any) {
  if (loading)
    return <Skeleton className="h-24 w-full rounded-2xl bg-zinc-900" />;

  return (
    <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all group shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div
          className={`p-2 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform`}
        >
          <Icon size={18} />
        </div>
        {/* Trend Indicator (Static for now, can be dynamic) */}
        <div className="text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center">
          <ArrowUpRight size={10} className="mr-0.5" /> +
        </div>
      </div>
      <div>
        <h3 className="text-lg font-black text-white tracking-tight truncate">
          {value}
        </h3>
        <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider mt-0.5">
          {title}
        </p>
      </div>
    </div>
  );
}
