"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import {
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
  MessageCircle,
  Receipt,
  User,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    addToCart,
    removeFromCart,
    removeItem,
    totalItems,
    totalPrice,
    moveToHistory, // <--- JANGAN LUPA IMPORT INI
  } = useCart();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");

  const handleOpenCheckout = () => {
    setIsDialogOpen(true);
  };

  const handleSendToWhatsApp = () => {
    if (!customerName || !tableNumber) {
      toast.error("Data Belum Lengkap! 🚫", {
        description: "Mohon isi Nama dan Nomor Meja dulu ya.",
        position: "top-center",
        duration: 3000,
        className: "bg-red-950 border-red-800 text-white",
      });
      return;
    }

    const phoneNumber = "6285746869466";

    let message = `*PESANAN BARU!* 🍢\n--------------------------\n`;
    message += `👤 Nama: *${customerName}*\n`;
    message += `📍 Meja: *${tableNumber}*\n`;
    message += `--------------------------\n`;
    items.forEach((item) => {
      message += `${item.name} (${item.qty}x)\nRp ${(item.price * item.qty).toLocaleString("id-ID")}\n\n`;
    });
    message += `--------------------------\n*TOTAL: Rp ${totalPrice().toLocaleString("id-ID")}*\n\nMohon diproses ya mas!`;

    // --- STEP PENTING: SIMPAN KE HISTORY ---
    moveToHistory(customerName, tableNumber);

    toast.success("Pesanan Dibuat! 🚀", {
      description: "Membuka WhatsApp...",
      position: "top-center",
      duration: 2000,
    });

    // Buka WA lalu Pindah Halaman
    setTimeout(() => {
      window.open(
        `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
        "_blank",
      );
      setIsDialogOpen(false);
      router.push("/history"); // <--- PINDAH KE HALAMAN HISTORY
    }, 1000);
  };

  return (
    <MobileLayout>
      <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center gap-4">
        <Button
          onClick={() => router.back()}
          size="icon"
          variant="ghost"
          className="text-zinc-400 hover:text-white"
        >
          <ChevronLeft />
        </Button>
        <h1 className="text-lg font-bold text-white">Keranjang Makan</h1>
      </div>

      <div className="p-5 space-y-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="text-zinc-600" size={36} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">Masih Kosong Nih</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Perut kenyang hati senang, yuk pesen dulu!
              </p>
            </div>
            <Link href="/">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 mt-4 font-bold shadow-lg">
                Lihat Menu
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4 pb-48">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-3 bg-zinc-900/40 border border-white/5 rounded-2xl relative group"
              >
                <div className="h-20 w-20 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                  <img
                    src={item.image}
                    className="w-full h-full object-cover"
                    alt={item.name}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-zinc-100 text-sm line-clamp-1 pr-6">
                      {item.name}
                    </h3>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-zinc-500 hover:text-red-500 absolute top-3 right-3"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="font-bold text-orange-400 text-sm">
                    Rp {(item.price * item.qty).toLocaleString("id-ID")}
                  </span>
                  <div className="flex items-center justify-end mt-2">
                    <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/5">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:text-white"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-bold text-white w-4 text-center">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-black hover:bg-orange-500 hover:text-white"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-[80px] left-0 right-0 px-4 z-40">
          <div className="max-w-md mx-auto bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,1)] ring-1 ring-orange-500/20 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 mb-4 text-zinc-400">
              <Receipt size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Rincian Pembayaran
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Harga Menu ({totalItems()} item)</span>
                <span>Rp {totalPrice().toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Biaya Layanan</span>
                <span className="text-green-500">Gratis</span>
              </div>
              <div className="border-t border-dashed border-zinc-700 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-lg">
                  Total Bayar
                </span>
                <span className="text-orange-500 font-extrabold text-2xl">
                  Rp {totalPrice().toLocaleString("id-ID")}
                </span>
              </div>
            </div>
            <Button
              onClick={handleOpenCheckout}
              className="w-full h-12 bg-green-600 hover:bg-green-500 text-white text-base font-bold rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <MessageCircle size={20} className="fill-white/20" />
              Pesan ke WhatsApp
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-[320px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-bold">
              Data Pemesan 📝
            </DialogTitle>
            <DialogDescription className="text-left text-zinc-400">
              Isi dulu ya biar pesananmu gak ketuker!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-zinc-300 flex items-center gap-2"
              >
                <User size={14} /> Nama Kamu
              </Label>
              <Input
                id="name"
                placeholder="Contoh: Radithya"
                className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="table"
                className="text-zinc-300 flex items-center gap-2"
              >
                <MapPin size={14} /> Nomor Meja
              </Label>
              <Input
                id="table"
                placeholder="Contoh: 5"
                type="number"
                className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSendToWhatsApp}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold h-11"
            >
              Kirim Pesanan Sekarang 🚀
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
