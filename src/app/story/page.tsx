"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import {
  MapPin,
  Instagram,
  Phone,
  Flag,
  Smile,
  Utensils,
  ArrowRight,
  Share2,
  Copy,
  CheckCircle,
  X,
  Star,
  Send,
  Loader2,
  Lock,
  Calendar,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// --- CSS KHUSUS UNTUK MARQUEE HALUS ---
const style = `
@keyframes marquee {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}
.animate-marquee-smooth {
  display: flex;
  width: max-content;
  animation: marquee 40s linear infinite; /* Durasi lambat agar cinematic */
  will-change: transform; /* Paksa GPU Rendering */
}
.animate-marquee-smooth:hover {
  animation-play-state: paused;
}
/* Optimasi Scroll HP */
.gpu-layer {
  transform: translateZ(0);
  backface-visibility: hidden;
}
`;

// --- TIPE DATA ---
interface StoreData {
  name: string;
  history_title: string;
  history_description: string;
  history_image_url: string;
  address: string;
  map_embed_url: string;
  instagram_url: string;
  whatsapp_number: string;
}

const CACHE_KEY_STORY = "story_data_final_v8";

// --- KOMPONEN KECIL ---
const VerifiedBadge = () => (
  <span className="flex items-center gap-1 text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20">
    <CheckCircle size={8} /> Verified
  </span>
);

const ReviewCard = ({ review }: { review: any }) => (
  <div className="w-[280px] bg-zinc-900/90 border border-white/10 p-4 rounded-2xl flex flex-col justify-between h-auto shadow-lg backdrop-blur-sm mx-3 select-none transition-transform hover:scale-[1.02] duration-300">
    <div>
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={10}
              className={`${i < review.rating ? "fill-orange-500 text-orange-500" : "text-zinc-700"}`}
            />
          ))}
        </div>
        <VerifiedBadge />
      </div>
      <p className="text-zinc-300 text-xs italic line-clamp-3 leading-relaxed mb-3">
        "{review.comment}"
      </p>
    </div>
    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
      <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-inner shrink-0">
        {review.name ? review.name.charAt(0) : "A"}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-[10px] font-bold text-white truncate w-full">
          {review.name || "Pelanggan"}
        </span>
        <span className="text-[9px] text-zinc-500">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  </div>
);

