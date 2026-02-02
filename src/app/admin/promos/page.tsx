"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  TicketPercent,
  Plus,
  Trash2,
  Copy,
  Search,
  Loader2,
  Percent,
  Power,
  PowerOff,
  AlertCircle,
  AlertTriangle,
  Tag,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// --- CONFIG ---
const CACHE_KEY_PROMOS = "admin_promos_data_v6_sync"; // Bump Version

// --- TYPES ---
interface Promo {
  id: number;
  code: string;
  description: string | null;
  discount_amount: number;
  discount_type: "percentage" | "fixed";
  min_purchase: number;
  is_active: boolean;
}

// --- HELPER FORMATTER ---
const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

const formatNumber = (num: number) =>
  new Intl.NumberFormat("id-ID").format(num);

const formatCompactNumber = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
  }).format(number);
};

// --- SUB-COMPONENT: FORM MODAL (Highly Optimized) ---
const PromoFormModal = memo(
  ({
    isOpen,
    onClose,
    initialData,
    onSuccess,
  }: {
    isOpen: boolean;
    onClose: () => void;
    initialData: Promo | null;
    onSuccess: () => void;
  }) => {
    const [form, setForm] = useState({
      code: "",
      description: "",
      discount_amount: 0,
      discount_type: "percentage" as "percentage" | "fixed",
      min_purchase: 0,
      is_active: true,
    });

    const [displayAmount, setDisplayAmount] = useState("");
    const [displayMinPurchase, setDisplayMinPurchase] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (isOpen) {
        if (initialData) {
          setForm({
            code: initialData.code || "",
            description: initialData.description || "",
            discount_amount: initialData.discount_amount || 0,
            discount_type: initialData.discount_type || "percentage",
            min_purchase: initialData.min_purchase || 0,
            is_active: initialData.is_active,
          });
          setDisplayAmount(formatNumber(initialData.discount_amount || 0));
          setDisplayMinPurchase(formatNumber(initialData.min_purchase || 0));
        } else {
          setForm({
            code: "",
            description: "",
            discount_amount: 0,
            discount_type: "percentage",
            min_purchase: 0,
            is_active: true,
          });
          setDisplayAmount("");
          setDisplayMinPurchase("");
        }
      }
    }, [initialData, isOpen]);

    const handleAmountChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "");
        const num = parseInt(raw) || 0;
        setForm((prev) => {
          if (prev.discount_type === "percentage" && num > 100) return prev;
          return { ...prev, discount_amount: num };
        });
        if (!(form.discount_type === "percentage" && num > 100)) {
          setDisplayAmount(raw ? formatNumber(num) : "");
        }
      },
      [form.discount_type],
    );

    const handleMinPurchaseChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "");
        const num = parseInt(raw) || 0;
        setForm((prev) => ({ ...prev, min_purchase: num }));
        setDisplayMinPurchase(raw ? formatNumber(num) : "");
      },
      [],
    );

    const handleSubmit = async () => {
      if (!form.code || !form.discount_amount) {
        toast.error("Kode & Nominal wajib diisi!");
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          code: form.code.toUpperCase().replace(/\s/g, ""),
          description: form.description,
          discount_amount: form.discount_amount,
          discount_type: form.discount_type,
          min_purchase: form.min_purchase,
          is_active: form.is_active,
        };

        if (initialData) {
          const { error } = await supabase
            .from("promos")
            .update(payload)
            .eq("id", initialData.id);
          if (error) throw error;
          toast.success("Promo diupdate ✅");
        } else {
          const { error } = await supabase.from("promos").insert([payload]);
          if (error) throw error;
          toast.success("Promo dibuat 🎉");
        }
        onSuccess();
        onClose();
      } catch (e) {
        toast.error("Gagal menyimpan");
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md rounded-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {initialData ? "Edit Promo" : "Buat Promo Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">
                  Kode Promo
                </label>
                <Input
                  placeholder="CONTOH: HEMAT10"
                  className="bg-zinc-900 border-zinc-800 rounded-xl font-mono uppercase text-sm h-11 sm:h-10 focus:ring-emerald-500"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">
                  Deskripsi
                </label>
                <Input
                  placeholder="Keterangan singkat..."
                  className="bg-zinc-900 border-zinc-800 rounded-xl text-sm h-11 sm:h-10 focus:ring-emerald-500"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">
                  Tipe Diskon
                </label>
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 h-11 sm:h-10 items-center">
                  <button
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        discount_type: "percentage",
                        discount_amount: 0,
                      }))
                    }
                    className={`flex-1 h-full rounded-lg text-xs font-bold transition-all ${form.discount_type === "percentage" ? "bg-pink-600 text-white shadow-sm" : "text-zinc-500 hover:text-white"}`}
                  >
                    %
                  </button>
                  <button
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        discount_type: "fixed",
                        discount_amount: 0,
                      }))
                    }
                    className={`flex-1 h-full rounded-lg text-xs font-bold transition-all ${form.discount_type === "fixed" ? "bg-pink-600 text-white shadow-sm" : "text-zinc-500 hover:text-white"}`}
                  >
                    Rp
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">
                  {form.discount_type === "percentage"
                    ? "Persentase"
                    : "Nominal"}
                </label>
                <div className="relative">
                  {form.discount_type === "percentage" ? (
                    <Percent
                      className="absolute left-3 top-3 text-zinc-500 pointer-events-none"
                      size={14}
                    />
                  ) : (
                    <span className="absolute left-3 top-3 text-xs font-bold text-zinc-500 pointer-events-none">
                      Rp
                    </span>
                  )}
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="pl-9 bg-zinc-900 border-zinc-800 rounded-xl text-sm h-11 sm:h-10 font-mono focus:ring-emerald-500"
                    value={displayAmount}
                    onChange={handleAmountChange}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">
                Min. Belanja
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-zinc-500 pointer-events-none">
                  Rp
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="pl-9 bg-zinc-900 border-zinc-800 rounded-xl text-sm h-11 sm:h-10 font-mono focus:ring-emerald-500"
                  value={displayMinPurchase}
                  onChange={handleMinPurchaseChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white h-11 sm:h-10"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-white text-black hover:bg-zinc-200 font-bold rounded-xl h-11 sm:h-10"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                "Simpan Promo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
PromoFormModal.displayName = "PromoFormModal";

// --- MAIN PAGE ---
export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal & Delete State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<Promo | null>(null);

  // 1. FETCH DATA (Optimized with Local Update)
  const fetchPromos = useCallback(async (useCache = true) => {
    if (useCache) {
      const cached = sessionStorage.getItem(CACHE_KEY_PROMOS);
      if (cached) {
        setPromos(JSON.parse(cached));
        setIsLoading(false);
      }
    }
    try {
      const { data, error } = await supabase
        .from("promos")
        .select("*")
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPromos(data as Promo[]);
      sessionStorage.setItem(CACHE_KEY_PROMOS, JSON.stringify(data));
    } catch (e) {
      if (!useCache) toast.error("Gagal memuat promo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. REALTIME (Auto Update when User changes)
  useEffect(() => {
    fetchPromos(true);
    const channel = supabase
      .channel("admin-promos-v6")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promos" },
        () => fetchPromos(false),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPromos]);

  // 3. HANDLERS (Memoized)
  const handleCopy = useCallback((code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Kode disalin! 📋");
  }, []);

  const handleToggleStatus = useCallback(
    async (id: number, currentStatus: boolean) => {
      // Optimistic Update
      const updatedPromos = promos.map((p) =>
        p.id === id ? { ...p, is_active: !currentStatus } : p,
      );
      setPromos(updatedPromos);
      sessionStorage.setItem(CACHE_KEY_PROMOS, JSON.stringify(updatedPromos));

      try {
        const { error } = await supabase
          .from("promos")
          .update({ is_active: !currentStatus })
          .eq("id", id);
        if (error) throw error;
        toast.success(currentStatus ? "Dinonaktifkan" : "Diaktifkan");
      } catch (e) {
        fetchPromos(false); // Rollback if error
        toast.error("Gagal update status");
      }
    },
    [promos, fetchPromos],
  );

  const handleDeleteConfirm = async () => {
    if (!promoToDelete) return;

    // Optimistic Delete
    const updatedPromos = promos.filter((p) => p.id !== promoToDelete.id);
    setPromos(updatedPromos);
    sessionStorage.setItem(CACHE_KEY_PROMOS, JSON.stringify(updatedPromos));
    setPromoToDelete(null);

    try {
      const { error } = await supabase
        .from("promos")
        .delete()
        .eq("id", promoToDelete.id);
      if (error) throw error;
      toast.success("Dihapus");
    } catch (e) {
      fetchPromos(false); // Rollback
      toast.error("Gagal menghapus");
    }
  };

  const handleOpenAdd = useCallback(() => {
    setEditingPromo(null);
    setIsModalOpen(true);
  }, []);
  const handleOpenEdit = useCallback((promo: Promo) => {
    setEditingPromo(promo);
    setIsModalOpen(true);
  }, []);

  // 4. FILTER (Memoized)
  const filteredPromos = useMemo(() => {
    return promos.filter((p) =>
      (p.code || "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [promos, search]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <TicketPercent size={28} className="text-pink-500" /> Promo &
            Voucher
          </h1>
          <p className="text-zinc-400 text-xs mt-1 ml-1 font-medium">
            Strategi diskon pelanggan.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-pink-600 hover:bg-pink-500 text-white font-bold shadow-lg shadow-pink-900/20 rounded-xl h-10 px-6 active:scale-95 transition-transform"
        >
          <Plus size={18} className="mr-2" /> Buat Promo
        </Button>
      </div>

      {/* CONTROLS */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
        <Input
          placeholder="Cari kode voucher..."
          className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl text-sm h-10 focus:ring-pink-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && promos.length === 0 ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-zinc-900/50 rounded-3xl animate-pulse border border-white/5"
            />
          ))
        ) : filteredPromos.length === 0 ? (
          <div className="col-span-full py-20 text-center text-zinc-500 flex flex-col items-center">
            <TicketPercent size={48} className="opacity-20 mb-3" />
            <p>Belum ada promo aktif.</p>
          </div>
        ) : (
          filteredPromos.map((promo) => (
            <div
              key={promo.id}
              className={`relative p-5 rounded-3xl border transition-all group overflow-hidden ${promo.is_active ? "bg-zinc-900 border-white/5 hover:border-pink-500/30" : "bg-zinc-900/50 border-zinc-800 opacity-60 grayscale"}`}
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div
                  onClick={() => handleCopy(promo.code)}
                  className="bg-black/40 border border-dashed border-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-black/60 hover:border-pink-500 transition-all active:scale-95"
                  title="Salin Kode"
                >
                  <Tag size={14} className="text-pink-500" />
                  <span className="font-mono font-bold text-lg text-white tracking-wider">
                    {promo.code}
                  </span>
                  <Copy size={12} className="text-zinc-600" />
                </div>
                <div
                  className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${promo.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"}`}
                >
                  {promo.is_active ? "Aktif" : "Non-Aktif"}
                </div>
              </div>
              <div className="space-y-1 mb-6 relative z-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white group-hover:text-pink-400 transition-colors">
                    {promo.discount_type === "percentage"
                      ? `${promo.discount_amount}%`
                      : formatCompactNumber(promo.discount_amount)}
                  </span>
                  <span className="text-xs font-bold text-zinc-500 uppercase">
                    OFF
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 h-8">
                  {promo.description || "Potongan harga spesial."}
                </p>
                {promo.min_purchase > 0 && (
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-2 bg-white/5 w-fit px-2 py-1 rounded-md">
                    <AlertCircle size={10} /> Min. Belanja:{" "}
                    {formatRupiah(promo.min_purchase)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-white/5 relative z-10">
                <Button
                  onClick={() => handleToggleStatus(promo.id, promo.is_active)}
                  variant="ghost"
                  size="sm"
                  className={`flex-1 h-9 rounded-xl font-bold text-xs ${promo.is_active ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                >
                  {promo.is_active ? (
                    <>
                      <PowerOff size={14} className="mr-2" /> Matikan
                    </>
                  ) : (
                    <>
                      <Power size={14} className="mr-2" /> Aktifkan
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleOpenEdit(promo)}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  onClick={() => setPromoToDelete(promo)}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <PromoFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingPromo}
        onSuccess={() => fetchPromos(false)}
      />

      {/* DELETE CONFIRM */}
      <Dialog
        open={!!promoToDelete}
        onOpenChange={(open) => !open && setPromoToDelete(null)}
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[400px] rounded-3xl p-0 overflow-hidden w-[95vw] sm:w-full">
          <div className="bg-red-500/10 p-6 flex flex-col items-center justify-center text-center border-b border-red-500/20">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500 animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <DialogTitle className="text-xl font-bold text-red-500">
              Hapus Promo?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 mt-2 text-xs max-w-[280px]">
              Yakin ingin menghapus kode <b>{promoToDelete?.code}</b>? Tidak
              bisa dibatalkan.
            </DialogDescription>
          </div>
          <DialogFooter className="p-4 bg-zinc-900 flex gap-2 justify-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => setPromoToDelete(null)}
              className="flex-1 text-zinc-400 hover:text-white rounded-xl h-11 sm:h-10"
            >
              Batal
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl h-11 sm:h-10 shadow-lg shadow-red-900/20"
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
