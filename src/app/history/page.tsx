"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import {
  Clock,
  Trash2,
  Search,
  Repeat,
  Copy,
  ChevronDown,
  ChevronUp,
  Receipt,
  Wallet,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

// Komponen Kartu History (Style Struk Belanja)
const HistoryCard = ({
  order,
  onReorder,
}: {
  order: any;
  onReorder: (items: any[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Order #${order.id}\nItems: ${order.items.map((i: any) => `${i.name} x${i.qty}`).join(", ")}\nTotal: Rp ${order.total.toLocaleString("id-ID")}`;
    navigator.clipboard.writeText(text);
    toast.success("Detail pesanan disalin! 📋");
  };

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden mb-3 transition-all hover:border-white/10 group">
      {/* Header Kartu */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 cursor-pointer active:bg-zinc-800/50 transition-colors"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800 p-2.5 rounded-xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-white font-bold text-base">
                Rp {order.total.toLocaleString("id-ID")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Clock size={10} /> {order.date}
                </span>
                <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                  SUKSES
                </span>
              </div>
            </div>
          </div>
          <div className="text-zinc-500">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        {/* Preview Item (Tampil walau tertutup) */}
        {!isOpen && (
          <p className="text-xs text-zinc-500 line-clamp-1 pl-1">
            {order.items.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}
          </p>
        )}
      </div>

      {/* Detail Accordion */}
      {isOpen && (
        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
          <div className="border-t border-dashed border-zinc-700 my-3 relative">
            <div className="absolute -left-5 -top-1.5 w-3 h-3 bg-black rounded-full" />
            <div className="absolute -right-5 -top-1.5 w-3 h-3 bg-black rounded-full" />
          </div>

          <div className="space-y-2 mb-5">
            {order.items.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex justify-between text-xs text-zinc-300"
              >
                <span className="flex-1">
                  <span className="font-bold text-orange-500 mr-2">
                    {item.qty}x
                  </span>
                  {item.name}
                </span>
                <span className="text-zinc-500">
                  Rp {(item.price * item.qty).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1 h-10 text-xs border-zinc-700 text-zinc-400 hover:text-white bg-transparent rounded-xl"
            >
              <Copy size={14} className="mr-2" /> Salin
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReorder(order.items);
              }}
              className="flex-1 h-10 text-xs bg-orange-600 hover:bg-orange-500 text-white border-0 rounded-xl shadow-lg shadow-orange-900/20"
            >
              <Repeat size={14} className="mr-2" /> Pesan Lagi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function HistoryPage() {
  const router = useRouter();
  const { history, clearHistory, addToCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Hydration Fix (Penting untuk LocalStorage)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter Logic
  const filteredHistory = useMemo(() => {
    if (!searchQuery) return history;
    return history.filter(
      (order) =>
        order.items.some((item: any) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ) || order.date.includes(searchQuery),
    );
  }, [history, searchQuery]);

  // Stats Calculation
  const stats = useMemo(() => {
    const totalSpent = history.reduce((acc, curr) => acc + curr.total, 0);
    const totalOrders = history.length;
    return { totalSpent, totalOrders };
  }, [history]);

  const handleReorder = (items: any[]) => {
    items.forEach((item) => addToCart(item));
    if (navigator.vibrate) navigator.vibrate(50);
    toast.success("Menu masuk keranjang! 🛒");
    router.push("/cart");
  };

  const handleClearHistory = () => {
    if (confirm("Hapus semua riwayat? Data tidak bisa kembali.")) {
      clearHistory();
      toast.success("Riwayat bersih ✨");
    }
  };

  if (!mounted) return null;

  return (
    <MobileLayout>
      {/* HEADER FIXED (NO BACK BUTTON) */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Clock className="text-orange-500" size={20} />
          Riwayat
        </h1>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-full transition-all active:scale-95"
          >
            <Trash2 size={12} /> Hapus
          </button>
        )}
      </div>

      <div className="p-5 pb-32 min-h-screen">
        {history.length > 0 && (
          <>
            {/* STATS DASHBOARD */}
            <div className="grid grid-cols-2 gap-3 mb-6 animate-in fade-in slide-in-from-top-4">
              <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-16 h-16 bg-orange-500/10 rounded-full blur-2xl -mr-5 -mt-5"></div>
                <div className="text-orange-500 mb-2 bg-orange-500/10 w-fit p-2 rounded-lg">
                  <Wallet size={18} />
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Total Jajan
                </p>
                <p className="text-sm font-black text-white mt-1">
                  Rp {stats.totalSpent.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl -mr-5 -mt-5"></div>
                <div className="text-blue-500 mb-2 bg-blue-500/10 w-fit p-2 rounded-lg">
                  <ShoppingBag size={18} />
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Frekuensi
                </p>
                <p className="text-sm font-black text-white mt-1">
                  {stats.totalOrders}x Pesan
                </p>
              </div>
            </div>

            {/* SEARCH BAR */}
            <div className="relative mb-6 group">
              <Search
                size={16}
                className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-orange-500 transition-colors"
              />
              <Input
                placeholder="Cari menu yang pernah dibeli..."
                className="pl-9 bg-zinc-900 border-zinc-800 text-sm h-10 rounded-xl focus:ring-orange-500 focus:border-orange-500/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </>
        )}

        {/* LIST HISTORY */}
        {filteredHistory.length === 0 ? (
          // EMPTY STATE
          <div className="flex flex-col items-center justify-center pt-20 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-orange-500/10">
              <CheckCircle2 size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-white font-bold text-lg">
              {searchQuery ? "Tidak Ditemukan" : "Belum Ada Riwayat"}
            </h3>
            <p className="text-zinc-500 text-xs mt-2 max-w-[220px] leading-relaxed">
              {searchQuery
                ? `Tidak ada pesanan dengan kata kunci "${searchQuery}"`
                : "Semua pesanan kamu akan muncul di sini. Yuk pesan sekarang!"}
            </p>
            {!searchQuery && (
              <Link href="/menu">
                <Button className="mt-8 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold px-8 shadow-lg h-12">
                  Mulai Jajan Sekarang
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 pl-1">
              Terbaru
            </p>
            {filteredHistory
              .slice()
              .reverse()
              .map((order) => (
                <HistoryCard
                  key={order.id}
                  order={order}
                  onReorder={handleReorder}
                />
              ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
