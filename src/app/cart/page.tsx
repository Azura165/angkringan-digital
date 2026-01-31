"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import {
  Minus,
  Plus,
  Trash2,
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
  ChevronDown,
  ChevronUp,
  ChefHat,
  WifiOff,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef, useCallback, memo } from "react";
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

// --- SUB-COMPONENT: CART ITEM (OPTIMIZED RENDERING) ---
const CartItem = memo(
  ({
    item,
    note,
    onDecrease,
    onIncrease,
    onDelete,
    onNoteChange,
    onNoteFocus,
    isNoteFocused,
    onNoteBlur,
  }: {
    item: any;
    note: string;
    onDecrease: (item: any) => void;
    onIncrease: (item: any) => void;
    onDelete: (item: any) => void;
    onNoteChange: (id: string, val: string) => void;
    onNoteFocus: (id: string) => void;
    isNoteFocused: boolean;
    onNoteBlur: () => void;
  }) => {
    const [imgError, setImgError] = useState(false);

    return (
      <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-3 relative group shadow-sm flex gap-3 transition-transform">
        <div className="relative h-20 w-20 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/10 shadow-inner">
          {item.image && !imgError ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover"
              sizes="256px" // HD Quality
              quality={100} // Max Sharpness
              priority={true}
              onError={() => setImgError(true)}
            />
          ) : null}
          <div
            className={`absolute inset-0 flex items-center justify-center text-zinc-600 bg-zinc-800 ${
              item.image && !imgError ? "hidden" : "flex"
            }`}
          >
            {item.name.toLowerCase().includes("es") ||
            item.name.toLowerCase().includes("teh") ? (
              <Coffee size={24} />
            ) : (
              <Utensils size={24} />
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-zinc-100 text-sm line-clamp-2 leading-tight">
              {item.name}
            </h3>
            <button
              onClick={() => onDelete(item)}
              className="text-zinc-600 hover:text-red-500 p-1.5 rounded-lg active:scale-90 transition-colors shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="my-1">
            {isNoteFocused ? (
              <Input
                autoFocus
                className="h-7 text-[10px] bg-black/50 border-orange-500/50 text-white rounded-lg focus-visible:ring-0"
                value={note}
                placeholder="Pedas, tanpa bawang..."
                onChange={(e) => onNoteChange(item.id, e.target.value)}
                onBlur={onNoteBlur}
              />
            ) : (
              <div
                onClick={() => onNoteFocus(item.id)}
                className={`flex items-center gap-1.5 cursor-pointer w-fit px-2 py-1 rounded-lg text-[10px] transition-colors border border-transparent ${
                  note
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : "bg-zinc-950/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                <Edit3 size={10} />
                <span className="truncate max-w-[150px]">
                  {note || "Tambah Catatan"}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-orange-500 text-xs">
              Rp {(item.price * item.qty).toLocaleString("id-ID")}
            </span>
            <div className="flex items-center gap-3 bg-zinc-950 rounded-lg p-1 border border-zinc-800 shadow-sm">
              <button
                onClick={() => onDecrease(item)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 bg-zinc-900 active:scale-90 transition-all border border-zinc-800"
              >
                <Minus size={12} />
              </button>
              <span className="text-xs font-bold text-white w-4 text-center tabular-nums">
                {item.qty}
              </span>
              <button
                onClick={() => onIncrease(item)}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-black hover:bg-orange-500 hover:text-white active:scale-90 transition-all shadow-sm"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
CartItem.displayName = "CartItem";

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
    clearCart,
  } = useCart();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(true);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    desc: "",
    action: () => {},
    btnText: "Ya",
    isDestructive: true,
  });

  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [isTableLocked, setIsTableLocked] = useState(false);
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [needUtensils, setNeedUtensils] = useState(true);

  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [adminPhone, setAdminPhone] = useState("6285746869466");

  const nameInputRef = useRef<HTMLInputElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);

  const hasDrink = useMemo(
    () =>
      items.some((i) =>
        ["es", "teh", "jeruk", "kopi", "minuman"].some((keyword) =>
          i.name.toLowerCase().includes(keyword),
        ),
      ),
    [items],
  );
  const finalTotal = useMemo(() => totalPrice(), [items, totalPrice]);

  const estimatedTime = useMemo(() => {
    const totalQty = items.reduce((acc, item) => acc + item.qty, 0);
    return Math.max(5, totalQty * 2);
  }, [items]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // GENERATE TOKEN SAAT HALAMAN DIBUKA (BACKUP)
      let token = localStorage.getItem("app_user_token");
      if (!token) {
        token = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem("app_user_token", token);
      }

      const savedSession = sessionStorage.getItem("active_table_session");
      if (savedSession) {
        try {
          const tableData = JSON.parse(savedSession);
          setTableNumber(tableData.number);
          setIsTableLocked(true);
          setOrderType("dine-in");
        } catch (e) {}
      } else {
        const oldTable = sessionStorage.getItem("table_number");
        if (oldTable) setTableNumber(oldTable);
      }

      const savedName = localStorage.getItem("customer_name");
      if (savedName) setCustomerName(savedName);
    }

    const fetchConfig = async () => {
      const { data } = await supabase
        .from("store_config")
        .select("whatsapp_number")
        .single();
      if (data?.whatsapp_number) setAdminPhone(data.whatsapp_number);
    };
    fetchConfig();
  }, []);

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const sanitize = (str: string) =>
    str.replace(/[<>]/g, "").trim().slice(0, 50);

  const openCheckoutModal = () => {
    vibrate();
    setIsCheckoutOpen(true);
  };

  const handleIncreaseQty = useCallback(
    (item: any) => {
      vibrate();
      addToCart({ ...item, qty: item.qty });
    },
    [addToCart],
  );

  const handleDecreaseQty = useCallback(
    (item: any) => {
      vibrate();
      if (item.qty > 1) removeFromCart(item.id);
      else {
        setAlertConfig({
          isOpen: true,
          title: "Hapus Item?",
          desc: `Yakin hapus ${item.name}?`,
          action: () => {
            removeItem(item.id);
            setAlertConfig((prev) => ({ ...prev, isOpen: false }));
            toast.success("Item dihapus");
          },
          btnText: "Hapus",
          isDestructive: true,
        });
      }
    },
    [removeFromCart, removeItem],
  );

  const handleDeleteItem = useCallback(
    (item: any) => {
      vibrate();
      removeItem(item.id);
      toast("Item dihapus", {
        description: `${item.name}`,
        icon: <Trash2 size={16} className="text-red-500" />,
      });
    },
    [removeItem],
  );

  const handleNoteChange = useCallback((id: string, val: string) => {
    setItemNotes((prev) => ({ ...prev, [id]: val }));
  }, []);

  const confirmClearCart = () => {
    setAlertConfig({
      isOpen: true,
      title: "Kosongkan Keranjang?",
      desc: "Semua pesanan akan dihapus.",
      action: () => {
        clearCart();
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        toast.success("Keranjang bersih!");
      },
      btnText: "Ya, Kosongkan",
      isDestructive: true,
    });
  };

  // --- HANDLE PROCESS ORDER (TOKEN FORCE FIX) ---
  const handleProcessOrder = async () => {
    if (!navigator.onLine) {
      toast.error("Kamu sedang offline!", { icon: <WifiOff /> });
      return;
    }

    const safeName = sanitize(customerName);
    const safeTable = sanitize(tableNumber);

    let isValid = true;
    if (!safeName || safeName.length < 2) {
      isValid = false;
      nameInputRef.current?.focus();
      toast.error("Nama wajib diisi!");
    } else if (
      orderType === "dine-in" &&
      (!safeTable || safeTable.length < 1)
    ) {
      isValid = false;
      tableInputRef.current?.focus();
      toast.error("Nomor meja wajib diisi!");
    }

    if (!isValid) {
      vibrate();
      return;
    }

    setIsProcessing(true);
    localStorage.setItem("customer_name", safeName);

    // --- LOGIC TOKEN PASTI (ANTI NULL) ---
    let userToken = localStorage.getItem("app_user_token");
    if (!userToken || userToken === "null" || userToken === "undefined") {
      // Generate baru jika tidak ada / rusak
      userToken = `force-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem("app_user_token", userToken);
    }

    try {
      // 1. Order Header (Include Token)
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: safeName,
          customer_token: userToken, // PASTI ADA ISINYA SEKARANG
          table_number: orderType === "takeaway" ? "Takeaway" : safeTable,
          total_price: finalTotal,
          status: "pending",
          payment_status: "unpaid",
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
          is_visible_to_user: true, // Pastikan tidak tersembunyi
        })
        .select("id, order_code")
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error("Gagal membuat pesanan (No Data).");

      // 2. Order Items
      const orderItemsData = items.map((item) => ({
        order_id: orderData.id,
        menu_name: item.name,
        price: item.price,
        qty: item.qty,
        note: sanitize(itemNotes[item.id] || ""),
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsData);

      if (itemsError) {
        await supabase.from("orders").delete().eq("id", orderData.id); // Rollback
        throw new Error("Gagal menyimpan detail menu: " + itemsError.message);
      }

      // 3. WhatsApp Message
      const code = orderData.order_code || `#${orderData.id}`;
      const typeLabel =
        orderType === "takeaway"
          ? "🛍️ Dibungkus (Takeaway)"
          : `🍽️ Dine-In (Meja ${safeTable}) ${isTableLocked ? "✅ Verified" : ""}`;
      const payLabel =
        paymentMethod === "cash" ? "💵 Tunai (Cash)" : "💳 QRIS / Transfer";
      const utensilLabel = needUtensils ? "✅ Alat Makan" : "❌ Tanpa Alat";

      let msg = `*PESANAN BARU!* 🔔\n*KODE: ${code}*\n----------------\n👤 ${safeName.toUpperCase()}\n📍 ${typeLabel}\n💰 ${payLabel}\n🍴 ${utensilLabel}\n----------------\n`;
      items.forEach((item) => {
        const note = itemNotes[item.id]
          ? `\n   └ 📝 _${itemNotes[item.id]}_`
          : "";
        msg += `▪️ ${item.qty}x ${item.name} @ ${item.price / 1000}k${note}\n`;
      });
      msg += `----------------\n*TOTAL: Rp ${finalTotal.toLocaleString("id-ID")}*\n\n_Mohon diproses, terima kasih!_ 🙏`;

      moveToHistory(safeName, orderType === "dine-in" ? safeTable : "Takeaway");
      clearCart();
      setIsCheckoutOpen(false);
      toast.success("Pesanan Terkirim! 🚀");

      setTimeout(() => {
        const phone = adminPhone.replace(/[^0-9]/g, "");
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
          "_blank",
        );
        router.push("/history");
      }, 500);
    } catch (error: any) {
      console.error("ORDER ERROR:", error);
      toast.error("Gagal kirim pesanan: " + (error.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
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
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-orange-500" size={20} /> Keranjang
          </h1>
          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-zinc-700">
            {totalItems()}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={confirmClearCart}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-full transition-all active:scale-95 border border-red-500/20"
          >
            <Trash2 size={12} /> Reset
          </button>
        )}
      </div>

      <div className="p-4 space-y-5 pb-48 min-h-screen">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl relative">
              <ShoppingBag className="text-zinc-700" size={36} />
              <div className="absolute top-0 right-0 p-2 bg-zinc-800 rounded-full animate-bounce">
                <Flame className="text-orange-500" size={12} />
              </div>
            </div>
            <h3 className="text-white font-bold text-lg">Keranjang Kosong</h3>
            <p className="text-zinc-500 text-xs mt-2 max-w-[200px]">
              Yuk isi dengan menu favoritmu!
            </p>
            <Link href="/menu" className="mt-6">
              <Button className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl h-11 px-6 shadow-lg shadow-orange-900/20">
                Lihat Menu
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  note={itemNotes[item.id] || ""}
                  onDecrease={handleDecreaseQty}
                  onIncrease={handleIncreaseQty}
                  onDelete={handleDeleteItem}
                  onNoteChange={handleNoteChange}
                  onNoteFocus={setActiveNoteId}
                  isNoteFocused={activeNoteId === item.id}
                  onNoteBlur={() => setActiveNoteId(null)}
                />
              ))}
            </div>

            {!hasDrink && (
              <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400">
                    <Coffee size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Haus?</p>
                    <p className="text-[10px] text-zinc-400">
                      Pesan minum dong.
                    </p>
                  </div>
                </div>
                <Link href="/menu?q=minuman">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                  >
                    Tambah
                  </Button>
                </Link>
              </div>
            )}

            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
              <div
                onClick={() => setShowBillDetails(!showBillDetails)}
                className="p-3 flex items-center justify-between cursor-pointer"
              >
                <h3 className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                  <Receipt size={14} /> Ringkasan
                </h3>
                {showBillDetails ? (
                  <ChevronUp size={14} className="text-zinc-500" />
                ) : (
                  <ChevronDown size={14} className="text-zinc-500" />
                )}
              </div>
              {showBillDetails && (
                <div className="px-4 pb-4 pt-0 space-y-2 text-xs animate-in slide-in-from-top-1">
                  <div className="w-full h-px bg-zinc-800 mb-2" />
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span>Rp {finalTotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Layanan</span>
                    <span className="text-green-500">Gratis</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-zinc-700">
                    <span className="text-white font-bold">Total Bayar</span>
                    <span className="text-orange-500 font-black text-lg">
                      Rp {finalTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-[80px] left-0 right-0 px-4 z-40">
          <div className="max-w-md mx-auto bg-zinc-950/90 backdrop-blur-xl border border-white/10 p-3 rounded-3xl shadow-2xl flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopyOrder}
              className="h-12 w-12 rounded-2xl border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Copy size={18} />
            </Button>
            <Button
              onClick={openCheckoutModal}
              className="flex-1 h-12 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex flex-col justify-center items-center gap-0 leading-tight hover:brightness-110"
            >
              <span className="text-sm flex items-center gap-1">
                Pesan Sekarang <ArrowRight size={14} />
              </span>
              <span className="text-[9px] opacity-90 font-normal">
                Est. {estimatedTime} Menit • {totalItems()} Item
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* ALERT DIALOG */}
      <Dialog
        open={alertConfig.isOpen}
        onOpenChange={(open) =>
          setAlertConfig((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[320px] rounded-3xl p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
                alertConfig.isDestructive
                  ? "bg-red-500/10 text-red-500"
                  : "bg-blue-500/10 text-blue-500"
              }`}
            >
              <AlertTriangle size={24} />
            </div>
            <DialogTitle className="text-lg font-bold">
              {alertConfig.title}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              {alertConfig.desc}
            </DialogDescription>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center mt-4">
            <Button
              variant="outline"
              onClick={() =>
                setAlertConfig((prev) => ({ ...prev, isOpen: false }))
              }
              className="flex-1 bg-transparent border-zinc-700 text-zinc-300 rounded-xl h-10 hover:bg-zinc-900"
            >
              Batal
            </Button>
            <Button
              onClick={alertConfig.action}
              className={`flex-1 text-white rounded-xl h-10 ${
                alertConfig.isDestructive
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {alertConfig.btnText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CHECKOUT */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[340px] rounded-[2rem] pt-6 pb-8 gap-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              Data Pemesan 📝
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Lengkapi data berikut untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* TOGGLE TIPE PESANAN */}
            <div className="grid grid-cols-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => {
                  setOrderType("dine-in");
                  vibrate();
                }}
                className={`text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  orderType === "dine-in"
                    ? "bg-zinc-800 text-white shadow ring-1 ring-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Utensils size={14} /> Makan Sini
              </button>
              <button
                onClick={() => {
                  setOrderType("takeaway");
                  vibrate();
                }}
                className={`text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  orderType === "takeaway"
                    ? "bg-zinc-800 text-white shadow ring-1 ring-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <ShoppingBag size={14} /> Bungkus
              </button>
            </div>

            <div className="space-y-3">
              {/* INPUT NAMA */}
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs ml-1">Nama</Label>
                <div className="relative">
                  <User
                    size={14}
                    className="absolute left-3.5 top-3.5 text-zinc-500"
                  />
                  <Input
                    ref={nameInputRef}
                    placeholder="Nama kamu..."
                    className="pl-9 bg-zinc-900 border-zinc-800 focus-visible:ring-orange-500 h-11 rounded-xl text-sm"
                    value={customerName}
                    maxLength={20}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              {/* INPUT MEJA (AUTO-LOCK LOGIC) */}
              {orderType === "dine-in" && (
                <div className="space-y-1 animate-in slide-in-from-top-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-zinc-400 text-xs ml-1">
                      No. Meja
                    </Label>
                    {isTableLocked && (
                      <span className="text-[9px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium animate-pulse">
                        <CheckCircle2 size={10} /> Auto-Scan
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin
                      size={14}
                      className={`absolute left-3.5 top-3.5 ${
                        isTableLocked ? "text-emerald-500" : "text-zinc-500"
                      }`}
                    />
                    <Input
                      ref={tableInputRef}
                      placeholder="Contoh: 5"
                      readOnly={isTableLocked}
                      className={`pl-9 h-11 rounded-xl text-sm transition-colors ${
                        isTableLocked
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400 font-bold focus-visible:ring-0 cursor-not-allowed"
                          : "bg-zinc-900 border-zinc-800 focus-visible:ring-orange-500"
                      }`}
                      value={tableNumber}
                      maxLength={10}
                      onChange={(e) => {
                        if (!isTableLocked) setTableNumber(e.target.value);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* METODE BAYAR */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs ml-1">Pembayaran</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => {
                    setPaymentMethod("cash");
                    vibrate();
                  }}
                  className={`border rounded-xl p-3 cursor-pointer flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "cash"
                      ? "bg-orange-500/10 border-orange-500/50 text-orange-500 shadow-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                  }`}
                >
                  <Banknote size={18} />
                  <span className="text-[10px] font-bold">Tunai</span>
                </div>
                <div
                  onClick={() => {
                    setPaymentMethod("qris");
                    vibrate();
                  }}
                  className={`border rounded-xl p-3 cursor-pointer flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "qris"
                      ? "bg-blue-500/10 border-blue-500/50 text-blue-500 shadow-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                  }`}
                >
                  <QrCode size={18} />
                  <span className="text-[10px] font-bold">QRIS</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="bg-zinc-800 p-1.5 rounded-lg text-zinc-400">
                  <Soup size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Alat Makan?</span>
                </div>
              </div>
              <Switch
                checked={needUtensils}
                onCheckedChange={setNeedUtensils}
                className="data-[state=checked]:bg-green-500 scale-90"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleProcessOrder}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-12 rounded-xl text-sm shadow-lg active:scale-[0.98] transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <ChefHat size={18} className="mr-2" /> Kirim Pesanan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
