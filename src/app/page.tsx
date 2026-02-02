"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { FloatingCart } from "@/components/features/cart/FloatingCart";
import { useCart, MenuItem } from "@/hooks/use-cart";
import {
  Megaphone,
  Utensils,
  Coffee,
  Flame,
  Cookie,
  MapPin,
  Smile,
  Mail,
  Medal,
  ThumbsUp,
  Wifi,
  HelpCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Star,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  TicketPercent,
  Copy,
  Send,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
  Suspense,
  useMemo,
  memo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HomeProductCard } from "@/components/features/home/HomeProductCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ProductDetailModal = dynamic(
  () =>
    import("@/components/features/menu/ProductDetailModal").then(
      (mod) => mod.ProductDetailModal,
    ),
  { ssr: false, loading: () => null },
);

// --- CSS GLOBAL ---
const GLOBAL_STYLES = `
  @keyframes marquee-linear {
    0% { transform: translate3d(0, 0, 0); }
    100% { transform: translate3d(-50%, 0, 0); }
  }
  .animate-marquee-smooth {
    display: flex;
    width: max-content; 
    animation: marquee-linear 40s linear infinite; 
    will-change: transform; 
  }
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
  }
`;

// --- TYPES ---
interface HomeMenuItem extends MenuItem {
  description: string;
  rating: number;
  ratingCount?: number;
  originalPrice?: number;
  image: string;
  isAvailable?: boolean;
}

interface Promo {
  id: number;
  code: string;
  description: string;
  discount_amount: number;
  discount_type: "percentage" | "fixed";
  min_purchase: number;
  is_active: boolean;
}

interface StoreInfo {
  name: string;
  address: string;
  open_hour: string | null;
  close_hour: string | null;
  running_text: string;
  isOpenNow: boolean;
  ratingAvg: string;
  ratingCount: number;
}

interface HomeDataCache {
  recommendedItems: HomeMenuItem[];
  newItems: HomeMenuItem[];
  promos: Promo[];
  pedasItems: HomeMenuItem[];
  segarItems: HomeMenuItem[];
  kenyangItems: HomeMenuItem[];
  cemilanItems: HomeMenuItem[];
}

// --- CONSTANTS ---
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1519690889869-e705e59f72e1?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=600&auto=format&fit=crop",
];

const PROMO_STYLES = [
  "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600",
  "bg-gradient-to-br from-pink-600 via-rose-600 to-red-600",
  "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600",
  "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500",
];

const CACHE_KEY_STORE = "store_config_cache_v7";
const CACHE_KEY_HOME_DATA = "home_data_cache_v10";

// --- HELPER ---
const formatRupiahCompact = (num: number) => {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
};

// Helper Load Cache (Safe for SSR)
const loadCache = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

// --- SUB-COMPONENT: PROMO CARD ---
const PromoCard = memo(({ promo, index }: { promo: Promo; index: number }) => {
  const bgStyle = PROMO_STYLES[index % PROMO_STYLES.length];

  const handleCopy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(promo.code);
      toast.success("Kode Voucher Disalin! 🎟️");
    } else {
      toast.info(`Kode: ${promo.code}`);
    }
  };

  return (
    <div
      onClick={handleCopy}
      className={`snap-center min-w-[280px] h-[110px] rounded-2xl relative overflow-hidden shadow-lg cursor-pointer active:scale-[0.98] transition-all duration-300 group ${bgStyle}`}
    >
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none" />
      <div className="relative z-10 h-full flex flex-col justify-between p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-white border border-white/20 flex items-center gap-1 shadow-sm">
                <TicketPercent size={10} /> {promo.code}
              </span>
              {promo.min_purchase > 0 && (
                <span className="text-[9px] text-white/90 font-medium">
                  Min. {formatRupiahCompact(promo.min_purchase)}
                </span>
              )}
            </div>
            <h4 className="text-white font-black text-2xl leading-none drop-shadow-md tracking-tight">
              {promo.discount_type === "percentage"
                ? `${promo.discount_amount}% OFF`
                : `Hemat ${formatRupiahCompact(promo.discount_amount)}`}
            </h4>
          </div>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white group-hover:text-purple-600 transition-colors text-white">
            <Copy size={14} />
          </div>
        </div>
        <div className="flex justify-between items-end border-t border-white/10 pt-2 mt-1">
          <p className="text-white/80 text-[10px] font-medium line-clamp-1 max-w-[70%]">
            {promo.description || "Potongan spesial!"}
          </p>
          <span className="text-[9px] font-bold text-white bg-black/20 px-2 py-0.5 rounded-full">
            Salin Kode
          </span>
        </div>
      </div>
    </div>
  );
});
PromoCard.displayName = "PromoCard";

