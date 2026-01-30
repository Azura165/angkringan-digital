"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  CheckCircle2,
  Clock,
  ChefHat,
  Printer,
  DollarSign,
  Utensils,
  MapPin,
  Calendar,
  Volume2,
  VolumeX,
  Power,
  Eye,
  Wallet,
  QrCode,
  Download,
  ListChecks,
  AlertTriangle,
  Wifi,
  WifiOff,
  Smartphone,
  User,
  ChevronDown,
  Loader2,
  XCircle,
  FileWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
interface OrderItem {
  id: number;
  menu_name: string;
  price: number;
  qty: number;
  note?: string;
}

interface Order {
  id: number;
  order_code?: string;
  created_at: string;
  customer_name: string;
  table_number: string;
  total_price: number;
  status: "pending" | "cooking" | "ready" | "completed" | "cancelled";
  payment_status: "paid" | "unpaid";
  payment_method: string;
  items?: OrderItem[];
}

const ITEMS_PER_PAGE = 15; // Limit data agar ringan

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

const getTimeAgo = (dateStr: string) => {
  const diff = Math.floor(
    (new Date().getTime() - new Date(dateStr).getTime()) / 60000,
  );
  return diff;
};

// --- COMPONENT: ORDER CARD ---
const OrderCard = memo(
  ({
    order,
    onDetail,
    onUpdateStatus,
    kitchenMode,
    isProcessing,
  }: {
    order: Order;
    onDetail: (order: Order) => void;
    onUpdateStatus: (id: number, status: string, pay?: boolean) => void;
    kitchenMode: boolean;
    isProcessing: boolean;
  }) => {
    const statusColor = {
      pending: "border-yellow-500/50 bg-yellow-500/5 hover:bg-yellow-500/10",
      cooking: "border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10",
      ready: "border-green-500/50 bg-green-500/5 hover:bg-green-500/10",
      completed: "border-zinc-800 bg-zinc-900 opacity-75",
      cancelled: "border-red-900/50 bg-red-900/10 opacity-60",
    }[order.status];

    const minutesAgo = getTimeAgo(order.created_at);
    const isLate =
      order.status !== "completed" &&
      order.status !== "cancelled" &&
      minutesAgo > 30;

    const progressPercent = Math.min((minutesAgo / 45) * 100, 100);
    const progressColor =
      minutesAgo < 15
        ? "bg-green-500"
        : minutesAgo < 30
          ? "bg-yellow-500"
          : "bg-red-500";

    return (
      <div
        onClick={() => onDetail(order)}
        className={`relative rounded-2xl border cursor-pointer transition-all duration-300 active:scale-[0.98] flex flex-col justify-between h-full group overflow-hidden ${statusColor} ${kitchenMode ? "p-5" : "p-4"}`}
      >
        {/* Visual Timer Bar */}
        {order.status !== "completed" && order.status !== "cancelled" && (
          <div className="absolute bottom-0 left-0 h-1 w-full bg-zinc-800/50">
            <div
              className={`h-full ${progressColor} transition-all duration-1000 ease-out`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-orange-500 bg-orange-500/10 px-1.5 rounded">
                {order.order_code || `#${order.id}`}
              </span>
              {order.table_number === "Takeaway" ? (
                <Smartphone size={10} className="text-zinc-500" />
              ) : (
                <User size={10} className="text-zinc-500" />
              )}
            </div>
            <h3
              className={`font-bold text-white leading-tight line-clamp-1 ${kitchenMode ? "text-xl" : "text-lg"}`}
            >
              {order.customer_name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
              <span
                className={`flex items-center gap-1 ${isLate ? "text-red-500 font-bold animate-pulse" : ""}`}
              >
                <Clock size={12} /> {minutesAgo} mnt
              </span>
              <span className="w-px h-3 bg-zinc-700" />
              <span
                className={`${order.table_number === "Takeaway" ? "text-orange-400" : "text-zinc-300"} font-bold flex items-center gap-1`}
              >
                <MapPin size={12} /> {order.table_number}
              </span>
            </div>
          </div>
          <Badge
            variant={
              order.status === "pending"
                ? "warning"
                : order.status === "ready"
                  ? "success"
                  : "secondary"
            }
          >
            {order.status.toUpperCase()}
          </Badge>
        </div>

        {/* Items Preview */}
        <div
          className={`flex-1 space-y-1.5 mb-4 border-t border-dashed border-white/10 pt-3 ${kitchenMode ? "text-sm" : "text-xs"}`}
        >
          {order.items?.slice(0, kitchenMode ? 10 : 3).map((item, i) => (
            <div key={i} className="flex justify-between text-zinc-300">
              <span className="flex gap-2">
                <span
                  className={`font-bold ${kitchenMode ? "text-orange-400" : "text-zinc-500"}`}
                >
                  x{item.qty}
                </span>
                <span className="line-clamp-1">{item.menu_name}</span>
              </span>
            </div>
          ))}
          {!kitchenMode && (order.items?.length || 0) > 3 && (
            <p className="text-[10px] text-zinc-500 italic">
              + {(order.items?.length || 0) - 3} lainnya...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto relative z-10">
          {!kitchenMode && (
            <div className="flex justify-between items-center mb-3">
              <p className="font-black text-white text-base">
                {formatRupiah(order.total_price)}
              </p>
              <div
                className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 ${order.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
              >
                {order.payment_method === "qris" ? (
                  <QrCode size={10} />
                ) : (
                  <Wallet size={10} />
                )}
                {order.payment_status === "paid" ? "LUNAS" : "BELUM"}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {order.status === "pending" && (
              <Button
                disabled={isProcessing}
                size={kitchenMode ? "lg" : "sm"}
                className="w-full bg-blue-600 hover:bg-blue-500 font-bold transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(order.id, "cooking");
                }}
              >
                <ChefHat size={16} className="mr-2" /> Masak
              </Button>
            )}
            {order.status === "cooking" && (
              <Button
                disabled={isProcessing}
                size={kitchenMode ? "lg" : "sm"}
                className="w-full bg-orange-600 hover:bg-orange-500 font-bold transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(order.id, "ready");
                }}
              >
                <CheckCircle2 size={16} className="mr-2" /> Siap
              </Button>
            )}
            {order.status === "ready" && (
              <Button
                disabled={isProcessing}
                size={kitchenMode ? "lg" : "sm"}
                className="w-full bg-green-600 hover:bg-green-500 font-bold transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(order.id, "completed", true);
                }}
              >
                <DollarSign size={16} className="mr-2" /> Selesai
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  },
);
OrderCard.displayName = "OrderCard";

// --- MAIN PAGE ---
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeTab, setActiveTab] = useState("active");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isMuted, setIsMuted] = useState(false);
  const [kitchenMode, setKitchenMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedMute = localStorage.getItem("admin_mute");
    const savedKitchen = localStorage.getItem("admin_kitchen");
    if (savedMute) setIsMuted(JSON.parse(savedMute));
    if (savedKitchen) setKitchenMode(JSON.parse(savedKitchen));
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    localStorage.setItem("admin_mute", JSON.stringify(!isMuted));
  };
  const toggleKitchen = () => {
    setKitchenMode(!kitchenMode);
    localStorage.setItem("admin_kitchen", JSON.stringify(!kitchenMode));
  };

  // --- FETCH ORDERS ---
  const fetchOrders = useCallback(
    async (reset = false) => {
      if (reset) {
        setIsLoading(true);
        setPage(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const from = reset ? 0 : (page + 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`*, order_items(*)`)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!error && ordersData) {
        const formatted = ordersData.map((o: any) => ({
          ...o,
          items: o.order_items,
        }));

        if (reset) setOrders(formatted);
        else {
          setOrders((prev) => {
            const existingIds = new Set(prev.map((o) => o.id));
            return [
              ...prev,
              ...formatted.filter((o) => !existingIds.has(o.id)),
            ];
          });
          setPage((prev) => prev + 1);
        }

        if (ordersData.length < ITEMS_PER_PAGE) setHasMore(false);
        setIsConnected(true);
      } else {
        setIsConnected(false);
        toast.error("Gagal koneksi ke database.");
      }

      setIsLoading(false);
      setLoadingMore(false);
    },
    [page],
  );

  // --- AUTO CANCEL (>24H) ---
  const autoCancelOldOrders = async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("status", "pending")
      .lt("created_at", yesterday);
  };

  // --- REALTIME SETUP ---
  useEffect(() => {
    fetchOrders(true);
    autoCancelOldOrders();
    audioRef.current = new Audio("/sounds/notification.mp3");

    // LISTEN ALL EVENTS (INSERT + UPDATE)
    const channel = supabase
      .channel("realtime-orders-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // New Order
            if (!isMuted && audioRef.current)
              audioRef.current.play().catch(() => {});
            toast("Order Masuk!", {
              description: `Meja ${payload.new.table_number}`,
              icon: "🔔",
            });
            const { data } = await supabase
              .from("orders")
              .select(`*, order_items(*)`)
              .eq("id", payload.new.id)
              .single();
            if (data)
              setOrders((prev) => [
                { ...data, items: data.order_items },
                ...prev,
              ]);
          } else if (payload.eventType === "UPDATE") {
            // Update Status (Sync antar admin/device)
            setOrders((prev) =>
              prev.map((o) =>
                o.id === payload.new.id ? { ...o, ...payload.new } : o,
              ),
            );
          }
        },
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- ACTIONS ---
  const handleUpdateStatus = async (
    id: number,
    newStatus: string,
    isPayment = false,
  ) => {
    setIsProcessing(true);
    const oldOrders = [...orders];

    // Optimistic Update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status: newStatus as any,
              payment_status: isPayment ? "paid" : o.payment_status,
            }
          : o,
      ),
    );

    const updatePayload: any = { status: newStatus };
    if (isPayment) updatePayload.payment_status = "paid";

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      setOrders(oldOrders); // Rollback
      console.error("Update Error:", error);
      toast.error("Gagal update status. Cek izin DB.");
    } else {
      toast.success(`Status: ${newStatus.toUpperCase()}`);
      if (["completed", "cancelled"].includes(newStatus))
        setIsDetailOpen(false);
    }
    setIsProcessing(false);
  };

  const filteredOrders = useMemo(() => {
    let data = orders;
    if (activeTab === "active")
      data = data.filter((o) =>
        ["pending", "cooking", "ready"].includes(o.status),
      );
    else if (activeTab === "history")
      data = data.filter((o) => ["completed"].includes(o.status));
    else if (activeTab === "cancelled")
      data = data.filter((o) => ["cancelled"].includes(o.status));

    if (activeTab === "active" && statusFilter !== "all")
      data = data.filter((o) => o.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(q) ||
          o.table_number.toLowerCase().includes(q) ||
          (o.order_code && o.order_code.toLowerCase().includes(q)),
      );
    }

    if (activeTab === "active") {
      data.sort((a, b) => {
        const priority: Record<string, number> = {
          pending: 0,
          cooking: 1,
          ready: 2,
        };
        return (priority[a.status] || 0) - (priority[b.status] || 0);
      });
    }
    return data;
  }, [orders, activeTab, searchQuery, statusFilter]);

  const kitchenSummary = useMemo(() => {
    const activeItems = orders
      .filter((o) => ["pending", "cooking"].includes(o.status))
      .flatMap((o) => o.items || []);
    const summary: Record<string, number> = {};
    activeItems.forEach((item) => {
      summary[item.menu_name] = (summary[item.menu_name] || 0) + item.qty;
    });
    return Object.entries(summary).sort(([, a], [, b]) => b - a);
  }, [orders]);

  const handlePrint = () => {
    window.print();
  };
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todaysOrders = orders.filter(
      (o) => o.created_at.startsWith(today) && o.status !== "cancelled",
    );
    return {
      revenue: todaysOrders.reduce((acc, curr) => acc + curr.total_price, 0),
      count: todaysOrders.length,
    };
  }, [orders]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 md:pt-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Riwayat Order
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${isConnected ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"}`}
              >
                {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}{" "}
                {isConnected ? "Live" : "Offline"}
              </div>
            </h2>
            <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500 mt-1">
              <span>
                🗓️ Hari ini: <b>{stats.count}</b> Order
              </span>
              <span className="text-green-500">
                💵 Omzet: {formatRupiah(stats.revenue)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSummary(true)}
              className="border-zinc-800 text-zinc-300 relative"
              title="Rekap Dapur"
            >
              <ListChecks size={16} />{" "}
              {kitchenSummary.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleMute}
              className={`border-zinc-800 ${isMuted ? "text-red-500" : "text-green-500"}`}
              title={isMuted ? "Suara Mati" : "Suara Hidup"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleKitchen}
              className={`border-zinc-800 ${kitchenMode ? "bg-orange-500/20 text-orange-500 border-orange-500" : "text-zinc-400"}`}
              title="Mode Dapur"
            >
              <Eye size={16} className="mr-2" />{" "}
              {kitchenMode ? "Normal" : "Dapur"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="bg-zinc-900 p-1 rounded-xl flex gap-1 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => {
                  setActiveTab("active");
                  setStatusFilter("all");
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === "active" ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg" : "text-zinc-400 hover:text-white"}`}
              >
                🔥 Aktif (
                {
                  orders.filter((o) =>
                    ["pending", "cooking", "ready"].includes(o.status),
                  ).length
                }
                )
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === "history" ? "bg-zinc-800 text-white shadow-md border border-zinc-700" : "text-zinc-400 hover:text-white"}`}
              >
                ✅ Selesai
              </button>
              <button
                onClick={() => setActiveTab("cancelled")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === "cancelled" ? "bg-red-900/20 text-red-400 border border-red-900/50" : "text-zinc-400 hover:text-white"}`}
              >
                🚫 Batal
              </button>
            </div>
            <div className="relative flex-1 sm:max-w-xs group">
              <Search
                size={14}
                className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-orange-500 transition-colors"
              />
              <Input
                placeholder="Cari..."
                className="pl-9 bg-zinc-900 border-zinc-800 rounded-xl h-10 text-xs focus:ring-orange-500 transition-all focus:bg-zinc-900/80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {activeTab === "active" && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors whitespace-nowrap ${statusFilter === "all" ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors whitespace-nowrap flex items-center gap-1 ${statusFilter === "pending" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{" "}
                Pending
              </button>
              <button
                onClick={() => setStatusFilter("cooking")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors whitespace-nowrap flex items-center gap-1 ${statusFilter === "cooking" ? "bg-blue-500/20 text-blue-500 border-blue-500" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{" "}
                Dimasak
              </button>
              <button
                onClick={() => setStatusFilter("ready")}
                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors whitespace-nowrap flex items-center gap-1 ${statusFilter === "ready" ? "bg-green-500/20 text-green-500 border-green-500" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Siap
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className={`grid gap-4 ${kitchenMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}
      >
        {isLoading && orders.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-zinc-900 rounded-2xl animate-pulse"
              />
            ))
          : filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onDetail={() => {
                  requestAnimationFrame(() => {
                    setSelectedOrder(order);
                    setIsDetailOpen(true);
                  });
                }}
                onUpdateStatus={handleUpdateStatus}
                kitchenMode={kitchenMode}
                isProcessing={isProcessing}
              />
            ))}
      </div>

      {!isLoading && filteredOrders.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
          <div className="bg-zinc-900 p-6 rounded-full mb-4 border border-zinc-800">
            <Utensils size={40} className="opacity-30" />
          </div>
          <p className="text-sm font-medium">Tidak ada pesanan.</p>
        </div>
      )}

      {hasMore && !searchQuery && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={() => fetchOrders(false)}
            disabled={loadingMore}
            className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
          >
            {loadingMore ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : (
              <ChevronDown className="mr-2" size={16} />
            )}{" "}
            Muat Lebih Banyak
          </Button>
        </div>
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto print:bg-white print:text-black shadow-2xl shadow-black/90">
          <DialogHeader className="border-b border-dashed border-zinc-800 pb-4">
            <DialogTitle className="flex justify-between items-center text-xl">
              <span className="font-mono">
                {selectedOrder?.order_code || `#${selectedOrder?.id}`}
              </span>
              <Badge
                variant="outline"
                className="border-orange-500 text-orange-500"
              >
                {selectedOrder?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 flex items-center gap-2 text-xs">
              <Calendar size={12} />{" "}
              {selectedOrder &&
                new Date(selectedOrder.created_at).toLocaleString("id-ID")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2" id="printable-area">
            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl print:bg-transparent print:p-0">
              <div>
                <p className="font-bold text-lg text-white print:text-black">
                  {selectedOrder?.customer_name}
                </p>
                <div className="flex items-center gap-1 text-zinc-400 text-xs print:text-gray-600 mt-1">
                  <MapPin size={12} />{" "}
                  {selectedOrder?.table_number === "Takeaway"
                    ? "Bungkus"
                    : `Meja ${selectedOrder?.table_number}`}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">Metode</p>
                <div className="flex items-center gap-1 justify-end font-bold text-sm">
                  {selectedOrder?.payment_method === "qris" ? (
                    <QrCode size={14} />
                  ) : (
                    <Wallet size={14} />
                  )}{" "}
                  <span className="uppercase">
                    {selectedOrder?.payment_method}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {selectedOrder?.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-sm items-start border-b border-zinc-900 pb-2 last:border-0"
                >
                  <div className="flex gap-3">
                    <span className="font-bold text-orange-500 min-w-[24px]">
                      x{item.qty}
                    </span>
                    <div>
                      <span className="text-zinc-200 print:text-black font-medium">
                        {item.menu_name}
                      </span>
                      {item.note && (
                        <p className="text-[10px] text-zinc-500 italic mt-0.5 bg-zinc-900 px-2 py-0.5 rounded w-fit">
                          📝 {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-400 print:text-black">
                    {formatRupiah(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex justify-between items-center print:border-black print:bg-transparent">
              <span className="font-bold text-orange-200 print:text-black">
                TOTAL
              </span>
              <span className="font-black text-2xl text-orange-500 print:text-black">
                {selectedOrder && formatRupiah(selectedOrder.total_price)}
              </span>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col print:hidden pt-2">
            {selectedOrder?.status !== "completed" &&
              selectedOrder?.status !== "cancelled" && (
                <>
                  {selectedOrder?.status === "pending" && (
                    <Button
                      disabled={isProcessing}
                      onClick={() =>
                        selectedOrder &&
                        handleUpdateStatus(selectedOrder.id, "cooking")
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-12 text-lg"
                    >
                      <ChefHat size={20} className="mr-2" /> Terima & Masak
                    </Button>
                  )}
                  {selectedOrder?.status === "cooking" && (
                    <Button
                      disabled={isProcessing}
                      onClick={() =>
                        selectedOrder &&
                        handleUpdateStatus(selectedOrder.id, "ready")
                      }
                      className="w-full bg-orange-600 hover:bg-orange-700 font-bold h-12 text-lg"
                    >
                      <CheckCircle2 size={20} className="mr-2" /> Pesanan Siap!
                    </Button>
                  )}
                  {selectedOrder?.status === "ready" && (
                    <Button
                      disabled={isProcessing}
                      onClick={() =>
                        selectedOrder &&
                        handleUpdateStatus(selectedOrder.id, "completed", true)
                      }
                      className="w-full bg-green-600 hover:bg-green-700 font-bold h-12 text-lg"
                    >
                      <DollarSign size={20} className="mr-2" /> Selesai & Bayar
                    </Button>
                  )}
                </>
              )}
            <div className="flex gap-2 w-full mt-2">
              {selectedOrder?.status === "completed" && (
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex-1 border-zinc-700 hover:bg-zinc-800"
                >
                  <Printer size={16} className="mr-2" /> Cetak Struk
                </Button>
              )}
              {selectedOrder?.status !== "cancelled" &&
                selectedOrder?.status !== "completed" && (
                  <Button
                    variant="destructive"
                    onClick={() =>
                      selectedOrder &&
                      handleUpdateStatus(selectedOrder.id, "cancelled")
                    }
                    className="flex-1 bg-red-900/30 text-red-400 hover:bg-red-900 border border-red-900"
                  >
                    Batalkan
                  </Button>
                )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
