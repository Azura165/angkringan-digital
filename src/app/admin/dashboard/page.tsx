"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { MENU_ITEMS } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  TrendingUp,
  Users,
  ShoppingBag,
  Edit,
  PlusCircle,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminDashboard() {
  // Fungsi Dummy buat Edit/Hapus (Visual Only)
  const handleEdit = () => {
    toast.info("Fitur Edit butuh Database Backend 🚧", {
      description: "Saat ini data masih hardcoded di code.",
    });
  };

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <main className="w-full max-w-md bg-zinc-950 min-h-screen relative shadow-2xl overflow-y-auto pb-10">
        {/* Header Admin */}
        <div className="bg-zinc-900 border-b border-white/5 p-5 sticky top-0 z-10 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard Owner</h1>
            <p className="text-xs text-zinc-500">Selamat datang, Mas Radit!</p>
          </div>
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-zinc-400">
              <ChevronLeft />
            </Button>
          </Link>
        </div>

        <div className="p-5 space-y-6">
          {/* 1. KARTU STATISTIK (Dummy Data) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-4 rounded-2xl text-white shadow-lg">
              <div className="flex items-center gap-2 mb-1 opacity-80">
                <TrendingUp size={16} />{" "}
                <span className="text-xs font-bold">Omset Hari Ini</span>
              </div>
              <p className="text-2xl font-extrabold">Rp 450.000</p>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-1 text-zinc-400">
                <ShoppingBag size={16} />{" "}
                <span className="text-xs font-bold">Total Pesanan</span>
              </div>
              <p className="text-2xl font-extrabold">
                128{" "}
                <span className="text-xs font-normal text-zinc-500">Order</span>
              </p>
            </div>
          </div>

          {/* 2. MANAJEMEN MENU */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Daftar Menu</h2>
              <Button
                size="sm"
                className="bg-white text-black hover:bg-zinc-200 text-xs font-bold h-8 gap-1"
              >
                <PlusCircle size={14} /> Tambah
              </Button>
            </div>

            <div className="space-y-3">
              {MENU_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 bg-zinc-900/50 p-3 rounded-xl border border-white/5 items-center"
                >
                  <div className="h-12 w-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                    <img
                      src={item.image}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white text-sm font-bold">
                      {item.name}
                    </h3>
                    <p className="text-orange-500 text-xs font-medium">
                      Rp {item.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={handleEdit}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      onClick={handleEdit}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-900/50 text-red-500 hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
