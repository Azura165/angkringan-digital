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
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Import Card Optimized
import { HomeProductCard } from "@/components/features/home/HomeProductCard";

const ProductDetailModal = dynamic(
  () =>
    import("@/components/features/menu/ProductDetailModal").then(
      (mod) => mod.ProductDetailModal,
    ),
  { ssr: false, loading: () => null },
);

// --- TIPE DATA ---
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
  title: string;
  subtitle: string;
  bg_gradient: string;
}

interface StoreInfo {
  name: string;
  address: string;
  open_hour: string | null;
  close_hour: string | null;
  running_text: string;
  isOpenNow: boolean;
  ratingAvg: string; // Tambahan: Rating Toko
  ratingCount: number; // Tambahan: Jumlah Ulasan
}

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1519690889869-e705e59f72e1?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=600&auto=format&fit=crop",
];

const GRADIENT_MAP: Record<string, string> = {
  "from-red-500 to-pink-600": "bg-gradient-to-r from-red-500 to-pink-600",
  "from-green-500 to-emerald-600":
    "bg-gradient-to-r from-green-500 to-emerald-600",
  "from-blue-500 to-indigo-600": "bg-gradient-to-r from-blue-500 to-indigo-600",
  default: "bg-gradient-to-r from-orange-500 to-red-500",
};

const CACHE_KEY_STORE = "store_config_cache_v2"; // Bump version untuk rating
const CACHE_KEY_HOME_DATA = "home_data_cache_v5"; // Bump version

