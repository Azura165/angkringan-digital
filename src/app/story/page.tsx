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
  X,
  Star,
  Maximize2,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// --- TIPE DATA ---
interface StoreData {
  name: string;
  history_title: string;
  history_description: string;
  history_image_url: string;
  address: string;
  map_embed_url: string;
  instagram_url: string;
  whatsapp_number: string;
}

// Cache Key (Kunci Memori)
const CACHE_KEY_STORY = "story_data_cache_v1";

// --- KOMPONEN KECIL ---
const ReviewCard = ({ review }: { review: any }) => (
  <div className="min-w-[240px] bg-zinc-900 border border-white/5 p-4 rounded-xl snap-center flex flex-col justify-between h-32">
    <div>
      <div className="flex gap-1 mb-2">
        {[...Array(review.rating || 5)].map((_, i) => (
          <Star key={i} size={12} className="fill-orange-500 text-orange-500" />
        ))}
      </div>
      <p className="text-zinc-300 text-xs italic line-clamp-3 leading-relaxed">
        "{review.comment}"
      </p>
    </div>
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
      <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
        {review.name ? review.name.charAt(0) : "A"}
      </div>
      <span className="text-[10px] font-bold text-zinc-400 truncate">
        {review.name || "Anonim"}
      </span>
    </div>
  </div>
);

const IconMap = ({ name, size = 20 }: { name: string; size?: number }) => {
  switch (name) {
    case "Flag":
      return <Flag size={size} />;
    case "Smile":
      return <Smile size={size} />;
    case "Utensils":
      return <Utensils size={size} />;
    default:
      return <Star size={size} />;
  }
};

