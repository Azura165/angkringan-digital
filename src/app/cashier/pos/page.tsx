"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Utensils,
  ChefHat,
  Banknote,
  QrCode,
  Loader2,
  User,
  MapPin,
  RefreshCw,
  PackageOpen,
  Wifi,
  WifiOff,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// --- CONFIG ---
const CACHE_KEY_MENU = "cashier_menu_v4";
const CACHE_KEY_CATS = "cashier_cats_v4";

// --- TYPES ---
interface MenuItem {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string;
  is_available: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface CartItem extends MenuItem {
  qty: number;
  note?: string;
}

// --- HELPER ---
const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

// --- SUB-COMPONENTS (MEMOIZED) ---
const MenuCard = memo(
  ({ item, onClick }: { item: MenuItem; onClick: (i: MenuItem) => void }) => (
    <div
      onClick={() => onClick(item)}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer group hover:border-emerald-500/50 transition-all active:scale-95 flex flex-col h-full shadow-sm hover:shadow-md relative"
    >
      <div className="relative h-28 w-full bg-zinc-800 overflow-hidden">
        <Image
          src={item.image_url || "/placeholder.jpg"}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-white shadow-sm border border-white/10">
          {formatRupiah(item.price)}
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <h3 className="font-bold text-sm text-zinc-200 line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors">
          {item.name}
        </h3>
        <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-medium truncate">
          {item.category}
        </p>
      </div>
    </div>
  ),
);
MenuCard.displayName = "MenuCard";

const CategoryPill = memo(
  ({
    cat,
    active,
    onClick,
  }: {
    cat: string;
    active: boolean;
    onClick: (c: string) => void;
  }) => (
    <button
      onClick={() => onClick(cat)}
      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
        active
          ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/20"
          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600"
      }`}
    >
      {cat}
    </button>
  ),
);
CategoryPill.displayName = "CategoryPill";

export default function CashierPOSPage() {
  // DATA STATE
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // CART & UI STATE
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ORDER INFO STATE
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState<string>("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [showConfirm, setShowConfirm] = useState(false);

  // SOUND
  const beepSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      beepSound.current = new Audio("/sounds/beep.mp3");
      beepSound.current.volume = 0.5;
    }
  }, []);

  const playBeep = () => {
    if (beepSound.current) {
      beepSound.current.currentTime = 0;
      beepSound.current.play().catch(() => {});
    }
  };

  // 1. FETCH DATA (MENU & CATEGORIES)
  const fetchData = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);

    try {
      // Parallel Fetching agar lebih cepat
      const [menuRes, catRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("name"),
        supabase.from("categories").select("name").order("name"),
      ]);

      // Handle Menu
      if (menuRes.data) {
        setMenuItems(menuRes.data as MenuItem[]);
        sessionStorage.setItem(CACHE_KEY_MENU, JSON.stringify(menuRes.data));
      }

      // Handle Categories
      if (catRes.data) {
        const catList = ["Semua", ...catRes.data.map((c) => c.name)];
        setCategories(catList);
        sessionStorage.setItem(CACHE_KEY_CATS, JSON.stringify(catList));
      }
    } catch (e) {
      toast.error("Gagal sinkronisasi data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 2. INIT EFFECT
  useEffect(() => {
    // Load Cache First
    const cachedMenu = sessionStorage.getItem(CACHE_KEY_MENU);
    const cachedCats = sessionStorage.getItem(CACHE_KEY_CATS);

    if (cachedMenu && cachedCats) {
      try {
        setMenuItems(JSON.parse(cachedMenu));
        setCategories(JSON.parse(cachedCats));
        setIsLoading(false);
      } catch (e) {}
    }

    fetchData();

    // Realtime Sync
    const channel = supabase
      .channel("cashier-global-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          toast.info("Menu diperbarui! 🔄");
          fetchData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          fetchData();
        },
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // 3. CART LOGIC
  const addToCart = useCallback((item: MenuItem) => {
    playBeep();
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing)
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...prev, { ...item, qty: 1 }];
    });
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  const updateQty = useCallback((id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  }, []);

  const grandTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.qty, 0),
    [cart],
  );

  // 4. FILTERING
  const filteredMenu = useMemo(() => {
    let items = menuItems;
    if (activeCategory !== "Semua")
      items = items.filter((i) => i.category === activeCategory);
    if (search)
      items = items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()),
      );
    return items;
  }, [menuItems, activeCategory, search]);

  // 5. HANDLERS
  const adjustTableNumber = (delta: number) => {
    const current = parseInt(tableNumber) || 0;
    const next = Math.max(1, current + delta);
    setTableNumber(next.toString());
  };

  const handlePayClick = () => {
    if (!customerName.trim()) {
      toast.error("Nama Pelanggan wajib diisi!", { position: "top-right" });
      document.getElementById("customer-input")?.focus();
      return;
    }
    // Jika Dine-in, meja wajib. Jika Takeaway, meja opsional (otomatis "Takeaway")
    if (orderType === "dine-in" && !tableNumber) {
      toast.error("Nomor Meja wajib diisi untuk Dine-in!");
      return;
    }
    setShowConfirm(true);
  };

  const handleProcessOrder = async () => {
    setIsProcessing(true);
    const finalTable = orderType === "takeaway" ? "Takeaway" : tableNumber;

    try {
      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: customerName,
          table_number: finalTable,
          total_price: grandTotal,
          status: "pending",
          payment_status: "paid",
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Items
      const itemsPayload = cart.map((item) => ({
        order_id: orderData.id,
        menu_name: item.name,
        price: item.price,
        qty: item.qty,
        note: item.note || "-",
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsPayload);
      if (itemsError) throw itemsError;

      // 3. Update Table Status (Only Dine-in)
      if (orderType === "dine-in") {
        const { data: table } = await supabase
          .from("tables")
          .select("id")
          .eq("table_number", tableNumber)
          .single();
        if (table) {
          await supabase
            .from("tables")
            .update({ status: "occupied", current_pax: 1 })
            .eq("id", table.id);
        }
      }

      toast.success("Transaksi Sukses! ✅", {
        description: "Struk siap dicetak",
      });
      setCart([]);
      setCustomerName("");
      setTableNumber("");
      setShowConfirm(false);
    } catch (err: any) {
      toast.error("Gagal memproses", { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-zinc-950 font-sans">
      {/* --- LEFT: MENU --- */}
      <div className="flex-1 flex flex-col md:border-r border-white/5 p-4 gap-4 relative">
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-zinc-500"
                size={18}
              />
              <Input
                placeholder="Cari menu (Nama / Kategori)..."
                className="pl-10 h-10 bg-zinc-900 border-zinc-800 rounded-xl text-white text-xs focus:ring-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => fetchData(true)}
              className="border-zinc-800 text-zinc-400 bg-zinc-900 w-10 h-10 shrink-0"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </Button>
            <div
              className={`flex items-center px-3 rounded-xl border text-xs font-bold ${isConnected ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-red-500/10 border-red-500/30 text-red-500"}`}
            >
              {isConnected ? (
                <Wifi size={14} className="mr-1" />
              ) : (
                <WifiOff size={14} className="mr-1" />
              )}{" "}
              {isConnected ? "Live" : "Offline"}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat, idx) => (
              <CategoryPill
                key={`${cat}-${idx}`}
                cat={cat}
                active={activeCategory === cat}
                onClick={setActiveCategory}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-24 md:pb-0">
          {isLoading && menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Loader2 className="animate-spin mb-2" />{" "}
              <span className="text-xs">Memuat Menu...</span>
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
              <PackageOpen size={48} className="mb-2 opacity-20" />
              <p className="text-sm">Menu tidak ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMenu.map((item) => (
                <MenuCard key={item.id} item={item} onClick={addToCart} />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Floating Cart */}
        <div className="md:hidden absolute bottom-4 left-4 right-4">
          <Button
            onClick={() => setIsSidebarOpen(true)}
            className="w-full bg-emerald-600 text-white h-12 rounded-xl shadow-xl flex justify-between items-center px-4"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={18} /> {cart.length} Item
            </span>
            <span className="font-bold">{formatRupiah(grandTotal)}</span>
          </Button>
        </div>
      </div>

      {/* --- RIGHT: CART SIDEBAR --- */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[380px] bg-zinc-900 flex flex-col shadow-2xl z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="md:hidden p-2 bg-black/20 flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(false)}
            className="text-zinc-400"
          >
            Tutup
          </Button>
        </div>

        {/* INPUT DATA PELANGGAN */}
        <div className="p-4 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm space-y-3 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <ShoppingCart className="text-emerald-500" size={16} />
              </div>
              <h2 className="font-bold text-white text-sm">Keranjang</h2>
            </div>
            <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
              <button
                onClick={() => setOrderType("dine-in")}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${orderType === "dine-in" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"}`}
              >
                Dine In
              </button>
              <button
                onClick={() => setOrderType("takeaway")}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${orderType === "takeaway" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"}`}
              >
                Takeaway
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <User size={14} className="absolute left-3 top-3 text-zinc-500" />
              <Input
                id="customer-input"
                placeholder="Nama Pelanggan (Wajib)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-10 text-xs bg-zinc-800 border-zinc-700 pl-9 focus:ring-emerald-500 focus:border-emerald-500/50"
              />
            </div>

            {orderType === "dine-in" && (
              <div className="flex items-center gap-2 animate-in slide-in-from-top-2 fade-in">
                <div className="relative flex-1">
                  <MapPin
                    size={14}
                    className="absolute left-3 top-3 text-zinc-500"
                  />
                  <Input
                    type="number"
                    placeholder="No. Meja"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    // CSS CLASS untuk menghilangkan spinner browser
                    className="h-10 text-xs bg-zinc-800 border-zinc-700 pl-9 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => adjustTableNumber(-1)}
                    className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    onClick={() => adjustTableNumber(1)}
                    className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CART ITEMS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-black/20">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 space-y-2">
              <ShoppingCart size={40} />
              <p className="text-xs">Keranjang kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-zinc-900 p-2 rounded-xl border border-zinc-800 group hover:border-emerald-500/30 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-bold text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-emerald-500 font-mono mt-0.5">
                    {formatRupiah(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-xs font-bold w-5 text-center tabular-nums text-white">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-6 h-6 flex items-center justify-center bg-white text-black rounded hover:bg-zinc-200 transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-zinc-900 border-t border-white/5 space-y-3 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-end">
            <span className="text-xs text-zinc-400">Total Tagihan</span>
            <span className="text-xl font-black text-white">
              {formatRupiah(grandTotal)}
            </span>
          </div>
          <Button
            disabled={cart.length === 0}
            onClick={handlePayClick}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
          >
            Bayar & Proses <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>

      {/* --- MODERN RECEIPT MODAL --- */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-sm rounded-3xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
              <Receipt className="text-white" size={24} />
            </div>
            <DialogTitle className="text-white text-lg font-bold">
              Konfirmasi Order
            </DialogTitle>
            <p className="text-emerald-100 text-xs mt-1">
              Pastikan pesanan sudah benar.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Info Pelanggan */}
            <div className="flex justify-between items-center bg-zinc-900 p-3 rounded-xl border border-zinc-800">
              <div className="text-xs text-zinc-400">
                <p>Pelanggan</p>
                <p className="font-bold text-white text-sm mt-0.5">
                  {customerName}
                </p>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <p>Tipe</p>
                <div className="flex items-center gap-1 font-bold text-white mt-0.5 justify-end">
                  {orderType === "takeaway" ? (
                    <>
                      <ChefHat size={12} /> Bungkus
                    </>
                  ) : (
                    <>
                      <Utensils size={12} /> Meja {tableNumber}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metode Bayar */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Metode Pembayaran
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${paymentMethod === "cash" ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 ring-1 ring-emerald-500" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"}`}
                >
                  <Banknote size={20} />
                  <span className="text-xs font-bold">Tunai</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("qris")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${paymentMethod === "qris" ? "bg-blue-500/10 border-blue-500 text-blue-500 ring-1 ring-blue-500" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"}`}
                >
                  <QrCode size={20} />
                  <span className="text-xs font-bold">QRIS</span>
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t border-dashed border-zinc-800">
              <span className="text-zinc-400 text-sm">Total Bayar</span>
              <span className="text-2xl font-black text-white">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>

          <DialogFooter className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="flex-1 border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300 h-11 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleProcessOrder}
              disabled={isProcessing}
              className="flex-1 bg-white text-black hover:bg-gray-200 font-bold h-11 rounded-xl"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                "Cetak & Selesai"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
