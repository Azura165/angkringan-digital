"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import {
  Clock,
  Trash2,
  Search,
  Repeat,
  ChevronDown,
  ChevronUp,
  Receipt,
  Wallet,
  ShoppingBag,
  CheckCircle2,
  Share2,
  MapPin,
  Calendar,
  MoreVertical,
  Loader2,
  ArrowDown,
  History,
  AlertTriangle,
  Star,
  MessageSquarePlus,
  Send,
  Crown,
  Medal,
  User,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";

// --- 1. KOMPONEN KARTU HISTORY (OPTIMIZED) ---
const HistoryCard = ({
  order,
  onReorder,
  onDelete,
  onReviewClick,
}: {
  order: any;
  onReorder: (items: any[]) => void;
  onDelete: (id: string) => void;
  onReviewClick: (order: any) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!order || !order.items) return null;

  const handleShareStruk = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mejaInfo = order.table
      ? order.table.includes("Takeaway")
        ? "Takeaway"
        : `Meja ${order.table}`
      : "Takeaway";

    let struk = `🧾 *STRUK PESANAN*\n`;
    struk += `🆔 ${order.id}\n`;
    struk += `📅 ${order.date}\n`;
    struk += `📍 ${mejaInfo}\n`;
    struk += `------------------\n`;
    order.items.forEach((i: any) => {
      struk += `${i.qty}x ${i.name}\n`;
    });
    struk += `------------------\n`;
    struk += `💰 TOTAL: Rp ${order.total.toLocaleString("id-ID")}\n`;
    struk += `\n*Angkringan Mas Radit*`;

    navigator.clipboard.writeText(struk);
    toast.success("Struk disalin! Siap kirim WA 📲");
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(order.id);
    toast.success("ID Pesanan disalin.");
  };

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden mb-3 transition-all hover:border-zinc-700 group relative animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 cursor-pointer active:bg-zinc-800/50 transition-colors"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl transition-colors ${isOpen ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              <Receipt size={18} />
            </div>
            <div>
              <p className="text-white font-bold text-base tracking-tight">
                Rp {order.total.toLocaleString("id-ID")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded flex items-center gap-1 border border-white/5 font-medium">
                  <MapPin size={10} className="text-orange-500" />
                  {order.table
                    ? order.table.includes("Takeaway")
                      ? "Bungkus"
                      : `Meja ${order.table}`
                    : "Bungkus"}
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Clock size={10} />{" "}
                  {order.date.split(",")[1]?.trim() || "Barusan"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-zinc-600">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        {!isOpen && (
          <div className="flex justify-between items-center border-t border-dashed border-zinc-800 pt-2 mt-1">
            <p className="text-xs text-zinc-500 line-clamp-1 flex-1">
              {order.items.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}
            </p>
            <span className="text-[9px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              {order.items.length} Item
            </span>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t-2 border-dashed border-zinc-800 my-3 relative opacity-50" />

          {/* Detail ID */}
          <div
            onClick={handleCopyId}
            className="flex items-center gap-1 mb-3 text-[10px] text-zinc-600 hover:text-zinc-400 cursor-pointer w-fit"
          >
            <Copy size={10} /> ID: {order.id}
          </div>

          <div className="space-y-2 mb-5">
            {order.items.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex justify-between text-xs text-zinc-300"
              >
                <span className="flex-1 truncate pr-2">
                  <span className="font-bold text-orange-500 mr-2 tabular-nums">
                    {item.qty}x
                  </span>
                  {item.name}
                </span>
                <span className="text-zinc-500 tabular-nums">
                  {((item.price || 0) * item.qty).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {order.isReviewed ? (
              <div className="col-span-2 bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2">
                <CheckCircle2 size={14} /> Ulasan Terkirim
              </div>
            ) : (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onReviewClick(order);
                }}
                className="col-span-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2 rounded-xl h-9 border border-zinc-700"
              >
                <MessageSquarePlus size={14} className="mr-2 text-yellow-400" />{" "}
                Beri Ulasan
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareStruk}
              className="h-9 text-[10px] border-zinc-700 text-zinc-400 hover:text-white bg-transparent rounded-lg active:scale-95 transition-transform"
            >
              <Share2 size={12} className="mr-1.5" /> Struk
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReorder(order.items);
              }}
              className="h-9 text-[10px] bg-orange-600 hover:bg-orange-500 text-white border-0 rounded-lg shadow-lg col-span-2 active:scale-95 transition-transform"
            >
              <Repeat size={12} className="mr-1.5" /> Pesan Lagi
            </Button>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(order.id);
            }}
            className="w-full text-center text-[10px] text-red-500/30 hover:text-red-500 mt-4 hover:underline py-1 transition-colors"
          >
            Hapus riwayat ini
          </button>
        </div>
      )}
    </div>
  );
};

