"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, MenuItem } from "@/hooks/use-cart";
import { MENU_ITEMS, CATEGORIES } from "@/lib/data";
import { Plus, Search, Star } from "lucide-react";
import { useState, useEffect } from "react"; // Tambah useEffect
import { FloatingCart } from "@/components/features/cart/FloatingCart";
import { ProductDetailModal } from "@/components/features/menu/ProductDetailModal";
// Import Skeleton
import { MenuSkeleton } from "@/components/features/menu/MenuSkeleton";

export default function MenuPage() {
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // STATE LOADING
  const [isLoading, setIsLoading] = useState(true);

  // STATE POPUP
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // EFEK SIMULASI LOADING (Pura-pura ambil data dari server)
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 700); // Loading selama 1.5 detik
    return () => clearTimeout(timer);
  }, []); // Jalan sekali pas halaman dibuka

  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchCategory =
      activeCategory === "all" || item.category === activeCategory;
    const matchSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <MobileLayout>
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-white/5 pt-4 pb-2 space-y-3">
        <h1 className="text-2xl font-bold text-white px-5">Daftar Menu 📜</h1>

        <div className="px-5">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              size={18}
            />
            <Input
              placeholder="Cari sate, nasi, dll..."
              className="pl-10 bg-zinc-900 border-zinc-800 text-white rounded-xl focus-visible:ring-orange-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-white text-black font-bold"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 min-h-screen pb-32">
        {/* LOGIC LOADING: Kalau Loading TRUE -> Tampilkan Skeleton. Kalau FALSE -> Tampilkan Menu */}
        {isLoading ? (
          <MenuSkeleton />
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-500">
            {filteredItems.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="group bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden flex flex-col cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="h-32 w-full overflow-hidden relative">
                  <img
                    src={product.image}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt={product.name}
                  />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded flex items-center gap-0.5">
                    <Star
                      size={10}
                      className="text-yellow-400 fill-yellow-400"
                    />
                    <span className="text-[10px] font-bold text-white">
                      {product.rating}
                    </span>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-sm line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-zinc-500 text-[10px] line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-orange-400 font-bold text-sm">
                      Rp {product.price.toLocaleString("id-ID")}
                    </span>
                    <Button
                      size="icon"
                      className="h-7 w-7 rounded-full bg-white text-black hover:bg-orange-500 hover:text-white transition-colors"
                      onClick={(e) => handleQuickAdd(e, product)}
                    >
                      <Plus size={14} strokeWidth={3} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <span className="text-4xl mb-2">🤔</span>
            <p className="text-zinc-400 text-sm">
              Yah, menu yang kamu cari gak ketemu.
            </p>
          </div>
        )}
      </div>

      <FloatingCart />

      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
      />
    </MobileLayout>
  );
}
