"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  ShieldCheck,
  RefreshCw,
  Calculator,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Captcha State
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [captchaInput, setCaptchaInput] = useState("");
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);

  // Generate Captcha Baru
  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1; // 1-10
    const b = Math.floor(Math.random() * 10) + 1; // 1-10
    setCaptcha({ a, b });
    setCaptchaInput("");
    setIsCaptchaValid(false);
  };

  // Init Captcha saat load
  useEffect(() => {
    generateCaptcha();
    // Cek jika sudah login (Security Check)
    if (document.cookie.includes("admin_session=true")) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  // Validasi Real-time Captcha
  const handleCaptchaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCaptchaInput(val);
    // Validasi langsung (User Experience mulus)
    if (parseInt(val) === captcha.a + captcha.b) {
      setIsCaptchaValid(true);
    } else {
      setIsCaptchaValid(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validasi Captcha Layer Terakhir
    if (parseInt(captchaInput) !== captcha.a + captcha.b) {
      toast.error("Captcha Salah!", { description: "Hitung ulang ya, Kak!" });
      generateCaptcha(); // Reset biar bot bingung
      return;
    }

    setIsLoading(true);

    try {
      // 2. Cek Database Supabase
      const { data, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .eq("password", password) // Note: Production harusnya hash
        .single();

      if (error || !data) {
        toast.error("Akses Ditolak", {
          description: "Username atau Password tidak valid.",
        });
        setIsLoading(false);
        generateCaptcha(); // Reset captcha setiap gagal login (Anti Brute Force)
        return;
      }

      // 3. Set Secure Cookie & Session
      // Max-Age 1 hari, Secure, SameSite=Lax (Aman dari CSRF)
      document.cookie =
        "admin_session=true; path=/; max-age=86400; SameSite=Lax; Secure";

      localStorage.setItem(
        "admin_data",
        JSON.stringify({
          username: data.username,
          id: data.id,
          role: "super_admin",
        }),
      );

      toast.success("Login Berhasil! 🚀", {
        description: "Mengalihkan ke dashboard...",
      });

      // 4. Redirect
      router.refresh();
      router.replace("/admin/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Kesalahan Sistem", {
        description: "Cek koneksi internetmu.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden font-sans selection:bg-orange-500/30">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#ea580c15_0%,_transparent_50%)]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-[400px] bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-gradient-to-tr from-zinc-800 to-zinc-900 p-4 rounded-2xl border border-white/5 shadow-lg mb-4 ring-1 ring-white/5">
            <ShieldCheck size={32} className="text-orange-500 drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Admin Portal
          </h1>
          <p className="text-zinc-500 text-xs mt-1.5 font-medium">
            Masuk untuk mengelola sistem
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">
              ID Pengguna
            </Label>
            <Input
              type="text"
              className="bg-black/20 border-zinc-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-white h-11 rounded-xl transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">
              Kata Sandi
            </Label>
            <div className="relative group">
              <Input
                type="password"
                className="bg-black/20 border-zinc-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-white h-11 rounded-xl pl-10 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Lock
                size={16}
                className="absolute left-3.5 top-3.5 text-zinc-600 group-focus-within:text-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Math Captcha (Modern) */}
          <div className="pt-2">
            <div className="p-1.5 bg-zinc-800/30 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900/80 rounded-lg border border-white/5 min-w-[100px] justify-center">
                <Calculator size={14} className="text-blue-400" />
                <span className="text-white font-mono font-bold tracking-wider">
                  {captcha.a} + {captcha.b} = ?
                </span>
              </div>

              <Input
                type="number"
                className={`w-20 h-10 text-center font-bold border-zinc-700 bg-zinc-900 focus:ring-offset-0 ${
                  captchaInput
                    ? isCaptchaValid
                      ? "text-green-500 border-green-500/50 focus:ring-green-500/20"
                      : "text-red-500 border-red-500/50 focus:ring-red-500/20"
                    : "text-white"
                }`}
                placeholder="Hasil"
                value={captchaInput}
                onChange={handleCaptchaChange}
                required
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={generateCaptcha}
                className="text-zinc-500 hover:text-white hover:bg-white/5 h-10 w-10 rounded-lg"
                title="Ganti Soal"
              >
                <RefreshCw size={16} />
              </Button>
            </div>
            {/* Helper Text */}
            <div className="flex justify-end mt-1.5">
              {captchaInput && !isCaptchaValid && (
                <span className="text-[10px] text-red-400 animate-pulse">
                  Jawaban salah
                </span>
              )}
              {isCaptchaValid && (
                <span className="text-[10px] text-green-400 font-bold">
                  Verifikasi OK
                </span>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !isCaptchaValid}
            className={`w-full h-12 font-bold rounded-xl mt-4 transition-all duration-300 shadow-lg ${
              isCaptchaValid
                ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-orange-900/20 active:scale-[0.98]"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" /> Memproses...
              </>
            ) : (
              "Masuk Dashboard"
            )}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-4">
          <p className="text-[10px] text-zinc-600 font-medium">
            &copy; {new Date().getFullYear()} Angkringan Digital System.
          </p>
        </div>
      </div>
    </div>
  );
}
