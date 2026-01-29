"use client";

import { memo, useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus, Star, Heart, Ban, ImageOff, Utensils } from "lucide-react";

interface HomeProductCardProps {
  product: any;
  index?: number;
  isHorizontal?: boolean;
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
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      setHasError(false);
      setIsLoading(true);
    }, [product.image]);

    const isValidUrl =
      product.image &&
      typeof product.image === "string" &&
      (product.image.startsWith("http") || product.image.startsWith("/"));

    const showImage = isValidUrl && !hasError;

    return (
      <div
        onClick={() => onClick(product)}
        className={`group relative flex cursor-pointer transition-all border border-transparent overflow-hidden touch-manipulation select-none will-change-transform
        ${!product.isAvailable ? "grayscale opacity-70 bg-zinc-900/20" : "bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-white/5"}
        ${
          isHorizontal
            ? "gap-4 p-3 rounded-2xl flex-row items-start bg-zinc-900/40" // LIST MODE (Paling Laris) - Padding lebih besar
            : "flex-col rounded-[1.5rem] border-white/5 bg-zinc-900" // GRID MODE
        }
      `}
      >
        {/* RANKING BADGE */}
        {index !== undefined && index < 3 && (
          <div
            className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-zinc-950 z-30 shadow-xl
          ${index === 0 ? "bg-yellow-400 text-black" : index === 1 ? "bg-gray-300 text-black" : "bg-orange-700 text-white"}
        `}
          >
            #{index + 1}
          </div>
        )}

        {/* IMAGE CONTAINER */}
        <div
          className={`relative bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center shadow-inner
        ${isHorizontal ? "h-24 w-24 rounded-xl" : "w-full aspect-square"} 
        `}
        >
          {/* Placeholder Background */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 bg-zinc-800">
            {hasError ? (
              <ImageOff size={20} className="opacity-50" />
            ) : (
              <Utensils size={24} className="opacity-20 animate-pulse" />
            )}
          </div>

          {/* Real Image */}
          {showImage && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className={`object-cover transition-all duration-700 group-hover:scale-110 z-10 
                ${isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"} 
              `}
              sizes={isHorizontal ? "100px" : "300px"}
              quality={75}
              loading="lazy"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
              unoptimized={product.image.startsWith("http")}
            />
          )}

          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-[2px] z-20">
              <span className="bg-red-600 text-white px-2 py-1 rounded text-[8px] font-bold flex items-center gap-1 border border-red-500 shadow-xl tracking-wider">
                <Ban size={10} /> HABIS
              </span>
            </div>
          )}
        </div>

        {/* INFO CONTENT */}
        <div
          className={`flex flex-col justify-between flex-1 ${isHorizontal ? "h-24 py-0.5" : "p-4"}`}
        >
          <div>
            <div className="flex justify-between items-start gap-2">
              <h3
                className={`font-bold text-white leading-tight ${isHorizontal ? "text-sm line-clamp-2" : "text-sm line-clamp-1"}`}
              >
                {product.name}
              </h3>
            </div>

            {/* --- UPDATE: Deskripsi Tampil di SEMUA MODE --- */}
            <p
              className={`text-[10px] text-zinc-500 mt-1 leading-relaxed ${isHorizontal ? "line-clamp-2" : "line-clamp-1"}`}
            >
              {product.description ||
                "Menu lezat khas angkringan yang wajib dicoba!"}
            </p>

            {product.rating > 0 && (
              <div className="flex items-center gap-1 text-yellow-500 mt-1.5">
                <Star size={10} fill="currentColor" />
                <span className="text-[10px] font-bold text-zinc-300">
                  {product.rating}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-end mt-2">
            <div className="flex flex-col">
              {(product.originalPrice ?? 0) > product.price && (
                <span className="text-[9px] text-zinc-600 line-through decoration-zinc-600">
                  Rp {product.originalPrice?.toLocaleString("id-ID")}
                </span>
              )}
              <span className="font-black text-white text-sm tracking-tight">
                Rp {product.price.toLocaleString("id-ID")}
              </span>
            </div>

            <Button
              size="icon"
              disabled={!product.isAvailable}
              onClick={(e) => onQuickAdd(e, product)}
              className={`transition-all h-8 w-8 rounded-xl shadow-lg
              ${!product.isAvailable ? "bg-zinc-800 cursor-not-allowed text-zinc-600" : "bg-gradient-to-tr from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white active:scale-90 border-0"}
              `}
            >
              <Plus size={16} strokeWidth={3} />
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

HomeProductCard.displayName = "HomeProductCard";
