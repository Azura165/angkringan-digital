"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulasi Cek Password Sederhana
    setTimeout(() => {
      if (pin === "1234") {
        toast.success("Login Berhasil! 🔓");
        router.push("/admin/dashboard");
      } else {
        toast.error("PIN Salah! 🚫");
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 animate-in zoom-in duration-500">
        {/* Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-zinc-900 p-4 rounded-full border border-white/10 mb-4">
            <UtensilsCrossed size={40} className="text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Area 🛠️</h1>
          <p className="text-zinc-500 text-sm">
            Masukan PIN rahasia untuk masuk.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              size={18}
            />
            <Input
              type="password"
              placeholder="Masukan PIN (1234)"
              className="pl-10 bg-zinc-900 border-zinc-800 text-white h-12 text-center text-lg tracking-widest"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold"
            disabled={loading}
          >
            {loading ? "Memproses..." : "Masuk Dashboard"}
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-700">
          &copy; Angkringan Mas Radit System
        </p>
      </div>
    </div>
  );
}
