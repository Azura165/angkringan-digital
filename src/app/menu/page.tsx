"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, MenuItem } from "@/hooks/use-cart";
import {
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  ArrowUp,
  UtensilsCrossed,
  LayoutGrid,
  List as ListIcon,
  Check,
  Zap,
  QrCode,
  ArrowDown,
} from "lucide-react";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import { FloatingCart } from "@/components/features/cart/FloatingCart";
import { HomeProductCard } from "@/components/features/home/HomeProductCard";
import { Skeleton } from "@/components/ui/skeleton";

const ProductDetailModal = dynamic(
  () =>
    import("@/components/features/menu/ProductDetailModal").then(
      (mod) => mod.ProductDetailModal,
    ),
  { ssr: false, loading: () => null },
);

const CATEGORIES_UI = [
  { id: "all", name: "Semua", icon: "🔥" },
  { id: "makanan", name: "Makanan", icon: "🥘" },
  { id: "sate", name: "Satean", icon: "🍢" },
  { id: "minuman", name: "Minuman", icon: "🍹" },
  { id: "snack", name: "Cemilan", icon: "🍟" },
];

interface ExtendedMenuItem extends MenuItem {
  description: string;
  rating: number;
  category: string;
  originalPrice?: number;
  isRecommended?: boolean;
  isAvailable?: boolean;
}

const CACHE_KEY_MENU = "menu_items_cache";

