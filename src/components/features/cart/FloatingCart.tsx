"use client";

import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Utensils, ShoppingBasket } from "lucide-react"; // Tambah Icon Basket
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function FloatingCart() {
  // Ambil state cart
  const { totalItems, totalPrice, clearCart, isConfirmed, setConfirmed } =
    useCart();
  const itemsCount = totalItems();
  const priceTotal = totalPrice();

  // State untuk Hydration & Table Info
  const [mounted, setMounted] = useState(false);
  const [tableName, setTableName] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Cek Session Storage dengan aman
    if (typeof window !== "undefined") {
      const savedTable = sessionStorage.getItem("active_table_session");
      if (savedTable) {
        try {
          const tableData = JSON.parse(savedTable);
          // Validasi sederhana agar tidak error jika data korup
          if (tableData && tableData.number) {
            setTableName(tableData.number);
          }
        } catch (e) {
          console.error("Gagal memuat sesi meja", e);
        }
      }
    }
  }, []);

  // --- LOGIC TOMBOL PESAN (HYBRID SYSTEM) ---
  const handlePesan = () => {
    // 1. Kunci status cart (UI berubah ke mode checkout/konfirmasi)
    setConfirmed(true);

    // 2. Notifikasi Cerdas Berdasarkan Konteks
    if (tableName) {
      // SKENARIO 1: DINE-IN (Ada Meja)
      toast.success(`Pesanan ${tableName} Siap! 🍽️`, {
        description:
          "Mohon tunggu sebentar, pesanan akan diproses/lanjut bayar.",
        duration: 5000,
        position: "top-center",
        className: "bg-zinc-950 border-emerald-500/30 text-white", // Aksen Hijau
        icon: <Utensils className="text-emerald-500" size={18} />,
      });
    } else {
      // SKENARIO 2: TAKEAWAY / BELUM SCAN (Umum)
      toast.success("Pesanan Dibuat! 🛍️", {
        description:
          "Silakan ke kasir untuk pembayaran atau scan QR meja sekarang.",
        duration: 5000,
        position: "top-center",
        className: "bg-zinc-950 border-orange-500/30 text-white", // Aksen Orange
        icon: <ShoppingBasket className="text-orange-500" size={18} />,
      });
    }
  };

  if (!mounted) return null;

  // HIDE LOGIC: Sembunyikan jika kosong atau sudah dikonfirmasi
  if (itemsCount === 0 || isConfirmed) return null;

  return (
    <div className="fixed bottom-[85px] left-0 right-0 z-50 px-4 animate-in slide-in-from-bottom-5 fade-in duration-500 ease-out">
      <div className="max-w-md mx-auto relative">
        {/* Tombol Reset Cart (Hapus Semua) */}
        <button
          onClick={() => {
            if (confirm("Hapus semua menu di keranjang?")) clearCart();
          }}
          className="absolute -top-3 -right-2 z-50 bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-zinc-700 border border-white/10 rounded-full p-1.5 shadow-lg transition-all active:scale-90"
          aria-label="Kosongkan Keranjang"
        >
          <X size={14} strokeWidth={3} />
        </button>

        {/* CONTAINER UTAMA */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 backdrop-blur-xl border border-orange-500/50 p-4 rounded-2xl shadow-[0_10px_40px_-10px_rgba(249,115,22,0.3)] flex items-center justify-between relative overflow-hidden group ring-1 ring-white/10">
          {/* Efek Kilau Animasi */}
          <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shine pointer-events-none" />

          {/* Info Total & Meja */}
          <div className="flex flex-col px-1 z-10">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
              {tableName ? (
                // Indikator Hijau jika ada meja
                <span className="text-emerald-400 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />{" "}
                  {tableName}
                </span>
              ) : (
                // Indikator Orange jika Takeaway/Umum
                <span className="text-orange-300/70">Total Tagihan</span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-xs font-bold border border-orange-500/20">
                {itemsCount} Item
              </span>
              <span className="text-white font-black text-lg tracking-tight">
                Rp {priceTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Tombol Aksi Utama */}
          <Button
            size="sm"
            onClick={handlePesan}
            className="z-10 bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-6 h-10 font-bold shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
          >
            <ShoppingBag size={18} className="mr-2" />
            {tableName ? "Pesan" : "Lanjut"}
          </Button>
        </div>
      </div>
    </div>
  );
}
