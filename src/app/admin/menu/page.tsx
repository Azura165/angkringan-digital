"use client";

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Star,
  Save,
  Loader2,
  Tag,
  Copy as CopyIcon,
  Upload,
  XCircle,
  ImageOff,
  MoreVertical,
  Flame,
  UtensilsCrossed,
  Zap,
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
  CheckCircle2,
  FilterX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- TYPES ---
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_id: number;
  is_available: boolean;
  is_recommended: boolean;
  tags: string[];
}

const CATEGORIES = [
  { id: 1, name: "Satean" },
  { id: 2, name: "Makanan" },
  { id: 3, name: "Minuman" },
  { id: 4, name: "Cemilan" },
];

const HOME_SECTIONS = [
  {
    label: "Pedas",
    value: "Pedas",
    icon: Flame,
    color: "text-red-500 bg-red-500/10",
  },
  {
    label: "Berat",
    value: "Berat",
    icon: UtensilsCrossed,
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    label: "Promo",
    value: "Promo",
    icon: Zap,
    color: "text-purple-500 bg-purple-500/10",
  },
];

const CACHE_KEY = "admin_menu_cache_v4";

// --- UTILS: DEBOUNCE HOOK ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- 1. MEMOIZED CARD (Ultra Optimized) ---
const MenuGridItem = memo(
  ({
    item,
    onToggle,
    onEdit,
    onDuplicate,
    onDelete,
    index,
  }: {
    item: MenuItem;
    onToggle: (id: number, field: "is_available" | "is_recommended") => void;
    onEdit: (item: MenuItem) => void;
    onDuplicate: (item: MenuItem) => void;
    onDelete: (id: number) => void;
    index: number;
  }) => {
    const isPriority = index < 6;

    return (
      <div
        className={`group relative bg-zinc-900 border transition-all duration-300 rounded-2xl overflow-hidden flex flex-row md:flex-col ${!item.is_available ? "border-red-500/30 bg-red-900/5 opacity-80" : "border-white/5 hover:border-zinc-600 hover:shadow-xl hover:shadow-black/50"}`}
      >
        {/* IMAGE */}
        <div className="relative w-28 md:w-full md:h-48 bg-zinc-800 shrink-0 flex items-center justify-center overflow-hidden">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className={`object-cover transition-transform duration-700 group-hover:scale-105 ${!item.is_available ? "grayscale" : ""}`}
              sizes="(max-width: 768px) 120px, 300px"
              quality={60}
              priority={isPriority}
              onError={(e: any) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`absolute inset-0 flex items-center justify-center text-zinc-600 bg-zinc-800/50 ${item.image_url ? "hidden" : "flex"}`}
          >
            <ImageOff size={24} />
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            <span className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-white font-bold w-fit shadow-sm border border-white/10">
              {CATEGORIES.find((c) => c.id === item.category_id)?.name}
            </span>
            <div className="flex gap-1">
              {item.tags?.includes("Pedas") && (
                <span className="bg-red-500 text-white p-1 rounded-md shadow-sm">
                  <Flame size={10} fill="currentColor" />
                </span>
              )}
              {item.tags?.includes("Berat") && (
                <span className="bg-amber-500 text-black p-1 rounded-md shadow-sm">
                  <UtensilsCrossed size={10} />
                </span>
              )}
            </div>
          </div>

          {!item.is_available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 backdrop-blur-[1px]">
              <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full border border-red-400 shadow-lg tracking-wider">
                STOK HABIS
              </span>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-orange-500 transition-colors">
                {item.name}
              </h3>
              {item.is_recommended && (
                <Star
                  size={12}
                  className="text-yellow-500 fill-yellow-500 shrink-0 mt-1 animate-pulse"
                />
              )}
            </div>
            <p className="text-zinc-500 text-[10px] line-clamp-1">
              {item.description || "-"}
            </p>
            <span className="font-black text-white text-sm mt-1">
              Rp {item.price.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={item.is_available}
                onCheckedChange={() => onToggle(item.id, "is_available")}
                className="h-4 w-7 data-[state=checked]:bg-green-500"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-950 border-zinc-800 text-white w-48 shadow-xl shadow-black/50"
              >
                <DropdownMenuLabel className="text-xs text-zinc-500">
                  Atur Menu
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit3 size={14} className="mr-2" /> Edit Detail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(item)}>
                  <CopyIcon size={14} className="mr-2" /> Duplikat
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => onToggle(item.id, "is_recommended")}
                >
                  <Star
                    size={14}
                    className={`mr-2 ${item.is_recommended ? "fill-yellow-500 text-yellow-500" : ""}`}
                  />
                  {item.is_recommended
                    ? "Unset Paling Laris"
                    : "Set Paling Laris"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={14} className="mr-2" /> Hapus Menu
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.name === next.item.name &&
      prev.item.price === next.item.price &&
      prev.item.is_available === next.item.is_available &&
      prev.item.is_recommended === next.item.is_recommended &&
      prev.item.image_url === next.item.image_url &&
      prev.index === next.index
    );
  },
);
MenuGridItem.displayName = "MenuGridItem";

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const debouncedSearch = useDebounce(searchQuery, 300);

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isExitAlertOpen, setIsExitAlertOpen] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [displayPrice, setDisplayPrice] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    category_id: "1",
    tags: [] as string[],
  });

  // --- FETCH DATA (OPTIMIZED CACHE) ---
  const fetchMenu = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);

    // Cache Check
    if (typeof window !== "undefined" && !isBackground) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setItems(JSON.parse(cached));
        setIsLoading(false); // Stop loading if cache exists
      }
    }

    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("id", { ascending: false });

    if (data) {
      setItems(data);
      if (typeof window !== "undefined")
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }

    if (!isBackground) setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // --- FILTERING LOGIC (Fixed Ghosting) ---
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        item.category_id.toString() === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, debouncedSearch, selectedCategory]);

  const stats = useMemo(
    () => ({
      total: filteredItems.length,
      active: filteredItems.filter((i) => i.is_available).length,
      promo: filteredItems.filter((i) => i.is_recommended).length,
    }),
    [filteredItems],
  );

  // --- RENDERING CONDITIONS (STRICT LOGIC) ---
  // Pastikan logika ini tidak tumpang tindih
  const showSkeleton = isLoading && items.length === 0;
  const showGrid = !showSkeleton && filteredItems.length > 0;
  const showEmpty = !showSkeleton && filteredItems.length === 0;

  // --- ACTIONS ---
  const handleToggle = useCallback(
    async (id: number, field: "is_available" | "is_recommended") => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, [field]: !i[field] } : i)),
      );
      if (typeof navigator !== "undefined" && navigator.vibrate)
        navigator.vibrate(15);

      supabase
        .from("menu_items")
        .update({ [field]: !items.find((i) => i.id === id)?.[field] })
        .eq("id", id)
        .then(() => fetchMenu(true));
    },
    [items, fetchMenu],
  );

  const confirmDelete = useCallback((id: number) => {
    setItemToDelete(id);
    setIsDeleteOpen(true);
    if (typeof navigator !== "undefined" && navigator.vibrate)
      navigator.vibrate(50);
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", itemToDelete);
    setIsSubmitting(false);
    setIsDeleteOpen(false);
    if (!error) {
      const newItems = items.filter((i) => i.id !== itemToDelete);
      setItems(newItems);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(newItems));
      toast.success("Menu dihapus.");
    } else {
      toast.error("Gagal menghapus.");
    }
  };

  const handleDuplicate = useCallback((item: MenuItem) => {
    setFormData({
      name: `${item.name} (Copy)`,
      description: item.description || "",
      price: item.price,
      image_url: item.image_url || "",
      category_id: item.category_id.toString(),
      tags: item.tags || [],
    });
    setDisplayPrice(item.price.toLocaleString("id-ID"));
    setEditingItem(null);
    setIsModalOpen(true);
    setIsDirty(true);
    toast.info("Menu diduplikasi.");
  }, []);

  // --- MODAL & FORM ---
  const attemptCloseModal = () => {
    if (isDirty) {
      setIsExitAlertOpen(true);
    } else {
      setIsModalOpen(false);
    }
  };
  const confirmClose = () => {
    setIsExitAlertOpen(false);
    setIsModalOpen(false);
    setIsDirty(false);
  };

  const handlePriceChange = (val: string) => {
    const numberVal = parseInt(val.replace(/\D/g, "")) || 0;
    setFormData({ ...formData, price: numberVal });
    setDisplayPrice(numberVal.toLocaleString("id-ID"));
    setIsDirty(true);
  };

  const toggleTagInForm = (tagValue: string) => {
    setFormData((prev) => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tagValue)
        ? currentTags.filter((t) => t !== tagValue)
        : [...currentTags, tagValue];
      return { ...prev, tags: newTags };
    });
    setIsDirty(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran max 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const { error } = await supabase.storage
        .from("menu-images")
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage
        .from("menu-images")
        .getPublicUrl(fileName);
      setFormData({ ...formData, image_url: data.publicUrl });
      setIsDirty(true);
      toast.success("Upload berhasil!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal upload gambar.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Nama & Harga wajib diisi!");
      return;
    }
    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: formData.price,
      image_url: formData.image_url.trim(),
      category_id: parseInt(formData.category_id),
      tags: formData.tags,
    };

    let result;
    if (editingItem) {
      result = await supabase
        .from("menu_items")
        .update(payload)
        .eq("id", editingItem.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("menu_items")
        .insert(payload)
        .select()
        .single();
    }

    const { data, error } = result;
    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan.");
    } else if (data) {
      let updatedItems;
      if (editingItem) {
        updatedItems = items.map((i) =>
          i.id === editingItem.id ? (data as MenuItem) : i,
        );
      } else {
        updatedItems = [data as MenuItem, ...items];
      }
      setItems(updatedItems);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(updatedItems));

      toast.success("Menu tersimpan! ✨");
      setIsModalOpen(false);
      setIsDirty(false);
    }
  };

  const openEdit = useCallback((item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      image_url: item.image_url || "",
      category_id: item.category_id.toString(),
      tags: item.tags || [],
    });
    setDisplayPrice(item.price.toLocaleString("id-ID"));
    setIsModalOpen(true);
    setIsDirty(false);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, []);

  const openNew = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      image_url: "",
      category_id: "1",
      tags: [],
    });
    setDisplayPrice("");
    setIsModalOpen(true);
    setIsDirty(false);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* HEADER & FILTER */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 md:pt-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Manajemen Menu
            </h2>
            {/* STATS BAR */}
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Package size={14} className="text-blue-500" /> Total:{" "}
                  <span className="text-white">{stats.total}</span>
                </span>
                <span className="w-px h-4 bg-zinc-800"></span>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <CheckCircle2 size={14} className="text-green-500" /> Aktif:{" "}
                  <span className="text-white">{stats.active}</span>
                </span>
                <span className="w-px h-4 bg-zinc-800"></span>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Star size={14} className="text-yellow-500" /> Promo:{" "}
                  <span className="text-white">{stats.promo}</span>
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={openNew}
            size="sm"
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
          >
            <Plus size={16} className="mr-1" /> Menu Baru
          </Button>
        </div>

        {/* TABS KATEGORI */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${selectedCategory === "all" ? "bg-white text-black border-white shadow-md" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"}`}
          >
            Semua Menu
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id.toString())}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${selectedCategory === c.id.toString() ? "bg-white text-black border-white shadow-md" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* SEARCH BAR (With Clear) */}
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
          <Input
            placeholder="Cari menu (Sate, Nasi...)"
            className="pl-9 pr-8 bg-zinc-900 border-zinc-800 rounded-xl h-10 text-sm focus:ring-orange-500 focus:border-orange-500 placeholder:text-zinc-600"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* RENDER LOGIC (FIXED GHOSTING) */}
      <div className="min-h-[40vh]">
        {" "}
        {/* Wrapper agar layout stabil */}
        {showSkeleton ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 bg-zinc-900 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : showGrid ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item, index) => (
              <MenuGridItem
                key={item.id}
                item={item}
                index={index}
                onToggle={handleToggle}
                onEdit={openEdit}
                onDuplicate={handleDuplicate}
                onDelete={confirmDelete}
              />
            ))}
          </div>
        ) : showEmpty ? (
          // EMPTY STATE (STABIL)
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-zinc-900 p-6 rounded-full border border-zinc-800 mb-4 shadow-2xl">
              <FilterX size={48} className="text-zinc-700" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Menu tidak ditemukan
            </h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-xs">
              Tidak ada menu untuk kategori atau pencarian ini.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Reset Filter
            </Button>
          </div>
        ) : null}
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      <Dialog open={isModalOpen} onOpenChange={attemptCloseModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-[95%] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl gap-0 shadow-2xl shadow-black/80">
          <DialogHeader className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0 flex flex-row items-center justify-between">
            <DialogTitle>
              {editingItem ? "Edit Menu" : "Tambah Menu Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Upload Section */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <div className="relative w-full aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 group flex items-center justify-center shadow-inner">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2 text-zinc-500">
                      <Loader2 className="animate-spin" />{" "}
                      <span className="text-xs">Uploading...</span>
                    </div>
                  ) : formData.image_url ? (
                    <>
                      <Image
                        src={formData.image_url}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => {
                          setFormData({ ...formData, image_url: "" });
                          setIsDirty(true);
                        }}
                        className="absolute top-2 right-2 bg-red-600/80 p-2 rounded-full text-white hover:bg-red-600 transition-transform shadow-lg"
                      >
                        <XCircle size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                      <ImageOff size={32} />
                      <span className="text-xs">Preview</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full border-zinc-700 hover:bg-zinc-800 hover:text-white border-dashed"
                >
                  <Upload size={16} className="mr-2" />{" "}
                  {formData.image_url ? "Ganti Gambar" : "Upload Gambar"}
                </Button>
                <p className="text-[10px] text-zinc-500 text-center">
                  Max 2MB. Format PNG, JPG, WEBP.
                </p>
              </div>

              {/* Form Section */}
              <div className="md:col-span-3 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium">
                      Nama Menu <span className="text-red-500">*</span>
                    </label>
                    <Input
                      ref={nameInputRef}
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        setIsDirty(true);
                      }}
                      className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
                      placeholder="Contoh: Sate Ayam"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium">
                      Harga <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={displayPrice}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 font-bold text-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) => {
                      setFormData({ ...formData, category_id: v });
                      setIsDirty(true);
                    }}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">
                    Deskripsi
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      setIsDirty(true);
                    }}
                    className="bg-zinc-900 border-zinc-800 h-20 resize-none focus:ring-orange-500"
                    placeholder="Jelaskan menu ini secara singkat..."
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <label className="text-xs text-zinc-400 flex items-center gap-2 font-medium">
                    <Tag size={12} /> Atur Tampilan di Home (Tags)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HOME_SECTIONS.map((tag) => {
                      const isActive = formData.tags.includes(tag.value);
                      return (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => toggleTagInForm(tag.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isActive ? `${tag.color} border-transparent` : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"}`}
                        >
                          <tag.icon size={12} /> {tag.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 items-start mt-2 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl">
                    <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-blue-300 leading-tight">
                      <p className="mb-1 font-semibold">Tips Tag:</p>
                      <p>
                        • Pilih <b>Pedas</b> agar muncul di "Yang Pedas-Pedas".
                      </p>
                      <p>
                        • Pilih <b>Berat</b> agar muncul di "Nasi & Berat".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex-row justify-end gap-2 shrink-0">
            <Button
              variant="ghost"
              onClick={attemptCloseModal}
              disabled={isSubmitting}
              className="hover:bg-zinc-800 hover:text-white"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 shadow-lg shadow-orange-900/20"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <Save size={18} className="mr-2" />
              )}{" "}
              {editingItem ? "Update Menu" : "Simpan Menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CONFIRMATION DIALOGS --- */}
      <Dialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[320px] rounded-2xl shadow-2xl p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-1">
              <AlertCircle size={24} />
            </div>
            <DialogTitle className="text-lg">
              Perubahan Belum Disimpan
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Jika kamu menutup sekarang, perubahan yang baru dibuat akan
              hilang. Yakin?
            </DialogDescription>
            <div className="flex gap-2 w-full mt-2">
              <Button
                variant="outline"
                onClick={() => setIsExitAlertOpen(false)}
                className="flex-1 border-zinc-700 bg-transparent hover:bg-zinc-800"
              >
                Lanjut Edit
              </Button>
              <Button
                variant="destructive"
                onClick={confirmClose}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Buang
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="mx-auto bg-red-500/10 p-3 rounded-full w-fit mb-2">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <DialogTitle className="text-center">Hapus Permanen?</DialogTitle>
            <DialogDescription className="text-center text-zinc-400">
              Data yang dihapus tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="flex-1 bg-transparent border-zinc-700 hover:bg-zinc-800"
            >
              Batal
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Ya, Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