function MenuContent() {
  const { addToCart } = useCart();
  const searchParams = useSearchParams();

  // STATE
  const [dbMenuItems, setDbMenuItems] = useState<ExtendedMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // PULL TO REFRESH STATE
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  // FILTER & VIEW
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ExtendedMenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // FETCH DATA
  const fetchMenu = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);

    if (!forceRefresh) {
      const cachedData = sessionStorage.getItem(CACHE_KEY_MENU);
      if (cachedData) {
        setDbMenuItems(JSON.parse(cachedData));
        setIsLoading(false);
        if (!forceRefresh) return;
      } else {
        setIsLoading(true);
      }
    }

    try {
      // Simulasi delay sedikit biar animasi refresh kelihatan (UX)
      if (forceRefresh) await new Promise((r) => setTimeout(r, 800));

      const { data, error } = await supabase
        .from("menu_items")
        .select(`*, categories(slug)`)
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData: ExtendedMenuItem[] = data.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description || "Menu lezat khas angkringan.",
          price: item.price,
          originalPrice: item.original_price || 0,
          rating: item.rating_avg || 5.0,
          category: item.categories?.slug || "umum",
          image: item.image_url || "",
          isAvailable: item.is_available ?? true,
        }));

        setDbMenuItems(formattedData);
        sessionStorage.setItem(CACHE_KEY_MENU, JSON.stringify(formattedData));
      }
    } catch (err) {
      console.error("Gagal ambil menu:", err);
      // Silent error jika refresh, toast jika initial load gagal
      if (!forceRefresh) toast.error("Gagal memuat menu.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setPullY(0); // Reset posisi pull
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // --- LOGIC PULL TO REFRESH MANUAL ---
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY.current;

      // Hanya izinkan tarik jika scroll paling atas dan tarik ke bawah
      if (window.scrollY === 0 && delta > 0) {
        // Logarithmic resistance (makin ditarik makin berat)
        setPullY(Math.min(delta * 0.4, 120));
      } else {
        setPullY(0);
      }
    };

    const handleTouchEnd = () => {
      isPulling.current = false;
      if (pullY > 60) {
        // Threshold refresh
        fetchMenu(true); // Trigger refresh
      } else {
        setPullY(0); // Batal refresh
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullY, fetchMenu]);

  // FILTERING LOGIC
  const filteredItems = dbMenuItems
    .filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory)
        return false;
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return parseInt(b.id) - parseInt(a.id);
    });

  // UX Scroll Top
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleProductClick = useCallback((product: ExtendedMenuItem) => {
    if (!product.isAvailable) {
      toast.error("Maaf, menu ini habis! 😭");
      return;
    }
    setSelectedProduct(product);
    setIsModalOpen(true);
  }, []);

  const handleQuickAdd = useCallback(
    (e: React.MouseEvent, product: ExtendedMenuItem) => {
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

  return (
    <>
      {/* PULL TO REFRESH INDICATOR */}
      <div
        className="fixed top-20 left-0 w-full flex justify-center z-30 pointer-events-none transition-transform duration-200"
        style={{ transform: `translateY(${pullY > 0 ? pullY - 40 : -100}px)` }}
      >
        <div className="bg-zinc-900 border border-zinc-700 text-white rounded-full p-2 shadow-xl flex items-center gap-2">
          {isRefreshing ? (
            <>
              <Loader2 className="animate-spin text-orange-500" size={20} />{" "}
              <span className="text-xs font-bold">Update Menu...</span>
            </>
          ) : (
            <ArrowDown
              size={20}
              className={`text-zinc-400 ${pullY > 60 ? "rotate-180 transition-transform" : ""}`}
            />
          )}
        </div>
      </div>

      {/* HEADER STICKY */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 pb-2 shadow-lg shadow-black/20">
        <div className="pt-4 px-5 pb-3">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-xl font-bold text-white leading-none">
                Daftar Menu 📜
              </h1>
              <p className="text-[10px] text-zinc-500 mt-1">
                {dbMenuItems.length > 0
                  ? `${dbMenuItems.length} menu tersedia`
                  : "Memuat menu..."}
              </p>
            </div>

            {/* TOMBOL REFRESH DIHAPUS, DIGANTI VIEW MODE SAJA */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-zinc-800 text-orange-500 shadow-sm" : "text-zinc-500 hover:text-white"}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-zinc-800 text-orange-500 shadow-sm" : "text-zinc-500 hover:text-white"}`}
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                size={16}
              />
              <Input
                placeholder="Cari sate, nasi..."
                className="pl-9 bg-zinc-900 border-zinc-800 text-white rounded-xl focus-visible:ring-orange-500 h-10 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 p-1 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-zinc-800 bg-zinc-900 rounded-xl hover:bg-zinc-800 text-zinc-400 relative"
                >
                  <SlidersHorizontal size={16} />
                  {sortBy !== "newest" && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-56 bg-zinc-900/95 backdrop-blur-xl border-zinc-800 p-2 rounded-2xl shadow-2xl"
              >
                <div className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    Urutkan Harga
                  </div>
                  {[
                    { id: "newest", label: "Paling Baru", icon: Zap },
                    { id: "price_asc", label: "Termurah", icon: ArrowUp },
                    {
                      id: "price_desc",
                      label: "Termahal",
                      icon: ArrowUp,
                      rotate: true,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${sortBy === opt.id ? "bg-orange-500 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}
                    >
                      <div className="flex items-center gap-2">
                        <opt.icon
                          size={14}
                          className={opt.rotate ? "rotate-180" : ""}
                        />
                        {opt.label}
                      </div>
                      {sortBy === opt.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 pb-2 scrollbar-hide">
          {CATEGORIES_UI.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border ${activeCategory === cat.id ? "bg-white text-black border-white font-bold" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}
            >
              <span className="text-sm">{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="p-5 min-h-screen pb-32">
        {isLoading && dbMenuItems.length === 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {/* SKELETON DIUPDATE JADI KOTAK BESAR (H-64) BIAR SESUAI CARD BARU */}
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-64 w-full rounded-[1.5rem] bg-zinc-900"
              />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div
            className={`${viewMode === "grid" ? "grid grid-cols-2 gap-4" : "flex flex-col gap-3"}`}
          >
            {filteredItems.map((product) => (
              <HomeProductCard
                key={product.id}
                product={product}
                isHorizontal={viewMode === "list"}
                showLove={false}
                onClick={() => handleProductClick(product)}
                onQuickAdd={(e) => handleQuickAdd(e, product)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <UtensilsCrossed className="text-zinc-600" size={32} />
            </div>
            <h3 className="text-white font-bold mb-1">Menu tidak ditemukan</h3>
            <p className="text-zinc-500 text-xs px-10 mb-4">
              Coba cari kata kunci lain ya.
            </p>
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-300"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
            >
              Reset Pencarian
            </Button>
          </div>
        )}
      </div>

      {/* BACK TO TOP */}
      <div
        className={`fixed bottom-24 right-5 z-30 transition-all duration-300 ${showScrollTop ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"}`}
      >
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          size="icon"
          className="rounded-full bg-orange-500 shadow-lg shadow-orange-500/30 hover:bg-orange-600 h-10 w-10"
        >
          <ArrowUp size={20} />
        </Button>
      </div>

      <FloatingCart />

      {isModalOpen && selectedProduct && (
        <ProductDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={selectedProduct}
        />
      )}
    </>
  );
}

export default function MenuPage() {
  return (
    <MobileLayout>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-zinc-950">
            <Loader2 className="animate-spin text-orange-500" />
          </div>
        }
      >
        <MenuContent />
      </Suspense>
    </MobileLayout>
  );
}
