"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { MenuCategory } from "@/components/features/menu/MenuCategory";
import { FloatingCart } from "@/components/features/cart/FloatingCart";
import { useCart, MenuItem } from "@/hooks/use-cart"; // Import MenuItem buat tipe data
import { Plus, Star, ArrowRight, Clock } from "lucide-react";
import { MENU_ITEMS } from "@/lib/data";
import Link from "next/link";
import { useState } from "react";
// Import Modal Baru
import { ProductDetailModal } from "@/components/features/menu/ProductDetailModal";

export default function Home() {
  const { addToCart } = useCart();
  const recommendedItems = MENU_ITEMS.filter((item) => item.isRecommended);

  // STATE UNTUK POPUP
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fungsi Buka Popup
  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Fungsi Tambah Langsung (Tombol +)
  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.stopPropagation(); // Biar gak memicu klik kartu (popup)
    addToCart(product);
  };

  return (
    <MobileLayout>
      {/* ... (Hero Section TETAP SAMA, tidak perlu diubah) ... */}
      <section className="relative h-[300px] w-full overflow-hidden">
        {/* Copy paste kode Hero Section yang lama di sini */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1519690889869-e705e59f72e1?q=80&w=600&auto=format&fit=crop"
            alt="Angkringan Header"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 pt-12">
          {/* Status & History Button Wrapper */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Buka Sekarang
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-[10px] backdrop-blur-md">
                Tutup 24.00
              </span>
            </div>

            {/* TOMBOL SHORTCUT HISTORY */}
            <Link href="/history">
              <button className="bg-white/10 backdrop-blur-md border border-white/10 p-2 rounded-full text-white hover:bg-orange-500 hover:text-white transition-all shadow-lg active:scale-95">
                <Clock size={18} />
              </button>
            </Link>
          </div>

          <h1 className="text-4xl font-extrabold text-white mb-2 leading-tight tracking-tight">
            Angkringan
            <br />
            Mas Radit
          </h1>
          <p className="text-zinc-300 text-sm flex items-center gap-1.5 font-medium">
            📍 Jl. Malioboro No. 1 <span className="text-zinc-600">•</span> ⭐
            4.8
          </p>
        </div>
      </section>

      {/* ... (Menu Category TETAP SAMA) ... */}
      <MenuCategory />

      {/* --- DAFTAR MENU (Updated logic click) --- */}
      <section className="px-5 py-6 space-y-8 min-h-screen bg-zinc-950">
        {/* ... (Header Section TETAP SAMA) ... */}
        <div className="flex items-end justify-between border-l-4 border-orange-500 pl-3">
          <div>
            <h2 className="text-xl font-bold text-white leading-none">
              Rekomendasi Chef 👨‍🍳
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Wajib coba kalau baru pertama kesini!
            </p>
          </div>
          <Link
            href="/menu"
            className="text-xs text-orange-500 flex items-center gap-1 font-bold hover:underline"
          >
            Lihat Semua <ArrowRight size={12} />
          </Link>
        </div>

        <div className="space-y-5">
          {recommendedItems.map((product) => (
            // TAMBAHKAN onClick DI SINI
            <div
              key={product.id}
              onClick={() => handleProductClick(product)} // Klik kartu -> Buka Popup
              className="group relative flex gap-4 cursor-pointer"
            >
              <div className="h-28 w-28 rounded-2xl bg-zinc-900 overflow-hidden flex-shrink-0 relative shadow-lg shadow-black/50 border border-white/5">
                <img
                  src={product.image}
                  className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                  alt={product.name}
                />
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-md flex items-center gap-0.5">
                  <Star size={8} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[8px] font-bold text-white">
                    {product.rating}
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between py-1 relative">
                <div className="absolute -bottom-2.5 left-0 right-0 h-[1px] bg-gradient-to-r from-zinc-800 to-transparent" />

                <div>
                  <h3 className="font-bold text-white text-lg leading-tight tracking-tight">
                    {product.name}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed font-medium">
                    {product.description}
                  </p>
                </div>

                <div className="flex justify-between items-end mt-3">
                  <div className="flex flex-col">
                    {product.originalPrice > 0 && (
                      <span className="text-[10px] text-zinc-600 decoration-zinc-600 line-through font-medium">
                        Rp {product.originalPrice.toLocaleString("id-ID")}
                      </span>
                    )}
                    <span className="font-extrabold text-orange-500 text-lg">
                      Rp {product.price.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <Button
                    size="icon"
                    onClick={(e) => handleQuickAdd(e, product)} // Klik Tombol -> Langsung Add (Gak buka popup)
                    className="h-10 w-10 rounded-xl bg-white text-black shadow-[0_0_15px_-3px_rgba(255,255,255,0.4)] hover:bg-orange-500 hover:text-white hover:shadow-orange-500/50 hover:scale-110 active:scale-95 transition-all duration-300 border-none"
                  >
                    <Plus size={22} strokeWidth={3} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="py-8 flex justify-center">
          <Link href="/menu">
            <Button
              variant="outline"
              className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full px-8"
            >
              Lihat {MENU_ITEMS.length} Menu Lainnya 🍽️
            </Button>
          </Link>
        </div>
      </section>

      <FloatingCart />

      {/* --- PASANG KOMPONEN POPUP DI SINI --- */}
      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
      />
    </MobileLayout>
  );
}
