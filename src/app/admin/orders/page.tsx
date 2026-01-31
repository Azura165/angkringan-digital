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
  Wallet,
  QrCode,
  ListChecks,
  Wifi,
  WifiOff,
  Smartphone,
  User,
  ChevronDown,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  Zap,
  Volume2,
  VolumeX,
  Play,
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

const ITEMS_PER_PAGE = 50;
const CACHE_KEY = "admin_orders_cache_v1"; // Kunci penyimpanan cache

// --- HELPERS ---
const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

const getTimeAgo = (dateStr: string) => {
  const now = new Date();
  const created = new Date(dateStr);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} mnt`;
  if (diffHours < 24) return `${diffHours} jam`;
  return `${diffDays} hari`;
};

// --- SUB-COMPONENT: ORDER CARD (MEMOIZED) ---
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
    const statusConfig = {
      pending: {
        color: "border-yellow-500/50 bg-yellow-500/5",
        badge: "destructive",
      },
      cooking: { color: "border-blue-500/50 bg-blue-500/5", badge: "default" },
      ready: { color: "border-green-500/50 bg-green-500/5", badge: "success" },
      completed: {
        color: "border-zinc-800 bg-zinc-900 opacity-60",
        badge: "secondary",
      },
      cancelled: {
        color: "border-red-900/50 bg-red-900/10 opacity-60",
        badge: "destructive",
      },
    }[order.status] || { color: "border-zinc-800", badge: "secondary" };

    const timeString = getTimeAgo(order.created_at);
    const isLate =
      (order.status === "pending" &&
        (timeString.includes("jam") || parseInt(timeString) > 15)) ||
      (order.status === "cooking" &&
        (timeString.includes("jam") || parseInt(timeString) > 30));

    const handleCopyID = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(order.order_code || `#${order.id}`);
        toast.success("Kode disalin!");
      },
      [order.order_code, order.id],
    );

    const handleAction = useCallback(
      (e: React.MouseEvent, status: string, pay?: boolean) => {
        e.stopPropagation();
        onUpdateStatus(order.id, status, pay);
      },
      [order.id, onUpdateStatus],
    );

    return (
      <div
        onClick={() => onDetail(order)}
        className={`relative rounded-2xl border cursor-pointer transition-all duration-200 hover:border-zinc-600 active:scale-[0.99] flex flex-col justify-between h-full group overflow-hidden ${statusConfig.color} ${kitchenMode ? "p-5" : "p-4"}`}
      >
        {["pending", "cooking", "ready"].includes(order.status) && (
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 ${order.status === "ready" ? "bg-green-500" : order.status === "cooking" ? "bg-blue-500" : "bg-yellow-500"}`}
          />
        )}

        <div className="flex justify-between items-start mb-3 pl-2">
          <div className="flex flex-col min-w-0">
            <div
              onClick={handleCopyID}
              className="flex items-center gap-1.5 mb-0.5 cursor-copy hover:opacity-70 w-fit"
            >
              <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 bg-zinc-900 px-1.5 rounded border border-zinc-800">
                {order.order_code || `#${order.id}`}
              </span>
              {order.table_number === "Takeaway" ? (
                <Smartphone size={10} className="text-zinc-600" />
              ) : (
                <User size={10} className="text-zinc-600" />
              )}
            </div>
            <h3
              className={`font-bold text-white leading-tight truncate ${kitchenMode ? "text-xl" : "text-lg"}`}
            >
              {order.customer_name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
              <span
                className={`flex items-center gap-1 ${isLate ? "text-red-500 font-bold animate-pulse" : ""}`}
              >
                <Clock size={12} /> {timeString}
              </span>
              <span className="w-px h-3 bg-zinc-700" />
              <span
                className={`${order.table_number === "Takeaway" ? "text-orange-400" : "text-zinc-300"} font-bold flex items-center gap-1`}
              >
                <MapPin size={12} />{" "}
                {order.table_number === "Takeaway"
                  ? "Bungkus"
                  : `Meja ${order.table_number}`}
              </span>
            </div>
          </div>
          <Badge
            variant={order.status === "pending" ? "destructive" : "secondary"}
            className="uppercase text-[10px] shrink-0"
          >
            {order.status}
          </Badge>
        </div>

        <div
          className={`flex-1 space-y-2 mb-4 border-t border-dashed border-white/10 pt-3 pl-2 ${kitchenMode ? "text-sm" : "text-xs"}`}
        >
          {order.items?.slice(0, kitchenMode ? 8 : 3).map((item, i) => (
            <div key={i} className="flex flex-col">
              <div className="flex justify-between text-zinc-300">
                <span className="flex gap-2">
                  <span
                    className={`font-bold ${kitchenMode ? "text-orange-400" : "text-zinc-500"}`}
                  >
                    x{item.qty}
                  </span>
                  <span className="line-clamp-1">{item.menu_name}</span>
                </span>
              </div>
              {item.note && (
                <div className="ml-6 text-[10px] text-yellow-500/80 italic">
                  📝 {item.note}
                </div>
              )}
            </div>
          ))}
          {(order.items?.length || 0) > (kitchenMode ? 8 : 3) && (
            <p className="text-[10px] text-zinc-500 italic pl-6">
              + {(order.items?.length || 0) - (kitchenMode ? 8 : 3)} lainnya...
            </p>
          )}
        </div>

        <div className="mt-auto relative z-10 pl-2">
          {!kitchenMode && (
            <div className="flex justify-between items-center mb-3 bg-black/20 p-2 rounded-lg">
              <p className="font-black text-white text-sm">
                {formatRupiah(order.total_price)}
              </p>
              <div
                className={`text-[9px] px-2 py-0.5 rounded font-bold flex items-center gap-1 ${order.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
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
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-500 font-bold shadow-lg"
                onClick={(e) => handleAction(e, "cooking")}
              >
                <ChefHat size={16} className="mr-2" /> Masak
              </Button>
            )}
            {order.status === "cooking" && (
              <Button
                disabled={isProcessing}
                size="sm"
                className="w-full bg-orange-600 hover:bg-orange-500 font-bold shadow-lg"
                onClick={(e) => handleAction(e, "ready")}
              >
                <CheckCircle2 size={16} className="mr-2" /> Siap
              </Button>
            )}
            {order.status === "ready" && (
              <Button
                disabled={isProcessing}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-500 font-bold shadow-lg"
                onClick={(e) => handleAction(e, "completed", true)}
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

// --- MODALS (ISOLATED) ---
const OrderDetailModal = memo(
  ({ isOpen, onClose, order, onUpdate, onDelete, isProcessing }: any) => {
    if (!order) return null;
    const handlePrint = () => window.print();
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto print:bg-white print:text-black shadow-2xl">
          <DialogHeader className="border-b border-dashed border-zinc-800 pb-4">
            <DialogTitle className="flex justify-between items-center text-xl">
              <span className="font-mono text-zinc-300">
                {order.order_code || `#${order.id}`}
              </span>
              <Badge
                variant="outline"
                className="border-orange-500 text-orange-500"
              >
                {order.status}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 flex items-center gap-2 text-xs">
              <Calendar size={12} />{" "}
              {new Date(order.created_at).toLocaleString("id-ID")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2" id="printable-area">
            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl print:bg-transparent print:p-0">
              <div>
                <p className="font-bold text-lg text-white print:text-black">
                  {order.customer_name}
                </p>
                <div className="flex items-center gap-1 text-zinc-400 text-xs print:text-gray-600 mt-1">
                  <MapPin size={12} />{" "}
                  {order.table_number === "Takeaway"
                    ? "Bungkus"
                    : `Meja ${order.table_number}`}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">Metode</p>
                <div className="flex items-center gap-1 justify-end font-bold text-sm">
                  {order.payment_method === "qris" ? (
                    <QrCode size={14} />
                  ) : (
                    <Wallet size={14} />
                  )}{" "}
                  <span className="uppercase">{order.payment_method}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {order.items?.map((item: any, idx: number) => (
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
                        <div className="text-[10px] text-zinc-500 italic">
                          📝 {item.note}
                        </div>
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
                {formatRupiah(order.total_price)}
              </span>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col print:hidden pt-2">
            {order.status === "pending" && (
              <Button
                disabled={isProcessing}
                onClick={() => onUpdate(order.id, "cooking")}
                className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-12 text-lg"
              >
                <ChefHat size={20} className="mr-2" /> Terima & Masak
              </Button>
            )}
            {order.status === "cooking" && (
              <Button
                disabled={isProcessing}
                onClick={() => onUpdate(order.id, "ready")}
                className="w-full bg-orange-600 hover:bg-orange-700 font-bold h-12 text-lg"
              >
                <CheckCircle2 size={20} className="mr-2" /> Pesanan Siap!
              </Button>
            )}
            {order.status === "ready" && (
              <Button
                disabled={isProcessing}
                onClick={() => onUpdate(order.id, "completed", true)}
                className="w-full bg-green-600 hover:bg-green-700 font-bold h-12 text-lg"
              >
                <DollarSign size={20} className="mr-2" /> Selesai & Bayar
              </Button>
            )}
            <div className="flex gap-2 w-full mt-2">
              {order.status === "completed" && (
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex-1 border-zinc-700 hover:bg-zinc-800"
                >
                  <Printer size={16} className="mr-2" /> Cetak Struk
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={onDelete}
                className="flex-1 bg-red-900/30 text-red-400 hover:bg-red-900 border border-red-900"
              >
                <Trash2 size={16} className="mr-2" /> Hapus
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
OrderDetailModal.displayName = "OrderDetailModal";

const KitchenSummaryModal = memo(({ isOpen, onClose, orders }: any) => {
  const summary = useMemo(() => {
    const activeItems = orders
      .filter((o: Order) => ["pending", "cooking"].includes(o.status))
      .flatMap((o: Order) => o.items || []);
    const counts: Record<string, number> = {};
    activeItems.forEach((item: OrderItem) => {
      counts[item.menu_name] = (counts[item.menu_name] || 0) + item.qty;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [orders]);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks size={20} className="text-orange-500" /> Rekap Dapur
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Total item yang HARUS dimasak sekarang.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
          {summary.length > 0 ? (
            summary.map(([name, qty], idx) => (
              <div
                key={idx}
                className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800"
              >
                <span className="font-medium text-sm text-zinc-200">
                  {name}
                </span>
                <Badge className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-3 py-1">
                  {qty}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-center text-zinc-500 text-xs py-4 border border-dashed border-zinc-800 rounded-lg">
              Dapur aman terkendali. 😴
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
KitchenSummaryModal.displayName = "KitchenSummaryModal";

// --- MAIN PAGE ---
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [kitchenMode, setKitchenMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. INIT: Cache & Config
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKitchen = localStorage.getItem("admin_kitchen");
      const savedMute = localStorage.getItem("admin_mute");
      if (savedKitchen) setKitchenMode(JSON.parse(savedKitchen));
      if (savedMute) setIsMuted(JSON.parse(savedMute));

      if ("wakeLock" in navigator) {
        // @ts-ignore
        navigator.wakeLock.request("screen").catch(() => {});
      }

      // --- LOGIC RESET BADGE ---
      // Saat halaman ini dibuka, update timestamp "Terakhir Dibaca"
      localStorage.setItem("admin_last_read_orders", new Date().toISOString());

      // --- LOGIC CACHE (ANTI-LOADING) ---
      // Coba load dari memory dulu biar instan
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          setOrders(JSON.parse(cached));
          setIsLoading(false); // Langsung tampilkan konten!
        } catch (e) {}
      }
    }

    // Fetch data terbaru di background (Silent Update)
    fetchOrders(true);

    const channel = supabase
      .channel("admin-orders-page-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
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

  // Update Cache saat data berubah
  useEffect(() => {
    if (orders.length > 0) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(orders));
    }
  }, [orders]);

  const toggleKitchen = () =>
    setKitchenMode((prev) => {
      localStorage.setItem("admin_kitchen", JSON.stringify(!prev));
      return !prev;
    });
  const toggleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    localStorage.setItem("admin_mute", JSON.stringify(newVal));
    if (!newVal) {
      const a = new Audio("/sounds/notification.mp3");
      a.play().catch(() => {});
      toast("🔊 Test Suara");
    }
  };
  const testSound = () => {
    const a = new Audio("/sounds/notification.mp3");
    a.play().catch(() => toast.error("Klik interaksi dulu!"));
    toast("🔊 Test Suara Berjalan");
  };

  // 2. FETCH DATA (Optimized)
  const fetchOrders = useCallback(
    async (reset = false) => {
      if (reset) {
        setPage(0);
        setHasMore(true);
        // Jangan set isLoading(true) jika data sudah ada dari cache (biar gak kedip)
        setOrders((prev) => {
          if (prev.length === 0) setIsLoading(true);
          return prev;
        });
      } else {
        setLoadingMore(true);
      }

      const from = reset ? 0 : (page + 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`*, order_items(*)`)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        if (data) {
          const formatted = data.map((o: any) => ({
            ...o,
            items: o.order_items,
          }));
          setOrders((prev) => {
            if (reset) return formatted;
            const existingIds = new Set(prev.map((o) => o.id));
            return [
              ...prev,
              ...formatted.filter((o) => !existingIds.has(o.id)),
            ];
          });
          if (data.length < ITEMS_PER_PAGE) setHasMore(false);
        }
      } catch (err) {
        toast.error("Gagal sync data.");
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [page],
  );

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchOrders(true);
  };

  // 4. HANDLERS
  const handleDetail = useCallback((order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  }, []);
  const handleUpdateStatus = useCallback(
    async (id: number, newStatus: string, isPayment = false) => {
      setIsProcessing(true);
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
      if (["completed", "cancelled"].includes(newStatus))
        setIsDetailOpen(false);
      await supabase
        .from("orders")
        .update(
          isPayment
            ? { status: newStatus, payment_status: "paid" }
            : { status: newStatus },
        )
        .eq("id", id);
      toast.success(`Status: ${newStatus.toUpperCase()}`);
      setIsProcessing(false);
    },
    [],
  );
  const handleDeleteOrder = useCallback(async () => {
    if (!selectedOrder) return;
    if (confirm("Hapus pesanan ini?")) {
      setIsProcessing(true);
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", selectedOrder.id);
      if (!error) {
        setOrders((prev) => prev.filter((o) => o.id !== selectedOrder!.id));
        setIsDetailOpen(false);
        toast.success("Dihapus");
      }
      setIsProcessing(false);
    }
  }, [selectedOrder]);

  // 5. FILTERING
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
    if (searchQuery)
      data = data.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.order_code?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return data;
  }, [orders, activeTab, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todays = orders.filter(
      (o) => o.created_at.startsWith(today) && o.status !== "cancelled",
    );
    return {
      revenue: todays.reduce((acc, curr) => acc + curr.total_price, 0),
      count: todays.length,
    };
  }, [orders]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 md:pt-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Zap size={20} className="text-orange-500 fill-orange-500" />{" "}
              Monitoring
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${isConnected ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"}`}
              >
                {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}{" "}
                {isConnected ? "Live" : "Putus"}
              </div>
              <button
                onClick={handleManualRefresh}
                className={`ml-2 p-1.5 rounded-full hover:bg-zinc-800 transition-colors ${isRefreshing ? "animate-spin" : ""}`}
              >
                <RefreshCw size={16} className="text-zinc-400" />
              </button>
            </h2>
            <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500 mt-1">
              <span>
                🗓️ Hari ini: <b>{stats.count}</b> Order
              </span>
              <span className="text-green-500">
                💵 {formatRupiah(stats.revenue)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSummary(true)}
              className="border-zinc-800 text-zinc-300"
            >
              <ListChecks size={16} className="mr-2" /> Dapur
            </Button>
            <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
              <Button
                size="icon"
                variant="ghost"
                onClick={testSound}
                className="h-8 w-8 text-zinc-400 hover:text-white"
                title="Tes Suara"
              >
                <Play size={10} />
              </Button>
              <div className="w-px h-4 bg-zinc-800 mx-0.5"></div>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleMute}
                className={`h-8 w-8 ${isMuted ? "text-red-500" : "text-green-500"}`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleKitchen}
              className={`border-zinc-800 ${kitchenMode ? "bg-orange-500/20 text-orange-500 border-orange-500" : "text-zinc-400"}`}
            >
              <Eye size={16} className="mr-2" />{" "}
              {kitchenMode ? "Normal" : "Fokus"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="bg-zinc-900 p-1 rounded-xl flex gap-1 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === "active" ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg" : "text-zinc-400 hover:text-white"}`}
              >
                🔥 Aktif
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
                onDetail={handleDetail}
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
      {hasMore && !searchQuery && filteredOrders.length >= ITEMS_PER_PAGE && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={() => fetchOrders(false)}
            disabled={loadingMore}
            className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white w-full sm:w-auto"
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

      <OrderDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        order={selectedOrder}
        onUpdate={handleUpdateStatus}
        onDelete={handleDeleteOrder}
        isProcessing={isProcessing}
      />
      <KitchenSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        orders={orders}
      />
    </div>
  );
}