// --- HALAMAN UTAMA ---
export default function HistoryPage() {
  const router = useRouter();
  const {
    history,
    clearHistory,
    addToCart,
    removeFromHistory,
    markAsReviewed,
  } = useCart();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(5);

  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter Logic
  const filteredAndGroupedHistory = useMemo(() => {
    if (!history) return {};
    const groups: Record<string, any[]> = {};
    const filtered = history.filter(
      (o) =>
        searchQuery === "" ||
        o.items.some((i: any) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );
    filtered.forEach((order) => {
      const dateKey = order.date ? order.date.split(",")[0] : "Lainnya";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(order);
    });
    return groups;
  }, [history, searchQuery]);

  // Statistik & Membership Logic (Gamifikasi)
  const stats = useMemo(() => {
    if (!history)
      return {
        totalSpent: 0,
        totalOrders: 0,
        level: "Pendatang Baru",
        icon: User,
        color: "text-green-500",
      };

    const totalSpent = history.reduce((acc, curr) => acc + curr.total, 0);
    const totalOrders = history.length;

    let level = "Pendatang Baru";
    let icon = User;
    let color = "text-green-500";

    if (totalOrders > 15) {
      level = "Sultan Angkringan";
      icon = Crown;
      color = "text-yellow-500";
    } else if (totalOrders > 5) {
      level = "Warga Lokal";
      icon = Medal;
      color = "text-blue-400";
    }

    return { totalSpent, totalOrders, level, icon, color };
  }, [history]);

  const handleDeleteOne = (id: string) => {
    if (removeFromHistory) {
      removeFromHistory(id);
      toast.success("Riwayat dihapus.");
    } else {
      toast.error("Gagal hapus.");
    }
  };

  const handleClearAllConfirm = () => {
    clearHistory();
    setIsClearAlertOpen(false);
    toast.success("Semua riwayat dihapus.");
  };

  const handleReorder = (items: any[]) => {
    items.forEach((item) => addToCart(item));
    if (navigator.vibrate) navigator.vibrate(50);
    toast.success("Masuk keranjang! 🛒");
    router.push("/cart");
  };

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      toast.error("Isi komentar dulu ya kak! 😊");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        name: reviewOrder?.customerName || "Pelanggan Setia",
        comment: comment,
        rating: rating,
        is_approved: false,
      });
      if (error) throw error;
      if (reviewOrder && markAsReviewed) markAsReviewed(reviewOrder.id);

      toast.success("Ulasan terkirim! 🎉", {
        description: "Menunggu persetujuan admin.",
      });
      setReviewOrder(null);
      setComment("");
      setRating(5);
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengirim ulasan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!mounted) return null;
  const hasHistory = history && history.length > 0;

  return (
    <MobileLayout>
      {/* HEADER STICKY */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 px-5 py-3 flex items-center justify-between shadow-sm transition-all">
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Clock className="text-orange-500" size={18} /> Riwayat
        </h1>
        {hasHistory && (
          <div className="relative">
            <Button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white rounded-full transition-colors"
            >
              <MoreVertical size={16} />
            </Button>
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden animate-in zoom-in-95 duration-200">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsClearAlertOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-xs text-red-500 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={14} /> Hapus Semua
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-5 pb-32 min-h-screen">
        {hasHistory ? (
          <>
            {/* STATS CARD (Gamified) */}
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-5 rounded-3xl border border-white/5 relative overflow-hidden mb-6 shadow-2xl">
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
                {/* Level Icon */}
                <div className="bg-zinc-950/50 p-2.5 rounded-2xl backdrop-blur-sm border border-white/5">
                  <stats.icon size={24} className={stats.color} />
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500">Total Order</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1">
                    <ShoppingBag size={12} className="text-blue-500" />{" "}
                    {stats.totalOrders}x
                  </span>
                </div>
                <div className="w-[1px] h-full bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500">
                    Level Member
                  </span>
                  <span
                    className={`text-sm font-bold flex items-center gap-1 ${stats.color}`}
                  >
                    <stats.icon size={12} /> {stats.level}
                  </span>
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <div className="relative mb-6">
              <Search
                size={16}
                className="absolute left-3 top-3 text-zinc-500"
              />
              <Input
                placeholder="Cari sate, es teh..."
                className="pl-9 bg-zinc-900 border-zinc-800 text-sm h-10 rounded-xl focus:ring-orange-500 placeholder:text-zinc-600 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* HISTORY LIST */}
            <div className="space-y-6">
              {Object.entries(filteredAndGroupedHistory)
                .reverse()
                .slice(0, displayLimit)
                .map(([date, orders]) => (
                  <div
                    key={date}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-700"
                  >
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-1 flex items-center gap-2">
                      <Calendar size={12} /> {date}
                    </h3>
                    {orders.reverse().map((order: any) => (
                      <HistoryCard
                        key={order.id}
                        order={order}
                        onReorder={handleReorder}
                        onDelete={handleDeleteOne}
                        onReviewClick={setReviewOrder}
                      />
                    ))}
                  </div>
                ))}

              {Object.keys(filteredAndGroupedHistory).length > displayLimit && (
                <Button
                  onClick={() => setDisplayLimit((prev) => prev + 5)}
                  variant="ghost"
                  className="w-full text-zinc-500 text-xs mt-4 hover:text-white hover:bg-zinc-900"
                >
                  Lihat Lebih Banyak <ArrowDown size={14} className="ml-2" />
                </Button>
              )}
            </div>
          </>
        ) : (
          // EMPTY STATE
          <div className="flex flex-col items-center justify-center pt-24 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
              <History size={32} className="text-zinc-700" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">
              Belum Ada Jejak
            </h3>
            <p className="text-zinc-500 text-xs max-w-[200px] leading-relaxed">
              Semua riwayat jajanmu bakal muncul di sini.
            </p>
            <Link href="/menu">
              <Button className="mt-8 bg-zinc-100 text-black hover:bg-white rounded-xl font-bold px-8 shadow-lg h-11 text-xs active:scale-95 transition-transform">
                Mulai Pesan
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* RATING DIALOG */}
      <Dialog open={!!reviewOrder} onOpenChange={() => setReviewOrder(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[340px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              Gimana Makanannya? 😋
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-500 text-xs">
              Bantu kami jadi lebih baik ya!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2 my-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none transform active:scale-125 transition-transform"
              >
                <Star
                  size={32}
                  className={`${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"} transition-colors`}
                />
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-center font-bold text-orange-500 text-lg">
              {rating === 5
                ? "Sempurna! 😍"
                : rating === 4
                  ? "Enak Kok! 😄"
                  : rating === 3
                    ? "Biasa Aja 🙂"
                    : "Kurang Sip 😔"}
            </div>
            <textarea
              placeholder="Tulis ulasan jujurmu disini..."
              className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmitReview}
            disabled={isSubmittingReview}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 rounded-xl mt-2"
          >
            {isSubmittingReview ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Send size={18} className="mr-2" /> Kirim Ulasan
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* CLEAR CONFIRM DIALOG */}
      <Dialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[320px] rounded-3xl p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-1">
              <AlertTriangle size={24} />
            </div>
            <DialogTitle className="text-lg font-bold">
              Hapus Semua?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Riwayat pesananmu akan hilang selamanya lho.
            </DialogDescription>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => setIsClearAlertOpen(false)}
              className="flex-1 bg-transparent border-zinc-700 text-zinc-300 rounded-xl h-10"
            >
              Batal
            </Button>
            <Button
              onClick={handleClearAllConfirm}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl h-10 shadow-lg"
            >
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
