"use client";

import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in zoom-in duration-500">
      {/* Icon Besar */}
      <div className="relative">
        <div className="absolute inset-0 bg-orange-500 blur-3xl opacity-20 animate-pulse" />
        <div className="relative bg-zinc-900 p-8 rounded-full border border-white/10 shadow-2xl">
          <UtensilsCrossed size={64} className="text-zinc-500" />

          {/* Tanda Tanya Muter */}
          <div className="absolute -top-2 -right-2 bg-orange-500 text-white w-10 h-10 flex items-center justify-center rounded-full font-bold text-xl border-4 border-black animate-bounce">
            ?
          </div>
        </div>
      </div>

      <div className="space-y-2 max-w-xs mx-auto">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Waduh! 404
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Menu yang kamu cari kayaknya udah abis atau emang gak pernah ada, Mas.
          😅
        </p>
      </div>

      {/* Tombol Balik */}
      <Link href="/">
        <Button className="bg-white text-black hover:bg-orange-500 hover:text-white font-bold rounded-full px-8 h-12 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all active:scale-95">
          Balik ke Angkringan 🏠
        </Button>
      </Link>

      <div className="absolute bottom-10 text-[10px] text-zinc-700 uppercase tracking-widest">
        Angkringan Mas Radit
      </div>
    </div>
  );
}
