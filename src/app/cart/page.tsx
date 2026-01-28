"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import {
  Minus,
  Plus,
  Trash2,
  MessageCircle,
  Receipt,
  User,
  MapPin,
  Utensils,
  ShoppingBag,
  Edit3,
  Copy,
  Coffee,
  ArrowRight,
  Loader2,
  Flame,
  Soup,
  CreditCard,
  Banknote,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
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
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    addToCart,
    removeFromCart,
    removeItem,
    totalItems,
    totalPrice,
    moveToHistory,
  } = useCart();

  // STATE FORM & UX
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash"); // FITUR BARU: Metode Bayar
  const [needUtensils, setNeedUtensils] = useState(true);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [isNoteOpen, setIsNoteOpen] = useState<string | null>(null);

  // STATE DB (Nomor WA Dinamis)
  const [adminPhone, setAdminPhone] = useState("6285746869466"); // Fallback default

  // 1. FETCH NOMOR WA DARI DB (OPTIMASI SERVER)
  useEffect(() => {
    async function fetchConfig() {
      const { data } = await supabase
        .from("store_config")
        .select("whatsapp_number")
        .single();
      if (data?.whatsapp_number) {
        setAdminPhone(data.whatsapp_number);
      }
    }
    fetchConfig();
  }, []);

  // Logic Upselling
  const hasDrink = useMemo(
    () =>
      items.some(
        (i) =>
          i.name.toLowerCase().includes("es") ||
          i.name.toLowerCase().includes("teh"),
      ),
    [items],
  );

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleNoteChange = (id: string, note: string) => {
    setItemNotes((prev) => ({ ...prev, [id]: note }));
  };

  const handleClearCart = () => {
    if (window.confirm("Yakin mau hapus semua pesanan?")) {
      items.forEach((i) => removeItem(i.id));
      vibrate();
      toast.success("Keranjang dikosongkan");
    }
  };

  const handleSendToWhatsApp = () => {
    // Validasi Input
    if (
      !customerName.trim() ||
      (orderType === "dine-in" && !tableNumber.trim())
    ) {
      toast.error("Lengkapi data dulu ya! 📝");
      return;
    }

    setIsProcessing(true);

    const time = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // FORMAT PESAN WA PROFESIONAL
    let message = `*PESANAN BARU!* 🛎️\n`;
    message += `📅 Jam: ${time}\n`;
    message += `👤 Nama: *${customerName.toUpperCase()}*\n`;
    message += `📍 Tipe: *${orderType === "dine-in" ? `Makan di Sini (Meja ${tableNumber})` : "Bungkus / Takeaway"}*\n`;
    message += `💰 Bayar: *${paymentMethod === "cash" ? "Tunai (Cash)" : "QRIS / Transfer"}*\n`;
    message += `🍴 Alat Makan: ${needUtensils ? "Ya" : "Tidak (Hemat Plastik)"}\n`;
    message += `➖➖➖➖➖➖➖➖➖\n`;

    items.forEach((item, index) => {
      const note = itemNotes[item.id]
        ? `\n   └ 📝 _Note: ${itemNotes[item.id]}_`
        : "";
      message += `${index + 1}. ${item.name} (${item.qty}x)\n   Rp ${(item.price * item.qty).toLocaleString("id-ID")}${note}\n`;
    });

    message += `➖➖➖➖➖➖➖➖➖\n`;
    message += `*TOTAL: Rp ${totalPrice().toLocaleString("id-ID")}*\n`;
    message += `\nMohon diproses ya kak! Terima kasih. 🙏`;

    // Simpan ke History Lokal
    moveToHistory(
      customerName,
      orderType === "dine-in" ? tableNumber : "Takeaway",
    );

    setTimeout(() => {
      window.open(
        `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`,
        "_blank",
      );
      setIsProcessing(false);
      setIsDialogOpen(false);
      router.push("/history");
    }, 1500);
  };

  const handleCopyOrder = () => {
    let text = items.map((i) => `${i.name} (${i.qty}x)`).join(", ");
    text += ` | Total: Rp ${totalPrice().toLocaleString("id-ID")}`;
    navigator.clipboard.writeText(text);
    toast.success("Ringkasan pesanan disalin! 📋");
  };

  return (
    <MobileLayout>
      {/* HEADER FIXED (TANPA BACK BUTTON) */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-orange-500" size={20} />
            Keranjang
          </h1>
          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {totalItems()} Item
          </span>
        </div>

        {/* Tombol Hapus Semua */}
        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-full transition-all active:scale-95"
          >
            <Trash2 size={12} /> Reset
          </button>
        )}
      </div>

      <div className="p-5 space-y-6 pb-48 min-h-screen">
        {items.length === 0 ? (
          // EMPTY STATE
          <div className="flex flex-col items-center justify-center pt-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-orange-500/10">
              <ShoppingBag className="text-zinc-700" size={48} />
            </div>
            <h3 className="text-white font-bold text-2xl">Lapar ya?</h3>
            <p className="text-zinc-500 text-sm mt-2 max-w-[250px]">
              Keranjangmu masih kosong nih. Yuk isi dengan yang enak-enak!
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-xs">
              <Link
                href="/menu?q=sate"
                className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all"
              >
                <Flame className="text-orange-500" size={20} />
                <span className="text-xs font-bold text-zinc-300">
                  Pesan Sate
                </span>
              </Link>
              <Link
                href="/menu?q=minuman"
                className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-zinc-800 transition-all"
              >
                <Coffee className="text-blue-500" size={20} />
                <span className="text-xs font-bold text-zinc-300">
                  Pesan Minum
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* LIST ITEM */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/40 border border-white/5 rounded-2xl p-3 relative group animate-in slide-in-from-bottom-2 duration-500"
                >
                  <div className="flex gap-3">
                    <div className="h-20 w-20 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 relative">
                      <Image
                        src={item.image || "/menu/sate-kulit.jpg"}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-zinc-100 text-sm line-clamp-1 pr-6">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => {
                            removeItem(item.id);
                            vibrate();
                          }}
                          className="text-zinc-600 hover:text-red-500 p-1 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Note Input */}
                      {isNoteOpen === item.id ? (
                        <div className="my-2 animate-in fade-in">
                          <Input
                            autoFocus
                            placeholder="Cth: Pedas, Tanpa bawang"
                            className="h-7 text-[10px] bg-black/30 border-zinc-700 focus:ring-orange-500"
                            value={itemNotes[item.id] || ""}
                            maxLength={50}
                            onChange={(e) =>
                              handleNoteChange(item.id, e.target.value)
                            }
                            onBlur={() => setIsNoteOpen(null)}
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsNoteOpen(item.id)}
                          className="flex items-center gap-1 my-1 cursor-pointer group/note w-fit"
                        >
                          <Edit3
                            size={10}
                            className="text-zinc-600 group-hover/note:text-orange-500 transition-colors"
                          />
                          <span
                            className={`text-[10px] truncate max-w-[150px] ${itemNotes[item.id] ? "text-orange-400 italic" : "text-zinc-600 group-hover/note:text-zinc-400"}`}
                          >
                            {itemNotes[item.id] || "Tambah Catatan..."}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-orange-400 text-sm">
                          Rp {(item.price * item.qty).toLocaleString("id-ID")}
                        </span>
                        <div className="flex items-center gap-3 bg-zinc-950 rounded-lg p-1 border border-zinc-800 shadow-inner">
                          <button
                            onClick={() => {
                              removeFromCart(item.id);
                              vibrate();
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-bold text-white w-4 text-center tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => {
                              addToCart(item);
                              vibrate();
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-white text-black hover:bg-orange-500 hover:text-white transition-all shadow"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* UPSELLING (JIKA PERLU) */}
            {!hasDrink && (
              <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-right-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                    <Coffee size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Haus gak?</p>
                    <p className="text-[10px] text-zinc-400">
                      Pesen minum sekalian yuk.
                    </p>
                  </div>
                </div>
                <Link href="/menu?q=minuman">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 rounded-lg"
                  >
                    Tambah
                  </Button>
                </Link>
              </div>
            )}

            {/* BILL DETAILS */}
            <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Receipt size={14} /> Ringkasan Pembayaran
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal ({totalItems()} item)</span>
                  <span>Rp {totalPrice().toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Pajak & Layanan</span>
                  <span className="text-green-500 font-medium">
                    Rp 0 (Gratis)
                  </span>
                </div>
                <div className="border-t border-dashed border-zinc-700 pt-3 flex justify-between items-center mt-2">
                  <span className="text-white font-bold text-base">
                    Total Tagihan
                  </span>
                  <span className="text-orange-500 font-black text-xl tracking-tight">
                    Rp {totalPrice().toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* BOTTOM ACTION */}
      {items.length > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 px-4 z-40">
          <div className="max-w-md mx-auto bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-4 rounded-[2rem] shadow-2xl">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCopyOrder}
                className="h-12 w-12 rounded-2xl border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
              >
                <Copy size={18} />
              </Button>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="flex-1 h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all text-base"
              >
                Lanjut Bayar <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG CHECKOUT (FINAL FORM) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[340px] rounded-[2rem] pt-6 pb-8 gap-5">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-bold flex items-center gap-2">
              Konfirmasi Pesanan ✨
            </DialogTitle>
            <DialogDescription className="text-left text-zinc-500 text-xs">
              Lengkapi data di bawah ini ya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 1. TIPE PESANAN */}
            <div className="grid grid-cols-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
              <button
                onClick={() => {
                  setOrderType("dine-in");
                  vibrate();
                }}
                className={`text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${orderType === "dine-in" ? "bg-zinc-800 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <Utensils size={14} /> Dine-in
              </button>
              <button
                onClick={() => {
                  setOrderType("takeaway");
                  vibrate();
                }}
                className={`text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${orderType === "takeaway" ? "bg-zinc-800 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <ShoppingBag size={14} /> Bungkus
              </button>
            </div>

            {/* 2. INPUT DATA */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs ml-1">Nama Kamu</Label>
                <div className="relative group">
                  <User
                    size={16}
                    className="absolute left-3.5 top-3 text-zinc-500 group-focus-within:text-orange-500 transition-colors"
                  />
                  <Input
                    placeholder="Radithya"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus:ring-orange-500 h-11 rounded-xl text-sm"
                    value={customerName}
                    maxLength={30}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              {orderType === "dine-in" && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <Label className="text-zinc-400 text-xs ml-1">
                    Nomor Meja
                  </Label>
                  <div className="relative group">
                    <MapPin
                      size={16}
                      className="absolute left-3.5 top-3 text-zinc-500 group-focus-within:text-orange-500 transition-colors"
                    />
                    <Input
                      type="number"
                      placeholder="Cth: 12"
                      className="pl-10 bg-zinc-900 border-zinc-800 focus:ring-orange-500 h-11 rounded-xl text-sm"
                      value={tableNumber}
                      maxLength={3}
                      onChange={(e) => setTableNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. METODE PEMBAYARAN (BARU) */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs ml-1">Bayar Pakai</Label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setPaymentMethod("cash")}
                  className={`border rounded-xl p-3 cursor-pointer flex flex-col items-center gap-1 transition-all ${paymentMethod === "cash" ? "bg-orange-500/10 border-orange-500 text-orange-500" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"}`}
                >
                  <Banknote size={20} />
                  <span className="text-[10px] font-bold">Tunai</span>
                </div>
                <div
                  onClick={() => setPaymentMethod("qris")}
                  className={`border rounded-xl p-3 cursor-pointer flex flex-col items-center gap-1 transition-all ${paymentMethod === "qris" ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"}`}
                >
                  <QrCode size={20} />
                  <span className="text-[10px] font-bold">QRIS</span>
                </div>
              </div>
            </div>

            {/* 4. UTENSILS */}
            <div className="flex items-center justify-between bg-zinc-900/30 p-3.5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="bg-zinc-800 p-2 rounded-lg">
                  <Soup size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Alat Makan</span>
                  <span className="text-[10px] text-zinc-500">
                    Bantu kurangi plastik
                  </span>
                </div>
              </div>
              <Switch
                checked={needUtensils}
                onCheckedChange={setNeedUtensils}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSendToWhatsApp}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-12 rounded-xl text-base shadow-lg shadow-green-900/20 active:scale-[0.98] transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <MessageCircle size={20} className="mr-2" /> Kirim Pesanan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
