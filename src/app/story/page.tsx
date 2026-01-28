"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import {
  MapPin,
  Instagram,
  Phone,
  Clock,
  Flag,
  Smile,
  Utensils,
  ArrowRight,
  Share2,
  Quote,
  Copy,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// --- TIPE DATA ---
interface Milestone {
  id: number;
  label: string;
  value: string;
  icon: string;
}

interface GalleryItem {
  id: number;
  image_url: string;
  caption: string;
}

interface StoreData {
  history_title: string;
  history_description: string;
  history_image_url: string;
  address: string;
  map_embed_url: string;
  instagram_url: string;
  whatsapp_number: string;
  name?: string;
}

// Helper Icon Map
const IconMap = ({
  name,
  size = 20,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) => {
  switch (name) {
    case "Flag":
      return <Flag size={size} className={className} />;
    case "Smile":
      return <Smile size={size} className={className} />;
    case "Utensils":
      return <Utensils size={size} className={className} />;
    default:
      return <Clock size={size} className={className} />;
  }
};

export default function HistoryPage() {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false); // Fitur Copy Address

  // FETCH DATA
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [configRes, milestoneRes, galleryRes] = await Promise.all([
          supabase.from("store_config").select("*").single(),
          supabase
            .from("milestones")
            .select("*")
            .order("id", { ascending: true }),
          supabase.from("gallery").select("*").limit(6),
        ]);

        if (configRes.data) setStoreData(configRes.data);
        if (milestoneRes.data) setMilestones(milestoneRes.data);
        if (galleryRes.data) setGallery(galleryRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data. Cek koneksi ya!");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // FITUR: Copy Address
  const handleCopyAddress = useCallback(() => {
    if (storeData?.address) {
      navigator.clipboard.writeText(storeData.address);
      setIsCopied(true);
      toast.success("Alamat disalin! 📋");
      setTimeout(() => setIsCopied(false), 2000);
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }, [storeData]);

  return (
    <MobileLayout>
      {/* 1. HERO SECTION (Clean Layout) */}
      <div className="relative h-[300px] w-full bg-zinc-900">
        {isLoading ? (
          <Skeleton className="w-full h-full bg-zinc-800" />
        ) : (
          <Image
            src={
              storeData?.history_image_url ||
              "https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=800&auto=format&fit=crop"
            }
            alt="Angkringan Story"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 800px"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

        <div className="absolute bottom-0 left-0 p-6 w-full z-10">
          <span className="inline-block px-3 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-3 animate-in fade-in slide-in-from-left-4 duration-700">
            Our Journey
          </span>
          <h1 className="text-3xl font-black text-white leading-tight mb-2 drop-shadow-xl animate-in slide-in-from-bottom-4 duration-700 delay-100">
            {storeData?.history_title || "Cerita Rasa"}
          </h1>
        </div>
      </div>

      <div className="px-6 py-8 space-y-12 bg-zinc-950 min-h-screen">
        {/* 2. STATS GRID (Bento Style - FIX OVERLAP) */}
        {/* Tidak ada margin negatif, layout grid murni */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-24 w-full rounded-2xl bg-zinc-900"
                  />
                ))
              : milestones.map((m) => (
                  <div
                    key={m.id}
                    className="bg-zinc-900 border border-white/5 p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1 hover:border-orange-500/30 transition-all group"
                  >
                    <div className="text-orange-500 bg-orange-500/10 p-2 rounded-full mb-1 group-hover:scale-110 transition-transform">
                      <IconMap name={m.icon} size={18} />
                    </div>
                    <span className="text-lg font-black text-white leading-none">
                      {m.value}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">
                      {m.label}
                    </span>
                  </div>
                ))}
          </div>
        </section>

        {/* 3. STORY CONTENT (Typography Focus) */}
        <section className="space-y-6">
          <div className="flex items-start gap-4">
            <Quote className="text-orange-500 shrink-0 rotate-180" size={24} />
            <div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-zinc-900" />
                  <Skeleton className="h-4 w-5/6 bg-zinc-900" />
                  <Skeleton className="h-4 w-4/6 bg-zinc-900" />
                </div>
              ) : (
                <p className="text-zinc-300 text-sm leading-7 font-light text-justify whitespace-pre-line">
                  {storeData?.history_description ||
                    "Cerita belum ditambahkan oleh admin."}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 4. GALLERY GRID (Masonry Feel) */}
        <section>
          <div className="flex items-center justify-between mb-4 border-l-2 border-orange-500 pl-3">
            <h3 className="text-white font-bold text-lg">Momen Terbaik 📸</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl bg-zinc-900" />
                ))
              : gallery.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`relative rounded-xl overflow-hidden group bg-zinc-900 border border-white/5 ${idx % 3 === 0 ? "col-span-2 h-48" : "h-36"}`}
                  >
                    <Image
                      src={item.image_url}
                      alt="Gallery"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                      sizes="(max-width: 768px) 100vw, 500px"
                      loading="lazy"
                    />
                  </div>
                ))}
          </div>
        </section>

        {/* 5. LOCATION (Interactive & Copyable) */}
        <section className="space-y-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <MapPin className="text-orange-500" /> Lokasi Kami
          </h3>

          {/* Address Card */}
          <div
            onClick={handleCopyAddress}
            className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl border border-white/5 cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                Alamat Lengkap
              </span>
              <p className="text-sm text-zinc-300 font-medium line-clamp-1">
                {storeData?.address || "Loading..."}
              </p>
            </div>
            <div className="text-zinc-500">
              {isCopied ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <Copy size={18} />
              )}
            </div>
          </div>

          {/* Map Embed (Lazy Load via Iframe) */}
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-56 bg-zinc-900 relative group">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <iframe
                src={storeData?.map_embed_url}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
              />
            )}
            {/* Overlay Button */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeData?.address || "")}`}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-3 right-3 bg-white text-black px-4 py-2 rounded-full text-[10px] font-bold shadow-lg hover:bg-orange-500 hover:text-white transition-colors flex items-center gap-2 z-10"
            >
              Buka di Google Maps <ArrowRight size={12} />
            </a>
          </div>
        </section>

        {/* 6. FOOTER CONNECT */}
        <div className="pt-8 border-t border-white/5 text-center space-y-6">
          <h3 className="text-2xl font-black text-white tracking-tighter">
            Angkringan<span className="text-orange-500">Digital.</span>
          </h3>

          <div className="flex justify-center gap-4">
            <a
              href={storeData?.instagram_url}
              target="_blank"
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-pink-500 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all"
            >
              <Instagram size={20} />
            </a>
            <a
              href={`https://wa.me/${storeData?.whatsapp_number}`}
              target="_blank"
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-green-500 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
            >
              <Phone size={20} />
            </a>
            <button
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"
              onClick={() => {
                if (navigator.share)
                  navigator.share({
                    title: "Angkringan Mas Radit",
                    url: window.location.href,
                  });
              }}
            >
              <Share2 size={20} />
            </button>
          </div>

          <p className="text-[10px] text-zinc-600 pb-10">
            © {new Date().getFullYear()}{" "}
            {storeData?.name || "Angkringan Digital"}.<br />
            Created with ❤️ for UMKM Indonesia.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}
