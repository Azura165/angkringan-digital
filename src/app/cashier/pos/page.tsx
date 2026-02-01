"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
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
  ChevronDown,
  Keyboard, // Icon indikator shortcut
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
  DialogDescription,
} from "@/components/ui/dialog";

// --- CONFIG ---
const CACHE_KEY_MENU = "cashier_menu_v11";
const CACHE_KEY_CATS = "cashier_cats_v11";

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
  id: number | string; // string untuk 'all'
  name: string;
  slug: string;
}

interface TableData {
  id: number;
  table_number: string;
  status: "available" | "occupied" | "reserved";
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

const formatNumber = (num: number) =>
  new Intl.NumberFormat("id-ID").format(num);

// --- SUB-COMPONENTS (MEMOIZED) ---
const MenuCard = memo(
  ({ item, onClick }: { item: MenuItem; onClick: (i: MenuItem) => void }) => (
    <div
      onClick={() => onClick(item)}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer group hover:border-emerald-500/50 transition-all active:scale-[0.98] flex flex-col h-full shadow-sm hover:shadow-md relative touch-manipulation"
    >
      <div className="relative h-24 sm:h-28 w-full bg-zinc-800 overflow-hidden">
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
        <h3 className="font-bold text-xs sm:text-sm text-zinc-200 line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors">
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
    cat: Category;
    active: boolean;
    onClick: (c: string) => void;
  }) => (
    <button
      onClick={() => onClick(cat.name)} // Filter by Name (sesuai data menu)
      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
        active
          ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/20"
          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600"
      }`}
    >
      {cat.name}
    </button>
  ),
);
CategoryPill.displayName = "CategoryPill";

export default function CashierPOSPage() {
  // DATA STATE
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // CART & UI STATE
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoryName, setActiveCategoryName] = useState("Semua");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ORDER INFO STATE
  const [customerName, setCustomerName] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");

  // PAYMENT STATE
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cashInputValue, setCashInputValue] = useState("");

  // PROCESS STATE
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // REFS (Untuk Focus & Sound)
  const beepSound = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. INIT SOUND & SHORTCUTS
  useEffect(() => {
    if (typeof window !== "undefined") {
      beepSound.current = new Audio("/sounds/beep.mp3");
      beepSound.current.volume = 0.5;
    }

    // Keyboard Shortcuts Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tekan '/' untuk Search
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Tekan 'End' untuk Bayar (jika ada item)
      if (e.key === "End" && cart.length > 0) {
        e.preventDefault();
        handleOpenConfirm(); // Panggil fungsi bayar
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playBeep = () => {
    if (beepSound.current) {
      beepSound.current.currentTime = 0;
      beepSound.current.play().catch(() => {});
    }
  };

  // 2. FETCH DATA (Optimized)
  const fetchData = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const [menuRes, catRes, tableRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("name"),
        supabase.from("categories").select("id, name, slug").order("name"), // Fetch slug juga
        supabase.from("tables").select("id, table_number, status").order("id"),
      ]);

      if (menuRes.data) {
        setMenuItems(menuRes.data as MenuItem[]);
        sessionStorage.setItem(CACHE_KEY_MENU, JSON.stringify(menuRes.data));
      }
      if (catRes.data) {
        // Gabungkan "Semua" dengan kategori dari DB
        const mergedCats: Category[] = [
          { id: "all", name: "Semua", slug: "all" },
          ...catRes.data,
        ];
        setCategories(mergedCats);
        sessionStorage.setItem(CACHE_KEY_CATS, JSON.stringify(mergedCats));
      }
      if (tableRes.data) {
        setTables(tableRes.data as TableData[]);
      }
    } catch (e) {
      toast.error("Gagal sinkronisasi data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 3. INIT EFFECT & REALTIME
  useEffect(() => {
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

    // Listen Menu Changes
    const menuSub = supabase
      .channel("cashier-menu-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => fetchData(),
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));

    // Listen Table Changes
    const tableSub = supabase
      .channel("cashier-table-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => {
          supabase
            .from("tables")
            .select("id, table_number, status")
            .order("id")
            .then(({ data }) => {
              if (data) setTables(data as TableData[]);
            });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(menuSub);
      supabase.removeChannel(tableSub);
    };
  }, [fetchData]);

  // 4. CART LOGIC
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

  const clearCart = () => {
    if (confirm("Hapus semua item di keranjang?")) {
      setCart([]);
      toast.info("Keranjang dikosongkan");
    }
  };

  const grandTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.qty, 0),
    [cart],
  );

  const changeAmount = cashReceived - grandTotal;
  const isCashSufficient =
    paymentMethod === "cash" ? cashReceived >= grandTotal : true;

  // 5. FILTERING
  const filteredMenu = useMemo(() => {
    let items = menuItems;
    if (activeCategoryName !== "Semua")
      items = items.filter((i) => i.category === activeCategoryName);
    if (search)
      items = items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()),
      );
    return items;
  }, [menuItems, activeCategoryName, search]);

  // 6. INPUT FORMATTER
  const handleCashInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw) || 0;
    setCashReceived(num);
    setCashInputValue(raw ? formatNumber(num) : "");
  };

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
    setCashInputValue(formatNumber(amount));
  };

  // 7. HANDLERS (PROCESS)
  const handleOpenConfirm = () => {
    if (!customerName.trim()) {
      toast.error("Nama Pelanggan wajib diisi!");
      document.getElementById("customer-input")?.focus();
      return;
    }
    if (orderType === "dine-in" && !selectedTableId) {
      toast.error("Pilih Nomor Meja!");
      return;
    }
    if (paymentMethod === "cash" && !isCashSufficient) {
      toast.error("Uang pembayaran kurang!");
      document.getElementById("cash-input")?.focus();
      return;
    }
    setShowConfirm(true);
  };

  const handleProcessOrder = async () => {
    setIsProcessing(true);

    let finalTable = "Takeaway";
    if (orderType === "dine-in") {
      const t = tables.find((t) => t.id.toString() === selectedTableId);
      finalTable = t ? t.table_number : "Unknown";
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: customerName,
          table_number: finalTable,
          total_price: grandTotal,
          status: "pending",
          payment_status: "paid",
          payment_method: paymentMethod,
          cash_received: paymentMethod === "cash" ? cashReceived : grandTotal, // KIRIM KE DB
        })
        .select()
        .single();

      if (orderError) throw orderError;

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

      if (orderType === "dine-in" && selectedTableId) {
        await supabase
          .from("tables")
          .update({ status: "occupied", current_pax: 1 })
          .eq("id", selectedTableId);
      }

      toast.success("Transaksi Sukses! ✅", {
        description: "Order telah masuk antrian.",
      });

      // Reset
      setCart([]);
      setCustomerName("");
      setSelectedTableId("");
      setCashReceived(0);
      setCashInputValue("");
      setShowConfirm(false);
    } catch (err: any) {
      toast.error("Gagal memproses", { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-zinc-950 font-sans">
      {/* --- LEFT: MENU CATALOG --- */}
      <div className="flex-1 flex flex-col md:border-r border-white/5 p-4 gap-4 relative">
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-zinc-500"
                size={18}
              />
              <Input
                ref={searchInputRef}
                placeholder="Cari menu... (Tekan /)"
                className="pl-10 h-10 bg-zinc-900 border-zinc-800 rounded-xl text-white text-xs focus:ring-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="absolute right-3 top-2.5 hidden md:flex items-center gap-1 opacity-50">
                <Keyboard size={12} className="text-zinc-500" />
              </div>
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
                key={`${cat.id}-${idx}`}
                cat={cat}
                active={activeCategoryName === cat.name}
                onClick={setActiveCategoryName}
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

        {/* Mobile Floating Trigger */}
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

      {/* --- RIGHT: SIDEBAR --- */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-zinc-900 flex flex-col shadow-2xl z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="md:hidden p-2 bg-black/20 flex justify-start shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(false)}
            className="text-zinc-400"
          >
            Tutup Panel
          </Button>
        </div>

        {/* 1. INFO PELANGGAN */}
        <div className="p-4 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm space-y-3 shrink-0">
          <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
            <button
              onClick={() => setOrderType("dine-in")}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${orderType === "dine-in" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"}`}
            >
              Dine In
            </button>
            <button
              onClick={() => setOrderType("takeaway")}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${orderType === "takeaway" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"}`}
            >
              Takeaway
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-[2]">
              <User size={14} className="absolute left-3 top-3 text-zinc-500" />
              <Input
                id="customer-input"
                placeholder="Nama Pelanggan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-10 text-xs bg-zinc-800 border-zinc-700 pl-9 focus:ring-emerald-500"
              />
            </div>

            {orderType === "dine-in" && (
              <div className="relative flex-1">
                <MapPin
                  size={14}
                  className="absolute left-3 top-3 text-zinc-500 z-10"
                />
                <div className="relative">
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="h-10 w-full text-xs bg-zinc-800 border-zinc-700 pl-9 pr-8 rounded-md focus:ring-emerald-500 appearance-none text-white cursor-pointer hover:bg-zinc-700 transition-colors"
                  >
                    <option value="" disabled>
                      Meja
                    </option>
                    {tables
                      .filter(
                        (t) =>
                          t.status === "available" ||
                          t.id.toString() === selectedTableId,
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.table_number.replace("Meja ", "")}
                        </option>
                      ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-3 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. ITEM LIST */}
        <div className="p-2 border-b border-white/5 flex justify-between items-center text-xs text-zinc-400 px-4 bg-zinc-900/50">
          <span>
            Keranjang ({cart.reduce((acc, item) => acc + item.qty, 0)} items)
          </span>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
            >
              <Trash2 size={12} /> Hapus
            </button>
          )}
        </div>

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

        {/* 3. PAYMENT AREA */}
        <div className="p-4 bg-zinc-900 border-t border-white/5 space-y-3 shrink-0 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] z-20">
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${paymentMethod === "cash" ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-zinc-800 border-transparent text-zinc-400 hover:bg-zinc-700"}`}
            >
              <Banknote size={14} /> Tunai
            </button>
            <button
              onClick={() => setPaymentMethod("qris")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${paymentMethod === "qris" ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-zinc-800 border-transparent text-zinc-400 hover:bg-zinc-700"}`}
            >
              <QrCode size={14} /> QRIS
            </button>
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">
                  Bayar
                </span>
                <Input
                  id="cash-input"
                  type="text"
                  inputMode="numeric"
                  value={cashInputValue}
                  onChange={handleCashInput}
                  className="h-10 pl-14 bg-black border-zinc-700 font-mono font-bold text-white focus:ring-emerald-500 text-right pr-3"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleQuickCash(grandTotal)}
                  className="bg-emerald-900/30 text-emerald-500 text-[9px] font-bold py-1.5 rounded-md hover:bg-emerald-900/50 border border-emerald-500/20"
                >
                  Pas
                </button>
                {[20000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleQuickCash(amt)}
                    className="bg-zinc-800 text-zinc-300 text-[9px] font-bold py-1.5 rounded-md hover:bg-zinc-700 border border-zinc-700"
                  >
                    {amt / 1000}k
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-800 space-y-1">
            <div className="flex justify-between items-end">
              <div className="text-right">
                <p className="text-[10px] text-zinc-400">Total Tagihan</p>
                <p className="text-xl font-black text-white leading-none">
                  {formatRupiah(grandTotal)}
                </p>
              </div>
              {paymentMethod === "cash" && (
                <div className="text-right">
                  <p className="text-[10px] text-zinc-400">Kembalian</p>
                  <p
                    className={`text-sm font-bold font-mono leading-none ${changeAmount < 0 ? "text-red-500" : "text-emerald-500"}`}
                  >
                    {changeAmount < 0 ? "-" : ""}
                    {formatRupiah(Math.abs(changeAmount))}
                  </p>
                </div>
              )}
            </div>

            <Button
              disabled={
                cart.length === 0 ||
                (paymentMethod === "cash" && !isCashSufficient)
              }
              onClick={handleOpenConfirm}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all mt-2"
            >
              {paymentMethod === "cash" && !isCashSufficient
                ? "Uang Kurang"
                : "Konfirmasi & Proses"}{" "}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[360px] rounded-3xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Konfirmasi</DialogTitle>
            <DialogDescription>Cek</DialogDescription>
          </DialogHeader>

          <div className="bg-emerald-600 p-6 text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
              <Receipt className="text-white" size={24} />
            </div>
            <h2 className="text-lg font-bold text-white">Konfirmasi Order</h2>
            <p className="text-emerald-100 text-xs">
              Pastikan data sudah benar.
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2 text-sm border-b border-dashed border-zinc-800 pb-4">
              <div className="flex justify-between text-zinc-400">
                <span>Pelanggan</span>
                <span className="text-white font-bold">{customerName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Tipe</span>
                <span className="text-white font-bold">
                  {orderType === "takeaway"
                    ? "Bungkus"
                    : `Meja ${tables.find((t) => t.id.toString() === selectedTableId)?.table_number.replace("Meja ", "") || "-"}`}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Pembayaran</span>
                <span className="text-white font-bold uppercase">
                  {paymentMethod}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">
                Rincian Menu
              </p>
              <div className="bg-zinc-900 rounded-xl p-3 max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-xs text-zinc-300 border-b border-zinc-800 last:border-0 pb-1 last:pb-0"
                  >
                    <div className="flex gap-2">
                      <span className="font-bold text-emerald-500">
                        {item.qty}x
                      </span>
                      <span className="line-clamp-1 max-w-[140px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono">
                      {formatRupiah(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 p-3 rounded-xl space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Total Belanja</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>
              {paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Uang Masuk</span>
                    <span>{formatRupiah(cashReceived)}</span>
                  </div>
                  <div className="border-t border-zinc-800 my-1 pt-1 flex justify-between font-bold text-sm text-emerald-500">
                    <span>Kembalian</span>
                    <span>{formatRupiah(changeAmount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              className="flex-1 text-zinc-400 hover:text-white"
            >
              Batal
            </Button>
            <Button
              onClick={handleProcessOrder}
              disabled={isProcessing}
              className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                "Konfirmasi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