export default function Home() {
  const { addToCart } = useCart();
  const [isPending, startTransition] = useTransition();

  // REFS (Untuk Auto Scroll)
  const topRef = useRef<HTMLDivElement>(null);
  const pedasRef = useRef<HTMLDivElement>(null);
  const segarRef = useRef<HTMLDivElement>(null);
  const kenyangRef = useRef<HTMLDivElement>(null);
  const cemilanRef = useRef<HTMLDivElement>(null);

  // STATE DATA
  const [recommendedItems, setRecommendedItems] = useState<HomeMenuItem[]>([]);
  const [newItems, setNewItems] = useState<HomeMenuItem[]>([]);
  const [pedasItems, setPedasItems] = useState<HomeMenuItem[]>([]);
  const [segarItems, setSegarItems] = useState<HomeMenuItem[]>([]);
  const [kenyangItems, setKenyangItems] = useState<HomeMenuItem[]>([]);
  const [cemilanItems, setCemilanItems] = useState<HomeMenuItem[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);

  // STATE STORE (Include Rating)
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(CACHE_KEY_STORE);
      if (cached) return JSON.parse(cached);
    }
    return {
      name: "Angkringan Mas Radit",
      address: "Memuat lokasi...",
      open_hour: null,
      close_hour: null,
      running_text: "Selamat Datang!",
      isOpenNow: false,
      ratingAvg: "5.0",
      ratingCount: 0,
    };
  });

  // STATE UX
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [greeting, setGreeting] = useState("Halo");
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<HomeMenuItem | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // FETCH DATA (OPTIMIZED LIMIT 7 + REVIEWS)
  const fetchData = useCallback(async (forceRefresh = false) => {
    // 1. Cek Cache
    if (!forceRefresh && typeof window !== "undefined") {
      const cachedHome = sessionStorage.getItem(CACHE_KEY_HOME_DATA);
      if (cachedHome) {
        try {
          const parsed = JSON.parse(cachedHome);
          setRecommendedItems(parsed.recommendedItems || []);
          setNewItems(parsed.newItems || []);
          setPromos(parsed.promos || []);
          setPedasItems(parsed.pedasItems || []);
          setSegarItems(parsed.segarItems || []);
          setKenyangItems(parsed.kenyangItems || []);
          setCemilanItems(parsed.cemilanItems || []);
          setIsInitialLoading(false);
        } catch (e) {
          console.error("Cache error", e);
        }
      }
    }

    try {
      const LIMIT_COUNT = 7;

      const [
        recRes, // Paling Laris
        newRes, // Baru
        promoRes,
        configRes,
        pedasRes, // Tag: Pedas
        segarRes, // Kategori: Minuman
        kenyangRes, // Tag: Berat
        cemilanRes, // Kategori: Cemilan
        reviewsRes, // NEW: Fetch Rating Toko
      ] = await Promise.all([
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .eq("is_recommended", true)
          .limit(LIMIT_COUNT),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("id", { ascending: false })
          .limit(LIMIT_COUNT),
        supabase.from("promos").select("*").eq("is_active", true),
        supabase.from("store_config").select("*").single(),

        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .contains("tags", ["Pedas"])
          .limit(LIMIT_COUNT),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .eq("category_id", 3)
          .limit(LIMIT_COUNT),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .contains("tags", ["Berat"])
          .limit(LIMIT_COUNT),
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .eq("category_id", 4)
          .limit(LIMIT_COUNT),
        supabase.from("reviews").select("rating"), // Ambil rating saja biar ringan
      ]);

      const fmt = (data: any[]) => (data ? data.map(formatMenuItem) : []);

      const newData = {
        recommendedItems: fmt(recRes.data || []),
        newItems: fmt(newRes.data || []),
        promos: promoRes.data || [],
        pedasItems: fmt(pedasRes.data || []),
        segarItems: fmt(segarRes.data || []),
        kenyangItems: fmt(kenyangRes.data || []),
        cemilanItems: fmt(cemilanRes.data || []),
      };

      setRecommendedItems(newData.recommendedItems);
      setNewItems(newData.newItems);
      setPromos(newData.promos);
      setPedasItems(newData.pedasItems);
      setSegarItems(newData.segarItems);
      setKenyangItems(newData.kenyangItems);
      setCemilanItems(newData.cemilanItems);

      sessionStorage.setItem(CACHE_KEY_HOME_DATA, JSON.stringify(newData));

      // CALCULATE RATING
      const allRatings = reviewsRes.data || [];
      const totalRating = allRatings.reduce(
        (acc, curr) => acc + curr.rating,
        0,
      );
      const avgRating =
        allRatings.length > 0
          ? (totalRating / allRatings.length).toFixed(1)
          : "5.0";

      if (configRes.data) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        const newStoreInfo = {
          name: configRes.data.store_name || "Angkringan Mas Radit",
          address: configRes.data.address || "Jl. Malioboro No. 1",
          open_hour: configRes.data.open_hour || "17:00",
          close_hour: configRes.data.close_hour || "23:59",
          running_text: configRes.data.running_text || "Selamat Datang!",
          isOpenNow:
            currentTime >= (configRes.data.open_hour || "17:00") &&
            currentTime <= (configRes.data.close_hour || "23:59"),
          ratingAvg: avgRating,
          ratingCount: allRatings.length,
        };
        setStoreInfo(newStoreInfo);
        sessionStorage.setItem(CACHE_KEY_STORE, JSON.stringify(newStoreInfo));
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    // Logic Sapaan
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

    // Logic Back to Top Button
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Hero Carousel
    const interval = setInterval(
      () => setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length),
      5000,
    );

    fetchData();

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [fetchData]);

  const formatMenuItem = (item: any): HomeMenuItem => ({
    id: item.id.toString(),
    name: item.name,
    description: item.description || "Menu lezat!",
    price: item.price,
    originalPrice: item.original_price || 0,
    rating: item.rating_avg || 5.0,
    ratingCount: item.rating_count || 0,
    image: item.image_url || "",
    isAvailable: item.is_available ?? true,
  });

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProductClick = useCallback((product: HomeMenuItem) => {
    if (!product.isAvailable) {
      toast.error("Stok habis kak 😭");
      return;
    }
    startTransition(() => {
      setSelectedProduct(product);
      setIsModalOpen(true);
    });
  }, []);

  const handleQuickAdd = useCallback(
    (e: React.MouseEvent, product: any) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastClickTime < 400) return;
      setLastClickTime(now);
      if (!product.isAvailable) return;
      addToCart(product);
      if (navigator.vibrate) navigator.vibrate(50);
      toast.success("Masuk keranjang! 🛒");
    },
    [addToCart, lastClickTime],
  );

  // Component Carousel (Reusable)
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
    const scroll = (direction: "left" | "right") => {
      if (scrollRef.current) {
        const { current } = scrollRef;
        const scrollAmount = direction === "left" ? -200 : 200;
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    };
    const showSkeleton = isInitialLoading && items.length === 0;

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

        {/* Navigasi Desktop */}
        <div className="absolute top-1/2 -translate-y-1/2 left-2 z-20 hidden md:group-hover/section:block">
          <button
            onClick={() => scroll("left")}
            className="bg-black/50 p-2 rounded-full text-white hover:bg-orange-500 transition-colors backdrop-blur-sm"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20 hidden md:group-hover/section:block">
          <button
            onClick={() => scroll("right")}
            className="bg-black/50 p-2 rounded-full text-white hover:bg-orange-500 transition-colors backdrop-blur-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        >
          {showSkeleton ? (
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
              <span>Belum ada menu di sini</span>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <MobileLayout>
      {/* --- SEO JSON-LD INJECTION (OPTIMASI SEO & TWA) --- */}
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
            priceRange: "$",
            servesCuisine: "Indonesian",
            openingHoursSpecification: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
              opens: storeInfo.open_hour || "17:00",
              closes: storeInfo.close_hour || "23:59",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: storeInfo.ratingAvg,
              reviewCount: storeInfo.ratingCount,
            },
          }),
        }}
      />

      {/* HERO SECTION */}
      <section
        ref={topRef}
        className="relative h-[340px] w-full overflow-hidden group bg-zinc-900"
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
              quality={60}
              sizes="(max-width: 768px) 100vw, 600px"
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
                  {storeInfo.isOpenNow ? "Buka Sekarang" : "Tutup"}
                </span>
              </div>

              {/* FITUR BARU: RATING BADGE DI HERO */}
              <Link href="/story" className="animate-in fade-in zoom-in">
                <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 backdrop-blur-md hover:bg-yellow-500/20 transition-colors active:scale-95 cursor-pointer">
                  <Star size={12} className="fill-yellow-400" />
                  <span className="text-[10px] font-bold">
                    {storeInfo.ratingAvg}
                  </span>
                  <span className="text-[9px] opacity-70">
                    ({storeInfo.ratingCount})
                  </span>
                </div>
              </Link>
            </div>

            {storeInfo.open_hour && (
              <div className="text-[10px] text-zinc-300 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 font-medium animate-in fade-in">
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
            {storeInfo.name.split(" ")[0]}
            <br />
            <span className="text-white">
              {storeInfo.name.split(" ").slice(1).join(" ")}
            </span>
          </h1>
          <p className="text-zinc-300 text-xs flex items-center gap-1.5 font-medium opacity-90">
            <MapPin size={12} className="text-orange-500" /> {storeInfo.address}
          </p>
        </div>
      </section>

      {/* RUNNING TEXT */}
      <div className="bg-zinc-900 border-b border-white/5 h-10 flex items-center relative overflow-hidden">
        <div className="h-full bg-orange-500 px-3 flex items-center justify-center z-10 shadow-lg">
          <Megaphone size={16} className="text-white animate-pulse" />
        </div>
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="whitespace-nowrap animate-marquee flex items-center">
            <span className="text-xs font-medium text-orange-200 mx-8 flex items-center gap-2">
              📢 {storeInfo.running_text}
            </span>
            <span className="text-xs font-medium text-orange-200 mx-8 flex items-center gap-2">
              📢 {storeInfo.running_text}
            </span>
          </div>
        </div>
      </div>

      {/* TRUST STATS */}
      <div className="grid grid-cols-3 gap-2 px-5 py-4 border-b border-white/5 bg-zinc-900/20">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="p-2 bg-zinc-900 rounded-full text-orange-500 border border-zinc-800 shadow-md">
            <Medal size={16} />
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">
            100% Halal
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="p-2 bg-zinc-900 rounded-full text-orange-500 border border-zinc-800 shadow-md">
            <ThumbsUp size={16} />
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">Murah</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="p-2 bg-zinc-900 rounded-full text-orange-500 border border-zinc-800 shadow-md">
            <Wifi size={16} />
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">
            Free WiFi
          </span>
        </div>
      </div>

      {/* CATEGORY ICONS */}
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

      {/* PROMO CAROUSEL */}
      {promos.length > 0 && (
        <div className="px-5 pb-6 border-b border-white/5">
          <div className="flex overflow-x-auto gap-3 scrollbar-hide snap-x snap-mandatory">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className={`snap-center min-w-[260px] h-24 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden shadow-lg border border-white/10 ${GRADIENT_MAP[promo.bg_gradient] || GRADIENT_MAP["default"]}`}
              >
                <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl" />
                <h4 className="text-white font-bold text-lg relative z-10">
                  {promo.title}
                </h4>
                <p className="text-white/80 text-xs font-medium relative z-10">
                  {promo.subtitle}
                </p>
                <button className="mt-2 bg-white/20 hover:bg-white/30 w-fit px-3 py-1 rounded-full text-[10px] text-white font-bold backdrop-blur-sm transition-colors border border-white/20">
                  Cek Sekarang
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MOOD SELECTOR */}
      <section className="px-5 py-4">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          <Smile size={16} className="text-yellow-400" /> Lagi pengen apa?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => scrollToRef(pedasRef)}
            className="p-3 rounded-xl border bg-red-500/10 text-red-400 border-red-500/20 text-xs font-bold active:scale-95 transition-transform"
          >
            Pedas Nampol 🔥
          </button>
          <button
            onClick={() => scrollToRef(segarRef)}
            className="p-3 rounded-xl border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs font-bold active:scale-95 transition-transform"
          >
            Seger Dingin 🧊
          </button>
          <button
            onClick={() => scrollToRef(kenyangRef)}
            className="p-3 rounded-xl border bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-bold active:scale-95 transition-transform"
          >
            Kenyang Pol 🍚
          </button>
          <button
            onClick={() => scrollToRef(cemilanRef)}
            className="p-3 rounded-xl border bg-pink-500/10 text-pink-400 border-pink-500/20 text-xs font-bold active:scale-95 transition-transform"
          >
            Manis & Cemilan 🍫
          </button>
        </div>
      </section>

      {/* PALING LARIS */}
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
          {isInitialLoading && recommendedItems.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />
              ))
            : recommendedItems.map((p, i) => (
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

      {/* DYNAMIC SECTIONS */}
      <SectionCarousel
        title="Baru Mateng ♨️"
        items={newItems}
        linkQuery="baru"
      />
      <SectionCarousel
        title="Yang Pedas-Pedas 🌶️"
        items={pedasItems}
        linkQuery="pedas"
        refObj={pedasRef}
      />
      <SectionCarousel
        title="Pelepas Dahaga 🍹"
        items={segarItems}
        linkQuery="es"
        refObj={segarRef}
      />
      <SectionCarousel
        title="Nasi & Berat 🍚"
        items={kenyangItems}
        linkQuery="nasi"
        refObj={kenyangRef}
      />
      <SectionCarousel
        title="Cemilan 🍢"
        items={cemilanItems}
        linkQuery="cemilan"
        refObj={cemilanRef}
      />

      {/* NEWSLETTER & FAQ */}
      <section className="px-5 py-8 space-y-6">
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
          <Mail className="mx-auto text-orange-500 mb-2" size={28} />
          <h3 className="text-white font-bold mb-1 text-lg">
            Dapat Promo Mingguan?
          </h3>
          <p className="text-xs text-zinc-500 mb-4 px-4">
            Langganan newsletter kami, gratis sate tiap bulan!
          </p>
          <div className="flex gap-2 relative z-10">
            <Input
              placeholder="Email kamu..."
              className="bg-zinc-950 border-zinc-700 text-xs h-10 rounded-xl"
            />
            <Button className="bg-orange-500 hover:bg-orange-600 h-10 rounded-xl px-6 font-bold shadow-lg">
              Join
            </Button>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-2">
            <HelpCircle size={16} className="text-orange-500" /> FAQ Singkat
          </h3>
          {[
            { q: "Buka jam berapa?", a: "Setiap hari, jam 17.00 - 24.00 WIB" },
            {
              q: "Bisa delivery order?",
              a: "Bisa banget! Klik tombol pesan di menu.",
            },
            {
              q: "Lokasi tepatnya dimana?",
              a: "Jl. Malioboro No. 1 (Depan Teras Kaca).",
            },
          ].map((faq, i) => (
            <div
              key={i}
              className="border-b border-white/5 last:border-0 pb-3 last:pb-0"
            >
              <div className="text-xs font-bold text-zinc-200 mb-1">
                {faq.q}
              </div>
              <div className="text-[10px] text-zinc-500 leading-relaxed">
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BACK TO TOP BUTTON */}
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
