"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MenuItem, useCart } from "@/hooks/use-cart";
import {
  Star,
  Plus,
  X,
  ImageOff,
  Flame,
  ThumbsUp,
  Share2,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useState, useEffect } from "react";

// Update Tipe Data: Tambah sold_count
interface ExtendedMenuItem extends MenuItem {
  tags?: string[];
  description?: string;
  rating?: number;
  category?: string;
  sold_count?: number; // FIELD BARU DARI DB
}

interface ProductDetailModalProps {
  product: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
}: ProductDetailModalProps) {
  const { addToCart } = useCart();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [product]);

  if (!product) return null;

  const item = product as ExtendedMenuItem;

  // --- LOGIC 1: FORMAT ANGKA TERJUAL (1200 -> 1.2k) ---
  const formatSoldCount = (count: number = 0) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return count.toString();
  };

  // --- LOGIC 2: AUTO-TAGS ---
  const displayTags = item.tags && item.tags.length > 0 ? item.tags : [];
  if (displayTags.length === 0) {
    if ((item.rating || 5.0) >= 4.7) displayTags.push("Recommended");
    if (
      item.name.toLowerCase().includes("pedas") ||
      item.description?.toLowerCase().includes("pedas")
    )
      displayTags.push("Pedas Nampol");
    if ((item.sold_count || 0) > 100) displayTags.push("Best Seller");
  }

  const handleAddToCart = () => {
    addToCart(product);
    if (navigator.vibrate) navigator.vibrate(50);
    toast.success("Masuk Keranjang! 🛒", {
      description: `${product.name} ditambahkan.`,
      position: "top-center",
      duration: 1500,
    });
    onClose();
  };

  // FITUR SHARE (Detail Kecil)
  const handleShare = () => {
    const url = `${window.location.origin}/menu?q=${encodeURIComponent(item.name)}`;
    if (navigator.share) {
      navigator
        .share({
          title: item.name,
          text: `Cobain ${item.name} di Angkringan Mas Radit!`,
          url: url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link Produk Disalin! 🔗");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[340px] rounded-[2rem] p-0 overflow-hidden gap-0 ring-0 outline-none [&>button]:hidden shadow-2xl shadow-black/80">
        {/* HEADER GAMBAR */}
        <div className="relative h-80 w-full bg-zinc-900 group">
          {!imgError && item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority={true}
              quality={85}
              sizes="(max-width: 768px) 100vw, 400px"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-700 gap-2">
              <div className="p-4 bg-zinc-800/50 rounded-full">
                <ImageOff size={32} />
              </div>
              <span className="text-xs font-medium uppercase tracking-widest opacity-50">
                No Image
              </span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

          {/* HEADER BUTTONS (Share & Close) */}
          <div className="absolute top-4 right-4 flex gap-2 z-20">
            <button
              onClick={handleShare}
              className="bg-black/20 backdrop-blur-xl border border-white/10 text-white p-2 rounded-full hover:bg-black/50 transition-all active:scale-90"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="bg-black/20 backdrop-blur-xl border border-white/10 text-white p-2 rounded-full hover:bg-black/50 transition-all active:scale-90"
            >
              <X size={18} />
            </button>
          </div>

          {/* INFO UTAMA */}
          <div className="absolute bottom-0 left-0 w-full p-6 z-10 flex flex-col gap-2">
            {/* Kategori Kecil (Detail Baru) */}
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-orange-400">
                <Utensils size={10} /> {item.category || "Menu"}
              </span>
            </div>

            {/* TAGS */}
            <div className="flex flex-wrap gap-1.5 animate-in slide-in-from-bottom-2 duration-500">
              {displayTags.map((tag, i) => (
                <div
                  key={i}
                  className={`
                    px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1 shadow-sm border border-white/5
                    ${
                      tag.toLowerCase().includes("pedas")
                        ? "bg-red-500/20 text-red-200"
                        : tag.toLowerCase().includes("best seller")
                          ? "bg-yellow-500/20 text-yellow-200"
                          : "bg-zinc-800/60 text-zinc-300"
                    }
                  `}
                >
                  {tag.toLowerCase().includes("pedas") && <Flame size={10} />}
                  {tag.toLowerCase().includes("best seller") && (
                    <ThumbsUp size={10} />
                  )}
                  {tag}
                </div>
              ))}
            </div>

            <DialogTitle className="text-3xl font-black text-white leading-none tracking-tight drop-shadow-lg">
              {item.name}
            </DialogTitle>
          </div>
        </div>

        {/* KONTEN DETAIL */}
        <div className="px-6 pb-6 pt-4 bg-zinc-950 relative space-y-5">
          {/* RATING & REAL SOLD COUNT */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-yellow-400">
                <Star size={18} className="fill-yellow-400" />
                <span className="text-lg font-bold text-white">
                  {item.rating || "5.0"}
                </span>
              </div>
              <div className="h-4 w-[1px] bg-zinc-800" />
              {/* DATA REAL DARI DB */}
              <span className="text-xs text-zinc-400 font-medium">
                {formatSoldCount(item.sold_count || 0)}+ Terjual
              </span>
            </div>
          </div>

          <DialogDescription className="text-zinc-400 text-sm leading-relaxed font-normal">
            {item.description ||
              "Menu spesial dengan bumbu rahasia yang meresap sempurna. Wajib coba selagi hangat, cocok untuk menemani malammu!"}
          </DialogDescription>

          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

          {/* FOOTER ACTION */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex-1">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                Total Harga
              </p>
              <p className="text-2xl font-black text-white tracking-tighter">
                Rp {item.price.toLocaleString("id-ID")}
              </p>
            </div>

            <Button
              onClick={handleAddToCart}
              className="bg-orange-600 hover:bg-orange-500 text-white h-12 px-8 rounded-xl font-bold text-base shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={20} strokeWidth={3} />
              Pesan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
