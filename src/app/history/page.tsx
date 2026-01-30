"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import {
  Clock,
  Repeat,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  CheckCircle2,
  Share2,
  MapPin,
  Loader2,
  History,
  AlertTriangle,
  Star,
  Send,
  Crown,
  Medal,
  User,
  ChefHat,
  BellRing,
  RefreshCw,
  Trash2,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";

// --- TYPES ---
interface OrderItem {
  menu_name: string;
  price: number;
  qty: number;
  note?: string;
}

interface Order {
  id: number;
  order_code: string;
  created_at: string;
  total_price: number;
  status: "pending" | "cooking" | "ready" | "completed" | "cancelled";
  table_number: string;
  items: OrderItem[];
}

const ITEMS_PER_PAGE = 10;

// --- STATUS CONFIG ---
const getStatusConfig = (status: string) => {
  switch (status) {
    case "pending":
      return {
        label: "Menunggu",
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        icon: Clock,
        desc: "Menunggu konfirmasi kasir.",
      };
    case "cooking":
      return {
        label: "Dimasak",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        icon: ChefHat,
        desc: "Koki sedang masak pesananmu.",
      };
    case "ready":
      return {
        label: "Siap Saji",
        color: "text-green-500",
        bg: "bg-green-500/10",
        icon: BellRing,
        desc: "Pesanan siap diantar/diambil.",
      };
    case "completed":
      return {
        label: "Selesai",
        color: "text-zinc-400",
        bg: "bg-zinc-800",
        icon: CheckCircle2,
        desc: "Transaksi selesai.",
      };
    case "cancelled":
      return {
        label: "Batal",
        color: "text-red-500",
        bg: "bg-red-500/10",
        icon: AlertTriangle,
        desc: "Pesanan dibatalkan.",
      };
    default:
      return {
        label: "...",
        color: "text-zinc-500",
        bg: "bg-zinc-900",
        icon: Clock,
        desc: "",
      };
  }
};

