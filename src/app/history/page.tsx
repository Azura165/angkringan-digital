"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { ChevronLeft, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const router = useRouter();
  const { history, clearHistory } = useCart();

  // Trik Hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <MobileLayout>
      <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            size="icon"
            variant="ghost"
            className="text-zinc-400 hover:text-white"
          >
            <ChevronLeft />
          </Button>
          <h1 className="text-lg font-bold text-white">Riwayat Pesanan</h1>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
          >
            <Trash2 size={12} /> Hapus
          </button>
        )}
      </div>

      <div className="p-5 space-y-6 pb-32">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 opacity-50">
            <Clock size={48} className="text-zinc-600" />
            <p className="text-zinc-400 text-sm">Belum ada riwayat pesanan.</p>
            <Link href="/">
              <Button
                variant="outline"
                className="border-zinc-700 bg-transparent text-white rounded-full"
              >
                Pesan Sesuatu
              </Button>
            </Link>
          </div>
        ) : (
          history.map((order) => (
            <div
              key={order.id}
              className="relative bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50" />
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-mono mb-1">
                      {order.id}
                    </p>
                    <p className="text-xs text-zinc-300 font-bold flex items-center gap-1">
                      <Clock size={10} className="text-orange-500" />{" "}
                      {order.date}
                    </p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase">
                    Sukses
                  </span>
                </div>
                <div className="border-t border-dashed border-zinc-800 my-2" />
                <div className="space-y-1">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs text-zinc-400"
                    >
                      <span>
                        {item.qty}x {item.name}
                      </span>
                      <span>{item.price.toLocaleString("id-ID")}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-zinc-800 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Total Bayar</span>
                  <span className="text-orange-400 font-bold text-sm">
                    Rp {order.total.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
