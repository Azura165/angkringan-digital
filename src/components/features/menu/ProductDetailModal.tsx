"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MenuItem, useCart } from "@/hooks/use-cart";
import { Star, Plus } from "lucide-react";
import { toast } from "sonner";

interface ProductDetailModalProps {
  product: MenuItem | null; // Data produk yang diklik
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
}: ProductDetailModalProps) {
  const { addToCart } = useCart();

  if (!product) return null;

  const handleAddToCart = () => {
    addToCart(product);
    toast.success("Masuk Keranjang! 🛒", {
      description: `${product.name} ditambahkan.`,
      position: "top-center",
      duration: 1500,
    });
    onClose(); // Tutup popup setelah add
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-[340px] rounded-3xl p-0 overflow-hidden gap-0">
        {/* Gambar Full Header */}
        <div className="relative h-56 w-full">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

          {/* Badge Rating */}
          <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-white">4.8</span>
          </div>
        </div>

        {/* Konten Detail */}
        <div className="p-5 space-y-4">
          <div>
            <DialogTitle className="text-xl font-bold mb-1">
              {product.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm leading-relaxed">
              {/* Deskripsi dummy kalau di data gak ada deskripsi panjang */}
              Rasakan kenikmatan bumbu rempah pilihan yang meresap sempurna.
              Cocok banget buat temen nongkrong malam ini! 🍢
            </DialogDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-800 px-3 py-1 rounded-full text-[10px] text-zinc-400">
              🔥 Pedas Manis
            </div>
            <div className="bg-zinc-800 px-3 py-1 rounded-full text-[10px] text-zinc-400">
              👍 Recommended
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-5 pt-2 flex items-center justify-between border-t border-white/5 bg-zinc-900/50">
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs">Harga</span>
            <span className="text-orange-500 font-extrabold text-xl">
              Rp {product.price.toLocaleString("id-ID")}
            </span>
          </div>

          <Button
            onClick={handleAddToCart}
            className="bg-white text-black hover:bg-orange-500 hover:text-white rounded-xl px-6 font-bold transition-all active:scale-95"
          >
            <Plus size={18} className="mr-2" /> Tambah
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
