"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  // Trik Hydration biar data cart aman
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    useCart.persist.rehydrate();
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <main className="w-full max-w-md bg-zinc-950 min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
        {/* Padding bawah SELALU pb-28 biar konten paling bawah gak ketutupan Navbar & Tombol Floating */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-28 animate-in fade-in duration-500">
          {children}
        </div>

        {/* Navigasi Bawah SELALU MUNCUL sekarang */}
        <BottomNav />
      </main>
    </div>
  );
}