const groupOrdersByDate = (orders: Order[]) => {
  const groups: Record<string, Order[]> = {};
  orders.forEach((order) => {
    const date = new Date(order.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let key = date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (date.toDateString() === today.toDateString()) key = "Hari Ini";
    else if (date.toDateString() === yesterday.toDateString()) key = "Kemarin";
    if (!groups[key]) groups[key] = [];
    groups[key].push(order);
  });
  return groups;
};

// --- COMPONENTS ---
const HistorySkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-zinc-900 rounded-2xl p-4 border border-white/5 h-24 w-full"
      >
        <div className="flex gap-3">
          <div className="h-10 w-10 bg-zinc-800 rounded-lg"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
            <div className="h-3 bg-zinc-800 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const HistoryCard = memo(
  ({
    order,
    onReorder,
    onReviewClick,
    onDeleteClick,
  }: {
    order: Order;
    onReorder: (items: any[]) => void;
    onReviewClick: (order: Order) => void;
    onDeleteClick: (id: number) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const status = getStatusConfig(order.status);
    const StatusIcon = status.icon;
    const displayId = order.order_code || `#${order.id}`;

    const handleCopyStruk = (e: React.MouseEvent) => {
      e.stopPropagation();
      let text = `🧾 *STRUK ${displayId}*\nTotal: Rp ${order.total_price.toLocaleString("id-ID")}\nStatus: ${status.label}\n\n`;
      order.items.forEach((i) => {
        text += `${i.qty}x ${i.menu_name}\n`;
      });
      navigator.clipboard.writeText(text);
      toast.success("Struk disalin! 📋");
    };

    return (
      <div
        className={`border rounded-2xl overflow-hidden mb-3 transition-all duration-300 relative group ${order.status === "completed" || order.status === "cancelled" ? "bg-zinc-900/30 border-white/5" : "bg-zinc-900 border-orange-500/20 shadow-lg shadow-orange-900/5"}`}
      >
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 cursor-pointer active:bg-zinc-800/50 transition-colors"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl transition-colors ${status.bg} ${status.color}`}
              >
                <StatusIcon
                  size={20}
                  className={
                    ["pending", "cooking"].includes(order.status)
                      ? "animate-pulse"
                      : ""
                  }
                />
              </div>
              <div>
                <p className="text-white font-bold text-base tracking-tight">
                  Rp {order.total_price.toLocaleString("id-ID")}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/5 ${status.color} bg-black/20`}
                  >
                    {status.label}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    <MapPin size={10} className="text-orange-500" />{" "}
                    {order.table_number === "Takeaway"
                      ? "Bungkus"
                      : `Meja ${order.table_number}`}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="text-zinc-600 transition-transform duration-300"
              style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <ChevronDown size={18} />
            </div>
          </div>
          {!isOpen && (
            <div className="flex justify-between items-center border-t border-dashed border-zinc-800 pt-2 mt-1">
              <p className="text-xs text-zinc-500 line-clamp-1 flex-1">
                {order.items.map((i) => `${i.qty}x ${i.menu_name}`).join(", ")}
              </p>
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 tracking-wider">
                {displayId}
              </span>
            </div>
          )}
        </div>
        {isOpen && (
          <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="border-t-2 border-dashed border-zinc-800 my-3 relative opacity-50" />
            <div
              className={`text-xs p-3 rounded-xl mb-4 flex items-start gap-2 ${status.bg} ${status.color}`}
            >
              <StatusIcon size={16} className="shrink-0 mt-0.5" />{" "}
              <span>{status.desc}</span>
            </div>
            <div className="space-y-2 mb-5">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-xs text-zinc-300"
                >
                  <span className="flex-1 truncate pr-2">
                    <span className="font-bold text-orange-500 mr-2 tabular-nums">
                      {item.qty}x
                    </span>
                    {item.menu_name}
                  </span>
                  <span className="text-zinc-500 tabular-nums">
                    {((item.price || 0) * item.qty).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {order.status === "completed" ? (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReviewClick(order);
                  }}
                  variant="outline"
                  className="h-9 text-[10px] border-zinc-700 hover:bg-zinc-800"
                >
                  <Star size={12} className="mr-1.5 text-yellow-500" /> Nilai
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-9 text-[10px] border-zinc-700 opacity-50 cursor-not-allowed"
                >
                  <Loader2 size={12} className="mr-1.5 animate-spin" /> Proses
                </Button>
              )}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(order.items);
                }}
                className="h-9 text-[10px] bg-orange-600 hover:bg-orange-500 text-white border-0"
              >
                <Repeat size={12} className="mr-1.5" /> Pesan Lagi
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCopyStruk}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] text-zinc-500 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 h-8 rounded-lg"
              >
                <Share2 size={10} /> Salin Struk
              </button>
              {(order.status === "completed" ||
                order.status === "cancelled") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(order.id);
                  }}
                  className="flex-none px-3 flex items-center justify-center text-red-500 hover:text-red-400 bg-red-500/10 border border-red-500/20 h-8 rounded-lg transition-colors"
                >
                  <EyeOff size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);
HistoryCard.displayName = "HistoryCard";

const ReviewDialog = memo(
  ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
    isSubmitting: boolean;
  }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    useEffect(() => {
      if (isOpen) {
        setRating(5);
        setComment("");
      }
    }, [isOpen]);
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[320px] rounded-[2rem] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold flex flex-col items-center gap-2">
              <span className="text-4xl">😋</span>Gimana Rasanya?
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-500 text-xs">
              Bantu kami jadi lebih baik.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-3 my-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none transform transition-transform active:scale-90 hover:scale-110"
              >
                <Star
                  size={32}
                  className={`${star <= rating ? "fill-yellow-400 text-yellow-400 drop-shadow-md" : "text-zinc-700"} transition-colors duration-300`}
                />
              </button>
            ))}
          </div>
          <textarea
            placeholder="Tulis ulasan jujurmu disini..."
            className="w-full h-24 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none placeholder:text-zinc-600"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            onClick={() => onSubmit(rating, comment)}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold h-12 rounded-xl mt-2 shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Send size={18} className="mr-2" /> Kirim Ulasan
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>
    );
  },
);
ReviewDialog.displayName = "ReviewDialog";

// --- MAIN PAGE ---
export default function HistoryPage() {
  const router = useRouter();
  const { addToCart } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // FETCH DATA
  const fetchHistory = useCallback(
    async (name: string, reset = false) => {
      if (reset) {
        setIsRefreshing(true);
        setPage(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const currentFrom = reset ? 0 : (page + 1) * ITEMS_PER_PAGE;
      const currentTo = currentFrom + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("customer_name", name)
        .eq("is_visible_to_user", true)
        .order("created_at", { ascending: false })
        .range(currentFrom, currentTo);

      if (!error && data) {
        const mappedOrders = data.map((o: any) => ({
          id: o.id,
          order_code: o.order_code,
          created_at: o.created_at,
          total_price: o.total_price,
          status: o.status,
          table_number: o.table_number,
          items: o.order_items.map((i: any) => ({
            menu_name: i.menu_name,
            price: i.price,
            qty: i.qty,
            note: i.note,
          })),
        }));

        if (reset) setOrders(mappedOrders);
        else setOrders((prev) => [...prev, ...mappedOrders]);

        if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      }

      setIsLoading(false);
      setIsRefreshing(false);
      setLoadingMore(false);
    },
    [page],
  );

  // INITIAL LOAD & REALTIME
  useEffect(() => {
    const name = localStorage.getItem("customer_name");
    setCustomerName(name);

    if (name) {
      fetchHistory(name, true);

      // REALTIME LISTENER (FIXED TYPE ERROR)
      const channel = supabase
        .channel("public:orders-history")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => {
            // 1. Ambil data baru (dengan casting 'as any' agar TS tidak rewel)
            const newData = payload.new as any;

            // 2. Cek apakah ini update milik user kita?
            if (newData && newData.customer_name === name) {
              // 3. Cek apakah data ini di-soft delete? (Jika ya, hapus dari list)
              if (newData.is_visible_to_user === false) {
                setOrders((prev) => prev.filter((o) => o.id !== newData.id));
                return;
              }

              if (payload.eventType === "INSERT") {
                fetchHistory(name, true); // Refresh list jika ada order baru
              } else if (payload.eventType === "UPDATE") {
                // Update status secara lokal (tanpa fetch ulang)
                setOrders((prev) =>
                  prev.map((o) =>
                    o.id === newData.id ? { ...o, status: newData.status } : o,
                  ),
                );

                if (newData.status === "ready") {
                  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                  toast.success("Pesananmu Siap! 🍽️");
                }
              }
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setIsLoading(false);
    }
  }, []);

  const groupedOrders = useMemo(() => groupOrdersByDate(orders), [orders]);

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const totalSpent = completed.reduce(
      (acc, curr) => acc + curr.total_price,
      0,
    );
    const totalOrders = completed.length;
    let level = "Pendatang Baru",
      Icon = User,
      color = "text-green-500";
    if (totalOrders > 10) {
      level = "Sultan Angkringan";
      Icon = Crown;
      color = "text-yellow-500";
    } else if (totalOrders > 3) {
      level = "Warga Lokal";
      Icon = Medal;
      color = "text-blue-400";
    }
    return { totalSpent, totalOrders, level, Icon, color };
  }, [orders]);

  const handleReorder = useCallback(
    (items: any[]) => {
      items.forEach((item) =>
        addToCart({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: item.menu_name,
          price: item.price,
          qty: item.qty,
          image: "",
        } as any),
      );
      toast.success("Masuk keranjang! 🛒");
      router.push("/cart");
    },
    [addToCart, router],
  );

  const handleSubmitReview = useCallback(
    async (rating: number, comment: string) => {
      if (!customerName) return;
      setIsSubmitting(true);
      const { error } = await supabase
        .from("reviews")
        .insert({
          name: customerName,
          comment: comment,
          rating: rating,
          created_at: new Date(),
        });
      setIsSubmitting(false);
      if (!error) {
        toast.success("Makasih ulasannya! ⭐");
        setReviewOrder(null);
      } else {
        toast.success("Ulasan terkirim!");
        setReviewOrder(null);
      }
    },
    [customerName],
  );

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from("orders")
      .update({ is_visible_to_user: false })
      .eq("id", deleteId);
    if (!error) {
      setOrders((prev) => prev.filter((o) => o.id !== deleteId));
      toast.success("Riwayat disembunyikan.");
    } else {
      toast.error("Gagal menghapus.");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const handleManualRefresh = () => {
    if (customerName) {
      toast("Sinkronisasi data...", {
        icon: <RefreshCw className="animate-spin h-4 w-4" />,
        duration: 1000,
      });
      fetchHistory(customerName, true);
    }
  };

  return (
    <MobileLayout>
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <History className="text-orange-500" size={20} /> Riwayat
        </h1>
        <div className="flex items-center gap-2">
          {customerName && (
            <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full border border-zinc-800 line-clamp-1 max-w-[100px]">
              Hi, {customerName}
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            className={`p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 active:scale-90 transition-all ${isRefreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="p-5 pb-32 min-h-screen">
        {isLoading && orders.length === 0 ? (
          <HistorySkeleton />
        ) : orders.length > 0 ? (
          <>
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-5 rounded-3xl border border-white/5 relative overflow-hidden mb-6 shadow-2xl animate-in slide-in-from-top-4 duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Total Jajanmu
                  </p>
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    Rp {stats.totalSpent.toLocaleString("id-ID")}
                  </h2>
                </div>
                <div className="bg-zinc-950/50 p-2.5 rounded-2xl backdrop-blur-sm border border-white/5">
                  <stats.Icon size={24} className={stats.color} />
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500">
                    Order Selesai
                  </span>
                  <span className="text-sm font-bold text-white flex items-center gap-1">
                    <ShoppingBag size={12} className="text-blue-500" />{" "}
                    {stats.totalOrders}x
                  </span>
                </div>
                <div className="w-[1px] h-full bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500">Level Kamu</span>
                  <span
                    className={`text-sm font-bold flex items-center gap-1 ${stats.color}`}
                  >
                    {stats.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedOrders).map(([date, groupOrders]) => (
                <div key={date}>
                  <h3 className="text-xs font-bold text-zinc-500 mb-3 ml-1 uppercase tracking-wider sticky top-[70px] bg-zinc-950/80 backdrop-blur-md py-2 z-30 w-fit px-3 rounded-full border border-white/5">
                    {date}
                  </h3>
                  <div className="space-y-3">
                    {groupOrders.map((order) => (
                      <HistoryCard
                        key={order.id}
                        order={order}
                        onReorder={handleReorder}
                        onReviewClick={setReviewOrder}
                        onDeleteClick={setDeleteId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => fetchHistory(customerName || "", false)}
                  disabled={loadingMore}
                  variant="outline"
                  className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white w-full"
                >
                  {loadingMore ? (
                    <Loader2 className="animate-spin mr-2" size={14} />
                  ) : (
                    <ChevronDown className="mr-2" size={14} />
                  )}{" "}
                  Muat Lebih Banyak
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-24 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
              <History size={32} className="text-zinc-700" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">
              Belum Ada Jejak
            </h3>
            <p className="text-zinc-500 text-xs max-w-[200px] leading-relaxed">
              Pesan makan dulu yuk biar ada riwayatnya!
            </p>
            <Link href="/menu">
              <Button className="mt-8 bg-zinc-100 text-black hover:bg-white rounded-xl font-bold px-8 shadow-lg h-11 text-xs active:scale-95 transition-transform">
                Mulai Pesan
              </Button>
            </Link>
          </div>
        )}
      </div>

      <ReviewDialog
        isOpen={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        onSubmit={handleSubmitReview}
        isSubmitting={isSubmitting}
      />

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[300px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">
              Sembunyikan Riwayat?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-zinc-500">
              Data hanya disembunyikan dari HP kamu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center mt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="flex-1 bg-transparent border-zinc-700 hover:bg-zinc-900 h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white h-9 text-xs border-0"
            >
              {isDeleting ? (
                <Loader2 className="animate-spin h-3 w-3" />
              ) : (
                "Ya, Sembunyikan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
