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
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { FloatingCart } from "@/components/features/cart/FloatingCart";
import { MenuSkeleton } from "@/components/features/menu/MenuSkeleton";
import { supabase } from "@/lib/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// IMPORT KARTU YANG SAMA DENGAN HOME (Konsistensi Desain)
import { HomeProductCard } from "@/components/features/home/HomeProductCard";

// LAZY LOAD MODAL (Optimasi Performa Awal)
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

// Tipe Data
interface ExtendedMenuItem extends MenuItem {
  description: string;
  rating: number;
  category: string;
  originalPrice?: number;
  isRecommended?: boolean;
  isAvailable?: boolean;
}

const ITEMS_PER_PAGE = 8;

export default function MenuPage() {
  const { addToCart } = useCart();

  // STATE DATA
  const [dbMenuItems, setDbMenuItems] = useState<ExtendedMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // STATE FILTER
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest",
  );

  // STATE UX
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ExtendedMenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Rate Limiting (Keamanan Client-Side)
  const [lastClickTime, setLastClickTime] = useState(0);

  // Load View Mode Preference
  useEffect(() => {
    const savedView = localStorage.getItem("viewMode");
    if (savedView === "list" || savedView === "grid") setViewMode(savedView);
  }, []);

  const changeViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("viewMode", mode);
  };

  // FETCH DATA
  const fetchMenu = useCallback(
    async (isLoadMore = false) => {
      if (!isLoadMore) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const currentPage = isLoadMore ? page + 1 : 0;
        const from = currentPage * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase.from("menu_items").select(`*, categories(slug)`);

        // 1. Search Logic
        if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);

        // 2. Sorting Logic
        if (sortBy === "price_asc")
          query = query.order("price", { ascending: true });
        else if (sortBy === "price_desc")
          query = query.order("price", { ascending: false });
        else query = query.order("id", { ascending: false });

        // 3. Pagination
        query = query.range(from, to);

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          // Mapping Data
          let formattedData: ExtendedMenuItem[] = data.map((item: any) => ({
            id: item.id.toString(),
            name: item.name,
            description: item.description || "Menu lezat khas angkringan.",
            price: item.price,
            originalPrice: item.original_price || 0,
            rating: item.rating_avg || 5.0, // Pakai data real DB
            category: item.categories?.slug || "umum",
            image: item.image_url || "",
            isAvailable: item.is_available ?? true,
          }));

          // Client-side Category Filter (Karena struktur DB relasi)
          if (activeCategory !== "all") {
            formattedData = formattedData.filter(
              (item) => item.category === activeCategory,
            );
          }

          if (data.length < ITEMS_PER_PAGE) setHasMore(false);
          else setHasMore(true);

          if (isLoadMore) {
            setDbMenuItems((prev) => [...prev, ...formattedData]);
            setPage(currentPage);
          } else {
            setDbMenuItems(formattedData);
            setPage(0);
          }
        }
      } catch (err) {
        console.error("Gagal ambil menu:", err);
        toast.error("Gagal memuat menu. Cek koneksi ya!");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [activeCategory, searchQuery, sortBy, page],
  );

  // Trigger Fetch saat filter berubah
  useEffect(() => {
    fetchMenu(false);
  }, [activeCategory, searchQuery, sortBy]);

  // UX Scroll Top
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleProductClick = useCallback((product: ExtendedMenuItem) => {
    if (!product.isAvailable) {
      toast.error("Maaf, menu ini sedang habis! 😭");
      return;
    }
    setSelectedProduct(product);
    setIsModalOpen(true);
  }, []);

  const handleQuickAdd = useCallback(
    (e: React.MouseEvent, product: ExtendedMenuItem) => {
      e.stopPropagation();
      // Anti Spam Click
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
    <MobileLayout>
      {/* HEADER STICKY */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 pb-2 shadow-lg shadow-black/20">
        <div className="pt-4 px-5 pb-3">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-xl font-bold text-white leading-none">
                Daftar Menu 📜
              </h1>
              <p className="text-[10px] text-zinc-500 mt-1">
                {dbMenuItems.length} menu lezat tersedia
              </p>
            </div>

            {/* TOGGLE VIEW MODE */}
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => changeViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-zinc-800 text-orange-500 shadow-sm" : "text-zinc-500 hover:text-white"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => changeViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-zinc-800 text-orange-500 shadow-sm" : "text-zinc-500 hover:text-white"}`}
              >
                <ListIcon size={16} />
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

            {/* FILTER POPOVER (Sama seperti Home) */}
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${
                        sortBy === opt.id
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                          : "text-zinc-300 hover:bg-zinc-800"
                      }`}
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

                  {sortBy !== "newest" && (
                    <div className="pt-2 mt-2 border-t border-white/5">
                      <button
                        onClick={() => setSortBy("newest")}
                        className="w-full text-xs text-center text-red-400 hover:text-red-300 py-1"
                      >
                        Reset Filter
                      </button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* KATEGORI SCROLL */}
        <div className="flex gap-2 overflow-x-auto px-5 pb-2 scrollbar-hide">
          {CATEGORIES_UI.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border ${
                activeCategory === cat.id
                  ? "bg-white text-black border-white shadow shadow-white/10 font-bold"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <span className="text-sm">{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="p-5 min-h-screen pb-32">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
            <MenuSkeleton />
          </div>
        ) : dbMenuItems.length > 0 ? (
          <>
            {/* GRID / LIST VIEW SWITCHER */}
            <div
              className={`
                ${
                  viewMode === "grid"
                    ? "grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-500"
                    : "flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
                }
            `}
            >
              {dbMenuItems.map((product) => (
                // MENGGUNAKAN KOMPONEN KARTU YANG SAMA DENGAN HOME (REUSABLE)
                <HomeProductCard
                  key={product.id}
                  product={product}
                  isHorizontal={viewMode === "list"} // List Mode = Horizontal Card
                  showLove={false} // LOVE DIMATIKAN
                  onClick={() => handleProductClick(product)}
                  onQuickAdd={(e) => handleQuickAdd(e, product)}
                  // onToggleFavorite tidak dipassing (otomatis hilang)
                />
              ))}
            </div>

            {hasMore && !searchQuery && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => fetchMenu(true)}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="border-zinc-800 bg-zinc-900 text-zinc-300 min-w-[150px] rounded-full"
                >
                  {isLoadingMore ? (
                    <Loader2 className="animate-spin mr-2" size={16} />
                  ) : (
                    "Muat Lebih Banyak 👇"
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <UtensilsCrossed className="text-zinc-600" size={32} />
            </div>
            <h3 className="text-white font-bold mb-1">Menu tidak ditemukan</h3>
            <p className="text-zinc-500 text-xs px-10 mb-4">
              Mungkin salah ketik atau belum ada menu di kategori ini.
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

      {/* MODAL DETAIL (Render Conditional) */}
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
