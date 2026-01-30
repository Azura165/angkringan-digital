"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    useCart.persist.rehydrate();
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="min-h-screen bg-black" />; // Loading state simple
  }

  return (
    <div className="min-h-screen bg-black flex justify-center overflow-hidden">
      <main className="w-full max-w-md bg-zinc-950 min-h-screen relative shadow-2xl flex flex-col overflow-hidden">
        {/* Konten Utama: Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-28 animate-in fade-in duration-500 overscroll-none">
          {children}
        </div>

        {/* Navigasi Bawah: Fixed */}
        <BottomNav />
      </main>
    </div>
  );
}
