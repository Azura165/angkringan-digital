"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useTransition,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  Star,
  Search,
  Trash2,
  Heart,
  Loader2,
  Store,
  Utensils,
  Reply,
  ChevronDown,
  AlertTriangle,
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
import Image from "next/image";

// --- TYPES ---
interface Review {
  id: number;
  created_at: string;
  name: string;
  rating: number;
  comment: string;
  is_featured: boolean;
  reply?: string;
  menu_id?: number;
  menu_items?: { name: string; image: string };
}

const ITEMS_PER_PAGE = 10;

// --- UTILS ---
const RatingStars = memo(({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={12}
        className={`${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"}`}
      />
    ))}
  </div>
));
RatingStars.displayName = "RatingStars";

const timeAgo = (dateStr: string) => {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(dateStr).getTime()) / 1000,
  );
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " thn lalu";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " bln lalu";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " hr lalu";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " jam lalu";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mnt lalu";
  return "Baru saja";
};

// --- OPTIMIZED COMPONENT: REVIEW CARD ---
const ReviewCard = memo(
  ({
    review,
    showMenuContext,
    onToggleFeatured,
    onDelete,
    onReply,
  }: {
    review: Review;
    showMenuContext: boolean;
    onToggleFeatured: (id: number, status: boolean) => void;
    onDelete: (id: number) => void;
    onReply: (review: Review) => void;
  }) => {
    return (
      <div
        className={`p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${review.is_featured ? "bg-zinc-900/80 border-red-500/30 shadow-lg shadow-red-900/10" : "bg-zinc-900/40 border-white/5"}`}
      >
        {showMenuContext && review.menu_items && (
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-dashed border-white/10">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
              {review.menu_items.image ? (
                <Image
                  src={review.menu_items.image}
                  alt="menu"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <Utensils className="m-auto text-zinc-600" size={12} />
              )}
            </div>
            <p className="text-xs font-bold text-white line-clamp-1">
              {review.menu_items.name}
            </p>
          </div>
        )}

        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-inner shrink-0 ${review.rating >= 4 ? "bg-gradient-to-tr from-green-600 to-emerald-600" : review.rating <= 2 ? "bg-gradient-to-tr from-red-600 to-orange-600" : "bg-gradient-to-tr from-blue-600 to-cyan-600"}`}
            >
              {review.name.substring(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight truncate">
                {review.name}
              </h4>
              <span className="text-[9px] text-zinc-500">
                {timeAgo(review.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={() => onToggleFeatured(review.id, review.is_featured)}
            className={`p-2 rounded-full transition-colors active:scale-90 ${review.is_featured ? "text-red-500 bg-red-500/10" : "text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400"}`}
          >
            <Heart
              size={14}
              className={review.is_featured ? "fill-current" : ""}
            />
          </button>
        </div>

        <div className="mb-2">
          <RatingStars rating={review.rating} />
        </div>

        <div className="relative pl-3 border-l-2 border-zinc-800 mb-3">
          <p className="text-xs text-zinc-300 italic leading-relaxed line-clamp-4">
            "{review.comment}"
          </p>
        </div>

        {review.reply ? (
          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 flex gap-2 mb-3">
            <div className="w-0.5 bg-orange-500 rounded-full shrink-0" />
            <div>
              <p className="text-[9px] font-bold text-orange-500 mb-0.5">
                Balasan Admin
              </p>
              <p className="text-[10px] text-zinc-400 leading-snug">
                {review.reply}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-white/5">
          <Button
            onClick={() => onDelete(review.id)}
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={12} />
          </Button>
          <Button
            onClick={() => onReply(review)}
            size="sm"
            variant="outline"
            className={`h-7 text-[10px] border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 ${review.reply ? "opacity-70" : ""}`}
          >
            <Reply size={10} className="mr-1.5" />{" "}
            {review.reply ? "Edit" : "Balas"}
          </Button>
        </div>
      </div>
    );
  },
);
ReviewCard.displayName = "ReviewCard";

// --- MAIN PAGE ---
export default function AdminReviewsPage() {
  const [storeReviews, setStoreReviews] = useState<Review[]>([]);
  const [menuReviews, setMenuReviews] = useState<Review[]>([]);
  const [hasMoreStore, setHasMoreStore] = useState(true);
  const [hasMoreMenu, setHasMoreMenu] = useState(true);

  // Use simple string state for instant switching
  const [activeTab, setActiveTab] = useState<"store" | "menu">("store");
  const [isPending, startTransition] = useTransition(); // Optimization for concurrent rendering

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filter, setFilter] = useState<
    "all" | "featured" | "positive" | "negative"
  >("all");
  const [search, setSearch] = useState("");

  const [replyId, setReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- INITIAL FETCH (PARALLEL) ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);

    const fetchType = async (isStore: boolean) => {
      let query = supabase
        .from("reviews")
        .select("*, menu_items(name, image)")
        .order("created_at", { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);
      if (isStore) query = query.is("menu_id", null);
      else query = query.not("menu_id", "is", null);
      const { data } = await query;
      return (data as Review[]) || [];
    };

    const [storeData, menuData] = await Promise.all([
      fetchType(true),
      fetchType(false),
    ]);

    setStoreReviews(storeData);
    setMenuReviews(menuData);
    setHasMoreStore(storeData.length >= ITEMS_PER_PAGE);
    setHasMoreMenu(menuData.length >= ITEMS_PER_PAGE);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Load More Function
  const loadMore = async () => {
    const isStore = activeTab === "store";
    const currentLen = isStore ? storeReviews.length : menuReviews.length;

    setLoadingMore(true);
    let query = supabase
      .from("reviews")
      .select("*, menu_items(name, image)")
      .order("created_at", { ascending: false })
      .range(currentLen, currentLen + ITEMS_PER_PAGE - 1);
    if (isStore) query = query.is("menu_id", null);
    else query = query.not("menu_id", "is", null);

    const { data } = await query;
    if (data) {
      const newData = data as Review[];
      if (isStore) {
        setStoreReviews((prev) => [...prev, ...newData]);
        setHasMoreStore(newData.length >= ITEMS_PER_PAGE);
      } else {
        setMenuReviews((prev) => [...prev, ...newData]);
        setHasMoreMenu(newData.length >= ITEMS_PER_PAGE);
      }
    }
    setLoadingMore(false);
  };

  // Realtime Update (Sync with Home)
  useEffect(() => {
    const channel = supabase
      .channel("admin-reviews-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newReview = payload.new as Review;
            // Simple logic: insert to top based on type
            if (!newReview.menu_id)
              setStoreReviews((prev) => [newReview, ...prev]);
            else setMenuReviews((prev) => [newReview, ...prev]);
            toast.info("Ulasan baru masuk! 🔔");
          } else if (payload.eventType === "DELETE") {
            setStoreReviews((prev) =>
              prev.filter((r) => r.id !== payload.old.id),
            );
            setMenuReviews((prev) =>
              prev.filter((r) => r.id !== payload.old.id),
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Review;
            const updater = (list: Review[]) =>
              list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r));
            setStoreReviews(updater);
            setMenuReviews(updater);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- ACTIONS ---
  // FIX: Fungsi ini sebelumnya hilang, sekarang sudah ditambahkan!
  const handleOpenReply = useCallback((review: Review) => {
    setReplyId(review.id);
    setReplyText(review.reply || "");
    setIsModalOpen(true);
  }, []);

  const handleToggleFeatured = useCallback(
    async (id: number, currentStatus: boolean) => {
      const updater = (list: Review[]) =>
        list.map((r) =>
          r.id === id ? { ...r, is_featured: !currentStatus } : r,
        );
      setStoreReviews(updater);
      setMenuReviews(updater); // Update both lists (safe)
      if (navigator.vibrate) navigator.vibrate(50);
      const { error } = await supabase
        .from("reviews")
        .update({ is_featured: !currentStatus })
        .eq("id", id);
      if (error) toast.error("Gagal update DB");
      else
        toast.success(
          currentStatus ? "Dihapus dari Story" : "Ditambahkan ke Story ❤️",
        );
    },
    [],
  );

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    if (navigator.vibrate) navigator.vibrate(100);
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", deleteId);
    if (!error) {
      setStoreReviews((prev) => prev.filter((r) => r.id !== deleteId));
      setMenuReviews((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success("Ulasan dihapus");
    } else {
      toast.error("Gagal hapus");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const handleSendReply = async () => {
    if (!replyId) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("reviews")
      .update({ reply: replyText })
      .eq("id", replyId);
    if (!error) {
      const updater = (list: Review[]) =>
        list.map((r) => (r.id === replyId ? { ...r, reply: replyText } : r));
      setStoreReviews(updater);
      setMenuReviews(updater);
      toast.success("Balasan terkirim!");
      setIsModalOpen(false);
    } else {
      toast.error("Gagal kirim.");
    }
    setIsSubmitting(false);
  };

  // --- STATS CALCULATION (MEMOIZED) ---
  const activeData = activeTab === "store" ? storeReviews : menuReviews;

  const stats = useMemo(() => {
    const total = activeData.length;
    const avg =
      total > 0
        ? (activeData.reduce((a, b) => a + b.rating, 0) / total).toFixed(1)
        : "0.0";
    const featured = activeData.filter((r) => r.is_featured).length;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: activeData.filter((r) => Math.round(r.rating) === star).length,
    }));
    return { total, avg, featured, distribution };
  }, [activeData]); // Only recalc when data changes

  // Filtering
  const displayedReviews = useMemo(() => {
    let data = activeData;
    if (filter === "featured") data = data.filter((r) => r.is_featured);
    if (filter === "positive") data = data.filter((r) => r.rating >= 4);
    if (filter === "negative") data = data.filter((r) => r.rating <= 3);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.comment.toLowerCase().includes(q) ||
          r.menu_items?.name.toLowerCase().includes(q),
      );
    }
    return data;
  }, [activeData, filter, search]);

  const activeReplyReview = useMemo(
    () =>
      storeReviews.find((r) => r.id === replyId) ||
      menuReviews.find((r) => r.id === replyId),
    [replyId, storeReviews, menuReviews],
  );

  // Handle Tab Change (Instant)
  const switchTab = (tab: "store" | "menu") => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* HEADER STATS (MOBILE OPTIMIZED) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Scorecard */}
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-3xl -mr-5 -mt-5" />
          <div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">
              {activeTab === "store" ? "Rating Toko" : "Rating Menu"}
            </p>
            <div className="flex items-end gap-2">
              <h2 className="text-4xl font-black text-white">{stats.avg}</h2>
              <span className="text-sm text-zinc-500 mb-1.5">/ 5.0</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex gap-1 mb-2 justify-end">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={16}
                  className={`fill-orange-500 ${i <= Math.round(parseFloat(stats.avg)) ? "text-orange-500" : "text-zinc-800 fill-zinc-800"}`}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-400">{stats.total} Ulasan</p>
          </div>
        </div>

        {/* Distribution (Hidden on small mobile to save space, visible on MD+) */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-center gap-1.5 hidden sm:flex">
          {stats.distribution.slice(0, 3).map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-xs">
              <span className="w-3 flex items-center gap-0.5 text-zinc-400">
                {d.star}
                <Star size={8} />
              </span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(d.count / (stats.total || 1)) * 100}%` }}
                />
              </div>
              <span className="text-zinc-500 tabular-nums w-6 text-right">
                {d.count}
              </span>
            </div>
          ))}
        </div>

        {/* Featured Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between md:flex-col md:justify-center md:items-center md:text-center">
          <div className="flex items-center gap-3 md:flex-col md:gap-2">
            <div className="bg-red-500/10 p-2.5 rounded-full text-red-500">
              <Heart size={20} className="fill-red-500/20" />
            </div>
            <div className="text-left md:text-center">
              <h3 className="text-xl font-bold text-white leading-none">
                {stats.featured}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Masuk Story</p>
            </div>
          </div>
          {/* Mobile Only Extra Info */}
          <div className="md:hidden text-[10px] text-zinc-600 italic">
            Konten Pilihan
          </div>
        </div>
      </div>

      {/* CONTROLS (STICKY) */}
      <div className="sticky top-[70px] z-20 bg-zinc-950/90 backdrop-blur-xl py-2 -mx-4 px-4 flex flex-col gap-3 border-b border-white/5 shadow-sm">
        <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 grid grid-cols-2 gap-1">
          <button
            onClick={() => switchTab("store")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "store" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Store size={14} /> Toko
          </button>
          <button
            onClick={() => switchTab("menu")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "menu" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Utensils size={14} /> Menu
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {["all", "featured", "positive", "negative"].map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f as any)}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className={`rounded-full h-7 text-[10px] capitalize whitespace-nowrap px-3 ${filter === f ? "bg-white text-black font-bold" : "border-zinc-800 text-zinc-400 bg-zinc-900/50"}`}
            >
              {f === "featured" && (
                <Heart size={10} className="mr-1 fill-current" />
              )}{" "}
              {f}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <Input
            placeholder="Cari ulasan..."
            className="pl-9 bg-zinc-900 border-zinc-800 rounded-xl h-9 text-xs focus:ring-1 focus:ring-orange-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* LIST (INSTANT SWITCH) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-pulse"
            />
          ))
        ) : displayedReviews.length > 0 ? (
          displayedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              showMenuContext={activeTab === "menu"}
              onToggleFeatured={handleToggleFeatured}
              onDelete={setDeleteId}
              onReply={handleOpenReply}
            />
          ))
        ) : (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center opacity-50">
            <div className="bg-zinc-900 p-4 rounded-full mb-3">
              <Search size={24} className="text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-xs">Tidak ada ulasan ditemukan.</p>
          </div>
        )}
      </div>

      {!isLoading &&
        !search &&
        ((activeTab === "store" && hasMoreStore) ||
          (activeTab === "menu" && hasMoreMenu)) && (
          <div className="flex justify-center pt-4 pb-8">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
              className="bg-zinc-900 border-zinc-800 text-zinc-400 w-full md:w-auto h-10 rounded-xl"
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

      {/* MODALS */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm rounded-2xl p-5">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-sm">Balas Ulasan</DialogTitle>
            <DialogDescription className="text-[10px]">
              Tanggapan Anda akan muncul di aplikasi.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 mb-3">
            <p className="text-xs text-zinc-400 italic line-clamp-3">
              "{activeReplyReview?.comment}"
            </p>
          </div>
          <textarea
            placeholder="Tulis balasan..."
            className="w-full h-24 bg-black border border-zinc-700 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none resize-none"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <DialogFooter className="mt-2">
            <Button
              onClick={handleSendReply}
              disabled={isSubmitting || !replyText}
              className="w-full bg-orange-600 hover:bg-orange-500 h-9 text-xs"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin w-3 h-3" />
              ) : (
                "Kirim Balasan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[280px] rounded-3xl p-6">
          <DialogHeader className="flex flex-col items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-center text-base">
              Hapus Permanen?
            </DialogTitle>
            <DialogDescription className="text-center text-[10px] text-zinc-500">
              Data ulasan akan hilang dan tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="flex-1 bg-transparent border-zinc-700 hover:bg-zinc-900 h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white h-9 text-xs border-0"
            >
              {isDeleting ? (
                <Loader2 className="animate-spin h-3 w-3" />
              ) : (
                "Ya, Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