export default function StoryPage() {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UX States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // FETCH DATA DENGAN CACHE
  useEffect(() => {
    async function init() {
      // 1. CEK CACHE DULU (Instant Load)
      const cachedData = sessionStorage.getItem(CACHE_KEY_STORY);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setStoreData(parsed.storeData);
          setMilestones(parsed.milestones);
          setGallery(parsed.gallery);
          setReviews(parsed.reviews);
          setIsLoading(false); // Langsung matikan loading jika cache ada
        } catch (e) {
          console.error("Cache error", e);
        }
      } else {
        // Hanya set loading true jika TIDAK ada cache
        setIsLoading(true);
      }

      try {
        // 2. FETCH DATA BARU (Background Update)
        const [config, mile, gal, rev] = await Promise.all([
          supabase.from("store_config").select("*").single(),
          supabase.from("milestones").select("*").order("id"),
          supabase.from("gallery").select("*").limit(6),
          supabase
            .from("reviews")
            .select("*")
            .gte("rating", 4)
            .limit(5)
            .order("created_at", { ascending: false }),
        ]);

        if (config.data) {
          setStoreData(config.data);
          // SEO JSON-LD
          const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Restaurant",
            name: config.data.name || "Angkringan Digital",
            image: config.data.history_image_url,
            address: config.data.address,
            telephone: config.data.whatsapp_number,
          };
          const script = document.createElement("script");
          script.type = "application/ld+json";
          script.text = JSON.stringify(jsonLd);
          document.head.appendChild(script);
        }
        if (mile.data) setMilestones(mile.data);
        if (gal.data) setGallery(gal.data);
        if (rev.data) setReviews(rev.data);

        // 3. SIMPAN KE CACHE
        const newData = {
          storeData: config.data,
          milestones: mile.data || [],
          gallery: gal.data || [],
          reviews: rev.data || [],
        };
        sessionStorage.setItem(CACHE_KEY_STORY, JSON.stringify(newData));
      } catch (err) {
        console.error("Error fetching story data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const handleCopyAddress = () => {
    if (storeData?.address) {
      navigator.clipboard.writeText(storeData.address);
      setIsCopied(true);
      if (navigator.vibrate) navigator.vibrate(50);
      toast.success("Alamat disalin! 📋");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <MobileLayout>
      {/* HERO SECTION */}
      <div className="relative h-[320px] w-full overflow-hidden bg-zinc-900">
        <div className="absolute inset-0 w-full h-full">
          {isLoading && !storeData ? ( // Hanya show skeleton jika data beneran kosong
            <Skeleton className="w-full h-full bg-zinc-800" />
          ) : (
            <Image
              src={
                storeData?.history_image_url ||
                "https://images.unsplash.com/photo-1555126634-323283e090fa"
              }
              alt="Story Cover"
              fill
              className="object-cover"
              priority={true} // Prioritas Loading
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 p-6 w-full z-10 translate-y-0 transform">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-3 shadow-lg">
            <Flag size={10} fill="currentColor" /> Our Journey
          </span>
          <h1 className="text-4xl font-black text-white leading-none mb-2 drop-shadow-2xl">
            {storeData?.history_title || "Perjalanan Rasa"}
          </h1>
        </div>
      </div>

      <div className="px-5 py-8 space-y-10 bg-zinc-950 min-h-screen relative z-20 rounded-t-[2rem] -mt-6 border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {/* MILESTONES */}
        <section className="grid grid-cols-3 gap-3">
          {isLoading && milestones.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl bg-zinc-900" />
              ))
            : milestones.map((m) => (
                <div
                  key={m.id}
                  className="bg-zinc-900/50 border border-white/5 p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1 hover:bg-zinc-900 transition-colors"
                >
                  <span className="text-orange-500 mb-1">
                    <IconMap name={m.icon} size={20} />
                  </span>
                  <span className="text-lg font-black text-white leading-none">
                    {m.value}
                  </span>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">
                    {m.label}
                  </span>
                </div>
              ))}
        </section>

        {/* STORY TEXT */}
        <section className="relative">
          <Quote
            className="absolute -top-4 -left-2 text-orange-500/20 rotate-180"
            size={48}
          />
          <p className="text-zinc-300 text-sm leading-7 font-light text-justify relative z-10 pl-4 border-l-2 border-orange-500/50">
            {storeData?.history_description || "Loading story..."}
          </p>
        </section>

        {/* GALLERY */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">Galeri 📸</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {isLoading && gallery.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl bg-zinc-900" />
                ))
              : gallery.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedImage(item.image_url)}
                    className={`relative rounded-xl overflow-hidden bg-zinc-900 cursor-pointer group ${idx % 3 === 0 ? "col-span-2 h-48" : "h-36"}`}
                  >
                    <Image
                      src={item.image_url}
                      alt="Gallery"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                      <Maximize2
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
                        size={24}
                      />
                    </div>
                  </div>
                ))}
          </div>
        </section>

        {/* REVIEWS */}
        {reviews.length > 0 && (
          <section className="overflow-hidden">
            <h3 className="text-white font-bold text-sm mb-4 px-1">
              Kata Mereka ❤️
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {reviews.map((r, i) => (
                <ReviewCard key={i} review={r} />
              ))}
            </div>
          </section>
        )}

        {/* LOCATION */}
        <section className="space-y-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <MapPin className="text-orange-500" /> Lokasi
          </h3>

          <div
            onClick={handleCopyAddress}
            className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-white/5 cursor-pointer active:scale-95 transition-all"
          >
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                Alamat
              </span>
              <p className="text-sm text-zinc-300 font-medium truncate">
                {storeData?.address || "..."}
              </p>
            </div>
            <div className="text-zinc-500 bg-zinc-800 p-2 rounded-full">
              {isCopied ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 h-48 bg-zinc-900 relative group">
            {storeData?.map_embed_url && (
              <iframe
                src={storeData.map_embed_url}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                className="grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
              />
            )}
            <a
              href={`http://maps.google.com/?q=${encodeURIComponent(storeData?.address || "")}`}
              target="_blank"
              className="absolute bottom-3 right-3 bg-white text-black px-4 py-2 rounded-full text-[10px] font-bold shadow-xl hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2 z-10"
            >
              Buka Peta <ArrowRight size={12} />
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <div className="pt-6 border-t border-white/5 pb-20">
          <div className="flex justify-center gap-4 mb-6">
            <a
              href={storeData?.instagram_url}
              target="_blank"
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-pink-500 hover:scale-110 transition-transform"
            >
              <Instagram size={22} />
            </a>
            <a
              href={`https://wa.me/${storeData?.whatsapp_number}`}
              target="_blank"
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-green-500 hover:scale-110 transition-transform"
            >
              <Phone size={22} />
            </a>
            <button
              onClick={() =>
                navigator.share?.({
                  title: storeData?.name,
                  url: window.location.href,
                })
              }
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-blue-500 hover:scale-110 transition-transform"
            >
              <Share2 size={22} />
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-600">
            © {new Date().getFullYear()} {storeData?.name}.<br />
            All Rights Reserved.
          </p>
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="bg-black/90 border-none p-0 max-w-none w-screen h-screen flex items-center justify-center outline-none">
          <div className="relative w-full max-w-md aspect-square">
            {selectedImage && (
              <Image
                src={selectedImage}
                alt="Full"
                fill
                className="object-contain"
              />
            )}
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 text-white bg-white/10 p-2 rounded-full backdrop-blur-md"
          >
            <X size={24} />
          </button>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
