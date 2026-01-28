"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

const categories = [
  { id: "all", name: "🔥 Semua" },
  { id: "sate", name: "🍡 Sate" },
  { id: "nasi", name: "🍚 Nasi" },
  { id: "minum", name: "🍹 Minuman" },
  { id: "gorengan", name: "🥟 Gorengan" },
  { id: "lain", name: "✨ Lainnya" },
];

export function MenuCategory() {
  const [activeCategory, setActiveCategory] = useState("all");

  return (
    // Backdrop blur lebih kuat biar konten di belakang gak ganggu teks
    <div className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 py-4">
      <div className="relative">
        {/* Scroll Container */}
        <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 scrollbar-hide snap-x">
          {categories.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "snap-start flex-shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-bold tracking-wide transition-all duration-300 ease-out",
                  // LOGIKA PSIKOLOGI WARNA:
                  // Aktif = Putih Terang (Fokus Utama)
                  // Tidak Aktif = Abu Gelap (Background)
                  isActive
                    ? "bg-white text-zinc-950 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] scale-105"
                    : "bg-zinc-900/50 text-zinc-500 border border-white/5 hover:bg-zinc-800 hover:text-zinc-300",
                )}
              >
                {category.name}
              </button>
            );
          })}
          {/* Spacer kanan */}
          <div className="w-4 flex-shrink-0" />
        </div>

        {/* Gradasi pudar di kanan (Visual Cue) */}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
