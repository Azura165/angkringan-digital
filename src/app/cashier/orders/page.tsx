"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Printer,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  MapPin,
  ChevronRight,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  ArrowRight,
  ChevronDown,
  Receipt,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ReceiptPrint } from "@/components/cashier/ReceiptPrint";

// --- CONFIG ---
const CACHE_KEY = "cashier_orders_v7"; // Update Cache Version
const ITEMS_PER_PAGE = 20;

// --- HELPERS ---
const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// --- SUB-COMPONENT: ORDER ROW ---
const OrderRow = memo(
  ({ order, onDetail }: { order: any; onDetail: (o: any) => void }) => {
    const statusColor =
      {
        pending: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
        cooking: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        ready: "text-green-500 bg-green-500/10 border-green-500/20",
        completed: "text-zinc-400 bg-zinc-800/50 border-zinc-700",
        cancelled: "text-red-500 bg-red-500/10 border-red-500/20",
      }[order.status as string] || "text-zinc-400";

    const isScanOrder =
      order.payment_status === "unpaid" && order.status !== "cancelled";

    return (
      <div
        onClick={() => onDetail(order)}
        className={`flex items-center justify-between p-4 bg-zinc-900/50 border rounded-xl mb-3 cursor-pointer hover:bg-zinc-800 transition-all active:scale-[0.99] group ${order.status === "pending" ? "border-l-4 border-l-yellow-500 border-y-zinc-800 border-r-zinc-800" : "border-zinc-800"}`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center border ${statusColor}`}
          >
            {order.status === "cooking" ? (
              <ChefHat size={18} />
            ) : order.status === "ready" ? (
              <CheckCircle2 size={18} />
            ) : order.status === "cancelled" ? (
              <XCircle size={18} />
            ) : (
              <Clock size={18} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm md:text-base">
                {order.customer_name}
              </span>
              {isScanOrder ? (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 border-blue-500/50 text-blue-400 gap-1 px-1"
                >
                  <Smartphone size={8} /> SCAN
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 border-emerald-500/50 text-emerald-400 gap-1 px-1"
                >
                  <Monitor size={8} /> KASIR
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
              <span className="flex items-center gap-1 font-mono bg-zinc-900 px-1.5 rounded border border-zinc-800 text-zinc-400">
                {order.order_code || `#${order.id}`}
              </span>
              <span className="w-px h-3 bg-zinc-700"></span>
              <span className="flex items-center gap-1">
                {order.table_number === "Takeaway" ? (
                  <ChefHat size={12} />
                ) : (
                  <MapPin size={12} />
                )}
                {order.table_number === "Takeaway"
                  ? "Bungkus"
                  : `Meja ${order.table_number}`}
              </span>
              <span className="hidden sm:inline w-px h-3 bg-zinc-700"></span>
              <span className="hidden sm:flex items-center gap-1">
                <Clock size={12} /> {formatTime(order.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-emerald-500 text-sm mb-1">
            {formatRupiah(order.total_price)}
          </p>
          <div className="flex items-center justify-end gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${statusColor}`}
            >
              {order.status}
            </span>
            <ChevronRight
              size={16}
              className="text-zinc-600 group-hover:text-white transition-colors"
            />
          </div>
        </div>
      </div>
    );
  },
);
OrderRow.displayName = "OrderRow";

// --- MAIN PAGE ---
export default function CashierOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false); // Default false agar tidak muncul loading awal
  const [loadingMore, setLoadingMore] = useState(false);

  // 1. INIT
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMute = localStorage.getItem("app_is_muted");
      setIsMuted(savedMute === "true");

      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Array.isArray(data)) {
            setOrders(data);
            setIsLoading(false);
            // Optimasi: Jika data di cache < limit, berarti sudah habis
            if (data.length < ITEMS_PER_PAGE) setHasMore(false);
            else setHasMore(true);
          }
        } catch (e) {}
      }
    }

    // Background Fetch (Selalu update data terbaru)
    fetchOrders(true);

    const channel = supabase
      .channel("cashier-orders-management")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            fetchOrders(true); // Order baru -> Refresh list
          } else if (payload.eventType === "UPDATE") {
            // Optimistic Update Status (Ringan)
            setOrders((prev) =>
              prev.map((o) =>
                o.id === payload.new.id ? { ...o, ...payload.new } : o,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(orders));
    }
  }, [orders]);

  // 2. FETCH ORDERS (OPTIMIZED QUERY)
  const fetchOrders = useCallback(
    async (reset = false) => {
      if (reset) {
        setIsRefreshing(true);
        setPage(0);
        // Jangan setHasMore(true) disini agar tidak flicker tombol
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 0 : page;
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const today = new Date().toISOString().split("T")[0];

      try {
        // Select kolom spesifik + relasi order_items
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id, created_at, customer_name, table_number, total_price, 
            status, payment_status, payment_method, order_code, cash_received,
            order_items ( id, menu_name, price, qty, note )
        `,
          )
          .gte("created_at", `${today}T00:00:00`)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        if (data) {
          if (reset) {
            setOrders(data);
          } else {
            setOrders((prev) => {
              const existingIds = new Set(prev.map((o) => o.id));
              const newItems = data.filter((o) => !existingIds.has(o.id));
              return [...prev, ...newItems];
            });
          }

          // Logic Pagination Pintar
          // Jika data yang didapat kurang dari limit, berarti sudah habis
          if (data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
          } else {
            setHasMore(true);
            setPage(currentPage + 1);
          }
        }
      } catch (e) {
        toast.error("Gagal memuat data");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setLoadingMore(false);
      }
    },
    [page],
  );

  // 3. HANDLERS
  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    localStorage.setItem("app_is_muted", String(newState));
    if (!newState) {
      const audio = new Audio("/sounds/notification.mp3");
      audio.play().catch(() => {});
      toast("🔊 Suara Aktif");
    } else {
      toast("🔇 Suara Dimatikan");
    }
  };

  const handleUpdateStatus = async (
    id: number,
    newStatus: string,
    close = false,
  ) => {
    setIsProcessing(true);

    // Optimistic Update
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
    );
    if (selectedOrder)
      setSelectedOrder({ ...selectedOrder, status: newStatus });

    const updatePayload: any = { status: newStatus };
    if (newStatus === "completed") updatePayload.payment_status = "paid";

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      toast.error("Gagal update status");
      fetchOrders(true); // Rollback
    } else {
      toast.success(`Status: ${newStatus.toUpperCase()}`);
      if (close) setIsDetailOpen(false);
    }
    setIsProcessing(false);
  };

  const handlePrint = () => window.print();

  // 4. FILTERING
  const filteredOrders = useMemo(() => {
    let data = orders;
    if (statusFilter !== "all")
      data = data.filter((o) => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(q) ||
          (o.order_code && o.order_code.toLowerCase().includes(q)) ||
          o.id.toString().includes(q),
      );
    }
    return data;
  }, [orders, search, statusFilter]);

  // Helper Hitung Kembalian (untuk display modal)
  const calculateChange = (order: any) => {
    const received = order.cash_received || 0;
    const total = order.total_price || 0;
    return received - total;
  };

  return (
    <>
      <div className="p-4 md:p-6 pb-24 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 print:hidden">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-emerald-500" /> Riwayat & Kelola
            </h1>
            <p className="text-zinc-400 text-xs">Kelola pesanan hari ini.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto items-center">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className={`w-9 h-9 rounded-lg border border-zinc-800 ${isMuted ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10"}`}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>

            <div className="h-6 w-px bg-zinc-800 mx-1" />

            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-zinc-500"
                size={16}
              />
              <Input
                placeholder="Cari Order ID / Nama..."
                className="pl-9 bg-zinc-900 border-zinc-800 h-9 text-xs w-full md:w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => fetchOrders(true)}
              className={`border-zinc-800 bg-zinc-900 hover:text-white h-9 w-9 ${isRefreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>

        {/* STATUS TABS */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: "all", label: "Semua", color: "bg-zinc-800" },
            {
              id: "pending",
              label: "Pending",
              color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
            },
            {
              id: "cooking",
              label: "Dimasak",
              color: "bg-blue-500/20 text-blue-500 border-blue-500/50",
            },
            {
              id: "ready",
              label: "Siap Saji",
              color: "bg-green-500/20 text-green-500 border-green-500/50",
            },
            {
              id: "completed",
              label: "Selesai",
              color: "bg-zinc-800 text-zinc-400",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                statusFilter === tab.id
                  ? `${tab.color} border shadow-lg`
                  : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ORDERS LIST */}
        <div className="min-h-[300px]">
          {isLoading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <Loader2 className="animate-spin mb-2" /> Memuat data...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-900 rounded-xl bg-zinc-900/20">
              <Filter size={40} className="mb-2 opacity-50" />
              <p className="text-sm">Tidak ada pesanan.</p>
            </div>
          ) : (
            <>
              {filteredOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onDetail={(o) => {
                    setSelectedOrder(o);
                    setIsDetailOpen(true);
                  }}
                />
              ))}

              {/* BUTTON LOAD MORE (HANYA MUNCUL JIKA ADA LEBIH BANYAK) */}
              {hasMore && !search && statusFilter === "all" && (
                <div className="flex justify-center pt-4">
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
            </>
          )}
        </div>

        {/* DETAIL MODAL */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm rounded-2xl [&>button]:hidden">
            <DialogHeader className="border-b border-white/10 pb-4">
              <DialogTitle className="flex justify-between items-center">
                <span className="font-mono">
                  {selectedOrder?.order_code || `#${selectedOrder?.id}`}
                </span>
                <Badge
                  variant="outline"
                  className={`uppercase ${selectedOrder?.status === "pending" ? "text-yellow-500 border-yellow-500" : "text-zinc-400"}`}
                >
                  {selectedOrder?.status}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                <Calendar size={12} />{" "}
                {selectedOrder &&
                  new Date(selectedOrder.created_at).toLocaleString("id-ID")}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-zinc-900 p-3 rounded-lg text-sm border border-zinc-800">
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-400">Pelanggan</span>
                  <span className="font-bold">
                    {selectedOrder?.customer_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Posisi</span>
                  <span className="font-bold">
                    {selectedOrder?.table_number === "Takeaway"
                      ? "Bungkus"
                      : `Meja ${selectedOrder?.table_number}`}
                  </span>
                </div>
              </div>

              {/* LIST ITEMS */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Detail Menu
                </p>
                {selectedOrder?.order_items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm border-b border-zinc-900 pb-2"
                  >
                    <div className="flex gap-2">
                      <span className="font-bold text-emerald-500">
                        {item.qty}x
                      </span>
                      <span>{item.menu_name}</span>
                    </div>
                    <span className="font-mono text-zinc-400">
                      {formatRupiah(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              {/* RINCIAN PEMBAYARAN (FITUR BARU) */}
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-1 mt-2">
                <div className="flex justify-between items-center text-zinc-300 font-bold">
                  <span className="text-xs">Total</span>
                  <span>
                    {selectedOrder && formatRupiah(selectedOrder.total_price)}
                  </span>
                </div>

                {selectedOrder?.payment_method === "cash" &&
                  selectedOrder?.cash_received > 0 && (
                    <>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Wallet size={10} /> Bayar
                        </span>
                        <span>{formatRupiah(selectedOrder.cash_received)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-500 pt-1 border-t border-zinc-800 mt-1">
                        <span>Kembalian</span>
                        <span>
                          {formatRupiah(calculateChange(selectedOrder))}
                        </span>
                      </div>
                    </>
                  )}

                <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1 pt-1 border-t border-zinc-800 border-dashed">
                  <span>Metode</span>
                  <span className="uppercase">
                    {selectedOrder?.payment_method}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
              {selectedOrder?.status === "pending" && (
                <Button
                  onClick={() =>
                    handleUpdateStatus(selectedOrder.id, "cooking")
                  }
                  disabled={isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-500 font-bold"
                >
                  <ChefHat size={16} className="mr-2" /> Terima & Masak
                </Button>
              )}
              {selectedOrder?.status === "cooking" && (
                <Button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "ready")}
                  disabled={isProcessing}
                  className="w-full bg-orange-600 hover:bg-orange-500 font-bold"
                >
                  <CheckCircle2 size={16} className="mr-2" /> Pesanan Siap
                </Button>
              )}
              {selectedOrder?.status === "ready" && (
                <Button
                  onClick={() =>
                    handleUpdateStatus(selectedOrder.id, "completed", true)
                  }
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-500 font-bold"
                >
                  <ArrowRight size={16} className="mr-2" /> Selesaikan Order
                </Button>
              )}
              <div className="flex gap-2 mt-1">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                  className="flex-1 border-zinc-700 text-zinc-300"
                >
                  Tutup
                </Button>
                <Button
                  onClick={handlePrint}
                  disabled={selectedOrder?.status === "pending"}
                  className={`flex-1 font-bold ${selectedOrder?.status === "pending" ? "bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed" : "bg-white text-black hover:bg-zinc-200"}`}
                >
                  <Printer size={16} className="mr-2" />{" "}
                  {selectedOrder?.status === "pending"
                    ? "Menunggu Masak"
                    : "Cetak Struk"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* COMPONENT PRINT */}
      <ReceiptPrint order={selectedOrder} />
    </>
  );
}
