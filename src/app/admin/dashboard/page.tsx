"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  DollarSign,
  ShoppingBag,
  Utensils,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCcw,
  AlertCircle,
  ChefHat,
  Store,
  Award,
  PackageX,
  Wallet,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// --- CONFIG ---
const CACHE_KEY = "admin_dashboard_v4_optimized";

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

  if (seconds < 60) return "Baru saja";
  let interval = seconds / 3600;
  if (interval > 24) return Math.floor(interval / 24) + " hari lalu";
  if (interval > 1) return Math.floor(interval) + " jam lalu";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mnt lalu";
  return "Baru saja";
};

// --- SUB-COMPONENT: EXPENSE MODAL (Agar Tidak Lag) ---
// Kita pisahkan ini agar saat mengetik, dashboard utama tidak re-render
const ExpenseModal = memo(
  ({
    isOpen,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => {
    const [form, setForm] = useState({
      name: "",
      amount: "",
      category: "operasional",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!form.name || !form.amount) {
        toast.error("Mohon lengkapi data");
        return;
      }
      setIsSubmitting(true);
      try {
        const { error } = await supabase.from("expenses").insert({
          name: form.name,
          amount: parseInt(form.amount),
          category: form.category,
          date: new Date().toISOString(),
        });
        if (error) throw error;
        toast.success("Pengeluaran tercatat");
        setForm({ name: "", amount: "", category: "operasional" }); // Reset
        onSuccess(); // Refresh dashboard
        onClose();
      } catch (e) {
        toast.error("Gagal menyimpan");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-sm rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle>Catat Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Keperluan
              </label>
              <Input
                placeholder="Contoh: Beli Es Batu, Token Listrik"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-zinc-900 border-zinc-700 focus:ring-emerald-500 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Nominal (Rp)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="bg-zinc-900 border-zinc-700 focus:ring-emerald-500 font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Kategori
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="operasional">Operasional (Listrik, Air)</option>
                <option value="bahan_baku">Bahan Baku (Pasar)</option>
                <option value="gaji">Gaji Karyawan</option>
                <option value="lainnya">Lain-lain</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-white text-black hover:bg-zinc-200 font-bold rounded-xl"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
ExpenseModal.displayName = "ExpenseModal";

// --- MAIN PAGE ---
export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  // Data State
  const [rawDataOrders, setRawDataOrders] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentShifts, setRecentShifts] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalMenu: 0,
    totalCategories: 0,
    outOfStock: 0,
    totalReviews: 0,
    totalOrders: 0,
    revenue: 0,
    totalExpenses: 0,
    netProfit: 0,
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
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // --- FUNGSI UTAMA: FETCH DATA ---
  const fetchData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);

      const [
        menuRes,
        categoryRes,
        stockRes,
        reviewRes,
        ordersRes,
        recentRes,
        activeOrdersRes,
        topItemsRes,
        configRes,
        shiftsRes,
        expensesRes,
      ] = await Promise.all([
        supabase.from("menu_items").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase
          .from("menu_items")
          .select("*", { count: "exact", head: true })
          .eq("is_available", false),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total_price, created_at, status"),
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8), // Limit 8 agar pas layout
        supabase
          .from("orders")
          .select("status, table_number")
          .neq("status", "completed")
          .neq("status", "cancelled"),
        supabase.from("order_items").select("menu_name, qty").limit(100),
        supabase.from("store_config").select("*").single(),
        supabase
          .from("shifts")
          .select("*, admins(username)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("expenses").select("amount"),
      ]);

      // Calculations
      const allOrders = ordersRes.data || [];
      const totalRevenue = allOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((acc, curr) => acc + (curr.total_price || 0), 0);
      const totalExpenses = (expensesRes.data || []).reduce(
        (acc, curr) => acc + (curr.amount || 0),
        0,
      );
      const netProfit = totalRevenue - totalExpenses;

      // Trend (Simplifikasi)
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isSameDay = (d1: Date, d2: Date) =>
        d1.toDateString() === d2.toDateString();
      const todayRev = allOrders
        .filter((o) => isSameDay(new Date(o.created_at), today))
        .reduce((a, b) => a + b.total_price, 0);
      const yestRev = allOrders
        .filter((o) => isSameDay(new Date(o.created_at), yesterday))
        .reduce((a, b) => a + b.total_price, 0);
      const revenueTrend =
        yestRev === 0
          ? todayRev > 0
            ? 100
            : 0
          : ((todayRev - yestRev) / yestRev) * 100;

      // Active Status
      const activeData = activeOrdersRes.data || [];
      const tables = new Set(
        activeData
          .filter((o) => o.table_number !== "Takeaway")
          .map((o) => o.table_number),
      );

      // Top Items
      const itemCounts: Record<string, number> = {};
      (topItemsRes.data || []).forEach((item: any) => {
        itemCounts[item.menu_name] =
          (itemCounts[item.menu_name] || 0) + item.qty;
      });
      const sortedTopItems = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      // Store Status
      let isOpen = false;
      if (configRes.data) {
        const nowStr = `${today.getHours().toString().padStart(2, "0")}:${today.getMinutes().toString().padStart(2, "0")}`;
        isOpen =
          nowStr >= configRes.data.open_hour &&
          nowStr <= configRes.data.close_hour;
      }

      const newStats = {
        totalMenu: menuRes.count || 0,
        totalCategories: categoryRes.count || 0,
        outOfStock: stockRes.count || 0,
        totalReviews: reviewRes.count || 0,
        totalOrders: allOrders.length,
        revenue: totalRevenue,
        totalExpenses,
        netProfit,
        revenueTrend,
        avgOrderValue: 0,
        cancelRate: 0,
      };

      setStats(newStats);
      setRawDataOrders(allOrders);
      setRecentOrders(recentRes.data || []);
      setRecentShifts(shiftsRes.data || []);
      setOrderSummary({
        pending: activeData.filter((o) => o.status === "pending").length,
        cooking: activeData.filter((o) => o.status === "cooking").length,
        ready: activeData.filter((o) => o.status === "ready").length,
      });
      setActiveTables(tables.size);
      setTopItems(sortedTopItems);
      setIsStoreOpen(isOpen);

      // Caching
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          stats: newStats,
          rawDataOrders: allOrders,
          recentOrders: recentRes.data,
          recentShifts: shiftsRes.data,
          orderSummary: { pending: 0, cooking: 0, ready: 0 },
          activeTables: tables.size,
          topItems: sortedTopItems,
          isStoreOpen: isOpen,
        }),
      );

      if (showToast) toast.success("Data diperbarui");
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // --- CHART LOGIC (Memoized) ---
  const chartData = useMemo(() => {
    if (!rawDataOrders.length) return [];
    const now = new Date();
    let dataPoints: { label: string; value: number; date: Date }[] = [];

    // Logic 7 Hari (Default)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      dataPoints.push({
        label: d.toLocaleDateString("id-ID", { weekday: "short" }),
        value: 0,
        date: d,
      });
    }

    rawDataOrders.forEach((order) => {
      if (order.status === "cancelled") return;
      const d = new Date(order.created_at);
      // Logic simple untuk 7 hari terakhir
      if (timeRange === "7d") {
        const key = d.toDateString();
        const found = dataPoints.find((p) => p.date.toDateString() === key);
        if (found) found.value += order.total_price;
      }
      // ... (Logic 30d/1y bisa ditambahkan jika perlu, diminimalisir agar ringan)
    });

    const maxValue = Math.max(...dataPoints.map((d) => d.value), 1);
    return dataPoints.map((d) => ({
      ...d,
      height: (d.value / maxValue) * 100,
    }));
  }, [rawDataOrders, timeRange]);

  // --- INIT & REALTIME ---
  useEffect(() => {
    // Load Cache First (Instant Load)
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setStats(data.stats);
          setRawDataOrders(data.rawDataOrders);
          setRecentOrders(data.recentOrders);
          setIsLoading(false);
        } catch (e) {}
      }
    }
    fetchData();

    // Debounced Realtime Listener (Agar tidak lag jika order banyak masuk sekaligus)
    let timeout: NodeJS.Timeout;
    const channel = supabase
      .channel("dashboard-optimized")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => fetchData(), 2000); // Tunggu 2 detik
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/80 p-5 rounded-3xl border border-white/5 backdrop-blur-md shadow-xl sticky top-0 z-30">
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
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex-1 md:flex-none bg-red-600 hover:bg-red-500 text-white h-9 rounded-xl font-bold shadow-lg shadow-red-900/20 text-xs"
          >
            <PlusCircle size={14} className="mr-2" /> Catat Pengeluaran
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

      {/* FINANCE STATS (Clean Grid) */}
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
          title="Laba Bersih"
          value={formatRupiah(stats.netProfit)}
          icon={Award}
          color="text-blue-500"
          bg="bg-blue-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Pengeluaran"
          value={formatRupiah(stats.totalExpenses)}
          icon={Wallet}
          color="text-red-500"
          bg="bg-red-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Total Pesanan"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="text-orange-500"
          bg="bg-orange-500/10"
          loading={isLoading}
        />
      </div>

      {/* QUICK STATUS */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            l: "Pending",
            v: orderSummary.pending,
            c: "text-blue-500",
            bg: "bg-blue-500/10",
            i: Clock,
          },
          {
            l: "Dimasak",
            v: orderSummary.cooking,
            c: "text-orange-500",
            bg: "bg-orange-500/10",
            i: ChefHat,
          },
          {
            l: "Meja Isi",
            v: activeTables,
            c: "text-emerald-500",
            bg: "bg-emerald-500/10",
            i: Utensils,
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`${s.bg} border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden`}
          >
            <span className={`text-2xl font-black ${s.c} z-10`}>{s.v}</span>
            <span
              className={`text-[10px] ${s.c} opacity-70 uppercase tracking-wider font-bold mt-1 z-10`}
            >
              {s.l}
            </span>
            <s.i
              className={`absolute -right-2 -bottom-2 opacity-10 h-16 w-16 ${s.c}`}
            />
          </div>
        ))}
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Section */}
          <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col h-[320px] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 z-10 gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" /> Statistik
                  Pendapatan
                </h3>
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
            {/* Chart Bars */}
            <div className="flex-1 flex items-end justify-between gap-2 z-10 px-1">
              {chartData.length > 0 ? (
                chartData.map((d, i) => (
                  <TooltipProvider key={i}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full bg-zinc-800/30 rounded-t-lg relative group hover:bg-zinc-800/50 transition-colors h-full flex flex-col justify-end cursor-pointer">
                          <div
                            className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-all duration-700 ease-out group-hover:from-emerald-500 group-hover:to-emerald-300 relative"
                            style={{ height: `${d.height || 2}%` }}
                          />
                          <span className="text-[8px] text-zinc-600 text-center mt-2 font-mono">
                            {d.label}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-950 border-zinc-800 text-white text-xs font-bold">
                        <p>{d.date.toLocaleDateString()}</p>
                        <p className="text-emerald-500">
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
          </div>

          {/* Laporan Shift */}
          <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={16} className="text-purple-500" /> Laporan Shift
              (Audit)
            </h3>
            <div className="space-y-3">
              {recentShifts.length > 0 ? (
                recentShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="bg-zinc-950/50 p-3 rounded-xl border border-white/5 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-2">
                        {shift.admins?.username || "Kasir"}{" "}
                        <span className="text-[9px] font-normal text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                          {new Date(shift.created_at).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Sys: {formatCompactNumber(shift.end_cash_system)} | Akt:{" "}
                        {formatCompactNumber(shift.end_cash_actual)}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border ${shift.difference < 0 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"}`}
                    >
                      {shift.difference < 0 ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}{" "}
                      {shift.difference === 0
                        ? "Pas"
                        : formatRupiah(shift.difference)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-xs text-center py-4">
                  Belum ada data shift.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Recent Orders (Fixed Scrollbar) */}
          <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 flex flex-col h-[500px] shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Pesanan Terbaru
              </h3>
              <ArrowRight size={14} className="text-zinc-600" />
            </div>

            {/* CSS TRICK: Hide Scrollbar */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex gap-3 items-center p-3 rounded-2xl bg-zinc-950/30 border border-white/5 hover:border-emerald-500/20 transition-all group relative overflow-hidden"
                  >
                    <div
                      className={`w-1 absolute left-0 top-2 bottom-2 rounded-r-full ${order.status === "ready" ? "bg-green-500" : order.status === "cooking" ? "bg-blue-500" : "bg-yellow-500"}`}
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-mono font-bold text-zinc-500">
                          {order.order_code || `#${order.id}`}
                        </span>
                        <span className="text-[9px] text-zinc-600">
                          {timeAgo(order.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 font-bold truncate">
                        {order.customer_name}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {order.table_number === "Takeaway"
                          ? "Takeaway"
                          : `Meja ${order.table_number}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-500">
                        {formatCompactNumber(order.total_price)}
                      </p>
                      <span className="text-[9px] text-zinc-600 capitalize">
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                  <AlertCircle size={32} className="opacity-20 mb-2" />
                  <span className="text-xs">Belum ada pesanan</span>
                </div>
              )}
            </div>
          </div>

          {/* Top Menu (Moved Here for Balance) */}
          <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Award size={16} className="text-yellow-500" /> Menu Terlaris
            </h3>
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div
                  key={i}
                  className="bg-zinc-950/50 p-2 rounded-xl border border-white/5 flex items-center gap-3"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400"}`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {item.name}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}

// Compact Stat Card
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
