"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Save,
  Upload,
  Link as LinkIcon,
  Lock,
  Store,
  MapPin,
  Clock,
  Image as ImageIcon,
  History as HistoryIcon,
  Loader2,
  Smartphone,
  Globe,
  RefreshCw,
  Power,
  Eye,
  EyeOff,
  LogOut,
  ExternalLink,
  Info,
  Camera,
  LayoutTemplate,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

// --- TYPES ---
interface ConfigData {
  id?: number;
  store_name: string;
  address: string;
  whatsapp_number: string;
  instagram_url: string;
  map_embed_url: string;
  open_hour: string;
  close_hour: string;
  is_force_closed: boolean;
  running_text: string;
  hero_image_url: string;
  hero_image_url_2: string;
  hero_image_url_3: string;
  history_image_url: string;
  history_title: string;
  history_description: string;
  gallery_image_url_1: string;
  gallery_image_url_2: string;
  gallery_image_url_3: string;
}

// DEFAULT VALUES (Fallback agar tidak error/kosong)
const DEFAULT_CONFIG: ConfigData = {
  store_name: "Angkringan Mas Radit",
  address: "",
  whatsapp_number: "",
  instagram_url: "",
  map_embed_url: "",
  open_hour: "17:00",
  close_hour: "23:59",
  is_force_closed: false,
  running_text: "Selamat Datang!",
  hero_image_url:
    "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=800",
  hero_image_url_2:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800",
  hero_image_url_3:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800",
  history_image_url:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800",
  history_title: "Perjalanan Rasa",
  history_description: "Dimulai dari gerobak kecil...",
  gallery_image_url_1:
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=400",
  gallery_image_url_2:
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=400",
  gallery_image_url_3:
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=400",
};

