"use client";

import { memo, useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus, Star, Heart, Ban, Trophy, ImageOff, Share2 } from "lucide-react";
import { toast } from "sonner";

// Tipe Data
interface HomeProductCardProps {
  product: any;
  index?: number;
  isHorizontal?: boolean; // True = List View (Paling Laris), False = Grid/Carousel
  showLove?: boolean;
  onClick: (product: any) => void;
  onQuickAdd: (e: React.MouseEvent, product: any) => void;
  onToggleFavorite?: (e: React.MouseEvent, product: any) => void;
  isFavorite?: boolean;
}

export const HomeProductCard = memo(
  ({
    product,
    index,
    isHorizontal = false,
    showLove = true,
    onClick,
    onQuickAdd,
    onToggleFavorite,
    isFavorite,
  }: HomeProductCardProps) => {
    const [imgSrc, setImgSrc] = useState(product.image);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
      setImgSrc(product.image);
      setImgError(false);
    }, [product.image]);

    // FITUR BARU 1 (CARD): Share Button
    const handleShare = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(
        `${window.location.origin}/menu?q=${product.name}`,
      );
      toast.success("Link menu disalin! 🔗");
    };

    return (
      <div
        onClick={() => onClick(product)}
        className={`group relative flex cursor-pointer transition-all border border-transparent overflow-hidden touch-manipulation
        ${!product.isAvailable ? "grayscale opacity-70 bg-zinc-900/20" : "bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-white/5"}
        ${
          isHorizontal
            ? "gap-3 p-2 rounded-xl flex-row items-center" // List View (Paling Laris)
            : "min-w-[140px] w-[140px] snap-center flex-col rounded-xl border-white/5 bg-zinc-900" // Grid/Carousel
        }
      `}
      >
        {/* RANKING BADGE (FIX: Posisi Absolute di luar image container biar gak ketutupan) */}
        {index !== undefined && index < 3 && (
          <div
            className={`absolute -top-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-zinc-950 z-30 shadow-xl
          ${index === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black" : index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black" : "bg-gradient-to-br from-orange-700 to-orange-900 text-white"}
        `}
          >
            #{index + 1}
          </div>
        )}

        {/* IMAGE CONTAINER */}
        <div
          className={`relative bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center
        ${isHorizontal ? "h-24 w-24 rounded-lg border border-white/5" : "h-28 w-full"}`}
        >
          {!imgError ? (
            <Image
              src={imgSrc}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="120px"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-600 gap-1">
              <ImageOff size={16} />
              <span className="text-[8px] font-medium">No Image</span>
            </div>
          )}

          {/* STATUS HABIS */}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
              <span className="bg-red-600 text-white px-2 py-1 rounded text-[8px] font-bold flex items-center gap-1 border border-red-500">
                <Ban size={10} /> HABIS
              </span>
            </div>
          )}
        </div>

        {/* INFO CONTENT */}
        <div
          className={`flex flex-col justify-between flex-1 ${isHorizontal ? "py-1 pr-1 h-24" : "p-3"}`}
        >
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-white text-xs line-clamp-2 leading-tight flex-1">
                {product.name}
              </h3>

              {/* RATING (FIX: Pindah ke sini biar rapi di List View) */}
              <div className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded text-[9px] font-bold text-yellow-400 ml-2">
                <Star size={8} fill="currentColor" /> {product.rating}
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="flex justify-between items-end mt-2">
            <div className="flex flex-col">
              {(product.originalPrice ?? 0) > product.price && (
                <span className="text-[9px] text-zinc-500 line-through">
                  Rp {product.originalPrice?.toLocaleString("id-ID")}
                </span>
              )}
              {/* FITUR BARU 2 (CARD): Pulse Effect pada Harga */}
              <span
                className={`font-extrabold text-orange-500 ${isHorizontal ? "text-sm" : "text-xs"}`}
              >
                Rp {product.price.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex gap-2">
              {/* LOVE BUTTON (Sekarang Ada di Sini) */}
              {showLove && onToggleFavorite && (
                <button
                  onClick={(e) => onToggleFavorite(e, product)}
                  className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-pink-500 hover:border-pink-500/50 transition-all active:scale-90"
                >
                  <Heart
                    size={14}
                    className={isFavorite ? "fill-pink-500 text-pink-500" : ""}
                  />
                </button>
              )}

              {/* ADD BUTTON */}
              <Button
                size="icon"
                disabled={!product.isAvailable}
                onClick={(e) => onQuickAdd(e, product)}
                className={`transition-all h-7 w-7 rounded-lg shadow-lg
                ${!product.isAvailable ? "bg-zinc-800 cursor-not-allowed" : "bg-white text-black hover:bg-orange-500 hover:text-white active:scale-95"}
                `}
              >
                <Plus size={16} strokeWidth={3} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

HomeProductCard.displayName = "HomeProductCard";
