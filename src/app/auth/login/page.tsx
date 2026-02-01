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
  User,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Captcha State
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [captchaInput, setCaptchaInput] = useState("");
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);

  // Generate Captcha
  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ a, b });
    setCaptchaInput("");
    setIsCaptchaValid(false);
  };

  useEffect(() => {
    generateCaptcha();

    // Cek Session & Role di Cookie untuk Redirect Otomatis
    const sessionCookie = document.cookie.includes("admin_session=true");
    const roleCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_role="))
      ?.split("=")[1];

    if (sessionCookie && roleCookie) {
      if (roleCookie === "cashier") {
        router.replace("/cashier/pos");
      } else {
        router.replace("/admin/dashboard");
      }
    }
  }, [router]);

  const handleCaptchaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCaptchaInput(val);
    if (parseInt(val) === captcha.a + captcha.b) setIsCaptchaValid(true);
    else setIsCaptchaValid(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseInt(captchaInput) !== captcha.a + captcha.b) {
      toast.error("Captcha Salah!", { description: "Hitung ulang ya!" });
      generateCaptcha();
      return;
    }

    setIsLoading(true);

    try {
      // 1. Cek Database
      const { data, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (error || !data) {
        toast.error("Login Gagal", {
          description: "Username atau Password salah.",
        });
        setIsLoading(false);
        generateCaptcha();
        return;
      }

      // 2. Tentukan Role (Default ke cashier jika kosong)
      const userRole = data.role || "cashier";

      // 3. Set Cookies (Session & Role)
      // Secure cookies untuk production
      const cookieOptions = "path=/; max-age=86400; SameSite=Lax; Secure";
      document.cookie = `admin_session=true; ${cookieOptions}`;
      document.cookie = `user_role=${userRole}; ${cookieOptions}`;

      // 4. Simpan Data UI di LocalStorage
      localStorage.setItem(
        "admin_data",
        JSON.stringify({
          username: data.username,
          id: data.id,
          role: userRole,
        }),
      );

      toast.success(`Selamat Datang, ${data.username}! 👋`);

      // 5. Redirect Sesuai Role
      router.refresh(); // Refresh agar middleware update
      if (userRole === "cashier") {
        router.replace("/cashier/pos");
      } else {
        router.replace("/admin/dashboard");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi Kesalahan Sistem");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden font-sans selection:bg-orange-500/30">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#ea580c15_0%,_transparent_50%)]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-[400px] bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-gradient-to-tr from-zinc-800 to-zinc-900 p-4 rounded-2xl border border-white/5 shadow-lg mb-4 ring-1 ring-white/5">
            <ShieldCheck size={32} className="text-orange-500 drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            System Login
          </h1>
          <p className="text-zinc-500 text-xs mt-1.5 font-medium">
            Masuk sebagai Admin atau Kasir
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">
              Username
            </Label>
            <div className="relative group">
              <Input
                type="text"
                className="bg-black/20 border-zinc-800 focus:border-orange-500/50 text-white h-11 rounded-xl pl-10 transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="ID Pengguna"
              />
              <User
                size={16}
                className="absolute left-3.5 top-3.5 text-zinc-600 group-focus-within:text-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">
              Password
            </Label>
            <div className="relative group">
              <Input
                type="password"
                className="bg-black/20 border-zinc-800 focus:border-orange-500/50 text-white h-11 rounded-xl pl-10 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <Lock
                size={16}
                className="absolute left-3.5 top-3.5 text-zinc-600 group-focus-within:text-orange-500 transition-colors"
              />
            </div>
          </div>

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
                className={`w-20 h-10 text-center font-bold border-zinc-700 bg-zinc-900 ${isCaptchaValid ? "text-green-500 border-green-500/50" : "text-white"}`}
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
                className="text-zinc-500 hover:text-white h-10 w-10"
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !isCaptchaValid}
            className={`w-full h-12 font-bold rounded-xl mt-4 shadow-lg ${isCaptchaValid ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white" : "bg-zinc-800 text-zinc-500 border border-white/5"}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" /> Memproses...
              </>
            ) : (
              "Masuk Sistem"
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