// --- COMPONENT: IMAGE UPLOADER ---
const ImageInput = memo(
  ({
    label,
    value,
    onChange,
    bucketPath,
    size = "large",
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    bucketPath: string;
    size?: "small" | "large";
  }) => {
    const [mode, setMode] = useState<"url" | "upload">("url");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsUploading(true);
      const file = e.target.files[0];
      const fileName = `${bucketPath}-${Date.now()}.${file.name.split(".").pop()}`;
      try {
        const { error } = await supabase.storage
          .from("store-assets")
          .upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage
          .from("store-assets")
          .getPublicUrl(fileName);
        onChange(data.publicUrl);
        toast.success("Gambar terupload!");
      } catch (error: any) {
        toast.error("Upload gagal: " + error.message);
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl group hover:border-zinc-700 transition-all">
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            {size === "large" ? (
              <ImageIcon size={14} />
            ) : (
              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
            )}{" "}
            {label}
          </label>
          <div className="flex bg-black/50 p-1 rounded-lg border border-zinc-800 gap-1">
            <button
              onClick={() => setMode("url")}
              className={`px-2 py-1 text-[9px] font-bold rounded ${mode === "url" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
            >
              Link
            </button>
            <button
              onClick={() => setMode("upload")}
              className={`px-2 py-1 text-[9px] font-bold rounded ${mode === "upload" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
            >
              Upload
            </button>
          </div>
        </div>
        <div className="flex gap-4 items-start">
          <div
            className={`relative ${size === "large" ? "w-24 h-24" : "w-16 h-16"} bg-black rounded-xl border border-zinc-700 overflow-hidden shrink-0`}
          >
            {value ? (
              <Image
                src={value}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[9px] text-zinc-600">
                No Img
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 pt-1">
            {mode === "url" ? (
              <div className="relative">
                <LinkIcon
                  size={12}
                  className="absolute left-3 top-2.5 text-zinc-500"
                />
                <Input
                  value={value || ""}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="https://..."
                  className="pl-8 h-9 text-xs bg-zinc-950 border-zinc-800"
                />
                {value && (
                  <a
                    href={value}
                    target="_blank"
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  variant="outline"
                  className="h-9 w-full text-xs justify-start px-3 bg-zinc-950 border-zinc-800 text-zinc-400"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin mr-2 h-3 w-3" />
                  ) : (
                    <Upload className="mr-2 h-3 w-3" />
                  )}{" "}
                  {isUploading ? "Mengupload..." : "Pilih File"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
ImageInput.displayName = "ImageInput";

// --- MAIN PAGE ---
export default function AdminSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigData>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [isPassLoading, setIsPassLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // FETCH DATA
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("store_config")
          .select("*")
          .single();
        if (data) {
          // Merge dengan default agar tidak ada field kosong
          setConfig({ ...DEFAULT_CONFIG, ...data });
        } else if (!data && !error) {
          // Create jika belum ada
          const { data: newData } = await supabase
            .from("store_config")
            .insert([DEFAULT_CONFIG])
            .select()
            .single();
          if (newData) setConfig(newData);
        }
      } catch (err) {
        toast.error("Gagal memuat data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Handler Change
  const handleChange = useCallback((field: keyof ConfigData, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  // --- SAVE PER SECTION (OPTIMIZED) ---
  const saveSection = async (sectionFields: Partial<ConfigData>) => {
    if (!config.id) {
      toast.error("ID tidak ditemukan, refresh halaman.");
      return;
    }
    setIsSaving(true);
    try {
      // Hanya kirim field yang relevan + ID untuk where clause
      const { error } = await supabase
        .from("store_config")
        .update(sectionFields)
        .eq("id", config.id);
      if (error) throw error;

      toast.success("Perubahan disimpan! 🎉");
      sessionStorage.clear(); // Clear cache
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(`Gagal simpan: ${error.message || "Cek koneksi"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper Save Wrappers
  const saveIdentity = () => {
    let cleanWA = config.whatsapp_number;
    if (cleanWA.startsWith("0")) cleanWA = "62" + cleanWA.substring(1);
    if (cleanWA.startsWith("8")) cleanWA = "62" + cleanWA;
    saveSection({
      store_name: config.store_name,
      whatsapp_number: cleanWA,
      instagram_url: config.instagram_url,
      address: config.address,
      map_embed_url: config.map_embed_url,
    });
  };

  const saveOperational = () =>
    saveSection({
      open_hour: config.open_hour,
      close_hour: config.close_hour,
      is_force_closed: config.is_force_closed,
      running_text: config.running_text,
    });

  const saveVisual = () =>
    saveSection({
      hero_image_url: config.hero_image_url,
      hero_image_url_2: config.hero_image_url_2,
      hero_image_url_3: config.hero_image_url_3,
      history_image_url: config.history_image_url,
      history_title: config.history_title,
      history_description: config.history_description,
      gallery_image_url_1: config.gallery_image_url_1,
      gallery_image_url_2: config.gallery_image_url_2,
      gallery_image_url_3: config.gallery_image_url_3,
    });

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Min 6 karakter");
      return;
    }
    setIsPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      toast.success("Password Diubah! 🔒");
      setNewPassword("");
    } else {
      toast.error(error.message);
    }
    setIsPassLoading(false);
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    localStorage.removeItem("store_config_cache_v2");
    window.location.reload();
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );

  return (
    <div className="space-y-8 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 py-4 px-4 -mx-4 flex justify-between items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <RefreshCw size={24} className="text-orange-500" /> Pengaturan
          </h1>
          <p className="text-xs text-zinc-400">Kontrol penuh aplikasi.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          className="border-zinc-800 text-zinc-400 hover:text-white"
        >
          <RefreshCw size={14} className="mr-2" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl w-full flex overflow-x-auto scrollbar-hide h-auto gap-1 mb-6">
          <TabsTrigger
            value="identity"
            className="flex-1 py-2.5 text-xs font-medium data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-lg"
          >
            <Store size={14} className="mr-2" /> Identitas
          </TabsTrigger>
          <TabsTrigger
            value="operational"
            className="flex-1 py-2.5 text-xs font-medium data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-lg"
          >
            <Clock size={14} className="mr-2" /> Toko
          </TabsTrigger>
          <TabsTrigger
            value="visual"
            className="flex-1 py-2.5 text-xs font-medium data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-lg"
          >
            <ImageIcon size={14} className="mr-2" /> Visual
          </TabsTrigger>
          <TabsTrigger
            value="account"
            className="flex-1 py-2.5 text-xs font-medium data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-lg"
          >
            <Lock size={14} className="mr-2" /> Akun
          </TabsTrigger>
        </TabsList>

        {/* --- IDENTITAS --- */}
        <TabsContent value="identity" className="space-y-6">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 flex gap-2">
                  <Store size={14} /> Nama Toko
                </label>
                <Input
                  value={config.store_name}
                  onChange={(e) => handleChange("store_name", e.target.value)}
                  className="bg-zinc-950 border-zinc-800 h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 flex gap-2">
                  <Smartphone size={14} /> WhatsApp
                </label>
                <Input
                  value={config.whatsapp_number}
                  onChange={(e) =>
                    handleChange("whatsapp_number", e.target.value)
                  }
                  className="bg-zinc-950 border-zinc-800 h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 flex gap-2">
                  <Globe size={14} /> Instagram
                </label>
                <Input
                  value={config.instagram_url}
                  onChange={(e) =>
                    handleChange("instagram_url", e.target.value)
                  }
                  className="bg-zinc-950 border-zinc-800 h-11"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-zinc-400 flex gap-2">
                  <MapPin size={14} /> Alamat
                </label>
                <Textarea
                  value={config.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-zinc-400">
                  Maps Embed (src)
                </label>
                <Input
                  value={config.map_embed_url}
                  onChange={(e) =>
                    handleChange("map_embed_url", e.target.value)
                  }
                  className="bg-zinc-950 border-zinc-800 text-[10px] font-mono h-11"
                />
              </div>
            </div>
            <Button
              onClick={saveIdentity}
              disabled={isSaving}
              className="w-full bg-orange-600 hover:bg-orange-500 font-bold h-12"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={18} className="mr-2" />
              )}{" "}
              Simpan Identitas
            </Button>
          </div>
        </TabsContent>

        {/* --- OPERASIONAL --- */}
        <TabsContent value="operational" className="space-y-6">
          <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-6">
            <div
              className={`p-4 rounded-xl border flex justify-between items-center ${config.is_force_closed ? "bg-red-950/30 border-red-500/50" : "bg-black/40 border-zinc-800"}`}
            >
              <div className="flex items-center gap-3">
                <Power
                  size={20}
                  className={
                    config.is_force_closed ? "text-red-500" : "text-zinc-500"
                  }
                />
                <div className="text-sm font-bold text-white">
                  Tutup Paksa Toko (Darurat)
                </div>
              </div>
              <Switch
                checked={config.is_force_closed}
                onCheckedChange={(v) => handleChange("is_force_closed", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Jam Buka</label>
                <Input
                  type="time"
                  value={config.open_hour}
                  onChange={(e) => handleChange("open_hour", e.target.value)}
                  className="bg-zinc-950 border-zinc-800 h-12 text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Jam Tutup</label>
                <Input
                  type="time"
                  value={config.close_hour}
                  onChange={(e) => handleChange("close_hour", e.target.value)}
                  className="bg-zinc-950 border-zinc-800 h-12 text-center text-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Running Text</label>
              <Input
                value={config.running_text}
                onChange={(e) => handleChange("running_text", e.target.value)}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
            <Button
              onClick={saveOperational}
              disabled={isSaving}
              className="w-full bg-orange-600 hover:bg-orange-500 font-bold h-12"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={18} className="mr-2" />
              )}{" "}
              Simpan Toko
            </Button>
          </div>
        </TabsContent>

        {/* --- VISUAL --- */}
        <TabsContent value="visual" className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
              <LayoutTemplate size={18} className="text-orange-500" />
              <h3 className="font-bold text-white">Halaman Home (Hero)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ImageInput
                label="Slide 1"
                value={config.hero_image_url}
                onChange={(v) => handleChange("hero_image_url", v)}
                bucketPath="hero"
                size="small"
              />
              <ImageInput
                label="Slide 2"
                value={config.hero_image_url_2}
                onChange={(v) => handleChange("hero_image_url_2", v)}
                bucketPath="hero"
                size="small"
              />
              <ImageInput
                label="Slide 3"
                value={config.hero_image_url_3}
                onChange={(v) => handleChange("hero_image_url_3", v)}
                bucketPath="hero"
                size="small"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
              <BookOpen size={18} className="text-blue-500" />
              <h3 className="font-bold text-white">Halaman Story (Header)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <ImageInput
                  label="Foto Header"
                  value={config.history_image_url}
                  onChange={(v) => handleChange("history_image_url", v)}
                  bucketPath="history"
                />
              </div>
              <div className="md:col-span-2 space-y-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Judul</label>
                  <Input
                    value={config.history_title}
                    onChange={(e) =>
                      handleChange("history_title", e.target.value)
                    }
                    className="bg-zinc-950 border-zinc-800 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Isi Cerita</label>
                  <Textarea
                    value={config.history_description}
                    onChange={(e) =>
                      handleChange("history_description", e.target.value)
                    }
                    className="bg-zinc-950 border-zinc-800 min-h-[150px]"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
              <Camera size={18} className="text-pink-500" />
              <h3 className="font-bold text-white">Halaman Story (Galeri)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ImageInput
                label="Galeri 1"
                value={config.gallery_image_url_1}
                onChange={(v) => handleChange("gallery_image_url_1", v)}
                bucketPath="gallery"
                size="small"
              />
              <ImageInput
                label="Galeri 2"
                value={config.gallery_image_url_2}
                onChange={(v) => handleChange("gallery_image_url_2", v)}
                bucketPath="gallery"
                size="small"
              />
              <ImageInput
                label="Galeri 3"
                value={config.gallery_image_url_3}
                onChange={(v) => handleChange("gallery_image_url_3", v)}
                bucketPath="gallery"
                size="small"
              />
            </div>
          </div>
          <div className="sticky bottom-24 md:static pt-4">
            <Button
              onClick={saveVisual}
              disabled={isSaving}
              className="w-full bg-orange-600 hover:bg-orange-500 font-bold h-12 shadow-xl"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={18} className="mr-2" />
              )}{" "}
              Simpan Visual
            </Button>
          </div>
        </TabsContent>

        {/* --- AKUN --- */}
        <TabsContent value="account" className="space-y-6">
          <div className="bg-zinc-900/30 border border-red-500/20 p-6 rounded-2xl space-y-5">
            <div className="flex items-center gap-3 mb-2 border-b border-red-500/10 pb-4">
              <Lock size={20} className="text-red-500" />
              <h3 className="font-bold text-white">Ganti Password</h3>
            </div>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                placeholder="Password Baru (Min. 6)"
                className="bg-black border-zinc-800 pr-10 h-12"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3.5 text-zinc-500 hover:text-white"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={!newPassword || isPassLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12"
            >
              {isPassLoading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            variant="outline"
            className="w-full border-zinc-800 bg-transparent text-zinc-400 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50 h-14 rounded-xl"
          >
            <LogOut size={18} className="mr-2" /> Keluar
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
