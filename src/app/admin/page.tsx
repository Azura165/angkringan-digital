"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Cek Database
      const { data, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .eq("password", password) // Cek password (sebaiknya di-hash nanti)
        .single();

      if (error || !data) {
        toast.error("Login Gagal!", {
          description: "Username atau password salah.",
        });
        setIsLoading(false);
        return;
      }

      // 2. Login Sukses -> Simpan Sesi Sederhana
      // Kita simpan "token rahasia" di localStorage biar browser ingat admin sudah login
      localStorage.setItem(
        "admin_session",
        JSON.stringify({
          id: data.id,
          username: data.username,
          loginTime: new Date().toISOString(),
        }),
      );

      toast.success("Selamat Datang, Bos! 👨‍💼");

      // 3. Redirect ke Dashboard
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 p-8 rounded-3xl backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="bg-zinc-800 p-4 rounded-full border border-white/5 shadow-inner">
            <ShieldCheck size={40} className="text-orange-500" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Admin Portal</h1>
          <p className="text-zinc-500 text-sm">
            Masuk untuk mengelola Angkringan
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-zinc-400">Username</Label>
            <Input
              type="text"
              placeholder="admin"
              className="bg-zinc-950/50 border-zinc-800 focus:ring-orange-500 text-white h-12 rounded-xl"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">Password</Label>
            <div className="relative">
              <Input
                type="password"
                placeholder="••••••"
                className="bg-zinc-950/50 border-zinc-800 focus:ring-orange-500 text-white h-12 rounded-xl pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock
                size={16}
                className="absolute left-3.5 top-4 text-zinc-600"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg shadow-orange-900/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" /> Mengecek...
              </>
            ) : (
              "Masuk Dashboard"
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-zinc-600">
            Hanya personel berwenang yang boleh mengakses halaman ini.
          </p>
        </div>
      </div>
    </div>
  );
}
