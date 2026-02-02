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
  TicketPercent,
  X,
  CheckCircle2,
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
const CACHE_KEY_MENU = "cashier_menu_final_v1";
const CACHE_KEY_CATS = "cashier_cats_final_v1";

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
  id: number | string;
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

interface PromoData {
  id: number;
  code: string;
  discount_amount: number;
  discount_type: "percentage" | "fixed";
  min_purchase: number;
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
      onClick={() => onClick(cat.name)}
      className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all border ${
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
  // DATA
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // CART & UI
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoryName, setActiveCategoryName] = useState("Semua");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ORDER INFO
  const [customerName, setCustomerName] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");

  // PROMO (Compact)
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoData | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  // PAYMENT
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cashInputValue, setCashInputValue] = useState("");

  // PROCESS
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // REFS
  const beepSound = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. INIT
  useEffect(() => {
    if (typeof window !== "undefined") {
      beepSound.current = new Audio("/sounds/beep.mp3");
      beepSound.current.volume = 0.5;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "End" && cart.length > 0) {
        e.preventDefault();
        handleOpenConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  const playBeep = () => {
    if (beepSound.current) {
      beepSound.current.currentTime = 0;
      beepSound.current.play().catch(() => {});
    }
  };

  // 2. FETCH DATA
  const fetchData = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const [menuRes, catRes, tableRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("name"),
        supabase.from("categories").select("id, name, slug").order("name"),
        supabase.from("tables").select("id, table_number, status").order("id"),
      ]);

      if (menuRes.data) {
        setMenuItems(menuRes.data as MenuItem[]);
        sessionStorage.setItem(CACHE_KEY_MENU, JSON.stringify(menuRes.data));
      }
      if (catRes.data) {
        const mergedCats: Category[] = [
          { id: "all", name: "Semua", slug: "all" },
          ...catRes.data,
        ];
        setCategories(mergedCats);
        sessionStorage.setItem(CACHE_KEY_CATS, JSON.stringify(mergedCats));
      }
      if (tableRes.data) setTables(tableRes.data as TableData[]);
    } catch (e) {
      toast.error("Gagal sinkronisasi data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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

    const menuSub = supabase
      .channel("cashier-menu")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => fetchData(),
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));
    const tableSub = supabase
      .channel("cashier-table")
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
    if (confirm("Hapus keranjang?")) {
      setCart([]);
      setAppliedPromo(null);
      setPromoCodeInput("");
    }
  };

  // --- CALCULATION ---
  const subTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.qty, 0),
    [cart],
  );

  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (subTotal < appliedPromo.min_purchase) return 0;
    let disc =
      appliedPromo.discount_type === "percentage"
        ? (subTotal * appliedPromo.discount_amount) / 100
        : appliedPromo.discount_amount;
    return Math.min(disc, subTotal);
  }, [subTotal, appliedPromo]);

  const finalTotal = subTotal - discountAmount;
  const changeAmount = cashReceived - finalTotal;
  const isCashSufficient =
    paymentMethod === "cash" ? cashReceived >= finalTotal : true;

  // Auto-remove promo logic
  useEffect(() => {
    if (appliedPromo && subTotal < appliedPromo.min_purchase && subTotal > 0) {
      toast.warning("Minimal belanja tidak terpenuhi");
      setAppliedPromo(null);
    }
  }, [subTotal, appliedPromo]);

  // 5. PROMO HANDLER
  const handleCheckPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setIsCheckingPromo(true);
    try {
      const { data, error } = await supabase
        .from("promos")
        .select("*")
        .eq("code", promoCodeInput.trim().toUpperCase())
        .eq("is_active", true)
        .single();
      if (error || !data) {
        toast.error("Kode promo tidak valid");
        setAppliedPromo(null);
        return;
      }
      if (subTotal < data.min_purchase) {
        toast.error(`Min. belanja ${formatRupiah(data.min_purchase)}`);
        return;
      }
      setAppliedPromo(data);
      toast.success("Promo aktif! 🎉");
    } catch (e) {
      toast.error("Gagal cek promo");
    } finally {
      setIsCheckingPromo(false);
    }
  };

  // 6. FILTER
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

  // 7. INPUTS
  const handleCashInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw) || 0;
    setCashReceived(num);
    setCashInputValue(raw ? formatNumber(num) : "");
  };

  // 8. PROCESS
  const handleOpenConfirm = () => {
    if (!customerName.trim()) {
      toast.error("Isi Nama Pelanggan!");
      return;
    }
    if (orderType === "dine-in" && !selectedTableId) {
      toast.error("Pilih Meja!");
      return;
    }
    if (paymentMethod === "cash" && !isCashSufficient) {
      toast.error("Uang Kurang!");
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
          total_price: finalTotal,
          discount_amount: discountAmount,
          promo_code: appliedPromo ? appliedPromo.code : null,
          status: "pending",
          payment_status: "paid",
          payment_method: paymentMethod,
          cash_received: paymentMethod === "cash" ? cashReceived : finalTotal,
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

      await supabase.from("order_items").insert(itemsPayload);
      if (orderType === "dine-in" && selectedTableId) {
        await supabase
          .from("tables")
          .update({ status: "occupied", current_pax: 1 })
          .eq("id", selectedTableId);
      }

      toast.success("Transaksi Sukses! ✅");
      setCart([]);
      setCustomerName("");
      setSelectedTableId("");
      setCashReceived(0);
      setCashInputValue("");
      setAppliedPromo(null);
      setPromoCodeInput("");
      setShowConfirm(false);
    } catch (err: any) {
      toast.error("Gagal proses order");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-zinc-950 font-sans">
      {/* --- LEFT: MENU CATALOG (SCROLLBAR HIDDEN) --- */}
      <div className="flex-1 flex flex-col md:border-r border-white/5 p-4 gap-4 relative">
        <div className="flex flex-col gap-3 shrink-0">
          {/* SEARCH & FILTERS */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-zinc-500"
                size={18}
              />
              <Input
                ref={searchInputRef}
                placeholder="Cari menu... (/)"
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
              {isConnected ? "Live" : "Err"}
            </div>
          </div>
          {/* CATEGORIES (Scrollbar hidden via class) */}
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

        {/* MENU GRID (Scrollbar hidden) */}
        <div className="flex-1 overflow-y-auto pr-1 pb-24 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {isLoading && menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Loader2 className="animate-spin mb-2" />
              <span className="text-xs">Memuat...</span>
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
              <PackageOpen size={48} className="mb-2 opacity-20" />
              <p className="text-sm">Kosong</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMenu.map((item) => (
                <MenuCard key={item.id} item={item} onClick={addToCart} />
              ))}
            </div>
          )}
        </div>

        {/* MOBILE FLOATING CART BTN */}
        <div className="md:hidden absolute bottom-4 left-4 right-4">
          <Button
            onClick={() => setIsSidebarOpen(true)}
            className="w-full bg-emerald-600 text-white h-12 rounded-xl shadow-xl flex justify-between items-center px-4"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={18} /> {cart.length} Item
            </span>
            <span className="font-bold">{formatRupiah(finalTotal)}</span>
          </Button>
        </div>
      </div>

      {/* --- RIGHT: SIDEBAR --- */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[380px] bg-zinc-900 flex flex-col shadow-2xl z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="md:hidden p-2 bg-black/20 flex justify-start shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(false)}
            className="text-zinc-400"
          >
            Tutup
          </Button>
        </div>

        {/* 1. CUSTOMER INFO */}
        <div className="p-3 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm space-y-2 shrink-0">
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
              <User
                size={14}
                className="absolute left-3 top-2.5 text-zinc-500"
              />
              <Input
                id="customer-input"
                placeholder="Nama Pelanggan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-9 text-xs bg-zinc-800 border-zinc-700 pl-8 focus:ring-emerald-500"
              />
            </div>
            {orderType === "dine-in" && (
              <div className="relative flex-1">
                <MapPin
                  size={14}
                  className="absolute left-2.5 top-2.5 text-zinc-500 z-10"
                />
                <div className="relative">
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="h-9 w-full text-xs bg-zinc-800 border-zinc-700 pl-8 pr-6 rounded-md focus:ring-emerald-500 appearance-none text-white cursor-pointer hover:bg-zinc-700"
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
                    className="absolute right-2 top-2.5 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. CART LIST (Scrollbar hidden) */}
        <div className="flex justify-between items-center text-[10px] text-zinc-400 px-4 py-2 bg-zinc-900/50 uppercase font-bold tracking-wider">
          <span>Keranjang ({cart.length})</span>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
            >
              <Trash2 size={10} /> Reset
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 space-y-2">
              <ShoppingCart size={32} />
              <p className="text-xs">Keranjang kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-zinc-900 p-2 rounded-lg border border-zinc-800 hover:border-emerald-500/20 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-bold text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-emerald-500 font-mono">
                    {formatRupiah(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 rounded-md p-1 border border-zinc-800">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-5 h-5 flex items-center justify-center bg-zinc-800 rounded hover:bg-red-900/30 text-zinc-400 hover:text-red-400"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-xs font-bold w-4 text-center tabular-nums text-white">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-5 h-5 flex items-center justify-center bg-zinc-200 text-black rounded hover:bg-white"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 3. PROMO & PAYMENT (Compact Design) */}
        <div className="p-3 bg-zinc-900 border-t border-white/5 space-y-2 shrink-0 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] z-20">
          {/* COMPACT PROMO INPUT */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <TicketPercent
                size={12}
                className="absolute left-2.5 top-2.5 text-zinc-500"
              />
              <Input
                placeholder="Kode Voucher"
                className="h-8 pl-8 bg-zinc-950 border-zinc-800 text-[10px] focus:ring-pink-500 uppercase font-mono rounded-lg"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value)}
                disabled={!!appliedPromo}
              />
            </div>
            {appliedPromo ? (
              <Button
                onClick={() => {
                  setAppliedPromo(null);
                  setPromoCodeInput("");
                }}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg"
              >
                <X size={14} />
              </Button>
            ) : (
              <Button
                onClick={handleCheckPromo}
                disabled={!promoCodeInput || isCheckingPromo}
                size="sm"
                className="h-8 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold px-3 rounded-lg"
              >
                {isCheckingPromo ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  "Cek"
                )}
              </Button>
            )}
          </div>
          {appliedPromo && (
            <div className="flex justify-between items-center bg-emerald-950/30 border border-emerald-500/20 px-2 py-1.5 rounded-lg">
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={10} /> {appliedPromo.code}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                -{formatRupiah(discountAmount)}
              </span>
            </div>
          )}

          {/* PAYMENT METHOD */}
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${paymentMethod === "cash" ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-zinc-800 border-transparent text-zinc-400 hover:bg-zinc-700"}`}
            >
              <Banknote size={12} /> Tunai
            </button>
            <button
              onClick={() => setPaymentMethod("qris")}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${paymentMethod === "qris" ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-zinc-800 border-transparent text-zinc-400 hover:bg-zinc-700"}`}
            >
              <QrCode size={12} /> QRIS
            </button>
          </div>

          {/* CASH INPUT */}
          {paymentMethod === "cash" && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-[10px]">
                Bayar
              </span>
              <Input
                id="cash-input"
                type="text"
                inputMode="numeric"
                value={cashInputValue}
                onChange={handleCashInput}
                className="h-9 pl-12 bg-black border-zinc-700 font-mono font-bold text-white focus:ring-emerald-500 text-right pr-3 text-sm rounded-lg"
                placeholder="0"
              />
            </div>
          )}

          {/* TOTAL & ACTION */}
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex justify-between items-end mb-2">
              <div className="text-right w-full flex justify-between items-center">
                <div className="text-left">
                  <p className="text-[10px] text-zinc-400">Total</p>
                  {discountAmount > 0 && (
                    <span className="text-[10px] text-zinc-500 line-through block">
                      {formatRupiah(subTotal)}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-white leading-none">
                    {formatRupiah(finalTotal)}
                  </span>
                  {paymentMethod === "cash" && (
                    <p
                      className={`text-[10px] font-mono mt-0.5 ${changeAmount < 0 ? "text-red-500" : "text-emerald-500"}`}
                    >
                      {changeAmount < 0 ? "Kurang" : "Kembali"}:{" "}
                      {formatRupiah(Math.abs(changeAmount))}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Button
              disabled={
                cart.length === 0 ||
                (paymentMethod === "cash" && !isCashSufficient)
              }
              onClick={handleOpenConfirm}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all text-xs"
            >
              {paymentMethod === "cash" && !isCashSufficient
                ? "Uang Kurang"
                : "Proses Order"}{" "}
              <ArrowRight size={14} className="ml-2" />
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
          <div className="bg-emerald-600 p-5 text-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
              <Receipt className="text-white" size={20} />
            </div>
            <h2 className="text-base font-bold text-white">Konfirmasi Order</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="space-y-1.5 text-xs border-b border-dashed border-zinc-800 pb-3">
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
                <span>Metode</span>
                <span className="text-white font-bold uppercase">
                  {paymentMethod}
                </span>
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-3 max-h-[120px] overflow-y-auto space-y-1.5 custom-scrollbar">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-[10px] text-zinc-300 border-b border-zinc-800 last:border-0 pb-1 last:pb-0"
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
            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-800">
              <span>Total Akhir</span>
              <span>{formatRupiah(finalTotal)}</span>
            </div>
          </div>
          <DialogFooter className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              className="flex-1 text-zinc-400 hover:text-white h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleProcessOrder}
              disabled={isProcessing}
              className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold h-9 text-xs"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin w-3 h-3" />
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
