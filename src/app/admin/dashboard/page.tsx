"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  DollarSign,
  ShoppingBag,
  Utensils,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Download,
  Clock,
  RefreshCcw,
  AlertCircle,
  ChefHat,
  Store,
  Award,
  Calendar,
  PackageX,
  Layers,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- CONFIG ---
const CACHE_KEY = "admin_dashboard_cache_v2";

// --- TYPES ---
type TimeRange = "7d" | "30d" | "1y";

// --- HELPER FUNCTIONS ---
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

const formatCompactNumber = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
  }).format(number);
};

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " thn lalu";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " bln lalu";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " hari lalu";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " jam lalu";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mnt lalu";
  return "Baru saja";
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  // Data State
  const [rawDataOrders, setRawDataOrders] = useState<any[]>([]); // Menyimpan semua raw data untuk diolah client-side
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMenu: 0,
    totalCategories: 0,
    outOfStock: 0,
    totalReviews: 0,
    totalOrders: 0,
    revenue: 0,
    revenueTrend: 0,
    avgOrderValue: 0,
    cancelRate: 0,
  });

  const [activeTables, setActiveTables] = useState(0);
  const [orderSummary, setOrderSummary] = useState({
    pending: 0,
    cooking: 0,
    ready: 0,
  });
  const [topItems, setTopItems] = useState<any[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  // --- FUNGSI UTAMA: FETCH DATA ---
  const fetchData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);

      const [
        menuRes,
        categoryRes, // Tambahan: Hitung Kategori
        stockRes, // Tambahan: Menu Habis
        reviewRes,
        ordersRes,
        recentRes,
        activeOrdersRes,
        topItemsRes,
        configRes,
      ] = await Promise.all([
        supabase.from("menu_items").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase
          .from("menu_items")
          .select("*", { count: "exact", head: true })
          .eq("is_available", false),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total_price, created_at, status"), // Fetch light data
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("orders")
          .select("status, table_number")
          .neq("status", "completed")
          .neq("status", "cancelled"),
        supabase.from("order_items").select("menu_name, qty").limit(100),
        supabase.from("store_config").select("*").single(),
      ]);

      // --- PENGOLAHAN DATA STATISTIK ---
      const allOrders = ordersRes.data || [];
      const totalRevenue = allOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((acc, curr) => acc + (curr.total_price || 0), 0);

      // 1. Trend Revenue
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isSameDay = (d1: Date, d2: Date) =>
        d1.toDateString() === d2.toDateString();

      const todayRevenue = allOrders
        .filter(
          (o) =>
            isSameDay(new Date(o.created_at), today) &&
            o.status !== "cancelled",
        )
        .reduce((a, b) => a + b.total_price, 0);

      const yesterdayRevenue = allOrders
        .filter(
          (o) =>
            isSameDay(new Date(o.created_at), yesterday) &&
            o.status !== "cancelled",
        )
        .reduce((a, b) => a + b.total_price, 0);

      const revenueTrend =
        yesterdayRevenue === 0
          ? todayRevenue > 0
            ? 100
            : 0
          : ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

      // 2. AOV & Cancel Rate
      const totalValidOrders = allOrders.filter(
        (o) => o.status !== "cancelled",
      ).length;
      const avgOrderValue =
        totalValidOrders > 0 ? totalRevenue / totalValidOrders : 0;
      const totalCancelled = allOrders.filter(
        (o) => o.status === "cancelled",
      ).length;
      const cancelRate =
        allOrders.length > 0 ? (totalCancelled / allOrders.length) * 100 : 0;

      // 3. Quick Status
      const activeData = activeOrdersRes.data || [];
      const pending = activeData.filter((o) => o.status === "pending").length;
      const cooking = activeData.filter((o) => o.status === "cooking").length;
      const ready = activeData.filter((o) => o.status === "ready").length;
      const tables = new Set(
        activeData
          .filter((o) => o.table_number !== "Takeaway")
          .map((o) => o.table_number),
      );

      // 4. Top Items
      const itemCounts: Record<string, number> = {};
      (topItemsRes.data || []).forEach((item: any) => {
        itemCounts[item.menu_name] =
          (itemCounts[item.menu_name] || 0) + item.qty;
      });
      const sortedTopItems = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      // 5. Store Status
      let isOpen = false;
      if (configRes.data) {
        const nowStr = `${today.getHours().toString().padStart(2, "0")}:${today
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
        isOpen =
          nowStr >= configRes.data.open_hour &&
          nowStr <= configRes.data.close_hour;
      }

      // --- SET DATA ---
      const newStats = {
        totalMenu: menuRes.count || 0,
        totalCategories: categoryRes.count || 0, // Data Kategori
        outOfStock: stockRes.count || 0, // Data Stok Habis
        totalReviews: reviewRes.count || 0,
        totalOrders: allOrders.length,
        revenue: totalRevenue,
        revenueTrend,
        avgOrderValue,
        cancelRate,
      };
      const newOrderSummary = { pending, cooking, ready };
      const newRecentOrders = recentRes.data || [];

      setStats(newStats);
      setRawDataOrders(allOrders); // Simpan raw data untuk kalkulasi grafik dinamis
      setRecentOrders(newRecentOrders);
      setOrderSummary(newOrderSummary);
      setActiveTables(tables.size);
      setTopItems(sortedTopItems);
      setIsStoreOpen(isOpen);

      // --- SIMPAN KE CACHE ---
      const cacheData = {
        stats: newStats,
        rawDataOrders: allOrders,
        recentOrders: newRecentOrders,
        orderSummary: newOrderSummary,
        activeTables: tables.size,
        topItems: sortedTopItems,
        isStoreOpen: isOpen,
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      if (showToast) toast.success("Dashboard diperbarui");
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // --- LOGIC GRAFIK DINAMIS (MEMOIZED) ---
  const chartData = useMemo(() => {
    if (!rawDataOrders.length) return [];

    const now = new Date();
    let dataPoints: { label: string; value: number; date: Date }[] = [];
    const groupedData: Record<string, number> = {};

    if (timeRange === "7d") {
      // 7 Hari Terakhir
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString("id-ID", { weekday: "short" }); // Senin, Selasa...
        const dateKey = d.toDateString();
        groupedData[dateKey] = 0;
        dataPoints.push({ label: key, value: 0, date: d });
      }
    } else if (timeRange === "30d") {
      // 30 Hari Terakhir
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.getDate().toString(); // 1, 2, 3...
        const dateKey = d.toDateString();
        groupedData[dateKey] = 0;
        dataPoints.push({ label: key, value: 0, date: d });
      }
    } else if (timeRange === "1y") {
      // 1 Tahun Terakhir
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const key = d.toLocaleDateString("id-ID", { month: "short" }); // Jan, Feb...
        const monthKey = `${d.getMonth()}-${d.getFullYear()}`;
        groupedData[monthKey] = 0;
        dataPoints.push({ label: key, value: 0, date: d });
      }
    }

    // Isi Data
    rawDataOrders.forEach((order) => {
      if (order.status === "cancelled") return;
      const d = new Date(order.created_at);

      let key = "";
      if (timeRange === "1y") {
        key = `${d.getMonth()}-${d.getFullYear()}`;
        // Logic grouping bulan
        const found = dataPoints.find(
          (p) => `${p.date.getMonth()}-${p.date.getFullYear()}` === key,
        );
        if (found) found.value += order.total_price;
      } else {
        key = d.toDateString();
        // Logic grouping harian
        const found = dataPoints.find((p) => p.date.toDateString() === key);
        if (found) found.value += order.total_price;
      }
    });

    // Normalisasi Tinggi Grafik (Persentase)
    const maxValue = Math.max(...dataPoints.map((d) => d.value), 1);
    return dataPoints.map((d) => ({
      ...d,
      height: (d.value / maxValue) * 100,
    }));
  }, [rawDataOrders, timeRange]);

  // --- INIT: LOAD CACHE & REALTIME ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setStats(data.stats);
          setRawDataOrders(data.rawDataOrders || []);
          setRecentOrders(data.recentOrders);
          setOrderSummary(data.orderSummary);
          setActiveTables(data.activeTables);
          setTopItems(data.topItems);
          setIsStoreOpen(data.isStoreOpen);
          setIsLoading(false);
        } catch (e) {}
      }
    }
    fetchData();

    const channel = supabase
      .channel("admin-dashboard-realtime-v3")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Kode,Nama,Meja,Total,Status,Waktu\n" +
      recentOrders
        .map(
          (o) =>
            `${o.order_code || o.id},"${o.customer_name}",${o.table_number},${o.total_price},${o.status},${o.created_at}`,
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `laporan_penjualan_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    toast.success("Laporan berhasil didownload! 📂");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/80 p-5 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Dashboard
            {isStoreOpen ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold animate-pulse">
                <Store size={10} /> BUKA
              </span>
            ) : (
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <Store size={10} /> TUTUP
              </span>
            )}
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex-1 md:flex-none border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 h-9 rounded-xl"
          >
            <Download size={14} className="mr-2" /> Export
          </Button>
          <Button
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex-1 md:flex-none bg-zinc-800 hover:bg-zinc-700 text-white h-9 rounded-xl border border-zinc-700"
          >
            <RefreshCcw
              size={14}
              className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
        </div>
      </div>

      {/* QUICK STATUS GRID */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <span className="text-3xl font-black text-blue-500 z-10">
            {orderSummary.pending}
          </span>
          <span className="text-[10px] text-blue-300 uppercase tracking-wider font-bold mt-1 z-10">
            Pending
          </span>
          <Clock className="absolute -right-2 -bottom-2 text-blue-500/10 h-16 w-16" />
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <span className="text-3xl font-black text-orange-500 z-10">
            {orderSummary.cooking}
          </span>
          <span className="text-[10px] text-orange-300 uppercase tracking-wider font-bold mt-1 z-10">
            Dimasak
          </span>
          <ChefHat className="absolute -right-2 -bottom-2 text-orange-500/10 h-16 w-16" />
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <span className="text-3xl font-black text-emerald-500 z-10">
            {activeTables}
          </span>
          <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold mt-1 z-10">
            Meja Isi
          </span>
          <Utensils className="absolute -right-2 -bottom-2 text-emerald-500/10 h-16 w-16" />
        </div>
      </div>

      {/* MAIN STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Total Omzet"
          value={formatRupiah(stats.revenue)}
          icon={DollarSign}
          color="text-green-500"
          bg="bg-green-500/10"
          loading={isLoading}
          trend={stats.revenueTrend}
        />
        <StatCard
          title="Total Pesanan"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="text-blue-500"
          bg="bg-blue-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Rata-rata Order"
          value={formatRupiah(stats.avgOrderValue)}
          icon={Award}
          color="text-orange-500"
          bg="bg-orange-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Total Ulasan"
          value={stats.totalReviews}
          icon={Users}
          color="text-purple-500"
          bg="bg-purple-500/10"
          loading={isLoading}
        />
      </div>

      {/* MENU STATS DETAIL (NEW) */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-zinc-800 rounded-xl text-white">
            <Utensils size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.totalMenu}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">
              Total Menu
            </p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-zinc-800 rounded-xl text-blue-400">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {stats.totalCategories}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">
              Kategori
            </p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-zinc-800 rounded-xl text-red-400">
            <PackageX size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.outOfStock}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold">
              Menu Habis
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col h-[320px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 z-10 gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" /> Statistik
                  Pendapatan
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Pantau performa penjualanmu.
                </p>
              </div>
              <div className="flex bg-black/40 p-1 rounded-lg border border-zinc-800">
                {(["7d", "30d", "1y"] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${timeRange === range ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {range === "7d"
                      ? "7 Hari"
                      : range === "30d"
                        ? "30 Hari"
                        : "1 Tahun"}
                  </button>
                ))}
              </div>
            </div>

            {/* CHART BARS */}
            <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 z-10 px-1 overflow-x-auto pb-2 scrollbar-hide">
              {chartData.length > 0 ? (
                chartData.map((d, i) => (
                  <TooltipProvider key={i}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full min-w-[20px] bg-zinc-800/30 rounded-t-lg relative group hover:bg-zinc-800/50 transition-colors h-full flex flex-col justify-end cursor-pointer">
                          <div
                            className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-sm transition-all duration-700 ease-out group-hover:from-orange-500 group-hover:to-orange-300 relative"
                            style={{ height: `${d.height || 2}%` }}
                          />
                          <span className="text-[8px] text-zinc-600 text-center mt-2 font-mono truncate">
                            {d.label}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                        <p className="font-bold">
                          {d.date.toLocaleDateString("id-ID", {
                            dateStyle: "full",
                          })}
                        </p>
                        <p className="text-orange-500 font-mono mt-1">
                          {formatRupiah(d.value)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                  Belum ada data grafik
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_40px] pointer-events-none" />
          </div>

          {/* Top Menu */}
          <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Award size={16} className="text-yellow-500" /> Menu Favorit Hari
              Ini
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topItems.length > 0 ? (
                topItems.map((item, i) => (
                  <div
                    key={i}
                    className="bg-zinc-950/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 relative overflow-hidden"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${i === 0 ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400"}`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 z-10">
                      <p className="text-xs font-bold text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {item.count} Terjual
                      </p>
                    </div>
                    {i === 0 && (
                      <div className="absolute right-0 top-0 p-2 opacity-10">
                        <Award size={40} className="text-yellow-500" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-600 col-span-3 text-center py-2">
                  Belum ada penjualan hari ini.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Recent Orders */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 flex flex-col h-[500px]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" /> Pesanan Terbaru
          </h3>

          {/* LIST ORDER (SCROLLBAR HIDDEN) */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-16 w-full rounded-2xl bg-zinc-800/50"
                />
              ))
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex gap-3 items-center p-3 rounded-2xl bg-zinc-950/30 border border-white/5 hover:border-orange-500/20 transition-all cursor-default group relative overflow-hidden"
                >
                  <div
                    className={`w-1.5 absolute left-0 top-0 bottom-0 ${order.status === "ready" ? "bg-green-500" : order.status === "cooking" ? "bg-blue-500" : "bg-yellow-500"}`}
                  />

                  <div className="ml-2 flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono tracking-wider text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        {order.order_code || `#${order.id}`}{" "}
                      </span>
                      <span className="text-[9px] text-zinc-600 flex items-center gap-1">
                        <Clock size={8} /> {timeAgo(order.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 font-bold truncate">
                      {order.customer_name}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {order.table_number === "Takeaway"
                        ? "🛍️ Takeaway"
                        : `🍽️ ${order.table_number}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-orange-500">
                      {formatCompactNumber(order.total_price)}
                    </p>
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider mt-1 inline-block ${
                        order.status === "ready"
                          ? "bg-green-500/20 text-green-400"
                          : order.status === "cooking"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                <AlertCircle size={32} className="opacity-20" />
                <span className="text-xs text-center px-8">
                  Belum ada pesanan masuk.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// COMPACT CARD (Optimized)
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  loading,
  trend,
}: any) {
  if (loading)
    return <Skeleton className="h-28 w-full rounded-3xl bg-zinc-900" />;

  return (
    <div className="bg-zinc-900 border border-white/5 p-5 rounded-3xl flex flex-col justify-between hover:border-zinc-700 transition-all group shadow-sm relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}
      >
        <Icon size={48} />
      </div>

      <div className="flex justify-between items-start">
        <div
          className={`w-10 h-10 rounded-2xl ${bg} ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
        >
          <Icon size={20} />
        </div>

        {/* Trend Indicator */}
        {trend !== undefined && (
          <div
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${trend >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
          >
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-black text-white tracking-tight truncate">
          {value}
        </h3>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
          {title}
        </p>
      </div>
    </div>
  );
}