export default function StoryPage() {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [stats, setStats] = useState({ orders: 0, menus: 0, year: 2024 });
  const [gallery, setGallery] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States UX
  const [isCopied, setIsCopied] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");

  // Inject CSS
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = style;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // Title Update
  useEffect(() => {
    if (storeData?.name) document.title = `${storeData.name} - Cerita Kami`;
  }, [storeData]);

  // FETCH DATA WITH INSTANT CACHE
  useEffect(() => {
    const savedName = localStorage.getItem("customer_name");
    if (savedName) setCustomerName(savedName);

    // 1. Load Cache Langsung (Synchronous-like effect)
    const cachedData = sessionStorage.getItem(CACHE_KEY_STORY);
    let hasCache = false;

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setStoreData(parsed.storeData);
        setStats(parsed.stats);
        setGallery(parsed.gallery);
        setReviews(parsed.reviews);
        setIsLoading(false); // Langsung matikan loading jika cache ada
        hasCache = true;
      } catch (e) {
        console.error("Cache corrupted");
      }
    }

    // 2. Fetch Fresh Data (Background Update)
    const fetchData = async () => {
      if (!hasCache) setIsLoading(true); // Hanya loading jika tidak ada cache

      try {
        const [config, gal, rev, countOrders, countMenus] = await Promise.all([
          supabase.from("store_config").select("*").single(),
          supabase.from("gallery").select("*").limit(3),
          supabase
            .from("reviews")
            .select("*")
            .is("is_featured", true)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed"),
          supabase
            .from("menu_items")
            .select("id", { count: "exact", head: true }),
        ]);

        const newStats = {
          orders: countOrders.count || 1200,
          menus: countMenus.count || 40,
          year:
            new Date(config.data?.created_at || new Date()).getFullYear() ||
            2024,
        };

        const newData = {
          storeData: config.data,
          stats: newStats,
          gallery: gal.data || [],
          reviews: rev.data || [],
        };

        // Update state hanya jika data berubah (React akan handle diffing)
        setStoreData(config.data);
        setStats(newStats);
        setGallery(gal.data || []);
        setReviews(rev.data || []);

        sessionStorage.setItem(CACHE_KEY_STORY, JSON.stringify(newData));
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- HANDLERS ---
  const handleOpenReviewModal = async () => {
    if (!customerName) {
      toast.error("Siapa namamu?", {
        description: "Pesan dulu yuk biar kenal!",
      });
      return;
    }
    setIsSubmitting(true);
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_name", customerName)
      .eq("status", "completed")
      .limit(1);
    setIsSubmitting(false);
    if (data && data.length > 0) {
      setIsReviewModalOpen(true);
    } else {
      toast.error("Belum bisa review", {
        description: "Selesaikan 1 pesanan dulu ya!",
        icon: <Lock size={16} />,
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!userComment.trim()) {
      toast.error("Isi komentar dulu!");
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase
      .from("reviews")
      .insert({
        name: customerName,
        rating: userRating,
        comment: userComment,
        is_featured: false,
      });
    if (!error) {
      toast.success("Terkirim! 🎉", {
        description: "Menunggu moderasi admin.",
      });
      setIsReviewModalOpen(false);
      setUserComment("");
      setUserRating(5);
    } else {
      toast.error("Gagal kirim.");
    }
    setIsSubmitting(false);
  };

  const handleCopyAddress = () => {
    if (storeData?.address) {
      navigator.clipboard.writeText(storeData.address);
      setIsCopied(true);
      if (navigator.vibrate) navigator.vibrate(50);
      toast.success("Alamat disalin! 📋");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // --- RENDER ---
  return (
    <MobileLayout>
      {/* HERO SECTION (Optimized: No heavy transforms on scroll) */}
      <div className="relative h-[420px] w-full overflow-hidden bg-zinc-950 gpu-layer">
        <div className="absolute inset-0 w-full h-full">
          {isLoading && !storeData ? (
            <Skeleton className="w-full h-full bg-zinc-800" />
          ) : (
            <Image
              src={
                storeData?.history_image_url ||
                "https://images.unsplash.com/photo-1555126634-323283e090fa"
              }
              alt="Story Cover"
              fill
              className="object-cover opacity-60"
              priority={true}
              sizes="(max-width: 768px) 100vw, 600px"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 pb-32 z-10">
          <div className="animate-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/20 border border-orange-500/50 backdrop-blur-md text-orange-400 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 shadow-lg">
              <Flag size={10} fill="currentColor" /> Since {stats.year}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4 drop-shadow-2xl max-w-[90%]">
              {storeData?.history_title || "Perjalanan Rasa"}
            </h1>
            <p className="text-zinc-300 text-sm font-light leading-relaxed opacity-90 line-clamp-4 max-w-[95%]">
              {storeData?.history_description ||
                "Sebuah cerita tentang rasa, dedikasi, dan kehangatan."}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-10 space-y-12 bg-zinc-950 min-h-screen relative z-20 rounded-t-[2.5rem] -mt-20 border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {/* STATS */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h3 className="text-white font-bold text-lg">Pencapaian Kami 🚀</h3>
          </div>

          <div className="grid gap-3">
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                  Tahun Berdiri
                </span>
                <span className="text-2xl font-black text-white">
                  {stats.year}
                </span>
              </div>
              <div className="bg-zinc-900 p-3 rounded-xl text-orange-500 border border-zinc-800">
                <Flag size={20} />
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                  Pelanggan Happy
                </span>
                <span className="text-2xl font-black text-white">
                  {stats.orders > 1000
                    ? (stats.orders / 1000).toFixed(1) + "K+"
                    : stats.orders}
                </span>
              </div>
              <div className="bg-zinc-900 p-3 rounded-xl text-orange-500 border border-zinc-800">
                <Smile size={20} />
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                  Total Menu
                </span>
                <span className="text-2xl font-black text-white">
                  {stats.menus}+
                </span>
              </div>
              <div className="bg-zinc-900 p-3 rounded-xl text-orange-500 border border-zinc-800">
                <Utensils size={20} />
              </div>
            </div>
          </div>
        </section>

        {/* GALLERY (Lightweight) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Instagram className="text-pink-500" /> Galeri Momen
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {isLoading && gallery.length === 0 ? (
              <Skeleton className="h-40 w-full rounded-xl bg-zinc-900 col-span-2" />
            ) : (
              gallery.map((item, idx) => (
                <div
                  key={item.id}
                  className={`relative rounded-xl overflow-hidden bg-zinc-900 h-40 border border-white/5 ${idx === 0 ? "col-span-2" : "col-span-1"}`}
                >
                  <Image
                    src={item.image_url}
                    alt="Gallery"
                    fill
                    className="object-cover opacity-90"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {/* REVIEWS MARQUEE (SMOOTH LOOP) */}
        <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-5 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <h3 className="text-white font-bold text-lg">Kata Mereka ❤️</h3>
              <p className="text-[10px] text-zinc-400">
                Cerita asli dari pelanggan.
              </p>
            </div>
            <Button
              onClick={handleOpenReviewModal}
              size="sm"
              className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] h-8 rounded-full shadow-lg"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-3 w-3" />
              ) : (
                <>
                  <Send size={12} className="mr-1.5" /> Tulis Ulasan
                </>
              )}
            </Button>
          </div>

          {/* MARQUEE CONTAINER */}
          <div className="relative w-full overflow-hidden mask-linear-fade">
            {reviews.length > 0 ? (
              <div className="animate-marquee-smooth">
                {/* Render Original */}
                {reviews.map((r, i) => (
                  <ReviewCard key={`orig-${i}`} review={r} />
                ))}
                {/* Render Duplicate for Seamless Loop */}
                {reviews.map((r, i) => (
                  <ReviewCard key={`dup-${i}`} review={r} />
                ))}
                {/* Render Triplicate if items are few, to ensure full width cover */}
                {reviews.length < 5 &&
                  reviews.map((r, i) => (
                    <ReviewCard key={`tri-${i}`} review={r} />
                  ))}
              </div>
            ) : (
              <div className="w-full text-center py-4 text-zinc-600 text-xs italic">
                Belum ada ulasan pilihan.
              </div>
            )}
          </div>
        </section>

        {/* LOCATION */}
        <section className="space-y-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <MapPin className="text-orange-500" /> Lokasi
          </h3>
          <div
            onClick={handleCopyAddress}
            className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-white/5 cursor-pointer active:scale-95 transition-all hover:border-orange-500/30"
          >
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                Alamat
              </span>
              <p className="text-sm text-zinc-300 font-medium truncate">
                {storeData?.address || "..."}
              </p>
            </div>
            <div className="text-zinc-500 bg-zinc-800 p-2 rounded-full">
              <Copy size={16} />
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/10 h-48 bg-zinc-900 relative group">
            {storeData?.map_embed_url && (
              <iframe
                src={storeData.map_embed_url}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                className="grayscale opacity-60 group-hover:grayscale-0 transition-all duration-700"
              />
            )}
            <a
              href={`http://maps.google.com/?q=${encodeURIComponent(storeData?.address || "")}`}
              target="_blank"
              className="absolute bottom-3 right-3 bg-white text-black px-4 py-2 rounded-full text-[10px] font-bold shadow-xl flex items-center gap-2 z-10 active:scale-90"
            >
              Buka Peta <ArrowRight size={12} />
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <div className="pt-6 border-t border-white/5 pb-20">
          <div className="flex justify-center gap-4 mb-6">
            <a
              href={storeData?.instagram_url}
              target="_blank"
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-pink-500"
            >
              <Instagram size={22} />
            </a>
            <a
              href={`https://wa.me/${storeData?.whatsapp_number}`}
              target="_blank"
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-green-500"
            >
              <Phone size={22} />
            </a>
            <button
              onClick={() =>
                navigator.share?.({
                  title: storeData?.name,
                  url: window.location.href,
                })
              }
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-blue-500"
            >
              <Share2 size={22} />
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-600">
            © {new Date().getFullYear()} {storeData?.name || "Angkringan"}.
            <br />
            All Rights Reserved.
          </p>
        </div>
      </div>

      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[320px] rounded-3xl p-6">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-center text-xl font-bold">
              Beri Penilaian 🌟
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-zinc-500">
              Gimana pengalamanmu?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  className="focus:outline-none active:scale-90"
                >
                  <Star
                    size={32}
                    className={`${star <= userRating ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"}`}
                  />
                </button>
              ))}
            </div>
            <div className="w-full">
              <Textarea
                placeholder="Tempatnya asik, makanannya enak!"
                className="bg-zinc-900 border-zinc-800 rounded-xl text-sm min-h-[80px]"
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                maxLength={150}
              />
              <p className="text-[10px] text-zinc-600 text-right mt-1">
                {userComment.length}/150
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-500 font-bold rounded-xl h-11"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Kirim Ulasan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
