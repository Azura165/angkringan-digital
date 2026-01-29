"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Form & Upload State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayPrice, setDisplayPrice] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    category_id: "1",
    tags: "",
  });

  // 1. FETCH DATA
  const fetchMenu = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("id", { ascending: false });

    if (data) setItems(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // 2. FILTERING
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        item.category_id.toString() === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // 3. SMART TOGGLE
  const handleToggle = async (
    id: number,
    field: "is_available" | "is_recommended",
  ) => {
    const oldItems = [...items];
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: !i[field] } : i)),
    );

    if (navigator.vibrate) navigator.vibrate(10);

    const target = items.find((i) => i.id === id);
    if (!target) return;

    const { error } = await supabase
      .from("menu_items")
      .update({ [field]: !target[field] })
      .eq("id", id);

    if (error) {
      setItems(oldItems);
      toast.error("Gagal update koneksi buruk.");
    }
  };

  // 4. DUPLICATE & DELETE
  const handleDuplicate = (item: MenuItem) => {
    setFormData({
      name: `${item.name} (Copy)`,
      description: item.description || "",
      price: item.price,
      image_url: item.image_url || "",
      category_id: item.category_id.toString(),
      tags: item.tags ? item.tags.join(", ") : "",
    });
    setDisplayPrice(item.price.toLocaleString("id-ID"));
    setEditingItem(null);
    setIsModalOpen(true);
    toast.info("Menu diduplikasi, silakan edit.");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus menu ini?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Terhapus.");
    }
  };

  const handlePriceChange = (val: string) => {
    const numberVal = parseInt(val.replace(/\D/g, "")) || 0;
    setFormData({ ...formData, price: numberVal });
    setDisplayPrice(numberVal.toLocaleString("id-ID"));
  };

  // UPLOAD
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 2MB!");
      return;
    }

    setIsUploading(true);
    toast.loading("Mengupload...", { id: "upload-toast" });

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("menu_images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("menu_images")
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: urlData.publicUrl });
      toast.success("Berhasil!", { id: "upload-toast" });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal upload.", { id: "upload-toast" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // SUBMIT
  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Nama dan Harga wajib diisi.");
      return;
    }
    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: formData.price,
      image_url: formData.image_url.trim(),
      category_id: parseInt(formData.category_id),
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t),
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
      if (editingItem) {
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? (data as MenuItem) : i)),
        );
      } else {
        setItems((prev) => [data as MenuItem, ...prev]);
      }
      toast.success("Berhasil disimpan!");
      setIsModalOpen(false);
      resetForm();
    }
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      image_url: item.image_url || "",
      category_id: item.category_id.toString(),
      tags: item.tags ? item.tags.join(", ") : "",
    });
    setDisplayPrice(item.price.toLocaleString("id-ID"));
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      image_url: "",
      category_id: "1",
      tags: "",
    });
    setDisplayPrice("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* HEADER STICKY */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 md:pt-0">
        <div className="flex flex-row justify-between items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Manajemen Menu</h2>
            <p className="text-zinc-500 text-xs hidden md:block">
              Atur produk yang tampil di aplikasi.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            size="sm"
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg"
          >
            <Plus size={16} className="mr-1" /> Baru
          </Button>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCategory === "all"
                ? "bg-white text-black border-white"
                : "bg-zinc-900 text-zinc-400 border-zinc-800"
            }`}
          >
            Semua
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id.toString())}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === c.id.toString()
                  ? "bg-white text-black border-white"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
          <Input
            placeholder="Cari nama menu..."
            className="pl-9 bg-zinc-900 border-zinc-800 rounded-xl h-10 text-sm focus:ring-orange-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* MENU GRID (MOBILE: COMPACT LIST | DESKTOP: GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 md:h-64 bg-zinc-900 rounded-2xl animate-pulse"
            />
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-zinc-900 border transition-all rounded-2xl overflow-hidden flex flex-row md:flex-col ${
                !item.is_available
                  ? "border-red-500/30 bg-red-900/5"
                  : "border-white/5 hover:border-zinc-700"
              }`}
            >
              {/* IMAGE SECTION */}
              <div className="relative w-28 md:w-full md:h-48 bg-zinc-800 shrink-0 flex items-center justify-center">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className={`object-cover transition-opacity ${
                      !item.is_available ? "grayscale opacity-50" : ""
                    }`}
                    onError={(e: any) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}

                {/* Fallback Icon */}
                <div
                  className={`absolute inset-0 flex items-center justify-center text-zinc-600 ${item.image_url ? "hidden" : "flex"}`}
                >
                  <ImageOff size={24} />
                </div>

                {/* Badge Category (Desktop) */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-white font-bold hidden md:block">
                  {CATEGORIES.find((c) => c.id === item.category_id)?.name}
                </div>

                {/* Badge Habis (Overlay) */}
                {!item.is_available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                      HABIS
                    </span>
                  </div>
                )}
              </div>

              {/* CONTENT SECTION */}
              <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white text-sm line-clamp-1">
                      {item.name}
                    </h3>
                    {item.is_recommended && (
                      <Star
                        size={12}
                        className="text-yellow-500 fill-yellow-500 shrink-0 mt-1"
                      />
                    )}
                  </div>
                  <p className="text-zinc-500 text-[10px] line-clamp-2 md:line-clamp-2">
                    {item.description}
                  </p>
                  <span className="font-black text-orange-500 text-sm mt-1">
                    Rp {item.price.toLocaleString("id-ID")}
                  </span>
                </div>

                {/* ACTIONS BAR (Compact) */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 gap-2">
                  {/* Toggle Stok */}
                  <div
                    className="flex items-center gap-2"
                    title="Stok Habis/Ada"
                  >
                    <Switch
                      checked={item.is_available}
                      onCheckedChange={() =>
                        handleToggle(item.id, "is_available")
                      }
                      className="h-4 w-7 data-[state=checked]:bg-green-500"
                    />
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex gap-1">
                    {/* Mobile: Dropdown Menu untuk hemat tempat */}
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-zinc-900 border-zinc-800 text-white"
                        >
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Edit3 size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(item)}
                          >
                            <CopyIcon size={14} className="mr-2" /> Duplikat
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggle(item.id, "is_recommended")
                            }
                          >
                            <Star size={14} className="mr-2" />{" "}
                            {item.is_recommended ? "Unset" : "Set"} Home
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-500 focus:text-red-500"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={14} className="mr-2" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Desktop: Tombol Biasa */}
                    <div className="hidden md:flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-white"
                        onClick={() => handleDuplicate(item)}
                        title="Duplikat"
                      >
                        <CopyIcon size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-white"
                        onClick={() => openEdit(item)}
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:bg-red-900/20"
                        onClick={() => handleDelete(item.id)}
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-zinc-500 text-xs flex flex-col items-center">
            <Search size={32} className="mb-2 opacity-20" />
            <p>Tidak ada menu yang cocok.</p>
          </div>
        )}
      </div>

      {/* MODAL FORM (RESPONSIVE & SCROLLABLE) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white w-[95%] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
            <DialogTitle className="text-lg">
              {editingItem ? `Edit: ${editingItem.name}` : "Tambah Menu Baru"}
            </DialogTitle>
          </DialogHeader>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* --- KOLOM KIRI: UPLOAD --- */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <div className="relative w-full aspect-video md:aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 group flex items-center justify-center">
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
                        onError={(e: any) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextSibling.style.display = "flex";
                        }}
                      />
                      <div className="absolute inset-0 hidden items-center justify-center text-zinc-600 bg-zinc-900 z-0">
                        <ImageOff size={32} />
                      </div>
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <XCircle size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                      <ImageOff size={32} />
                      <span className="text-xs">Preview Gambar</span>
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
                  {formData.image_url ? "Ganti" : "Upload"}
                </Button>
              </div>

              {/* --- KOLOM KANAN: FORM --- */}
              <div className="md:col-span-3 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium">
                      Nama Menu <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
                      placeholder="Sate Ayam"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium">
                      Harga <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={displayPrice}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="Rp 0"
                      className="bg-zinc-900 border-zinc-800 font-bold text-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">
                    Kategori
                  </label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) =>
                      setFormData({ ...formData, category_id: v })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    maxLength={100}
                    className="bg-zinc-900 border-zinc-800 h-20 resize-none focus:ring-orange-500"
                    placeholder="Keterangan singkat..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium flex items-center gap-2">
                    <Tag size={12} /> Tags (Pisahkan koma)
                  </label>
                  <Input
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="Pedas, Promo"
                    className="bg-zinc-900 border-zinc-800 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER (FIXED BOTTOM) */}
          <DialogFooter className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex-row justify-end gap-2 shrink-0">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="hover:bg-zinc-800 hover:text-white"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <Save size={18} className="mr-2" />
              )}{" "}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
