"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  BookOpen,
  ShoppingBag,
  History,
} from "lucide-react"; // Import 'History'
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useEffect, useState } from "react";

export function BottomNav() {
  const pathname = usePathname();
  const { totalItems, isConfirmed } = useCart();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update Array Menu: Tambah 'History'
  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Menu", href: "/menu", icon: UtensilsCrossed },
    { name: "Story", href: "/story", icon: BookOpen },

    { name: "Order", href: "/cart", icon: ShoppingBag },
    { name: "History", href: "/history", icon: History },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5">
      <div className="flex justify-around items-center h-[72px] max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isCart = item.name === "Order";

          return (
            <Link
              key={item.name}
              href={item.href}
              className="group flex flex-col items-center justify-center w-full h-full space-y-1 relative"
            >
              {/* Badge Merah di Cart */}
              {isCart && mounted && totalItems() > 0 && isConfirmed && (
                <span className="absolute top-1 right-3 h-3.5 w-3.5 rounded-full bg-orange-500 text-[9px] font-bold text-white flex items-center justify-center border border-zinc-950 animate-in zoom-in spin-in-90 duration-300">
                  {totalItems()}
                </span>
              )}

              {/* Indikator Glow */}
              {isActive && (
                <div className="absolute top-2 w-8 h-8 bg-orange-500/20 rounded-full blur-lg animate-pulse" />
              )}

              <div
                className={cn(
                  "relative transition-all duration-300 ease-out p-1.5 rounded-xl",
                  isActive
                    ? "-translate-y-1 text-orange-500"
                    : "text-zinc-500 group-hover:text-zinc-300",
                )}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              {/* Label Text (Sekarang font lebih kecil dikit biar muat 5 item) */}
              <span
                className={cn(
                  "text-[9px] font-medium transition-all duration-300",
                  isActive
                    ? "text-orange-400 opacity-100"
                    : "text-zinc-600 opacity-0 scale-0 h-0",
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
