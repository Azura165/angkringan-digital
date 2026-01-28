"use client";

import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function FloatingCart() {
  // Ambil state isConfirmed dan setConfirmed
  const { totalItems, totalPrice, clearCart, isConfirmed, setConfirmed } =
    useCart();
  const itemsCount = totalItems();
  const priceTotal = totalPrice();

  // Trik Hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // LOGIC TOMBOL PESAN
  const handlePesan = () => {
    // 1. Ubah status jadi Confirmed (ini akan: Sembunyikan Bar & Munculkan Badge di Nav)
    setConfirmed(true);

    // 2. Munculkan Notif
    toast.success("Pesanan Masuk Keranjang! 🛒", {
      description: "Cek tab 'Order' di bawah untuk pembayaran.",
      duration: 3000,
      position: "top-center",
      className: "bg-zinc-900 border-orange-500/20 text-white", // Styling Toast biar gelap
    });
  };

  if (!mounted) return null;

  // LOGIC TAMPIL:
  // Hanya muncul kalau ada barang DAN BELUM dikonfirmasi
  if (itemsCount === 0 || isConfirmed) return null;

  return (
    <div className="fixed bottom-[85px] left-0 right-0 z-40 px-4 animate-in slide-in-from-bottom-5 fade-in duration-500 ease-out">
      <div className="max-w-md mx-auto relative">
        {/* Tombol Close (Reset) */}
        <button
          onClick={clearCart}
          className="absolute -top-3 -right-2 z-50 bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-zinc-700 border border-white/10 rounded-full p-1.5 shadow-lg transition-all active:scale-90"
        >
          <X size={14} strokeWidth={3} />
        </button>

        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 backdrop-blur-xl border border-orange-500/30 p-3.5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shine" />

          <div className="flex flex-col px-1 z-10">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-0.5">
              Total Tagihan
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded text-xs font-bold border border-orange-500/20">
                {itemsCount}x
              </span>
              <span className="text-white font-bold text-base tracking-tight">
                Rp {priceTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handlePesan}
            className="z-10 bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-6 font-bold shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
          >
            <ShoppingBag size={18} className="mr-2" />
            Pesan
          </Button>
        </div>
      </div>
    </div>
  );
}