// --- HOME CONTENT ---
function HomeContent() {
  const { addToCart } = useCart();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Refs
  const topRef = useRef<HTMLDivElement>(null);
  const pedasRef = useRef<HTMLDivElement>(null);
  const segarRef = useRef<HTMLDivElement>(null);
  const kenyangRef = useRef<HTMLDivElement>(null);
  const cemilanRef = useRef<HTMLDivElement>(null);

  // --- STATE INIT WITH LAZY CACHE (INSTANT LOAD) ---
  const [data, setData] = useState<HomeDataCache>(() =>
    loadCache<HomeDataCache>(CACHE_KEY_HOME_DATA, {
      recommendedItems: [],
      newItems: [],
      promos: [],
      pedasItems: [],
      segarItems: [],
      kenyangItems: [],
      cemilanItems: [],
    }),
  );

  const [storeInfo, setStoreInfo] = useState<StoreInfo>(() =>
    loadCache<StoreInfo>(CACHE_KEY_STORE, {
      name: "Angkringan...",
      address: "Lokasi...",
      open_hour: null,
      close_hour: null,
      running_text: "Selamat Datang!",
      isOpenNow: false,
      ratingAvg: "5.0",
      ratingCount: 0,
    }),
  );

  // UX State
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    // If cache exists, we are NOT loading initially
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem(CACHE_KEY_HOME_DATA)
    ) {
      return false;
    }
    return true;
  });

  const [activeTable, setActiveTable] = useState<{
    id: number;
    number: string;
    section: string;
  } | null>(null);
  const [isTableValidating, setIsTableValidating] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [greeting, setGreeting] = useState("Halo");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<HomeMenuItem | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formatter (Memoized)
  const formatMenuItem = useCallback(
    (item: any): HomeMenuItem => ({
      id: item.id.toString(),
      name: item.name,
      description: item.description || "Menu andalan kami.",
      price: item.price,
      originalPrice: item.original_price || 0,
      rating: item.rating_avg || 5.0,
      ratingCount: item.rating_count || 0,
      image: item.image_url || "",
      isAvailable: item.is_available ?? true,
    }),
    [],
  );

  // --- FETCH DATA (REVALIDATE) ---
  const fetchData = useCallback(async () => {
    try {
      const LIMIT = 7;
      const [
        rec,
        brandNew,
        promo,
        conf,
        pedas,
        segar,
        kenyang,
        cemilan,
        reviews,
      ] = await Promise.all([
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .eq("is_recommended", true)
          .limit(LIMIT),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("id", { ascending: false })
          .limit(LIMIT),
        supabase
          .from("promos")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("store_config").select("*").single(),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .contains("tags", ["Pedas"])
          .limit(LIMIT),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .eq("category_id", 3)
          .limit(LIMIT),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .contains("tags", ["Berat"])
          .limit(LIMIT),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .eq("category_id", 4)
          .limit(LIMIT),
        supabase.from("reviews").select("rating"),
      ]);

      const fmt = (d: any[]) => (d ? d.map(formatMenuItem) : []);

      const newData: HomeDataCache = {
        recommendedItems: fmt(rec.data || []),
        newItems: fmt(brandNew.data || []),
        promos: promo.data || [],
        pedasItems: fmt(pedas.data || []),
        segarItems: fmt(segar.data || []),
        kenyangItems: fmt(kenyang.data || []),
        cemilanItems: fmt(cemilan.data || []),
      };

      setData(newData);
      sessionStorage.setItem(CACHE_KEY_HOME_DATA, JSON.stringify(newData));

      const allRatings = reviews.data || [];
      const avgRating =
        allRatings.length > 0
          ? (
              allRatings.reduce((a, b) => a + b.rating, 0) / allRatings.length
            ).toFixed(1)
          : "5.0";

      if (conf.data) {
        const now = new Date();
        const curTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        const isOpen =
          curTime >= (conf.data.open_hour || "00:00") &&
          curTime <= (conf.data.close_hour || "23:59");

        const newStore = {
          name: conf.data.store_name || "Angkringan Digital",
          address: conf.data.address || "Jl. Angkringan No. 1",
          open_hour: conf.data.open_hour,
          close_hour: conf.data.close_hour,
          running_text: conf.data.running_text || "Selamat Datang!",
          isOpenNow: isOpen,
          ratingAvg: avgRating,
          ratingCount: allRatings.length,
        };
        setStoreInfo(newStore);
        sessionStorage.setItem(CACHE_KEY_STORE, JSON.stringify(newStore));
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsInitialLoading(false);
    }
  }, [formatMenuItem]);

  // Effects
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 11
        ? "Selamat Pagi ☀️"
        : h < 15
          ? "Selamat Siang 🌤️"
          : h < 18
            ? "Selamat Sore 🌇"
            : "Selamat Malam 🌙",
    );
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    const interval = setInterval(
      () => setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length),
      5000,
    );

    fetchData(); // Trigger Revalidate

    // REALTIME PROMO SYNC
    const promoSub = supabase
      .channel("home-promos-final-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promos" },
        async () => {
          const { data: newPromos } = await supabase
            .from("promos")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          if (newPromos) {
            setData((prev) => {
              const updated = { ...prev, promos: newPromos as Promo[] };
              sessionStorage.setItem(
                CACHE_KEY_HOME_DATA,
                JSON.stringify(updated),
              );
              return updated;
            });
          }
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
      supabase.removeChannel(promoSub);
    };
  }, [fetchData]);

  // Table Logic
  useEffect(() => {
    const tableId = searchParams.get("table");
    const tableToken = searchParams.get("token");
    if (tableId && tableToken) {
      const validate = async () => {
        setIsTableValidating(true);
        const { data } = await supabase
          .from("tables")
          .select("id, table_number, section, qr_token")
          .eq("id", tableId)
          .eq("qr_token", tableToken)
          .single();
        if (data) {
          const tData = {
            id: data.id,
            number: data.table_number,
            section: data.section,
          };
          setActiveTable(tData);
          sessionStorage.setItem("active_table_session", JSON.stringify(tData));
          localStorage.setItem("customer_table_id", data.id.toString());
          toast.success("Check-in Berhasil ✅");
          router.replace("/");
        } else {
          toast.error("QR Code Salah 🚫");
        }
        setIsTableValidating(false);
      };
      validate();
    } else {
      const saved = sessionStorage.getItem("active_table_session");
      if (saved) setActiveTable(JSON.parse(saved));
    }
  }, [searchParams, router]);

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const handleProductClick = (product: HomeMenuItem) => {
    if (product.isAvailable) {
      startTransition(() => {
        setSelectedProduct(product);
        setIsModalOpen(true);
      });
    } else {
      toast.error("Stok habis kak 🥲");
    }
  };
  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    if (product.isAvailable) {
      addToCart(product);
      if (navigator.vibrate) navigator.vibrate(50);
      toast.success("Masuk keranjang! 🛒");
    }
  };

  // --- CAROUSEL ---
  const SectionCarousel = ({
    title,
    items,
    linkQuery,
    refObj,
  }: {
    title: string;
    items: HomeMenuItem[];
    linkQuery: string;
    refObj?: any;
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const scroll = (d: "left" | "right") =>
      scrollRef.current?.scrollBy({
        left: d === "left" ? -200 : 200,
        behavior: "smooth",
      });
    return (
      <section
        ref={refObj}
        className="pt-6 px-5 scroll-mt-20 border-t border-white/5 relative group/section"
      >
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <Link
            href={`/menu?q=${linkQuery}`}
            className="text-[10px] text-orange-500 font-bold hover:underline flex items-center gap-1"
          >
            Lihat Semua <ArrowRight size={10} />
          </Link>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 left-2 z-20 hidden md:group-hover/section:block">
          <button
            onClick={() => scroll("left")}
            className="bg-black/50 p-2 rounded-full text-white hover:bg-orange-500 backdrop-blur-sm"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20 hidden md:group-hover/section:block">
          <button
            onClick={() => scroll("right")}
            className="bg-black/50 p-2 rounded-full text-white hover:bg-orange-500 backdrop-blur-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory transform-gpu"
        >
          {isInitialLoading && items.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="min-w-[160px] h-56 rounded-[1.5rem] bg-zinc-900"
              />
            ))
          ) : items.length > 0 ? (
            items.map((p) => (
              <div
                key={p.id}
                className="min-w-[160px] max-w-[160px] snap-center"
              >
                <HomeProductCard
                  product={p}
                  isHorizontal={false}
                  showLove={false}
                  onClick={() => handleProductClick(p)}
                  onQuickAdd={(e) => handleQuickAdd(e, p)}
                />
              </div>
            ))
          ) : (
            <div className="w-full text-center text-xs text-zinc-500 py-6 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center gap-2">
              <Utensils size={24} className="opacity-20" />
              <span>Menu habis kak</span>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <MobileLayout>
      <style jsx global>
        {GLOBAL_STYLES}
      </style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            name: storeInfo.name,
            image: HERO_IMAGES[0],
            address: {
              "@type": "PostalAddress",
              streetAddress: storeInfo.address,
              addressCountry: "ID",
            },
          }),
        }}
      />

      {/* HEADER & HERO */}
      {isTableValidating ? (
        <div className="fixed top-20 left-4 right-4 z-50 bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-orange-500/50 flex items-center gap-3 animate-in slide-in-from-top-5 shadow-2xl">
          <Loader2 className="animate-spin text-orange-500" size={20} />
          <p className="text-white text-sm font-bold">Verifikasi Meja...</p>
        </div>
      ) : (
        activeTable && (
          <div className="fixed top-16 left-4 right-4 z-40 animate-in slide-in-from-top-5 duration-500">
            <div className="bg-zinc-900/90 backdrop-blur-md border border-emerald-500/30 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/20">
                  <QrCode className="text-emerald-400" size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <CheckCircle2 size={10} /> TERHUBUNG
                  </p>
                  <p className="text-white font-black text-sm">
                    {activeTable.number}{" "}
                    <span className="text-zinc-500 font-normal text-[10px]">
                      ({activeTable.section})
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm("Keluar meja?")) {
                    setActiveTable(null);
                    sessionStorage.removeItem("active_table_session");
                  }
                }}
                className="bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 p-2 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )
      )}

      <section
        ref={topRef}
        className="relative h-[340px] w-full overflow-hidden bg-zinc-900"
      >
        {HERO_IMAGES.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === heroIndex ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src={img}
              alt="Hero"
              fill
              className="object-cover"
              priority={idx === 0}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>
        ))}
        <div className="absolute bottom-0 left-0 w-full p-6 pt-12 z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              <div
                className={`px-3 py-1.5 rounded-full flex items-center gap-2 border backdrop-blur-md transition-colors ${storeInfo.isOpenNow ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-red-500/20 border-red-500/30 text-red-400"}`}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${storeInfo.isOpenNow ? "bg-emerald-400" : "bg-red-400"}`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${storeInfo.isOpenNow ? "bg-emerald-500" : "bg-red-500"}`}
                  ></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {storeInfo.isOpenNow ? "Buka" : "Tutup"}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 backdrop-blur-md">
                <Star size={12} className="fill-yellow-400" />
                <span className="text-[10px] font-bold">
                  {storeInfo.ratingAvg}
                </span>
              </div>
            </div>
            {storeInfo.open_hour && (
              <div className="text-[10px] text-zinc-300 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 font-medium">
                {storeInfo.open_hour.slice(0, 5)} -{" "}
                {storeInfo.close_hour?.slice(0, 5)}
              </div>
            )}
          </div>
          <div className="mb-1">
            <span className="text-orange-400 text-xs font-bold tracking-wider uppercase">
              {greeting}, Kak! 👋
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2 leading-tight tracking-tight drop-shadow-2xl">
            {storeInfo.name}
          </h1>
          <p className="text-zinc-300 text-xs flex items-center gap-1.5 font-medium opacity-90">
            <MapPin size={12} className="text-orange-500" /> {storeInfo.address}
          </p>
        </div>
      </section>

      <div className="bg-zinc-900 border-b border-white/5 h-10 flex items-center relative overflow-hidden">
        <div className="h-full bg-orange-500 px-3 flex items-center justify-center z-10 shadow-lg relative">
          <Megaphone size={16} className="text-white animate-pulse" />
        </div>
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="animate-marquee-smooth flex items-center">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="text-xs font-medium text-orange-200 mx-8 flex items-center gap-2 whitespace-nowrap"
              >
                📢 {storeInfo.running_text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-5 py-4 border-b border-white/5 bg-zinc-900/20">
        {[
          { l: "100% Halal", i: Medal },
          { l: "Murah Meriah", i: ThumbsUp },
          { l: "Free WiFi", i: Wifi },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center">
            <div className="p-2 bg-zinc-900 rounded-full text-orange-500 border border-zinc-800 shadow-md">
              <s.i size={16} />
            </div>
            <span className="text-[10px] text-zinc-400 font-medium">{s.l}</span>
          </div>
        ))}
      </div>

      <div className="pt-6 pb-2 px-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold text-sm">Mau makan apa? 😋</h3>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
          {[
            {
              name: "Satean",
              icon: Flame,
              color: "from-orange-400 to-red-600",
            },
            {
              name: "Makanan",
              icon: Utensils,
              color: "from-blue-400 to-indigo-600",
            },
            {
              name: "Minuman",
              icon: Coffee,
              color: "from-emerald-400 to-teal-600",
            },
            {
              name: "Cemilan",
              icon: Cookie,
              color: "from-pink-400 to-purple-600",
            },
          ].map((cat, i) => (
            <Link
              href="/menu"
              key={i}
              className="flex flex-col items-center gap-2 group min-w-[64px]"
            >
              <div
                className={`p-[2px] rounded-full bg-gradient-to-tr ${cat.color} group-hover:scale-105 transition-transform`}
              >
                <div className="bg-zinc-950 p-3.5 rounded-full border-2 border-zinc-950 shadow-sm">
                  <cat.icon size={22} className="text-white" />
                </div>
              </div>
              <span className="text-[10px] font-medium text-zinc-400 group-hover:text-white transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {data.promos.length > 0 && (
        <div className="px-5 pb-6 border-b border-white/5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <TicketPercent size={16} className="text-pink-500" /> Promo
              Spesial
            </h3>
          </div>
          <div className="flex overflow-x-auto gap-3 scrollbar-hide snap-x snap-mandatory transform-gpu">
            {data.promos.map((promo, index) => (
              <PromoCard key={promo.id} promo={promo} index={index} />
            ))}
          </div>
        </div>
      )}

      <section className="px-5 py-4">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          <Smile size={16} className="text-yellow-400" /> Lagi pengen apa?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              l: "Pedas Nampol 🔥",
              r: pedasRef,
              c: "text-red-400 bg-red-500/10 border-red-500/20",
            },
            {
              l: "Seger Dingin 🧊",
              r: segarRef,
              c: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
            },
            {
              l: "Kenyang Pol 🍚",
              r: kenyangRef,
              c: "text-amber-400 bg-amber-500/10 border-amber-500/20",
            },
            {
              l: "Manis & Cemilan 🍫",
              r: cemilanRef,
              c: "text-pink-400 bg-pink-500/10 border-pink-500/20",
            },
          ].map((m, i) => (
            <button
              key={i}
              onClick={() => scrollToRef(m.r as any)}
              className={`p-3 rounded-xl border ${m.c} text-xs font-bold active:scale-95 transition-transform`}
            >
              {m.l}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pb-6">
        <div className="flex items-end justify-between mb-4 border-l-4 border-orange-500 pl-3">
          <div>
            <h2 className="text-lg font-bold text-white">Paling Laris 🔥</h2>
            <p className="text-[10px] text-zinc-500">Favorit warga lokal</p>
          </div>
          <Link
            href="/menu"
            className="text-[10px] text-orange-500 font-bold hover:underline"
          >
            Lihat Semua
          </Link>
        </div>
        <div className="space-y-3">
          {isInitialLoading && data.recommendedItems.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />
              ))
            : data.recommendedItems.map((p, i) => (
                <HomeProductCard
                  key={p.id}
                  product={p}
                  index={i}
                  isHorizontal={true}
                  showLove={false}
                  onClick={() => handleProductClick(p)}
                  onQuickAdd={(e) => handleQuickAdd(e, p)}
                />
              ))}
        </div>
      </section>

      <SectionCarousel
        title="Baru Mateng ♨️"
        items={data.newItems}
        linkQuery="baru"
      />
      <SectionCarousel
        title="Yang Pedas-Pedas 🌶️"
        items={data.pedasItems}
        linkQuery="pedas"
        refObj={pedasRef}
      />
      <SectionCarousel
        title="Pelepas Dahaga 🍹"
        items={data.segarItems}
        linkQuery="es"
        refObj={segarRef}
      />
      <SectionCarousel
        title="Nasi & Berat 🍚"
        items={data.kenyangItems}
        linkQuery="nasi"
        refObj={kenyangRef}
      />
      <SectionCarousel
        title="Cemilan 🍢"
        items={data.cemilanItems}
        linkQuery="cemilan"
        refObj={cemilanRef}
      />
      {/* --- NEWSLETTER (REDESIGNED) --- */}
      <section className="px-5 py-8 pb-32">
        <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 shadow-2xl">
          <div className="bg-zinc-950 rounded-[23px] p-6 text-center relative overflow-hidden h-full">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mt-16 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-to-tr from-orange-500 to-pink-500 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20 text-white">
                <Mail size={20} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Dapat Promo Mingguan?
              </h3>
              <p className="text-xs text-zinc-400 mb-4 px-2">
                Gabung newsletter kami buat dapetin kode voucher rahasia & info
                menu baru!
              </p>
              <div className="flex w-full gap-2 pl-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 focus-within:border-orange-500/50 transition-colors">
                <Input
                  placeholder="Email kamu..."
                  className="bg-transparent border-none text-xs h-9 rounded-xl pl-2 focus-visible:ring-0 text-white placeholder:text-zinc-600"
                />
                <Button
                  size="icon"
                  className="bg-orange-600 hover:bg-orange-500 h-9 w-9 rounded-xl shadow-lg shrink-0"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* --- FAQ SECTION (MODERN GLASS) --- */}
      <section className="px-5 py-8 border-t border-white/5 bg-zinc-900/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-gradient-to-tr from-orange-600 to-orange-400 p-2 rounded-lg text-white shadow-lg shadow-orange-500/20">
            <HelpCircle size={18} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Sering Ditanyakan</h3>
            <p className="text-[10px] text-zinc-500">Info seputar angkringan</p>
          </div>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {[
            {
              q: "Jam berapa buka?",
              a: `${storeInfo.open_hour?.slice(0, 5) || "17:00"} sampai ${storeInfo.close_hour?.slice(0, 5) || "Habis"} kak.`,
            },
            {
              q: "Apa semua menu halal?",
              a: "100% Halal kak. Kami tidak menggunakan bahan non-halal.",
            },
            {
              q: "Ada WiFi?",
              a: "Ada dong! WiFi kencang gratis untuk pelanggan.",
            },
            {
              q: "Lokasi tepatnya dimana?",
              a: `${storeInfo.address} (Depan Teras Kaca).`,
            },
          ].map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-white/5 bg-zinc-900/60 rounded-xl px-4 data-[state=open]:bg-zinc-800/80 data-[state=open]:border-orange-500/30 transition-all overflow-hidden"
            >
              <AccordionTrigger className="text-xs font-bold text-zinc-200 hover:no-underline py-3 group">
                <span className="flex-1 text-left">{faq.q}</span>
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-zinc-400 pb-4 leading-relaxed border-t border-white/5 pt-2 mt-1">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-5 z-40 bg-zinc-900 border border-zinc-700 text-white p-2 rounded-full shadow-lg transition-all duration-300 ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}
      >
        <ArrowUp size={20} />
      </button>
      <FloatingCart />
      {isModalOpen && selectedProduct && (
        <ProductDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={selectedProduct}
        />
      )}
    </MobileLayout>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
