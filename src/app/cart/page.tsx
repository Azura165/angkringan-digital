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
  Banknote,
  QrCode,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    addToCart,
    removeFromCart, // PENTING: Gunakan ini untuk mengurangi qty
    removeItem,
    totalItems,
    totalPrice,
    moveToHistory,
  } = useCart();

  // STATE UX & FORM
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Shopee-like Accordion
  const [showBillDetails, setShowBillDetails] = useState(true);

  // Data Form
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [isTableLocked, setIsTableLocked] = useState(false);

  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [needUtensils, setNeedUtensils] = useState(true);

  // Notes
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [isNoteOpen, setIsNoteOpen] = useState<string | null>(null);

  // Config DB
  const [adminPhone, setAdminPhone] = useState("6285746869466");

  // Ref
  const nameInputRef = useRef<HTMLInputElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);

  // 1. OPTIMASI: MEMOIZED LOGIC (Biar gak berat saat re-render)
  const hasDrink = useMemo(
    () =>
      items.some(
        (i) =>
          i.name.toLowerCase().includes("es") ||
          i.name.toLowerCase().includes("teh"),
      ),
    [items],
  );
  const finalTotal = useMemo(() => totalPrice(), [items, totalPrice]); // Cache total price

  useEffect(() => {
    const scannedTable = sessionStorage.getItem("table_number");
    if (scannedTable) {
      setTableNumber(scannedTable);
      setIsTableLocked(true);
      setOrderType("dine-in");
    }

    const savedName = localStorage.getItem("customer_name");
    if (savedName) setCustomerName(savedName);

    async function fetchConfig() {
      const { data } = await supabase
        .from("store_config")
        .select("whatsapp_number")
        .single();
      if (data?.whatsapp_number) setAdminPhone(data.whatsapp_number);
    }
    fetchConfig();
  }, []);

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleRemoveItem = (item: any) => {
    vibrate();
    removeItem(item.id);
    toast("Item dihapus", {
      description: `${item.name} dihapus.`,
      action: {
        label: "Batal",
        onClick: () => addToCart({ ...item, qty: item.qty }),
      },
      icon: <Trash2 size={16} className="text-red-500" />,
      duration: 3000,
    });
  };

  const confirmClearCart = () => {
    items.forEach((i) => removeItem(i.id));
    vibrate();
    setIsClearAlertOpen(false);
    toast.success("Keranjang bersih! ✨");
  };

  // 2. LOGIC MINUS YANG BENAR (FIX BUG)
  const handleDecreaseQty = (item: any) => {
    vibrate();
    if (item.qty > 1) {
      // Gunakan removeFromCart untuk mengurangi 1 (sesuai standar use-cart umumnya)
      // ATAU jika hook kamu support delta negatif di addToCart, pakai itu.
      // Demi keamanan, kita pakai removeFromCart yang biasanya safe.
      removeFromCart(item.id);
    } else {
      handleRemoveItem(item);
    }
  };

  const handleSendToWhatsApp = () => {
    // 3. SECURITY: INPUT VALIDATION
    // Mencegah input kosong atau spasi doang
    let isValid = true;
    if (!customerName.trim() || customerName.length < 2) {
      isValid = false;
      nameInputRef.current?.focus();
      nameInputRef.current?.classList.add(
        "animate-pulse",
        "ring-2",
        "ring-red-500",
      );
      setTimeout(
        () =>
          nameInputRef.current?.classList.remove(
            "animate-pulse",
            "ring-2",
            "ring-red-500",
          ),
        500,
      );
    }
    if (
      orderType === "dine-in" &&
      (!tableNumber.trim() || tableNumber.length > 3)
    ) {
      isValid = false;
      tableInputRef.current?.focus();
      tableInputRef.current?.classList.add(
        "animate-pulse",
        "ring-2",
        "ring-red-500",
      );
      setTimeout(
        () =>
          tableInputRef.current?.classList.remove(
            "animate-pulse",
            "ring-2",
            "ring-red-500",
          ),
        500,
      );
    }

    if (!isValid) {
      vibrate();
      toast.error("Data belum lengkap/valid kak! 🙏");
      return;
    }

    setIsProcessing(true);
    localStorage.setItem("customer_name", customerName); // Auto-save

    const time = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let message = `*PESANAN BARU!* 🛎️\n`;
    message += `📅 Jam: ${time}\n`;
    message += `👤 Nama: *${customerName.toUpperCase()}*\n`;
    message += `📍 Tipe: *${orderType === "dine-in" ? `Makan di Sini (Meja ${tableNumber})` : "Bungkus / Takeaway"}*\n`;
    message += `💰 Bayar: *${paymentMethod === "cash" ? "Tunai" : "QRIS"}*\n`;
    message += `🍴 Alat Makan: ${needUtensils ? "Ya" : "Tidak"}\n`;
    message += `➖➖➖➖➖➖➖➖➖\n`;

    items.forEach((item, index) => {
      // Security: Sanitize note (hapus karakter aneh kalau perlu, disini kita trust text biasa)
      const cleanNote = itemNotes[item.id]?.replace(/[^\w\s]/gi, "") || "";
      const noteDisplay = cleanNote ? `\n   └ 📝 _Note: ${cleanNote}_` : "";
      message += `${index + 1}. ${item.name} (${item.qty}x)\n   Rp ${(item.price * item.qty).toLocaleString("id-ID")}${noteDisplay}\n`;
    });

    message += `➖➖➖➖➖➖➖➖➖\n`;
    message += `*TOTAL: Rp ${finalTotal.toLocaleString("id-ID")}*\n`;
    message += `\nMohon diproses ya kak! Terima kasih.`;

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
      setIsCheckoutOpen(false);
      router.push("/history");
    }, 1500);
  };

  const handleCopyOrder = () => {
    let text = items.map((i) => `${i.name} (${i.qty}x)`).join(", ");
    text += ` | Total: Rp ${finalTotal.toLocaleString("id-ID")}`;
    navigator.clipboard.writeText(text);
    toast.success("Disalin! 📋");
  };

  return (
    <MobileLayout>
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-orange-500" size={22} />
            Keranjang
          </h1>
          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-zinc-700">
            {totalItems()} Item
          </span>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => setIsClearAlertOpen(true)}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-full transition-all active:scale-95 border border-red-500/20"
          >
            <Trash2 size={12} /> Reset
          </button>
        )}
      </div>

      <div className="p-5 space-y-6 pb-48 min-h-screen">
        {items.length === 0 ? (
          // EMPTY STATE (Ringan, Tanpa Gambar Berat)
          <div className="flex flex-col items-center justify-center pt-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-28 h-28 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-orange-500/5 relative">
              <ShoppingBag className="text-zinc-700" size={40} />
              <div className="absolute top-0 right-0 p-2 bg-zinc-800 rounded-full animate-bounce">
                <Flame className="text-orange-500" size={14} />
              </div>
            </div>
            <h3 className="text-white font-bold text-xl">Lapar ya?</h3>
            <p className="text-zinc-500 text-xs mt-2 max-w-[200px] leading-relaxed">
              Keranjangmu masih kosong nih. Yuk isi dengan yang enak!
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-xs">
              <Link
                href="/menu?q=sate"
                className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 hover:bg-zinc-800 transition-all active:scale-95 group"
              >
                <Flame className="text-orange-500 mb-1" size={18} />
                <span className="text-xs font-bold text-zinc-300">
                  Pesan Sate
                </span>
              </Link>
              <Link
                href="/menu?q=minuman"
                className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 hover:bg-zinc-800 transition-all active:scale-95 group"
              >
                <Coffee className="text-blue-500 mb-1" size={18} />
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
                  className="bg-zinc-900/40 border border-white/5 rounded-3xl p-3 relative group animate-in slide-in-from-bottom-2 duration-300 shadow-sm"
                >
                  <div className="flex gap-3">
                    {/* 4. OPTIMASI LCP: GANTI GAMBAR DENGAN ICON (Super Ringan) */}
                    <div className="h-20 w-20 rounded-2xl bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-600 border border-white/5">
                      {/* Logic Icon based on name simple */}
                      {item.name.toLowerCase().includes("es") ? (
                        <Coffee size={24} />
                      ) : item.name.toLowerCase().includes("sate") ? (
                        <Flame size={24} />
                      ) : (
                        <Utensils size={24} />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-zinc-100 text-sm line-clamp-2 leading-tight">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="text-zinc-600 hover:text-red-500 p-1.5 bg-zinc-950 rounded-lg transition-colors active:scale-90"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Note Input (Optimized) */}
                      {isNoteOpen === item.id ? (
                        <div className="my-2 animate-in fade-in">
                          <Input
                            autoFocus
                            placeholder="Catatan..."
                            className="h-7 text-[10px] bg-black/30 border-zinc-700 focus:ring-orange-500 rounded-lg px-2"
                            value={itemNotes[item.id] || ""}
                            maxLength={50} // SECURITY: MAX LENGTH
                            onChange={(e) =>
                              setItemNotes((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            onBlur={() => setIsNoteOpen(null)}
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsNoteOpen(item.id)}
                          className="flex items-center gap-1.5 my-1.5 cursor-pointer group/note w-fit bg-zinc-950/50 px-2 py-1 rounded-md border border-transparent hover:border-zinc-800 transition-all"
                        >
                          <Edit3
                            size={10}
                            className="text-zinc-600 group-hover/note:text-orange-500 transition-colors"
                          />
                          <span
                            className={`text-[10px] truncate max-w-[140px] ${itemNotes[item.id] ? "text-orange-400 italic" : "text-zinc-600 group-hover/note:text-zinc-400"}`}
                          >
                            {itemNotes[item.id] || "Catatan..."}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-extrabold text-orange-500 text-sm">
                          Rp {(item.price * item.qty).toLocaleString("id-ID")}
                        </span>

                        {/* TOMBOL QTY DENGAN FIX MINUS */}
                        <div className="flex items-center gap-3 bg-zinc-950 rounded-xl p-1 border border-zinc-800 shadow-inner">
                          <button
                            onClick={() => handleDecreaseQty(item)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all active:scale-90 bg-zinc-900"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold text-white w-4 text-center tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => {
                              addToCart(item);
                              vibrate();
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-black hover:bg-orange-500 hover:text-white transition-all shadow active:scale-90"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* UPSELLING (Hanya render jika belum ada minum) */}
            {!hasDrink && (
              <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/5 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-right-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400">
                    <Coffee size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Haus gak?</p>
                    <p className="text-[10px] text-zinc-400">
                      Tambah minum yuk.
                    </p>
                  </div>
                </div>
                <Link href="/menu?q=minuman">
                  <Button
                    size="sm"
                    className="h-8 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 font-bold"
                  >
                    Tambah
                  </Button>
                </Link>
              </div>
            )}

            {/* 5. SHOPEE STYLE BILL ACCORDION (Expandable) */}
            <div className="bg-zinc-900/50 rounded-3xl overflow-hidden border border-white/5 shadow-sm transition-all">
              <div
                onClick={() => setShowBillDetails(!showBillDetails)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/80 active:bg-zinc-900 transition-colors"
              >
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Receipt size={14} /> Rincian Pembayaran
                </h3>
                {showBillDetails ? (
                  <ChevronUp size={16} className="text-zinc-500" />
                ) : (
                  <ChevronDown size={16} className="text-zinc-500" />
                )}
              </div>

              {showBillDetails && (
                <div className="px-6 pb-6 pt-0 space-y-3 text-sm animate-in slide-in-from-top-2">
                  <div className="w-full h-[1px] bg-zinc-800 mb-3" />
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Subtotal ({totalItems()} item)</span>
                    <span>Rp {finalTotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span>Biaya Layanan</span>
                    <span className="text-green-500 font-medium">Rp 0</span>
                  </div>

                  <div className="border-t border-dashed border-zinc-700 pt-3 flex justify-between items-center mt-2">
                    <span className="text-white font-bold text-sm">
                      Total Akhir
                    </span>
                    <span className="text-orange-500 font-black text-xl tracking-tight">
                      Rp {finalTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* BOTTOM ACTION */}
      {items.length > 0 && (
        <div className="fixed bottom-[85px] left-0 right-0 px-4 z-40">
          <div className="max-w-md mx-auto bg-zinc-950/90 backdrop-blur-xl border border-white/10 p-4 rounded-[2rem] shadow-2xl">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCopyOrder}
                className="h-14 w-14 rounded-2xl border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-all active:scale-95"
              >
                <Copy size={20} />
              </Button>
              <Button
                onClick={() => {
                  setIsCheckoutOpen(true);
                  vibrate();
                }}
                className="flex-1 h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-2xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all text-base flex flex-col items-center justify-center gap-0.5 leading-none"
              >
                <span className="flex items-center gap-2">
                  Lanjut Bayar <ArrowRight size={16} />
                </span>
                <span className="text-[10px] font-normal opacity-80">
                  {totalItems()} Item • Rp {finalTotal.toLocaleString("id-ID")}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT DIALOG */}
      <Dialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[320px] rounded-3xl p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-1">
              <AlertTriangle size={24} />
            </div>
            <DialogTitle className="text-lg font-bold">
              Hapus Semua?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Pesananmu akan direset lho.
            </DialogDescription>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => setIsClearAlertOpen(false)}
              className="flex-1 bg-transparent border-zinc-700 text-zinc-300 rounded-xl h-10"
            >
              Batal
            </Button>
            <Button
              onClick={confirmClearCart}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl h-10"
            >
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHECKOUT DIALOG */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[340px] rounded-[2rem] pt-6 pb-8 gap-5">
          <DialogHeader>
            <DialogTitle className="text-left text-xl font-bold flex items-center gap-2">
              Data Pemesan 📝
            </DialogTitle>
            <DialogDescription className="text-left text-zinc-500 text-xs">
              Isi nama biar dipanggilnya gampang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
              <button
                onClick={() => {
                  setOrderType("dine-in");
                  vibrate();
                }}
                className={`text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${orderType === "dine-in" ? "bg-zinc-800 text-white shadow-md border border-zinc-700" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <Utensils size={14} /> Dine-in
              </button>
              <button
                onClick={() => {
                  setOrderType("takeaway");
                  vibrate();
                }}
                className={`text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${orderType === "takeaway" ? "bg-zinc-800 text-white shadow-md border border-zinc-700" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <ShoppingBag size={14} /> Bungkus
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs ml-1 font-medium">
                  Nama Kamu
                </Label>
                <div className="relative group">
                  <User
                    size={16}
                    className="absolute left-3.5 top-3.5 text-zinc-500 group-focus-within:text-orange-500 transition-colors"
                  />
                  <Input
                    ref={nameInputRef}
                    placeholder="Cth: Radithya"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus:ring-orange-500 h-12 rounded-xl text-sm transition-all"
                    value={customerName}
                    maxLength={30}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  {customerName && (
                    <div className="absolute right-3 top-3.5">
                      <History size={14} className="text-orange-500/50" />
                    </div>
                  )}
                </div>
              </div>

              {orderType === "dine-in" && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-zinc-400 text-xs ml-1 font-medium">
                      Nomor Meja
                    </Label>
                    {isTableLocked && (
                      <span className="text-[10px] text-green-500 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <QrCode size={10} /> Dari Scan QR
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <MapPin
                      size={16}
                      className={`absolute left-3.5 top-3.5 transition-colors ${isTableLocked ? "text-green-500" : "text-zinc-500 group-focus-within:text-orange-500"}`}
                    />
                    <Input
                      ref={tableInputRef}
                      type="number"
                      placeholder="Cth: 12"
                      readOnly={isTableLocked}
                      className={`pl-10 bg-zinc-900 border-zinc-800 focus:ring-orange-500 h-12 rounded-xl text-sm transition-all ${isTableLocked ? "opacity-80 cursor-not-allowed border-green-500/20 focus:ring-green-500" : ""}`}
                      value={tableNumber}
                      maxLength={3}
                      onChange={(e) => setTableNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs ml-1 font-medium">
                Bayar Pakai
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => {
                    setPaymentMethod("cash");
                    vibrate();
                  }}
                  className={`border rounded-2xl p-3 cursor-pointer flex flex-col items-center gap-1.5 transition-all ${paymentMethod === "cash" ? "bg-orange-500/10 border-orange-500/50 text-orange-500 ring-1 ring-orange-500" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"}`}
                >
                  <Banknote size={20} />
                  <span className="text-[10px] font-bold">Tunai (Kasir)</span>
                </div>
                <div
                  onClick={() => {
                    setPaymentMethod("qris");
                    vibrate();
                  }}
                  className={`border rounded-2xl p-3 cursor-pointer flex flex-col items-center gap-1.5 transition-all ${paymentMethod === "qris" ? "bg-blue-500/10 border-blue-500/50 text-blue-500 ring-1 ring-blue-500" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"}`}
                >
                  <QrCode size={20} />
                  <span className="text-[10px] font-bold">QRIS / Transfer</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="bg-zinc-800 p-2 rounded-xl text-zinc-400">
                  <Soup size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Butuh Alat Makan?</span>
                  <span className="text-[10px] text-zinc-500">
                    Sendok, garpu, tisu
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
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-14 rounded-2xl text-base shadow-lg shadow-green-900/20 active:scale-[0.98] transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <MessageCircle size={20} className="mr-2" /> Kirim Pesanan ke
                  WA
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
