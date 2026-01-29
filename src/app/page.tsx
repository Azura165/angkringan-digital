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
  Loader2,
  ArrowDown,
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

// Import Card
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

const CACHE_KEY_STORE = "store_config_cache";

export default function Home() {
  const { addToCart } = useCart();
  const [isPending, startTransition] = useTransition();

  // REFS
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

  // STATE STORE
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
    };
  });

  // STATE UX
  const [isLoading, setIsLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [greeting, setGreeting] = useState("Halo");
  const [lastClickTime, setLastClickTime] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<HomeMenuItem | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // PULL TO REFRESH STATE
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  // FETCH DATA FUNCTION
  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) setIsRefreshing(true);
      else if (!storeInfo.open_hour) setIsLoading(true);

      try {
        if (forceRefresh) await new Promise((r) => setTimeout(r, 800));

        const [
          recRes,
          newRes,
          promoRes,
          configRes,
          pedasRes,
          segarRes,
          kenyangRes,
          cemilanRes,
        ] = await Promise.all([
          supabase
            .from("menu_items")
            .select("*")
            .eq("is_recommended", true)
            .limit(5),
          supabase
            .from("menu_items")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(6),
          supabase.from("promos").select("*").eq("is_active", true),
          supabase.from("store_config").select("*").single(),
          supabase
            .from("menu_items")
            .select("*")
            .or("description.ilike.%pedas%,name.ilike.%pedas%")
            .limit(6),
          supabase.from("menu_items").select("*").eq("category_id", 3).limit(6),
          supabase.from("menu_items").select("*").eq("category_id", 2).limit(6),
          supabase.from("menu_items").select("*").eq("category_id", 4).limit(6),
        ]);

        if (recRes.data) setRecommendedItems(recRes.data.map(formatMenuItem));
        if (newRes.data) setNewItems(newRes.data.map(formatMenuItem));
        if (promoRes.data) setPromos(promoRes.data);
        if (pedasRes.data) setPedasItems(pedasRes.data.map(formatMenuItem));
        if (segarRes.data) setSegarItems(segarRes.data.map(formatMenuItem));
        if (kenyangRes.data)
          setKenyangItems(kenyangRes.data.map(formatMenuItem));
        if (cemilanRes.data)
          setCemilanItems(cemilanRes.data.map(formatMenuItem));

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
          };
          setStoreInfo(newStoreInfo);
          sessionStorage.setItem(CACHE_KEY_STORE, JSON.stringify(newStoreInfo));
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        if (forceRefresh) toast.error("Gagal update data");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setPullY(0);
      }
    },
    [storeInfo.open_hour],
  );

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

    const handleScroll = () => {
      const scroll = `${document.documentElement.scrollTop / (document.documentElement.scrollHeight - document.documentElement.clientHeight)}`;
      setScrollProgress(Number(scroll));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

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

  // LOGIC PULL REFRESH MANUAL
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (window.scrollY === 0 && delta > 0)
        setPullY(Math.min(delta * 0.4, 120));
      else setPullY(0);
    };
    const handleTouchEnd = () => {
      isPulling.current = false;
      if (pullY > 60) fetchData(true);
      else setPullY(0);
    };
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullY, fetchData]);

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
            className="bg-black/50 p-2 rounded-full text-white hover:bg-orange-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20 hidden md:group-hover/section:block">
          <button
            onClick={() => scroll("right")}
            className="bg-black/50 p-2 rounded-full text-white hover:bg-orange-500 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        >
          {isLoading && items.length === 0 ? (
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
            <div className="w-full text-center text-xs text-zinc-500 py-4 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
              Menu belum tersedia
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <MobileLayout>
      <div
        className="fixed top-20 left-0 w-full flex justify-center z-30 pointer-events-none transition-transform duration-200"
        style={{ transform: `translateY(${pullY > 0 ? pullY - 40 : -100}px)` }}
      >
        <div className="bg-zinc-900 border border-zinc-700 text-white rounded-full p-2 shadow-xl flex items-center gap-2">
          {isRefreshing ? (
            <>
              <Loader2 className="animate-spin text-orange-500" size={20} />
              <span className="text-xs">Update...</span>
            </>
          ) : (
            <ArrowDown
              size={20}
              className={pullY > 60 ? "rotate-180 transition-transform" : ""}
            />
          )}
        </div>
      </div>

      <div
        className="fixed top-0 left-0 h-1 bg-orange-600 z-[100]"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      {/* HERO & HEADER */}
      <section className="relative h-[340px] w-full overflow-hidden group bg-zinc-900">
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
              quality={65}
              sizes="(max-width: 768px) 100vw, 600px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>
        ))}
        <div className="absolute bottom-0 left-0 w-full p-6 pt-12 z-10">
          <div className="flex justify-between items-start mb-4">
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
            {storeInfo.open_hour ? (
              <div className="text-[10px] text-zinc-300 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 font-medium animate-in fade-in">
                {storeInfo.open_hour.slice(0, 5)} -{" "}
                {storeInfo.close_hour?.slice(0, 5)}
              </div>
            ) : (
              <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
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
          <span className="text-[10px] text-zinc-400 font-medium">
            Harga Murah
          </span>
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

      {/* PROMO */}
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

      {/* PALING LARIS (Grid 1x1 List Style) */}
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
          {isLoading && recommendedItems.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />
              ))
            : recommendedItems.map((p, i) => (
                <HomeProductCard
                  key={p.id}
                  product={p}
                  index={i}
                  isHorizontal={true} // Mode LIST
                  showLove={false}
                  onClick={() => handleProductClick(p)}
                  onQuickAdd={(e) => handleQuickAdd(e, p)}
                />
              ))}
        </div>
      </section>

      {/* CAROUSEL SECTIONS (Baru Mateng, Pedas, dll) */}
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

      {/* NEWSLETTER & FAQ (YANG HILANG KEMBALI) */}
      <section className="px-5 py-8 space-y-6">
        {/* Newsletter Card */}
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

        {/* FAQ Redesign - Simple Card (KEMBALI!) */}
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
