"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { STORY_CONTENT } from "@/lib/data";
import { MapPin, Instagram, Phone } from "lucide-react";

export default function StoryPage() {
  const { title, subtitle, description, stats, gallery } = STORY_CONTENT;

  return (
    <MobileLayout>
      {/* Header Image */}
      <div className="relative h-[350px] w-full">
        <img
          src={gallery[0]}
          className="w-full h-full object-cover"
          alt="Angkringan Story"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

        <div className="absolute bottom-0 left-0 p-6">
          <span className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-2 block">
            Our Story
          </span>
          <h1 className="text-4xl font-extrabold text-white leading-none">
            {title}
          </h1>
        </div>
      </div>

      {/* Konten Text */}
      <div className="px-6 py-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-white mb-3">{subtitle}</h2>
          <p className="text-zinc-400 text-sm leading-relaxed text-justify">
            {description}
          </p>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-3 gap-4 border-y border-white/5 py-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <span className="block text-2xl font-bold text-white">
                {stat.value}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-lg">
            Suasana Angkringan 📸
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Trik duplicate gambar biar kelihatan banyak gallery-nya */}
            <div className="h-40 rounded-2xl overflow-hidden bg-zinc-800">
              <img src={gallery[1]} className="w-full h-full object-cover" />
            </div>
            <div className="h-40 rounded-2xl overflow-hidden bg-zinc-800">
              <img src={gallery[0]} className="w-full h-full object-cover" />
            </div>
            <div className="col-span-2 h-48 rounded-2xl overflow-hidden bg-zinc-800 relative group">
              <img
                src="https://asset.kompas.com/crops/Oqe7u9QUkCgmeN5eO6WUbd3GDYk=/0x0:1000x667/750x500/data/photo/2020/10/23/5f92bf44d1872.jpg"
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-black/50 backdrop-blur-md text-white px-4 py-1 rounded-full text-xs border border-white/10">
                  📍 Cileungsi, Bogor
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-zinc-900 rounded-2xl p-5 space-y-4 border border-white/5">
          <h3 className="text-white font-bold">Kunjungi Kami</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <div className="flex items-center gap-3">
              <MapPin className="text-orange-500" size={18} />
              <span>Jl. Alternatif Cibubur No. 12</span>
            </div>
            <div className="flex items-center gap-3">
              <Instagram className="text-pink-500" size={18} />
              <span>@angkringan_masradit</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="text-green-500" size={18} />
              <span>0812-3456-7890</span>
            </div>
          </div>
        </div>

        <div className="h-20 text-center text-zinc-600 text-xs pt-10">
          &copy; 2026 Angkringan Mas Radit.
        </div>
      </div>
    </MobileLayout>
  );
}
