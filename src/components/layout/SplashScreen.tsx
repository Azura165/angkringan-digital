"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed } from "lucide-react";

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Timer Cepat: 800ms (0.7s animasi + 0.1s buffer biar smooth)
    const timer = setTimeout(() => {
      setShow(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950 animate-out fade-out duration-300 delay-700 fill-mode-forwards">
      {/* Logo Animasi (Zoom In Cepat) */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse" />
        <div className="relative bg-zinc-900 p-6 rounded-full border border-white/5 shadow-2xl animate-in zoom-in duration-300">
          <UtensilsCrossed size={48} className="text-orange-500" />
        </div>
      </div>

      {/* Teks Brand (Slide Up Cepat) */}
      <div className="text-center space-y-2 animate-in slide-in-from-bottom-5 duration-300 delay-100 fill-mode-forwards opacity-0">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Angkringan
          <br />
          Mas Radit
        </h1>
        <p className="text-xs text-zinc-500 uppercase tracking-[0.2em]">
          Authentic Taste
        </p>
      </div>

      {/* Loading Bar (Sesuai Request: 0.7s) */}
      <div className="absolute bottom-12 w-32 h-1 bg-zinc-900 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500 w-full animate-progress origin-left" />
      </div>
    </div>
  );
}
